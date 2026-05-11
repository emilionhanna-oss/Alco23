// src/controllers/profesorController.js
const db = require('../db');

function normalizeRoles(raw) {
  if (Array.isArray(raw)) return raw.map(String);
  if (raw === undefined || raw === null) return [];
  return [String(raw)];
}

function asTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : undefined;
}

const ALLOWED_MODULE_TYPES = new Set(['video', 'lectura', 'quiz', 'practica_presencial']);
const PRACTICA_PRESENCIAL_MESSAGE =
  'Se le ha notificado a tu instructor que has finalizado la parte teorica. ' +
  'Por favor, espera a ser contactado para coordinar tu evaluacion practica presencial';

function buildCourseResponse(row, modulos = [], alumnosInscritos = []) {
  return {
    id:               String(row.id),
    titulo:           row.titulo,
    descripcion:      row.descripcion,
    imagen:           row.imagen_url || '/course-images/curso-1-caidas.svg',
    progreso:         row.progreso || 0,
    instructorId:     row.instructor_id ? String(row.instructor_id) : null,
    modulos,
    alumnosInscritos: alumnosInscritos.map(String),
  };
}

async function getModulosByCurso(cursoId) {
  const result = await db.query(
    'SELECT * FROM modulos WHERE curso_id = $1 ORDER BY orden ASC',
    [cursoId]
  );
  return result.rows.map((m) => ({
    id:                  m.id,
    tituloModulo:        m.titulo,
    tipo:                m.tipo,
    contenido:           m.contenido || null,
    materialDescargable: m.material_url || null,
  }));
}

async function getAlumnosByCurso(cursoId) {
  const result = await db.query(
    'SELECT usuario_id FROM inscripciones WHERE curso_id = $1',
    [cursoId]
  );
  return result.rows.map((r) => String(r.usuario_id));
}

// GET /api/profesor/mis-cursos
const getMisCursos = async (req, res) => {
  try {
    const profesorId = req.user?.id;
    if (!profesorId) {
      return res.status(401).json({ mensaje: 'No autorizado' });
    }

    const result = await db.query(
      'SELECT * FROM cursos WHERE instructor_id = $1 ORDER BY creado_en DESC',
      [profesorId]
    );

    const cursos = await Promise.all(
      result.rows.map(async (c) => {
        const modulos = await getModulosByCurso(c.id);
        const alumnos = await getAlumnosByCurso(c.id);
        return buildCourseResponse(c, modulos, alumnos);
      })
    );

    return res.status(200).json(cursos);
  } catch (error) {
    console.error('Error al obtener cursos del profesor:', error);
    return res.status(500).json({ mensaje: 'No se pudieron obtener los cursos' });
  }
};

// GET /api/profesor/mis-cursos/:id/estudiantes
const getEstudiantesPorCurso = async (req, res) => {
  try {
    const { id: cursoId } = req.params;
    const profesorId = req.user?.id;

    // Verificar que el profesor es el propietario del curso
    const cursoResult = await db.query(
      'SELECT instructor_id FROM cursos WHERE id = $1',
      [cursoId]
    );

    if (cursoResult.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Curso no encontrado' });
    }

    if (String(cursoResult.rows[0].instructor_id) !== String(profesorId)) {
      return res.status(403).json({ mensaje: 'No autorizado' });
    }

    // Obtener estudiantes inscritos con su progreso
    const result = await db.query(
      `SELECT 
        u.id, 
        u.nombre_completo, 
        u.email, 
        u.nombre, 
        i.inscrito_en,
        COUNT(CASE WHEN pm.completado = true THEN 1 END)::INT as modulos_completados,
        COUNT(m.id)::INT as total_modulos
      FROM inscripciones i
      JOIN usuarios u ON u.id = i.usuario_id
      LEFT JOIN modulos m ON m.curso_id = i.curso_id
      LEFT JOIN progreso_modulos pm ON pm.usuario_id = u.id AND pm.modulo_id = m.id
      WHERE i.curso_id = $1
      GROUP BY u.id, u.nombre_completo, u.email, u.nombre, i.inscrito_en
      ORDER BY u.nombre_completo ASC`,
      [cursoId]
    );

    const estudiantes = result.rows.map((row) => ({
      id: String(row.id),
      nombreCompleto: row.nombre_completo,
      nombre: row.nombre,
      email: row.email,
      inscritoEn: row.inscrito_en,
      modulosCompletados: row.modulos_completados,
      totalModulos: row.total_modulos,
      progreso: row.total_modulos > 0 ? Math.round((row.modulos_completados / row.total_modulos) * 100) : 0,
    }));

    return res.status(200).json(estudiantes);
  } catch (error) {
    console.error('Error al obtener estudiantes:', error);
    return res.status(500).json({ mensaje: 'No se pudieron obtener los estudiantes' });
  }
};

