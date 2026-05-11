const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middlewares/authMiddleware');

router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM sedes ORDER BY nombre ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo sedes' });
  }
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { nombre, region } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
    const result = await db.query('INSERT INTO sedes (nombre, region) VALUES ($1, $2) RETURNING *', [nombre, region]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error creando sede' });
  }
});

router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { nombre, region } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
    const result = await db.query('UPDATE sedes SET nombre = $1, region = $2 WHERE id = $3 RETURNING *', [nombre, region, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error editando sede' });
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM sedes WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error eliminando sede' });
  }
});

module.exports = router;
