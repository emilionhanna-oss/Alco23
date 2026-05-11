// src/routes/quizRoutes.js
const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const { requireAuth } = require('../middlewares/authMiddleware');

/**
 * GET /api/quiz/modulos/:id
 * Obtener quiz de un módulo (preguntas sin respuestas correctas)
 */
router.get('/modulos/:id', requireAuth, quizController.obtenerQuizModulo);

/**
 * POST /api/quiz/modulos/:id/respuestas
 * Enviar respuestas y obtener calificación
 */
router.post('/modulos/:id/respuestas', requireAuth, quizController.guardarRespuestasQuiz);

/**
 * GET /api/quiz/modulos/:id/intentos
 * Ver historial de intentos del usuario
 */
router.get('/modulos/:id/intentos', requireAuth, quizController.obtenerIntentosUsuario);

module.exports = router;
