const express = require('express');
const router = express.Router();
const multer = require('multer');
const excelController = require('../controllers/excelController');
const { requireAuth, requireAdmin } = require('../middlewares/authMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

// Exportar todos los usuarios
router.get('/usuarios/exportar', requireAuth, requireAdmin, excelController.exportarUsuarios);

// Importar usuarios desde excel
router.post('/usuarios/importar', requireAuth, requireAdmin, upload.single('file'), excelController.importarUsuarios);

// Exportar métricas del dashboard
router.get('/dashboard/exportar', requireAuth, requireAdmin, excelController.exportarReporteDashboard);

module.exports = router;
