const express = require('express');
const router = express.Router();
const db = require('../db');

// Obtener todas las titulaciones
router.get('/', (req, res) => {
  db.query('SELECT id, nombre FROM titulaciones', (err, results) => {
    if (err) {
      console.error('Error al obtener titulaciones:', err.message);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }

    res.json(results);
  });
});

// Obtener titulación por ID
router.get('/:id', (req, res) => {
  const id = req.params.id;
  const query = 'SELECT id, nombre, graduacion_id FROM titulaciones WHERE id = ?';
  db.query(query, [id], (err, results) => {
    if (err) {
      console.error('Error al obtener titulación:', err.message);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Titulación no encontrada' });
    }
    res.json({ titulacion: results[0] });
  });
});

module.exports = router;
