// src/controllers/courseController.js
const db = require('../db');
const xlsx = require('xlsx');

/** Valida RUT chileno con dígito verificador. Acepta "12.345.678-9" o "12345678-9" */
function validarRutChileno(rut) {
  if (!rut || typeof rut !== 'string') return false;
  const cleaned = rut.replace(/\./g, '').replace(/\s/g, '').toUpperCase();
  if (!/^\d{7,8}-[\dK]$/.test(cleaned)) return false;
  const [body, dv] = cleaned.split('-');
  let suma = 0, mul = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    suma += parseInt(body[i]) * mul;
    mul = mul >= 7 ? 2 : mul + 1;
  }
  const dvEsperado = 11 - (suma % 11);
  const dvChar = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : String(dvEsperado);
  return dv === dvChar;
}

/** Valida formato de email */
function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeRoles(raw) {
  if (Array.isArray(raw)) return raw.map(String);
  if (raw === undefined || raw === null) return [];
  return [String(raw)];
}

function asTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : undefined;
}

const PRACTICA_PRESENCIAL_MESSAGE =
  'Se le ha notificado a tu instructor que has finalizado la parte teorica. ' +
  'Por favor, espera a ser contactado para coordinar tu evaluacion practica presencial';

const ALLOWED_MODULE_TYPES = new Set(['video', 'lectura', 'quiz', 'practica_presencial']);
const DEFAULT_COURSE_IMAGE = '/course-images/curso-1-caidas.svg';

function buildCourseResponse(row, modulos = [], alumnosInscritos = []) {
  let progreso = row.progreso || 0;
  if (modulos.length > 0) {
    const completedCount = modulos.filter((m) => m.completado).length;
    progreso = Math.round((completedCount / modulos.length) * 100);
  }

  return {
    id:               String(row.id),
    titulo:           row.titulo,
    descripcion:      row.descripcion,
    imagen:           row.imagen_url || DEFAULT_COURSE_IMAGE,
    progreso:         progreso,
    instructorId:     row.instructor_id ? String(row.instructor_id) : null,
    modulos,
    alumnosInscritos: alumnosInscritos.map(String),
  };
}

async function getModulosByCurso(cursoId, userId = null) {
  if (!userId) {
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
      completado:          false,
    }));
  }

  const result = await db.query(
    `SELECT m.*, pm.completado, ppe.estado as practica_estado
     FROM modulos m 
     LEFT JOIN progreso_modulos pm ON m.id = pm.modulo_id AND pm.usuario_id = $2 
     LEFT JOIN practica_presencial_evaluaciones ppe ON m.id = ppe.modulo_id AND ppe.usuario_id = $2
     WHERE m.curso_id = $1 
     ORDER BY m.orden ASC`,
    [cursoId, userId]
  );
  return result.rows.map((m) => ({
    id:                  m.id,
    tituloModulo:        m.titulo,
    tipo:                m.tipo,
    contenido:           m.contenido || null,
    materialDescargable: m.material_url || null,
    completado:          Boolean(m.completado),
    practicaEstado:      m.practica_estado || null,
  }));
}

