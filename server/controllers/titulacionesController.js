const express = require('express');
const router = express.Router();
const db = require('../db');

// Obtener todas las titulaciones
router.get('/', (req, res) => {
  db.query('SELECT id, nombre, siglas FROM titulaciones', (err, results) => {
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
  const query = 'SELECT id, nombre, siglas, graduacion_id FROM titulaciones WHERE id = ?';
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

// Modificar titulación por ID
router.put('/:id', (req, res) => {
  const id = req.params.id;
  const { nombre, siglas } = req.body;
  if (!nombre || !siglas) {
    return res.status(400).json({ error: 'El nombre y las siglas son obligatorios' });
  }
  db.query('UPDATE titulaciones SET nombre = ?, siglas = ? WHERE id = ?', [nombre, siglas, id], (err, result) => {
    if (err) {
      console.error('Error al modificar titulación:', err.message);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
    res.json({ mensaje: 'Titulación modificada correctamente' });
  });
});

// Eliminar titulación por ID
router.delete('/:id', (req, res) => {
  const id = req.params.id;
  db.query('DELETE FROM titulaciones WHERE id = ?', [id], (err, result) => {
    if (err) {
      console.error('Error al eliminar titulación:', err.message);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
    res.json({ mensaje: 'Titulación eliminada correctamente' });
  });
});

// Crear nueva titulación
router.post('/', (req, res) => {
  const { nombre, siglas } = req.body;
  if (!nombre || !siglas) {
    return res.status(400).json({ error: 'Nombre y siglas son obligatorios' });
  }
  db.query('INSERT INTO titulaciones (nombre, siglas) VALUES (?, ?)', [nombre, siglas], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'Ya existe una titulación con ese nombre o siglas' });
      }
      console.error('Error al crear titulación:', err.message);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
    res.json({ mensaje: 'Titulación creada correctamente', id: result.insertId });
  });
});

module.exports = router;
