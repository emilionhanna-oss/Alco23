// src/seeders/seed.js
const db = require('../db');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { isRutValid, normalizeRutForStorage } = require('../utils/rutUtils');

const SEED_DATA_PATH = path.join(__dirname, '../../data/db.json');
const FALLBACK_SEED_PATH = path.join(__dirname, 'default_seed.json');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return { salt, hash };
}

async function seedDatabase() {
  try {
    // Wait for database to be ready (avoid race with container startup)
    await waitForDatabase();
    // If FORCE_RESEED is set, perform a safe cleanup before seeding
    if ((process.env.FORCE_RESEED || '').toLowerCase() === 'true') {
      console.log('⚠️ FORCE_RESEED=true — limpiando datos existentes...');
      try {
        await db.query('BEGIN');
        await db.query('DELETE FROM respuestas_quiz');
        await db.query('DELETE FROM progreso_modulos');
        await db.query('DELETE FROM inscripciones');
        await db.query('DELETE FROM modulos');
        await db.query('DELETE FROM cursos');
        await db.query("DELETE FROM usuario_roles WHERE usuario_id IS NOT NULL");
        await db.query("DELETE FROM usuarios");
        await db.query('COMMIT');
        console.log('✅ Datos eliminados (FORCE_RESEED)');
      } catch (err) {
        await db.query('ROLLBACK');
        console.error('❌ Error limpiando datos para FORCE_RESEED:', err.message || err);
        throw err;
      }
    }

    // Check if data already exists
    const userCount = await db.query('SELECT COUNT(*) FROM usuarios');
    if (userCount.rows[0].count > 0) {
      console.log('✅ Base de datos ya contiene datos. Skipping seed.');
      return;
    }

    console.log('🌱 Iniciando seed de base de datos...');

    // Read seed data (prefer mounted data/db.json for compatibility, else use bundled default)
    let seedRawPath = SEED_DATA_PATH;
    if (!fs.existsSync(seedRawPath)) seedRawPath = FALLBACK_SEED_PATH;
    const rawData = fs.readFileSync(seedRawPath, 'utf8');
    const seedData = JSON.parse(rawData);

    // Insert sedes (ensure they exist)
    const sedes = [
      { nombre: 'Hualpen (Region del Biobio)', region: 'Region del Biobio' },
      { nombre: 'Coyhaique (Region de Aysen)', region: 'Region de Aysen' },
    ];

    const sedeMap = {};
    for (const sede of sedes) {
      const result = await db.query(
        'SELECT id FROM sedes WHERE nombre = $1',
        [sede.nombre]
      );
      if (result.rows.length > 0) {
        sedeMap[sede.nombre] = result.rows[0].id;
      } else {
        const insertResult = await db.query(
          'INSERT INTO sedes (nombre, region) VALUES ($1, $2) RETURNING id',
          [sede.nombre, sede.region]
        );
        sedeMap[sede.nombre] = insertResult.rows[0].id;
      }
    }

    console.log('✅ Sedes verificadas/creadas');

    // Insert users
    const userMap = {};
    for (const user of seedData.usuarios) {
      const rut = normalizeRutForStorage(user.rut);
      if (!isRutValid(rut)) {
        console.warn(`⚠️ RUT inválido, skipping usuario ${user.email}: ${user.rut}`);
        continue;
      }

      const sedeId = sedeMap[user.sede];
      if (!sedeId) {
        console.warn(`⚠️ Sede no encontrada, skipping usuario ${user.email}: ${user.sede}`);
        continue;
      }

      const { salt, hash } = hashPassword(user.password);

      const result = await db.query(
        `INSERT INTO usuarios
         (email, password_hash, password_salt, nombre_completo, nombre, rut, genero, sede_id, cargo, estado)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [
          user.email.toLowerCase(),
          hash,
          salt,
          user.nombreCompleto,
          user.nombre,
          rut,
          user.genero,
          sedeId,
          user.cargo,
          user.estado,
        ]
      );

      const userId = result.rows[0].id;
      userMap[user.id] = userId;

      // Insert roles
      for (const rol of user.rol) {
        await db.query(
          'INSERT INTO usuario_roles (usuario_id, rol) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [userId, rol]
        );
      }

      console.log(`✅ Usuario creado: ${user.email} (ID: ${userId})`);
    }

    console.log('✅ Usuarios y roles creados');

    // Insert courses
    for (const course of seedData.cursos) {
      const instructorId = userMap[course.instructorId];
      if (!instructorId) {
        console.warn(`⚠️ Instructor no encontrado, skipping curso ${course.titulo}`);
        continue;
      }

      const courseResult = await db.query(
        `INSERT INTO cursos (titulo, descripcion, imagen_url, instructor_id, publicado)
         VALUES ($1, $2, $3, $4, true)
         RETURNING id`,
        [course.titulo, course.descripcion, course.imagen, instructorId]
      );

      const cursoId = courseResult.rows[0].id;

      // Insert modules
      for (let i = 0; i < course.modulos.length; i++) {
        const modulo = course.modulos[i];
        const contenidoJson = JSON.stringify(modulo.contenido);

        await db.query(
          `INSERT INTO modulos (curso_id, titulo, tipo, contenido, orden)
           VALUES ($1, $2, $3, $4, $5)`,
          [cursoId, modulo.tituloModulo, modulo.tipo, contenidoJson, i]
        );
      }

      console.log(`✅ Curso creado: ${course.titulo} (ID: ${cursoId}) con ${course.modulos.length} módulos`);

      // Insert inscriptions
      for (const alumnoId of course.alumnosInscritos) {
        const usuarioId = userMap[alumnoId];
        if (usuarioId) {
          await db.query(
            'INSERT INTO inscripciones (usuario_id, curso_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [usuarioId, cursoId]
          );
        }
      }
    }

    console.log('✅ Cursos y módulos creados');
    console.log('🌱 Seed completado exitosamente');
  } catch (error) {
    console.error('❌ Error durante seed:', error);
    throw error;
  }
}

module.exports = { seedDatabase };

async function waitForDatabase(retries = 15, baseDelayMs = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await db.query('SELECT 1');
      console.log('✅ Database reachable');
      return;
    } catch (err) {
      const waitMs = baseDelayMs * attempt;
      console.log(`⏳ Esperando conexión a la base de datos (intento ${attempt}/${retries})...`);
      if (attempt === retries) {
        console.error('❌ No se pudo conectar a la base de datos después de varios intentos');
        throw err;
      }
      await new Promise((res) => setTimeout(res, waitMs));
    }
  }
}
