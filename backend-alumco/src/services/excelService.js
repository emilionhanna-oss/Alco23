const xlsx = require('xlsx');
const db = require('../db');
const crypto = require('crypto');

// Util para generar contraseñas y hashes (mismo de seed.js)
function generarPassword(rawPassword) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(rawPassword, salt, 64).toString('hex');
  return { hash, salt };
}

/**
 * Importar usuarios desde un archivo Excel
 * Columnas esperadas: Nombre Completo, Email, RUT, Genero, Cargo
 * Contraseña por defecto será su RUT
 */
async function importarUsuarios(buffer) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);

  const resultados = {
    insertados: 0,
    errores: []
  };

  // Por defecto, sede Nula, o la primera que exista. 
  // O podemos asignar una por defecto más adelante.

  for (const row of data) {
    const nombre_completo = row['Nombre Completo'] || row['nombre_completo'] || row['Nombre'] || '';
    const email = (row['Email'] || row['email'] || row['Correo'] || '').toString().toLowerCase().trim();
    const rut = (row['RUT'] || row['rut'] || '').toString().trim();
    const genero = row['Genero'] || row['genero'] || row['Género'] || 'Otro';
    const cargo = row['Cargo'] || row['cargo'] || '';

    if (!email || !rut || !nombre_completo) {
      resultados.errores.push(`Fila inválida: Faltan datos requeridos (Email, RUT o Nombre). Fila: ${JSON.stringify(row)}`);
      continue;
    }

    try {
      // 1. Verificar si ya existe
      const existe = await db.query('SELECT id FROM usuarios WHERE email = $1 OR rut = $2', [email, rut]);
      if (existe.rows.length > 0) {
        resultados.errores.push(`El usuario con email ${email} o RUT ${rut} ya existe.`);
        continue;
      }

      // 2. Crear contraseña (RUT sin puntos ni guion, o completo)
      const rawPassword = rut.replace(/[^0-9kK]/g, '');
      const { hash, salt } = generarPassword(rawPassword || rut);

      // 3. Insertar
      const newUser = await db.query(
        `INSERT INTO usuarios (email, password_hash, password_salt, nombre_completo, rut, genero, cargo, estado)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'activo') RETURNING id`,
        [email, hash, salt, nombre_completo, rut, genero, cargo]
      );
      const usuario_id = newUser.rows[0].id;

      // Asignar rol usuario por defecto
      await db.query('INSERT INTO usuario_roles (usuario_id, rol) VALUES ($1, $2)', [usuario_id, 'usuario']);
      
      resultados.insertados++;
    } catch (err) {
      resultados.errores.push(`Error insertando ${email}: ${err.message}`);
    }
  }

  return resultados;
}

/**
 * Exportar reporte de usuarios a Excel
 */
async function exportarUsuarios() {
  const result = await db.query(`
    SELECT u.id, u.nombre_completo, u.email, u.rut, u.genero, u.cargo, s.nombre as sede, u.estado, u.fecha_registro
    FROM usuarios u
    LEFT JOIN sedes s ON u.sede_id = s.id
    ORDER BY u.id DESC
  `);

  const workbook = xlsx.utils.book_new();
  const worksheet = xlsx.utils.json_to_sheet(result.rows);
  
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Usuarios');
  
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Exportar reporte de Dashboard a Excel
 */
async function exportarReporteDashboard() {
  const progresoResult = await db.query(`
    SELECT u.nombre_completo, u.email, u.rut, s.nombre as sede, c.titulo as curso, pm.completado, pm.completado_en
    FROM progreso_modulos pm
    JOIN usuarios u ON pm.usuario_id = u.id
    JOIN modulos m ON pm.modulo_id = m.id
    JOIN cursos c ON m.curso_id = c.id
    LEFT JOIN sedes s ON u.sede_id = s.id
  `);

  const workbook = xlsx.utils.book_new();
  const worksheet = xlsx.utils.json_to_sheet(progresoResult.rows);
  
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Reporte de Avance');
  
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = {
  importarUsuarios,
  exportarUsuarios,
  exportarReporteDashboard
};
