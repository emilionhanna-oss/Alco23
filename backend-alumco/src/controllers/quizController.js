// src/controllers/quizController.js
const db = require('../db');

/**
 * Califica un quiz comparando respuestas del usuario con las correctas
 * @param {Array} preguntas - Array de preguntas con respuestas correctas
 * @param {Array} respuestas_usuario - Array de respuestas {pregunta_id, respuesta_usuario}
 * @returns {Object} {puntuacion, detalles_preguntas}
 */
function calificarQuiz(preguntas, respuestas_usuario) {
  let correctas = 0;
  const total = preguntas.length;
  const detalles = [];

  // Crear mapa de respuestas del usuario por ID de pregunta
  const respuestasMap = {};
  respuestas_usuario.forEach((r) => {
    respuestasMap[String(r.pregunta_id)] = r.respuesta_usuario;
  });

  // Calificar cada pregunta
  preguntas.forEach((pregunta, idx) => {
    const pregunta_id = String(pregunta.id || idx);
    const respuesta_usuario = respuestasMap[pregunta_id];
    let es_correcta = false;

    // Solo calificar automáticamente selección múltiple
    if (pregunta.tipo === 'seleccion_multiple') {
      // Buscar opción correcta (nota: en DB se guarda como 'correcta' y no tiene id, usamos el índice)
      const index_correcto = (pregunta.opciones || []).findIndex((o) => o.correcta === true);
      if (index_correcto !== -1 && respuesta_usuario === String(index_correcto)) {
        es_correcta = true;
        correctas++;
      }
    } else if (pregunta.tipo === 'respuesta_escrita') {
      // Para respuesta escrita, solo registrar pero no calificar automáticamente
      // El profesor puede revisar manualmente si desea
      es_correcta = null; // null = sin calificar
    }

    detalles.push({
      pregunta_id,
      pregunta: pregunta.pregunta,
      tipo: pregunta.tipo,
      respuesta_usuario: respuesta_usuario || null,
      respuesta_correcta: pregunta.tipo === 'seleccion_multiple' 
        ? String((pregunta.opciones || []).findIndex((o) => o.correcta === true))
        : pregunta.respuestaModelo,
      es_correcta,
      opciones: (pregunta.opciones || []).map((o, idx) => ({ id: String(idx), texto: o.texto, correcta: o.correcta })),
      respuestaModelo: pregunta.respuestaModelo || null,
    });
  });

  // Calcular puntuación solo considerando preguntas de selección múltiple
  const preguntasAutocalificables = preguntas.filter((p) => p.tipo === 'seleccion_multiple').length;
  const puntuacion = preguntasAutocalificables > 0
    ? Math.round((correctas / preguntasAutocalificables) * 100)
    : 0;

  return { puntuacion, detalles };
}

/**
 * Aplicar bloqueo temporal de 14 días a un usuario en un módulo
 * @param {number} usuario_id
 * @param {number} modulo_id
 * @param {number} dias - Días de bloqueo (default 14)
 */
async function aplicarBloqeoTemporal(usuario_id, modulo_id, dias = 14) {
  const fecha_desbloq = new Date();
  fecha_desbloq.setDate(fecha_desbloq.getDate() + dias);

  await db.query(
    `UPDATE intentos_quiz 
     SET estado = 'bloqueado', fecha_desbloq_temporal = $1 
     WHERE usuario_id = $2 AND modulo_id = $3 AND intento_numero = 2`,
    [fecha_desbloq, usuario_id, modulo_id]
  );

  return fecha_desbloq;
}

/**
 * Verificar si usuario está bloqueado temporalmente en un módulo
 * @param {number} usuario_id
 * @param {number} modulo_id
 * @returns {Date|null} Fecha de desbloqueo si está bloqueado, null si no
 */
async function verificarBloqueoTemporal(usuario_id, modulo_id) {
  const result = await db.query(
    `SELECT fecha_desbloq_temporal FROM intentos_quiz 
     WHERE usuario_id = $1 AND modulo_id = $2 AND estado = 'bloqueado'
     ORDER BY intento_numero DESC LIMIT 1`,
    [usuario_id, modulo_id]
  );

  if (result.rows.length === 0) return null;

  const fecha_desbloq = new Date(result.rows[0].fecha_desbloq_temporal);
  const ahora = new Date();

  // Si ya pasó la fecha, desbloquear
  if (ahora > fecha_desbloq) {
    await db.query(
      `DELETE FROM intentos_quiz 
       WHERE usuario_id = $1 AND modulo_id = $2 AND estado = 'bloqueado'`,
      [usuario_id, modulo_id]
    );
    return null;
  }

  return fecha_desbloq;
}