async function getAlumnosByCurso(cursoId) {
  const result = await db.query(
    'SELECT usuario_id FROM inscripciones WHERE curso_id = $1',
    [cursoId]
  );
  return result.rows.map((r) => String(r.usuario_id));
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function sanitizeLecturaContenido(raw) {
  if (typeof raw === 'string') return { instrucciones: raw.trim() || undefined };
  if (isPlainObject(raw)) {
    return {
      archivoNombre: asTrimmedString(raw.archivoNombre) || undefined,
      instrucciones: asTrimmedString(raw.instrucciones) || undefined,
    };
  }
  return { instrucciones: undefined };
}

function sanitizeQuizContenido(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((q) => q && typeof q === 'object')
    .map((q) => {
      const tipo     = String(q.tipo) === 'respuesta_escrita' ? 'respuesta_escrita' : 'seleccion_multiple';
      const pregunta = asTrimmedString(q.pregunta) || '';
      if (tipo === 'respuesta_escrita') {
        return { tipo, pregunta, respuestaModelo: asTrimmedString(q.respuestaModelo) || undefined };
      }
      const opciones = (Array.isArray(q.opciones) ? q.opciones : [])
        .filter((o) => o && typeof o === 'object')
        .map((o) => ({ texto: asTrimmedString(o.texto) || '', correcta: Boolean(o.correcta) }));
      if (opciones.length > 0 && !opciones.some((o) => o.correcta)) opciones[0].correcta = true;
      return { tipo, pregunta, opciones };
    })
    .filter((q) => typeof q?.pregunta === 'string' && q.pregunta.trim().length > 0);
}

function sanitizeModulos(raw, existing = []) {
  if (!Array.isArray(raw)) return undefined;
  return raw
    .filter((m) => m && typeof m === 'object')
    .map((m, index) => {
      const ex = existing[index] && typeof existing[index] === 'object' ? existing[index] : {};
      const tituloModulo =
        asTrimmedString(m.tituloModulo) || asTrimmedString(ex.tituloModulo) || 'Modulo sin titulo';
      const tipo = ALLOWED_MODULE_TYPES.has(String(m.tipo)) ? String(m.tipo)
        : ALLOWED_MODULE_TYPES.has(String(ex.tipo)) ? String(ex.tipo) : 'lectura';
      const rawContenido = m.contenido !== undefined ? m.contenido : ex.contenido;
      let contenido;
      if      (tipo === 'practica_presencial') contenido = PRACTICA_PRESENCIAL_MESSAGE;
      else if (tipo === 'video')   { const s = asTrimmedString(rawContenido) ?? ''; contenido = (/^https?:\/\//i.test(s) || s.startsWith('/')) ? s : ''; }
      else if (tipo === 'lectura') contenido = sanitizeLecturaContenido(rawContenido);
      else if (tipo === 'quiz')    contenido = sanitizeQuizContenido(rawContenido);
      else                         contenido = asTrimmedString(rawContenido) ?? '';
      const material_url = asTrimmedString(m.materialDescargable) || asTrimmedString(ex.materialDescargable) || null;
      return { ...ex, tituloModulo, tipo, contenido, material_url };
    });
}

const listarCursos = async (req, res) => {
  try {
    const roles      = normalizeRoles(req.user?.rol);
    const isAdmin    = roles.includes('admin');
    const isProfesor = roles.includes('profesor');
    const wantAll    = String(req.query?.all || '') === '1';

    let rows;
    if (isAdmin && wantAll) {
      const result = await db.query('SELECT * FROM cursos ORDER BY creado_en DESC');
      rows = result.rows;
    } else if (isProfesor && wantAll) {
      const result = await db.query(
        'SELECT * FROM cursos WHERE instructor_id = $1 ORDER BY creado_en DESC',
        [req.user?.id]
      );
      rows = result.rows;
    } else {
      const result = await db.query(
        `SELECT c.* FROM cursos c
         INNER JOIN inscripciones i ON i.curso_id = c.id
         WHERE i.usuario_id = $1
         ORDER BY c.creado_en DESC`,
        [req.user?.id]
      );
      rows = result.rows;
    }

    // Batch: obtener módulos y alumnos en 2 queries en vez de N*2
    const cursoIds = rows.map((c) => c.id);

    let modulosMap = new Map();
    let alumnosMap = new Map();

    if (cursoIds.length > 0) {
      const userId = req.user?.id;
      const modulosResult = await db.query(
        `SELECT m.*, pm.completado
         FROM modulos m
         LEFT JOIN progreso_modulos pm ON pm.modulo_id = m.id AND pm.usuario_id = $2
         WHERE m.curso_id = ANY($1::int[]) 
         ORDER BY m.orden ASC`,
        [cursoIds, userId]
      );
      for (const m of modulosResult.rows) {
        const cid = String(m.curso_id);
        if (!modulosMap.has(cid)) modulosMap.set(cid, []);
        modulosMap.get(cid).push({
          id:                  m.id,
          tituloModulo:        m.titulo,
          tipo:                m.tipo,
          contenido:           m.contenido || null,
          materialDescargable: m.material_url || null,
          completado:          Boolean(m.completado),
        });
      }

      const alumnosResult = await db.query(
        'SELECT usuario_id, curso_id FROM inscripciones WHERE curso_id = ANY($1::int[])',
        [cursoIds]
      );
      for (const r of alumnosResult.rows) {
        const cid = String(r.curso_id);
        if (!alumnosMap.has(cid)) alumnosMap.set(cid, []);
        alumnosMap.get(cid).push(String(r.usuario_id));
      }
    }

    const result2 = rows.map((c) => {
      const cid = String(c.id);
      return buildCourseResponse(c, modulosMap.get(cid) || [], alumnosMap.get(cid) || []);
    });

    return res.status(200).json(result2);
  } catch (error) {
    console.error('Error al listar cursos:', error);
    return res.status(500).json({ mensaje: 'No se pudieron obtener los cursos' });
  }
};

const obtenerCursoPorId = async (req, res) => {
  try {
    const { id }  = req.params;
    const roles      = normalizeRoles(req.user?.rol);
    const isAdmin    = roles.includes('admin');
    const isProfesor = roles.includes('profesor');

    const cursoResult = await db.query('SELECT * FROM cursos WHERE id = $1', [id]);
    if (cursoResult.rows.length === 0)
      return res.status(404).json({ mensaje: `Curso con id ${id} no encontrado` });
    const curso = cursoResult.rows[0];

    if (!isAdmin) {
      if (isProfesor && String(curso.instructor_id) === String(req.user?.id)) {
        const modulos = await getModulosByCurso(id, req.user?.id);
        const alumnos = await getAlumnosByCurso(id);
        return res.status(200).json(buildCourseResponse(curso, modulos, alumnos));
      }

      const inscResult = await db.query(
        'SELECT id FROM inscripciones WHERE curso_id = $1 AND usuario_id = $2',
        [id, req.user?.id]
      );
      if (inscResult.rows.length === 0)
        return res.status(403).json({ mensaje: 'No autorizado' });
    }

    const modulos = await getModulosByCurso(id, req.user?.id);
    const alumnos = await getAlumnosByCurso(id);
    return res.status(200).json(buildCourseResponse(curso, modulos, alumnos));
  } catch (error) {
    console.error('Error al obtener curso:', error);
    return res.status(500).json({ mensaje: 'No se pudo obtener el detalle del curso' });
  }
};

const crearCurso = async (req, res) => {
  try {
    const { titulo, descripcion, imagen } = req.body || {};

    const result = await db.query(
      `INSERT INTO cursos (titulo, descripcion, imagen_url, instructor_id, publicado)
       VALUES ($1,$2,$3,$4,false) RETURNING *`,
      [
        asTrimmedString(titulo)      || 'Nueva Capacitacion',
        asTrimmedString(descripcion) || 'Descripcion de la capacitacion',
        asTrimmedString(imagen)      || DEFAULT_COURSE_IMAGE,
        req.user?.id || null,
      ]
    );

    const nuevo = result.rows[0];
    return res.status(201).json({ success: true, curso: buildCourseResponse(nuevo, [], []) });
  } catch (error) {
    console.error('Error creando curso:', error);
    return res.status(500).json({ mensaje: 'No se pudo crear el curso' });
  }
};

const actualizarCurso = async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion, imagen, modulos } = req.body || {};

    if (modulos !== undefined && !Array.isArray(modulos))
      return res.status(400).json({ mensaje: 'modulos debe ser un array' });

    const roles      = normalizeRoles(req.user?.rol);
    const isAdmin    = roles.includes('admin');
    const isProfesor = roles.includes('profesor');

    const cursoResult = await db.query('SELECT * FROM cursos WHERE id = $1', [id]);
    if (cursoResult.rows.length === 0)
      return res.status(404).json({ mensaje: `Curso con id ${id} no encontrado` });

    const t = asTrimmedString(titulo);
    const d = asTrimmedString(descripcion);
    const i = asTrimmedString(imagen);

    if (!isAdmin) {
      if (!isProfesor || String(cursoResult.rows[0].instructor_id) !== String(req.user?.id)) {
        return res.status(403).json({ mensaje: 'No autorizado' });
      }
    }

    await db.query(
      `UPDATE cursos SET
         titulo      = COALESCE($1, titulo),
         descripcion = COALESCE($2, descripcion),
         imagen_url  = COALESCE($3, imagen_url),
         actualizado_en = NOW()
       WHERE id = $4`,
      [t || null, d || null, i || null, id]
    );

    if (Array.isArray(modulos)) {
      const existingResult = await db.query(
        'SELECT id, titulo, tipo, contenido, orden FROM modulos WHERE curso_id = $1 ORDER BY orden ASC',
        [id]
      );
      const existingRows = existingResult.rows;
      const existingModulos = existingRows.map((m) => ({
        id:           m.id,
        tituloModulo: m.titulo,
        tipo:         m.tipo,
        contenido:    m.contenido || null,
        materialDescargable: m.material_url || null,
      }));
      const sanitized = sanitizeModulos(modulos, existingModulos);

      if (sanitized !== undefined) {
        const emptyQuizIndex = sanitized.findIndex(
          (m) => String(m?.tipo) === 'quiz' && Array.isArray(m?.contenido) && m.contenido.length === 0
        );
        if (emptyQuizIndex !== -1)
          return res.status(400).json({ mensaje: `El modulo #${emptyQuizIndex + 1} (quiz) debe tener al menos 1 pregunta.` });

        // Upsert strategy: update existing, insert new, delete removed
        const existingIds = existingRows.map((m) => m.id);
        const keepIds = new Set();

        for (let idx = 0; idx < sanitized.length; idx++) {
          const m = sanitized[idx];
          if (idx < existingRows.length) {
            // Update existing module in-place (preserves ID → preserves progress & quiz responses)
            const existingId = existingRows[idx].id;
            keepIds.add(existingId);
            await db.query(
              'UPDATE modulos SET titulo = $1, tipo = $2, contenido = $3, orden = $4, material_url = $5 WHERE id = $6',
              [m.tituloModulo, m.tipo, JSON.stringify(m.contenido), idx, m.material_url, existingId]
            );
          } else {
            // Insert new module
            await db.query(
              'INSERT INTO modulos (curso_id, titulo, tipo, contenido, orden, material_url) VALUES ($1,$2,$3,$4,$5,$6)',
              [id, m.tituloModulo, m.tipo, JSON.stringify(m.contenido), idx, m.material_url]
            );
          }
        }

        // Delete only modules that were actually removed
        const toDelete = existingIds.filter((eid) => !keepIds.has(eid));
        if (toDelete.length > 0) {
          await db.query('DELETE FROM modulos WHERE id = ANY($1::int[])', [toDelete]);
        }
      }
    }

    const modulosActualizados = await getModulosByCurso(id);
    const alumnos             = await getAlumnosByCurso(id);
    const cursoActualizado    = (await db.query('SELECT * FROM cursos WHERE id = $1', [id])).rows[0];

    return res.status(200).json({ success: true, curso: buildCourseResponse(cursoActualizado, modulosActualizados, alumnos) });
  } catch (error) {
    console.error('Error actualizando curso:', error);
    return res.status(500).json({ mensaje: 'No se pudo actualizar el curso' });
  }
};

