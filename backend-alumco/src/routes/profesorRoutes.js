const express = require('express');
const router = express.Router();
const profesorController = require('../controllers/profesorController');
const { requireAuth, requireProfesor } = require('../middlewares/authMiddleware');

// GET /api/profesor/mis-cursos
router.get('/mis-cursos', requireAuth, requireProfesor, profesorController.getMisCursos);

// GET /api/profesor/mis-cursos/:id/estudiantes
router.get('/mis-cursos/:id/estudiantes', requireAuth, requireProfesor, profesorController.getEstudiantesPorCurso);

// GET /api/profesor/mis-cursos/:id/practicas-pendientes
router.get('/mis-cursos/:id/practicas-pendientes', requireAuth, requireProfesor, profesorController.getPracticasPendientes);

// PUT /api/profesor/practicas/:id/autorizar
router.put('/practicas/:id/autorizar', requireAuth, requireProfesor, profesorController.autorizarPractica);

// PUT /api/profesor/mis-cursos/:id
router.put('/mis-cursos/:id', requireAuth, requireProfesor, profesorController.actualizarCurso);

module.exports = router;
