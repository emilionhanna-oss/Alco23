const express = require('express');
const router = express.Router();

const usersController = require('../controllers/usersController');
const { requireAuth, requireAdmin, requireProfesor } = require('../middlewares/authMiddleware');

router.get('/', requireAuth, requireProfesor, usersController.listarUsuarios);
router.put('/:id', requireAuth, requireAdmin, usersController.actualizarUsuario);

module.exports = router;