const eliminarCurso = async (req, res) => {
  try {
    const { id } = req.params;
    const cursoResult = await db.query('SELECT id FROM cursos WHERE id = $1', [id]);
    if (cursoResult.rows.length === 0)
      return res.status(404).json({ mensaje: `Curso con id ${id} no encontrado` });

    await db.query('DELETE FROM cursos WHERE id = $1', [id]);
    return res.status(200).json({ success: true, id: String(id) });
  } catch (error) {
    console.error('Error eliminando curso:', error);
    return res.status(500).json({ mensaje: 'No se pudo eliminar el curso' });
  }
};

const asignarAlumnos = async (req, res) => {
  try {
    const { id } = req.params;
    const { alumnosInscritos } = req.body || {};

    if (!Array.isArray(alumnosInscritos))
      return res.status(400).json({ mensaje: 'alumnosInscritos debe ser un array' });

    const cursoResult = await db.query('SELECT * FROM cursos WHERE id = $1', [id]);
    if (cursoResult.rows.length === 0)
      return res.status(404).json({ mensaje: `Curso con id ${id} no encontrado` });

    const roles      = normalizeRoles(req.user?.rol);
    const isAdmin    = roles.includes('admin');
    const isProfesor = roles.includes('profesor');

    if (!isAdmin) {
      if (!isProfesor || String(cursoResult.rows[0].instructor_id) !== String(req.user?.id)) {
        return res.status(403).json({ mensaje: 'No autorizado' });
      }
    }

    let normalized = [];
    if (alumnosInscritos.length > 0) {
      const placeholders = alumnosInscritos.map((_, i) => `$${i + 1}`).join(',');
      const validResult  = await db.query(
        `SELECT id FROM usuarios WHERE id IN (${placeholders})`,
        alumnosInscritos
      );
      const validIds = new Set(validResult.rows.map((u) => String(u.id)));
      normalized = [...new Set(alumnosInscritos.map(String).filter((uid) => validIds.has(uid)))];
    }

    await db.query('DELETE FROM inscripciones WHERE curso_id = $1', [id]);
    for (const userId of normalized) {
      await db.query(
        'INSERT INTO inscripciones (usuario_id, curso_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [userId, id]
      );
    }

    const modulos = await getModulosByCurso(id);
    const alumnos = await getAlumnosByCurso(id);
    const cursoActualizado = (await db.query('SELECT * FROM cursos WHERE id = $1', [id])).rows[0];

    return res.status(200).json({ success: true, curso: buildCourseResponse(cursoActualizado, modulos, alumnos) });
  } catch (error) {
    console.error('Error asignando alumnos:', error);
    return res.status(500).json({ mensaje: 'No se pudo asignar usuarios al curso' });
  }
};

