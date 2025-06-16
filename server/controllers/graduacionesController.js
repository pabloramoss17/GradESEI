const express = require('express');
const router = express.Router();
const db = require('../db');

// Obtener graduación por ID
router.get('/:id', (req, res) => {
  const id = req.params.id;
  const query = 'SELECT id, nombre, fecha FROM graduaciones WHERE id = ?';
  db.query(query, [id], (err, results) => {
    if (err) {
      console.error('Error al obtener graduación:', err.message);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Graduación no encontrada' });
    }
    res.json({ graduacion: results[0] });
  });
});

module.exports = router;