// GET /api/profesor/mis-cursos/:id/practicas-pendientes
const getPracticasPendientes = async (req, res) => {
  try {
    const { id: cursoId } = req.params;
    const profesorId = req.user?.id;

    // Verificar pertenencia
    const cursoResult = await db.query(
      'SELECT instructor_id FROM cursos WHERE id = $1',
      [cursoId]
    );

    if (cursoResult.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Curso no encontrado' });
    }

    if (String(cursoResult.rows[0].instructor_id) !== String(profesorId)) {
      return res.status(403).json({ mensaje: 'No autorizado' });
    }

    // Obtener prácticas presenciales pendientes
    const result = await db.query(
      `SELECT 
        ppe.id,
        ppe.usuario_id,
        ppe.modulo_id,
        ppe.estado,
        ppe.notas,
        ppe.evaluado_en,
        u.nombre_completo,
        u.email,
        m.titulo as titulo_modulo
      FROM practica_presencial_evaluaciones ppe
      JOIN usuarios u ON u.id = ppe.usuario_id
      JOIN modulos m ON m.id = ppe.modulo_id
      WHERE m.curso_id = $1 AND ppe.estado = 'pendiente'
      ORDER BY ppe.id ASC`,
      [cursoId]
    );

    const practicas = result.rows.map((row) => ({
      id: String(row.id),
      usuarioId: String(row.usuario_id),
      moduloId: String(row.modulo_id),
      estado: row.estado,
      notas: row.notas,
      evaluadoEn: row.evaluado_en,
      estudiante: {
        nombreCompleto: row.nombre_completo,
        email: row.email,
      },
      moduloTitulo: row.titulo_modulo,
    }));

    return res.status(200).json(practicas);
  } catch (error) {
    console.error('Error al obtener prácticas pendientes:', error);
    return res.status(500).json({ mensaje: 'No se pudieron obtener las prácticas' });
  }
};

// PUT /api/profesor/practicas/:id/autorizar
const autorizarPractica = async (req, res) => {
  try {
    const { id: practicaId } = req.params;
    const { estado, notas } = req.body;
    const profesorId = req.user?.id;

    // Validar estado
    if (!['aprobado', 'rechazado', 'pendiente'].includes(estado)) {
      return res.status(400).json({ mensaje: 'Estado inválido' });
    }

    // Obtener práctica y verificar pertenencia
    const practicaResult = await db.query(
      `SELECT ppe.*, m.curso_id
       FROM practica_presencial_evaluaciones ppe
       JOIN modulos m ON m.id = ppe.modulo_id
       WHERE ppe.id = $1`,
      [practicaId]
    );

    if (practicaResult.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Práctica no encontrada' });
    }

    const practica = practicaResult.rows[0];

    // Verificar que el profesor es propietario del curso
    const cursoResult = await db.query(
      'SELECT instructor_id FROM cursos WHERE id = $1',
      [practica.curso_id]
    );

    if (String(cursoResult.rows[0].instructor_id) !== String(profesorId)) {
      return res.status(403).json({ mensaje: 'No autorizado' });
    }

    // Actualizar práctica
    const updateResult = await db.query(
      `UPDATE practica_presencial_evaluaciones
       SET estado = $1, notas = $2, evaluado_en = NOW()
       WHERE id = $3
       RETURNING *`,
      [estado, asTrimmedString(notas) || null, practicaId]
    );

    if (estado === 'aprobado') {
      // Marcar módulo como completado
      await db.query(
        `INSERT INTO progreso_modulos (usuario_id, modulo_id, completado, completado_en)
         VALUES ($1, $2, true, NOW())
         ON CONFLICT (usuario_id, modulo_id) DO UPDATE
         SET completado = true, completado_en = NOW()`,
        [practica.usuario_id, practica.modulo_id]
      );
    }

    const updated = updateResult.rows[0];

    return res.status(200).json({
      id: String(updated.id),
      estado: updated.estado,
      notas: updated.notas,
      evaluadoEn: updated.evaluado_en,
    });
  } catch (error) {
    console.error('Error al autorizar práctica:', error);
    return res.status(500).json({ mensaje: 'No se pudo actualizar la práctica' });
  }
};