const completarModuloManual = async (req, res) => {
  try {
    const { cursoId, moduloId } = req.params;
    const userId = req.user.id;

    // Verificar que el módulo exista y no sea quiz (o que sea manual)
    const moduloResult = await db.query('SELECT tipo FROM modulos WHERE id = $1 AND curso_id = $2', [moduloId, cursoId]);
    if (moduloResult.rows.length === 0) {
      return res.status(404).json({ error: 'Módulo no encontrado' });
    }

    const { tipo } = moduloResult.rows[0];
    if (tipo === 'quiz') {
      return res.status(400).json({ error: 'Los módulos de tipo quiz se completan automáticamente al aprobar' });
    }

    // Marcar como completado
    await db.query(
      `INSERT INTO progreso_modulos (usuario_id, modulo_id, completado, completado_en)
       VALUES ($1, $2, true, NOW())
       ON CONFLICT (usuario_id, modulo_id) 
       DO UPDATE SET completado = true, completado_en = NOW()`,
      [userId, moduloId]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('Error al completar módulo manual:', err);
    res.status(500).json({ error: 'Error interno' });
  }
};

const solicitarPractica = async (req, res) => {
  try {
    const { moduloId } = req.params;
    const userId = req.user.id;

    // Insertar solicitud en estado pendiente
    await db.query(
      `INSERT INTO practica_presencial_evaluaciones (usuario_id, modulo_id, estado)
       VALUES ($1, $2, 'pendiente')
       ON CONFLICT (usuario_id, modulo_id) DO NOTHING`,
      [userId, moduloId]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('Error al solicitar practica:', err);
    res.status(500).json({ error: 'Error interno' });
  }
};

const inscripcionMasiva = async (req, res) => {
  try {
    const { id: cursoId } = req.params;
    
    // Verificar propiedad
    const cursoResult = await db.query('SELECT * FROM cursos WHERE id = $1', [cursoId]);
    if (cursoResult.rows.length === 0) return res.status(404).json({ error: 'Curso no encontrado' });

    const roles      = normalizeRoles(req.user?.rol);
    const isAdmin    = roles.includes('admin');
    const isProfesor = roles.includes('profesor');

    if (!isAdmin) {
      if (!isProfesor || String(cursoResult.rows[0].instructor_id) !== String(req.user?.id)) {
        return res.status(403).json({ error: 'No autorizado para este curso' });
      }
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No se subió ningún archivo' });
    }

    // FIX: multer usa memoryStorage (buffer), no file.path
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    let inscritos = 0;
    let yaInscritos = 0;
    const noEncontrados = [];
    const invalidos = [];

    for (const row of data) {
      const email = (row['Email'] || row['email'] || row['Correo'] || '').toString().trim().toLowerCase();
      const rut   = (row['RUT']   || row['rut']   || '').toString().trim();

      if (!email && !rut) continue;

      // Validar formatos antes de consultar la BD
      if (email && !validarEmail(email)) {
        invalidos.push(`Email inválido: "${email}"`);
        continue;
      }
      if (rut && !validarRutChileno(rut)) {
        invalidos.push(`RUT inválido: "${rut}"`);
        continue;
      }

      // Buscar usuario por email o por RUT (columnas independientes)
      const conditions = [];
      const params = [];
      if (email) { conditions.push(`email = $${params.length + 1}`); params.push(email); }
      if (rut)   { conditions.push(`rut = $${params.length + 1}`);   params.push(rut);   }

      const userRes = await db.query(
        `SELECT id FROM usuarios WHERE ${conditions.join(' OR ')}`,
        params
      );

      if (userRes.rows.length === 0) {
        noEncontrados.push(email || rut);
        continue;
      }

      const userId = userRes.rows[0].id;

      // Verificar si ya está inscrito
      const yaInscrito = await db.query(
        'SELECT 1 FROM inscripciones WHERE usuario_id = $1 AND curso_id = $2',
        [userId, cursoId]
      );
      if (yaInscrito.rows.length > 0) {
        yaInscritos++;
        continue;
      }

      // Inscribir
      const insRes = await db.query(
        'INSERT INTO inscripciones (usuario_id, curso_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, cursoId]
      );
      if (insRes.rowCount > 0) inscritos++;
    }

    const alumnos = await getAlumnosByCurso(cursoId);

    return res.json({
      success: true,
      inscritos,
      yaInscritos,
      noEncontrados,
      invalidos,
      alumnosActualizados: alumnos
    });
  } catch (error) {
    console.error('Error en inscripción masiva:', error);
    res.status(500).json({ success: false, error: 'Error procesando la inscripción masiva' });
  }
};

module.exports = {
  listarCursos,
  obtenerCursoPorId,
  crearCurso,
  actualizarCurso,
  eliminarCurso,
  asignarAlumnos,
  completarModuloManual,
  solicitarPractica,
  inscripcionMasiva
};
