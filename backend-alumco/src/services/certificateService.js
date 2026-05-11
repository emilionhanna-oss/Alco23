const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const crypto = require('crypto');
const db = require('../db');
const path = require('path');
const fs = require('fs');

/**
 * Genera un hash único para el certificado
 */
function generateCertificateHash(usuario_id, curso_id) {
  const data = `${usuario_id}-${curso_id}-${Date.now()}-${Math.random()}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}

/**
 * Obtiene la imagen de fondo (template del certificado)
 */
function getTemplatePath() {
  const possiblePaths = [
    path.join(__dirname, '../../public/certificate-template.png'),
    path.join(__dirname, '../../public/certificate-template.jpg')
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * Genera el documento PDF
 */
async function generateCertificate(curso_id, usuario_id) {
  // 1. Obtener datos del usuario y curso
  const userQuery = await db.query(
    `SELECT u.nombre_completo, u.rut, c.titulo as curso_titulo, c.instructor_id, i.firma_texto as instructor_firma_texto, i.firma_imagen_data_url as instructor_firma_img, pm.completado_en
     FROM usuarios u
     JOIN progreso_modulos pm ON pm.usuario_id = u.id
     JOIN modulos m ON m.id = pm.modulo_id
     JOIN cursos c ON c.id = m.curso_id
     LEFT JOIN usuarios i ON i.id = c.instructor_id
     WHERE u.id = $1 AND c.id = $2 AND pm.completado = true
     LIMIT 1`,
    [usuario_id, curso_id]
  );

  if (userQuery.rows.length === 0) {
    throw new Error('El usuario no ha completado este curso');
  }

  const data = userQuery.rows[0];

  // 2. Crear o buscar hash de certificado
  let hash;
  const existingCert = await db.query(
    'SELECT hash FROM certificados_emitidos WHERE usuario_id = $1 AND curso_id = $2',
    [usuario_id, curso_id]
  );

  if (existingCert.rows.length > 0) {
    hash = existingCert.rows[0].hash;
  } else {
    hash = generateCertificateHash(usuario_id, curso_id);
    await db.query(
      'INSERT INTO certificados_emitidos (hash, usuario_id, curso_id) VALUES ($1, $2, $3)',
      [hash, usuario_id, curso_id]
    );
  }

  // 3. Crear PDF
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        layout: 'landscape',
        size: 'A4',
        margin: 50
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });

      // Dibujar template si existe
      const templatePath = getTemplatePath();
      if (templatePath) {
        doc.image(templatePath, 0, 0, { width: 841.89, height: 595.28 });
      } else {
        // Fallback básico si no hay imagen de template
        doc.rect(20, 20, 801.89, 555.28).stroke();
        doc.rect(25, 25, 791.89, 545.28).stroke();
      }

      // Título
      doc.font('Helvetica-Bold')
         .fontSize(34)
         .fillColor('#1a2840')
         .text('CERTIFICADO DE APROBACIÓN', 0, 110, { align: 'center', width: 841.89 });

      doc.font('Helvetica')
         .fontSize(14)
         .fillColor('#4b5563')
         .text('Se otorga el presente a:', 0, 165, { align: 'center', width: 841.89 });

      // Nombre del alumno
      doc.font('Helvetica-Bold')
         .fontSize(32)
         .fillColor('#2563eb')
         .text(data.nombre_completo, 0, 195, { align: 'center', width: 841.89 });

      doc.font('Helvetica')
         .fontSize(12)
         .fillColor('#4b5563')
         .text(`RUT: ${data.rut}`, 0, 235, { align: 'center', width: 841.89 });

      // Descripción
      doc.font('Helvetica')
         .fontSize(14)
         .fillColor('#1f2937')
         .text('Por haber completado satisfactoriamente el curso:', 0, 280, { align: 'center', width: 841.89 });

      // Curso
      doc.font('Helvetica-Bold')
         .fontSize(24)
         .fillColor('#1a2840')
         .text(data.curso_titulo, 0, 310, { align: 'center', width: 841.89 });

      // Fecha
      const fechaFormat = data.completado_en ? new Date(data.completado_en).toLocaleDateString('es-CL') : new Date().toLocaleDateString('es-CL');
      doc.font('Helvetica')
         .fontSize(12)
         .fillColor('#4b5563')
         .text(`Fecha de emisión: ${fechaFormat}`, 0, 360, { align: 'center', width: 841.89 });

      // --- Sección Inferior (Firma y QR) ---
      const bottomY = 430;

      // Firma del instructor (Izquierda)
      if (data.instructor_firma_img && data.instructor_firma_img.startsWith('data:image/')) {
        try {
          const base64Data = data.instructor_firma_img.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
          const imgBuffer = Buffer.from(base64Data, 'base64');
          doc.image(imgBuffer, 150, bottomY, { width: 140, height: 60, fit: [140, 60] });
        } catch (e) {
          console.error('Error insertando firma en PDF:', e);
        }
      }
      doc.font('Helvetica-Bold')
         .fontSize(11)
         .fillColor('#1a2840')
         .text(data.instructor_firma_texto || 'Instructor Responsable', 120, bottomY + 65, { align: 'center', width: 200 });
      doc.moveTo(120, bottomY + 62).lineTo(320, bottomY + 62).strokeColor('#1a2840').lineWidth(1).stroke();

      // Generar y estampar código QR (Derecha)
      const frontendUrl = process.env.FRONTEND_URL || (process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',')[0] : 'http://localhost:5173');
      const verificationUrl = `${frontendUrl}/verificar-certificado/${hash}`;
      
      const qrDataUrl = await QRCode.toDataURL(verificationUrl, { margin: 1, color: { dark: '#1a2840' } });
      const qrBase64 = qrDataUrl.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
      const qrBuffer = Buffer.from(qrBase64, 'base64');
      
      doc.image(qrBuffer, 580, bottomY - 10, { width: 90 });
      doc.font('Helvetica')
         .fontSize(8)
         .fillColor('#6b7280')
         .text(`ID Verificación: ${hash}`, 560, bottomY + 85, { align: 'center', width: 130 });
      doc.text('Escanea para verificar autenticidad', 560, bottomY + 95, { align: 'center', width: 130 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Verifica la autenticidad de un certificado
 */
async function verifyCertificate(hash) {
  const result = await db.query(
    `SELECT ce.hash, ce.emitido_en, u.nombre_completo, u.rut, c.titulo as curso_titulo
     FROM certificados_emitidos ce
     JOIN usuarios u ON ce.usuario_id = u.id
     JOIN cursos c ON ce.curso_id = c.id
     WHERE ce.hash = $1`,
    [hash]
  );

  if (result.rows.length === 0) return null;
  return result.rows[0];
}

module.exports = {
  generateCertificate,
  verifyCertificate
};
