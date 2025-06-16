const express = require('express');
const router = express.Router();
const db = require('../db');

// Obtener salones por graduacion_id
router.get('/', (req, res) => {
  const graduacion_id = req.query.graduacion_id;
  if (!graduacion_id) {
    return res.status(400).json({ error: 'graduacion_id es requerido' });
  }
  const query = 'SELECT id, nombre, aforo_total FROM salones WHERE graduacion_id = ?';
  db.query(query, [graduacion_id], (err, results) => {
    if (err) {
      console.error('Error al obtener salones:', err.message);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
    res.json(results);
  });
});


module.exports = router;
