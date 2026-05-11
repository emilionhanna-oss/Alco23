const certificateService = require('../services/certificateService');
const archiver = require('archiver');
const db = require('../db');

const descargarCertificado = async (req, res) => {
  try {
    const curso_id = req.params.id;
    const usuario_id = req.user.id;

    const pdfBuffer = await certificateService.generateCertificate(curso_id, usuario_id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificado_alumco_${curso_id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error al generar certificado:', error);
    if (error.message === 'El usuario no ha completado este curso') {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'No se pudo generar el certificado' });
  }
};

const verificarCertificado = async (req, res) => {
  try {
    const { hash } = req.params;
    const data = await certificateService.verifyCertificate(hash);

    if (!data) {
      return res.status(404).json({ valido: false, error: 'Certificado no encontrado' });
    }

    res.json({
      valido: true,
      datos: data
    });
  } catch (error) {
    console.error('Error al verificar certificado:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

const descargaMasiva = async (req, res) => {
  try {
    const { cursoIds } = req.body;
    if (!Array.isArray(cursoIds) || cursoIds.length === 0) {
      return res.status(400).json({ error: 'Debe seleccionar al menos un curso' });
    }

    // 1. Encontrar todos los alumnos que completaron estos cursos
    const completedResult = await db.query(
      `SELECT 
          u.id as usuario_id, 
          u.nombre_completo, 
          i.curso_id,
          c.titulo as curso_titulo
       FROM inscripciones i
       JOIN usuarios u ON u.id = i.usuario_id
       JOIN cursos c ON c.id = i.curso_id
       LEFT JOIN modulos m ON m.curso_id = i.curso_id
       LEFT JOIN progreso_modulos pm ON pm.usuario_id = u.id AND pm.modulo_id = m.id
       WHERE i.curso_id = ANY($1)
       GROUP BY u.id, u.nombre_completo, i.curso_id, c.titulo
       HAVING COUNT(CASE WHEN pm.completado = true THEN 1 END) = COUNT(m.id) AND COUNT(m.id) > 0`,
      [cursoIds]
    );

    if (completedResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'No hay certificados: Ningún alumno tiene el 100% en estos cursos.' 
      });
    }

    // 2. Generar todos los certificados en memoria primero
    // Esto evita enviar un ZIP vacío si fallan las firmas
    const pdfs = [];
    let erroresFirma = 0;

    for (const row of completedResult.rows) {
      try {
        const pdfBuffer = await certificateService.generateCertificate(row.curso_id, row.usuario_id);
        const safeName = row.nombre_completo.replace(/[^a-z0-9]/gi, '_');
        const safeCourse = row.curso_titulo.replace(/[^a-z0-9]/gi, '_');
        pdfs.push({ buffer: pdfBuffer, name: `${safeName}_${safeCourse}.pdf` });
      } catch (err) {
        if (err.message.includes('firma')) {
          erroresFirma++;
        }
        console.error(`Error generando certificado para u:${row.usuario_id} c:${row.curso_id}:`, err.message);
      }
    }

    if (pdfs.length === 0) {
      return res.status(400).json({ 
        error: erroresFirma > 0 
          ? 'No se pudieron generar los certificados. Al parecer el instructor de estos cursos no tiene firma configurada.' 
          : 'No se logró generar ningún certificado válido.'
      });
    }

    // 3. Configurar Archiver y enviar el ZIP
    let archive;
    try {
      archive = new archiver.ZipArchive({ zlib: { level: 5 } });
    } catch (e) {
      console.error('Error al inicializar archiver:', e);
      return res.status(500).json({ error: 'Error de configuración del ZIP en el servidor' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="certificados_alumco_masivo.zip"');

    archive.pipe(res);

    for (const pdf of pdfs) {
      archive.append(pdf.buffer, { name: pdf.name });
    }

    archive.finalize();


  } catch (error) {
    console.error('Error en descarga masiva:', error);
    res.status(500).json({ error: 'Error interno del servidor al procesar la descarga masiva' });
  }
};

module.exports = {
  descargarCertificado,
  verificarCertificado,
  descargaMasiva
};
