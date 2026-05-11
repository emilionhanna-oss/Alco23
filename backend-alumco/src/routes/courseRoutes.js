const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { requireAuth, requireAdmin, requireProfesor } = require('../middlewares/authMiddleware');
const certificateController = require('../controllers/certificateController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de Multer para materiales
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});
const upload = multer({ storage });

router.get('/', requireAuth, courseController.listarCursos);
router.get('/:id', requireAuth, courseController.obtenerCursoPorId);

// Certificados
router.get('/verificar-certificado/:hash', certificateController.verificarCertificado);
router.get('/:id/certificado', requireAuth, certificateController.descargarCertificado);
router.post('/certificados/descarga-masiva', requireAuth, requireAdmin, certificateController.descargaMasiva);

// Progreso Manual
router.post('/:cursoId/modulos/:moduloId/completar', requireAuth, courseController.completarModuloManual);
router.post('/modulos/:moduloId/solicitar-practica', requireAuth, courseController.solicitarPractica);

// Admin/Profesor: crear curso
router.post('/', requireAuth, requireProfesor, courseController.crearCurso);

// Admin/Profesor: editar curso (título, descripción, imagen, módulos)
router.put('/:id', requireAuth, requireProfesor, courseController.actualizarCurso);

// Admin: eliminar curso
router.delete('/:id', requireAuth, requireAdmin, courseController.eliminarCurso);

// Admin/Profesor: asignar alumnos a un curso
router.put('/:id/alumnos', requireAuth, requireProfesor, courseController.asignarAlumnos);

// Admin/Profesor: inscripción masiva desde Excel
router.post('/:id/inscripcion-masiva', requireAuth, requireProfesor, upload.single('file'), courseController.inscripcionMasiva);

// Admin/Profesor: subir material de módulo
router.post('/upload-material', requireAuth, requireProfesor, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No se subió ningún archivo' });
  }
  const fileUrl = `/static/uploads/${req.file.filename}`;
  res.json({ success: true, url: fileUrl });
});

module.exports = router;