// PUT /api/profesor/mis-cursos/:id
const actualizarCurso = async (req, res) => {
  try {
    const { id: cursoId } = req.params;
    const { titulo, descripcion, imagen, modulos } = req.body;
    const profesorId = req.user?.id;

    // Verificar pertenencia
    const cursoResult = await db.query(
      'SELECT * FROM cursos WHERE id = $1',
      [cursoId]
    );

    if (cursoResult.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Curso no encontrado' });
    }

    if (String(cursoResult.rows[0].instructor_id) !== String(profesorId)) {
      return res.status(403).json({ mensaje: 'No autorizado' });
    }

    const curso = cursoResult.rows[0];

    // Actualizar metadatos
    const tituloFinal = asTrimmedString(titulo) || curso.titulo;
    const descFinal = asTrimmedString(descripcion) || curso.descripcion;
    const imagenFinal = asTrimmedString(imagen) || curso.imagen_url;

    const updateResult = await db.query(
      `UPDATE cursos
       SET titulo = $1, descripcion = $2, imagen_url = $3, actualizado_en = NOW()
       WHERE id = $4
       RETURNING *`,
      [tituloFinal, descFinal, imagenFinal, cursoId]
    );

    const updated = updateResult.rows[0];

    // Actualizar módulos si se proporcionan
    if (Array.isArray(modulos) && modulos.length > 0) {
      // Obtener módulos existentes
      const existingModulesResult = await db.query(
        'SELECT * FROM modulos WHERE curso_id = $1 ORDER BY orden ASC',
        [cursoId]
      );
      const existingModules = existingModulesResult.rows;

      // Actualizar cada módulo (simplificado: solo permite editar los existentes)
      for (let i = 0; i < modulos.length && i < existingModules.length; i++) {
        const mod = modulos[i];
        const existing = existingModules[i];

        if (mod.id === existing.id) {
          const titulo_mod = asTrimmedString(mod.tituloModulo) || existing.titulo;
          const tipo_mod = ALLOWED_MODULE_TYPES.has(mod.tipo) ? mod.tipo : existing.tipo;
          const contenido_mod = mod.contenido !== undefined ? mod.contenido : existing.contenido;

          await db.query(
            `UPDATE modulos
             SET titulo = $1, tipo = $2, contenido = $3
             WHERE id = $4`,
            [titulo_mod, tipo_mod, JSON.stringify(contenido_mod), mod.id]
          );
        }
      }
    }

    const modulosFinales = await getModulosByCurso(cursoId);
    const alumnosInscritos = await getAlumnosByCurso(cursoId);

    return res.status(200).json(
      buildCourseResponse(updated, modulosFinales, alumnosInscritos)
    );
  } catch (error) {
    console.error('Error al actualizar curso:', error);
    return res.status(500).json({ mensaje: 'No se pudo actualizar el curso' });
  }
};

module.exports = {
  getMisCursos,
  getEstudiantesPorCurso,
  getPracticasPendientes,
  autorizarPractica,
  actualizarCurso,
};