/**
 * GET /api/modulos/:id/quiz
 * Obtener el quiz de un módulo para que el usuario lo responda
 * No incluye respuestas correctas (solo en resultado final)
 */
const obtenerQuizModulo = async (req, res) => {
  try {
    const { id: modulo_id } = req.params;
    const usuario_id = req.user.id;

    // 1. Obtener módulo y validar que es quiz
    const moduloResult = await db.query(
      'SELECT * FROM modulos WHERE id = $1',
      [modulo_id]
    );

    if (moduloResult.rows.length === 0) {
      return res.status(404).json({ error: 'Módulo no encontrado' });
    }

    const modulo = moduloResult.rows[0];
    if (modulo.tipo !== 'quiz') {
      return res.status(400).json({ error: 'Este módulo no es un quiz' });
    }

    // 2. Verificar bloqueo temporal
    const fechaDesbloq = await verificarBloqueoTemporal(usuario_id, modulo_id);
    if (fechaDesbloq) {
      return res.status(403).json({
        error: 'Quiz bloqueado',
        bloqueado_hasta: fechaDesbloq.toISOString(),
        mensaje: `Estás bloqueado temporalmente hasta ${fechaDesbloq.toLocaleDateString('es-CL')} después de 2 intentos fallidos.`,
      });
    }

    // 3. Obtener intento actual o crear uno nuevo
    const intentoResult = await db.query(
      `SELECT * FROM intentos_quiz 
       WHERE usuario_id = $1 AND modulo_id = $2 
       ORDER BY intento_numero DESC LIMIT 1`,
      [usuario_id, modulo_id]
    );

    let intento_numero = 1;
    if (intentoResult.rows.length > 0) {
      const ultimo_intento = intentoResult.rows[0];

      // Si ya aprobó, no permitir nuevos intentos
      if (ultimo_intento.estado === 'completado') {
        return res.status(403).json({
          error: 'Ya aprobado',
          mensaje: 'Ya has aprobado este quiz. No es necesario repetirlo.',
        });
      }

      // Si el último intento fue reprobado, permitir el segundo intento
      if (ultimo_intento.estado === 'reprobado') {
        if (ultimo_intento.intento_numero < 2) {
          intento_numero = 2;
        } else {
          // Ya usó ambos intentos
          return res.status(403).json({
            error: 'Sin intentos disponibles',
            mensaje: 'Ya has usado tus 2 intentos. Estás bloqueado por 14 días.',
          });
        }
      } else if (ultimo_intento.estado === 'en_progreso') {
        // Reusar el intento en progreso
        intento_numero = ultimo_intento.intento_numero;
      }
    }

    // 4. Crear o reusar intento
    let intento_id = null;
    if (intentoResult.rows.length === 0 || intentoResult.rows[0].estado !== 'en_progreso') {
      const newIntento = await db.query(
        `INSERT INTO intentos_quiz (usuario_id, modulo_id, intento_numero, estado)
         VALUES ($1, $2, $3, 'en_progreso')
         ON CONFLICT (usuario_id, modulo_id, intento_numero) DO UPDATE
         SET estado = 'en_progreso', iniciado_en = NOW()
         RETURNING id`,
        [usuario_id, modulo_id, intento_numero]
      );
      intento_id = newIntento.rows[0].id;
    } else {
      intento_id = intentoResult.rows[0].id;
    }

    // 5. Procesar preguntas (sin respuestas correctas)
    const preguntas = Array.isArray(modulo.contenido) ? modulo.contenido : [];
    const preguntasFormato = preguntas.map((pregunta, idx) => ({
      id: pregunta.id || idx,
      tipo: pregunta.tipo,
      pregunta: pregunta.pregunta,
      opciones: pregunta.tipo === 'seleccion_multiple'
        ? (pregunta.opciones || []).map((opt, optIdx) => ({
            id: String(optIdx),
            texto: opt.texto,
            // NO incluir correcta aquí
          }))
        : undefined,
      // NO incluir respuestaModelo aquí
    }));

    return res.status(200).json({
      modulo_id: String(modulo_id),
      titulo: modulo.titulo,
      intento_id,
      intento_numero,
      preguntas: preguntasFormato,
      tiempo_limite_minutos: modulo.tiempo_limite_minutos,
      calificacion_minima: modulo.calificacion_minima || 60,
    });
  } catch (error) {
    console.error('Error en obtenerQuizModulo:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/modulos/:id/quiz/respuestas
 * Recibir y calificar respuestas del quiz
 */
const guardarRespuestasQuiz = async (req, res) => {
  try {
    const { id: modulo_id } = req.params;
    const usuario_id = req.user.id;
    const { intento_id, respuestas, tiempo_utilizado_segundos } = req.body;

    if (!intento_id || !Array.isArray(respuestas)) {
      return res.status(400).json({ error: 'intento_id y respuestas requeridos' });
    }

    // 1. Obtener el intento para validarlo
    const intentoResult = await db.query(
      'SELECT * FROM intentos_quiz WHERE id = $1 AND usuario_id = $2',
      [intento_id, usuario_id]
    );

    if (intentoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Intento no encontrado' });
    }

    const intento = intentoResult.rows[0];
    if (intento.estado !== 'en_progreso') {
      return res.status(400).json({ error: 'El intento ya ha sido completado' });
    }

    // 2. Obtener módulo con preguntas (ahora SÍ incluir respuestas correctas)
    const moduloResult = await db.query(
      'SELECT * FROM modulos WHERE id = $1',
      [modulo_id]
    );

    if (moduloResult.rows.length === 0) {
      return res.status(404).json({ error: 'Módulo no encontrado' });
    }

    const modulo = moduloResult.rows[0];
    const preguntas = Array.isArray(modulo.contenido) ? modulo.contenido : [];

    // 3. CALIFICAR
    const { puntuacion, detalles } = calificarQuiz(preguntas, respuestas);

    // 4. Determinar si aprobó
    const calificacion_minima = modulo.calificacion_minima || 60;
    const aprobado = puntuacion >= calificacion_minima;

    // 5. Actualizar intento en BD
    const estado_final = aprobado ? 'completado' : 'reprobado';
    await db.query(
      `UPDATE intentos_quiz 
       SET estado = $1, puntuacion = $2, completado_en = NOW(), 
           tiempo_utilizado_segundos = $3
       WHERE id = $4`,
      [estado_final, puntuacion, tiempo_utilizado_segundos, intento_id]
    );

    // 6. Guardar respuestas
    for (const respuesta of respuestas) {
      await db.query(
        `INSERT INTO respuestas_quiz (usuario_id, modulo_id, intento_id, respuesta, calificado)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [usuario_id, modulo_id, intento_id, JSON.stringify(respuesta), true]
      );
    }

    // 7. Si reprobó 2da vez, aplicar bloqueo
    let fecha_desbloq_temporal = null;
    if (!aprobado && intento.intento_numero === 2) {
      fecha_desbloq_temporal = await aplicarBloqeoTemporal(usuario_id, modulo_id, 14);
    }

    // 8. Marcar módulo como completado si aprobó
    if (aprobado) {
      await db.query(
        `INSERT INTO progreso_modulos (usuario_id, modulo_id, completado, completado_en)
         VALUES ($1, $2, true, NOW())
         ON CONFLICT (usuario_id, modulo_id) 
         DO UPDATE SET completado = true, completado_en = NOW()`,
        [usuario_id, modulo_id]
      );
    }

    return res.status(200).json({
      intento_numero: intento.intento_numero,
      puntuacion,
      estado: estado_final,
      aprobado,
      detalles_preguntas: detalles,
      fecha_desbloq_temporal: fecha_desbloq_temporal ? fecha_desbloq_temporal.toISOString() : null,
      mensaje: aprobado
        ? `¡Felicitaciones! Aprobaste con ${puntuacion}%.`
        : intento.intento_numero === 1
          ? `No aprobaste (${puntuacion}%). Te queda 1 intento más.`
          : `No aprobaste (${puntuacion}%). Estás bloqueado por 14 días.`,
    });
  } catch (error) {
    console.error('Error en guardarRespuestasQuiz:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/modulos/:id/quiz/intentos
 * Obtener historial de intentos del usuario en un quiz
 */
const obtenerIntentosUsuario = async (req, res) => {
  try {
    const { id: modulo_id } = req.params;
    const usuario_id = req.user.id;

    const result = await db.query(
      `SELECT intento_numero, puntuacion, estado, completado_en, fecha_desbloq_temporal
       FROM intentos_quiz
       WHERE usuario_id = $1 AND modulo_id = $2
       ORDER BY intento_numero ASC`,
      [usuario_id, modulo_id]
    );

    const intentos = result.rows.map((row) => ({
      intento_numero: row.intento_numero,
      puntuacion: row.puntuacion,
      estado: row.estado,
      completado_en: row.completado_en ? new Date(row.completado_en).toISOString() : null,
      fecha_desbloq_temporal: row.fecha_desbloq_temporal
        ? new Date(row.fecha_desbloq_temporal).toISOString()
        : null,
    }));

    return res.status(200).json({ intentos });
  } catch (error) {
    console.error('Error en obtenerIntentosUsuario:', error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  obtenerQuizModulo,
  guardarRespuestasQuiz,
  obtenerIntentosUsuario,
  calificarQuiz,
  aplicarBloqeoTemporal,
  verificarBloqueoTemporal,
};
