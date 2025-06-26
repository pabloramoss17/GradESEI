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

// GET /api/graduaciones
router.get('/', (req, res) => {
  const query = `
    SELECT g.id, g.nombre, g.fecha, g.registro_bloqueado, g.segundo_plazo_activado,
           t.id AS titulacion_id, t.nombre AS titulacion_nombre, t.siglas AS titulacion_siglas
    FROM graduaciones g
    LEFT JOIN titulaciones t ON t.graduacion_id = g.id
    ORDER BY g.fecha DESC, g.id DESC
  `;
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error al obtener graduaciones:', err.message);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
    // Agrupar por graduación
    const actos = [];
    const actosMap = {};
    results.forEach(row => {
      if (!actosMap[row.id]) {
        actosMap[row.id] = {
          id: row.id,
          nombre: row.nombre,
          fecha: row.fecha,
          registro_bloqueado: !!row.registro_bloqueado,
          segundo_plazo_activado: !!row.segundo_plazo_activado,
          titulaciones: []
        };
        actos.push(actosMap[row.id]);
      }
      if (row.titulacion_id) {
        actosMap[row.id].titulaciones.push({
          id: row.titulacion_id,
          nombre: row.titulacion_nombre,
          siglas: row.titulacion_siglas
        });
      }
    });
    res.json(actos);
  });
});

// POST /api/graduaciones
router.post('/', (req, res) => {
  const { nombre, fecha, registro_bloqueado, segundo_plazo_activado, titulaciones } = req.body;
  if (!nombre || !fecha || !Array.isArray(titulaciones) || titulaciones.length === 0) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }
  db.query(
    'INSERT INTO graduaciones (nombre, fecha, registro_bloqueado, segundo_plazo_activado) VALUES (?, ?, ?, ?)',
    [nombre, fecha, !!registro_bloqueado, !!segundo_plazo_activado],
    (err, result) => {
      if (err) {
        console.error('Error al crear graduación:', err.message);
        return res.status(500).json({ error: 'Error interno del servidor' });
      }
      const graduacionId = result.insertId;
      // Actualizar titulaciones asociadas
      db.query(
        'UPDATE titulaciones SET graduacion_id = NULL WHERE graduacion_id = ?',
        [graduacionId],
        () => {
          if (titulaciones.length > 0) {
            db.query(
              'UPDATE titulaciones SET graduacion_id = ? WHERE id IN (?)',
              [graduacionId, titulaciones],
              () => res.json({ mensaje: 'Acto creado correctamente' })
            );
          } else {
            res.json({ mensaje: 'Acto creado correctamente' });
          }
        }
      );
    }
  );
});

// PUT /api/graduaciones/:id
router.put('/:id', (req, res) => {
  const id = req.params.id;
  const { nombre, fecha, registro_bloqueado, segundo_plazo_activado, titulaciones } = req.body;
  if (!nombre || !fecha || !Array.isArray(titulaciones) || titulaciones.length === 0) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }
  db.query(
    'UPDATE graduaciones SET nombre = ?, fecha = ?, registro_bloqueado = ?, segundo_plazo_activado = ? WHERE id = ?',
    [nombre, fecha, !!registro_bloqueado, !!segundo_plazo_activado, id],
    (err) => {
      if (err) {
        console.error('Error al actualizar graduación:', err.message);
        return res.status(500).json({ error: 'Error interno del servidor' });
      }
      // Desasociar titulaciones previas
      db.query('UPDATE titulaciones SET graduacion_id = NULL WHERE graduacion_id = ?', [id], (err) => {
        if (err) {
          console.error('Error al desasociar titulaciones:', err.message);
          return res.status(500).json({ error: 'Error interno del servidor' });
        }
        // Asociar nuevas titulaciones
        db.query('UPDATE titulaciones SET graduacion_id = ? WHERE id IN (?)', [id, titulaciones], (err) => {
          if (err) {
            console.error('Error al asociar titulaciones:', err.message);
            return res.status(500).json({ error: 'Error interno del servidor' });
          }
          res.json({ mensaje: 'Acto actualizado correctamente' });
        });
      });
    }
  );
});

// DELETE /api/graduaciones/:id
router.delete('/:id', (req, res) => {
  const id = req.params.id;
  // Desasociar titulaciones primero
  db.query('UPDATE titulaciones SET graduacion_id = NULL WHERE graduacion_id = ?', [id], (err) => {
    if (err) {
      console.error('Error al desasociar titulaciones:', err.message);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
    // Eliminar graduación
    db.query('DELETE FROM graduaciones WHERE id = ?', [id], (err) => {
      if (err) {
        console.error('Error al eliminar graduación:', err.message);
        return res.status(500).json({ error: 'Error interno del servidor' });
      }
      res.json({ mensaje: 'Acto eliminado correctamente' });
    });
  });
});

// GET /api/graduaciones/:id/alumnos
router.get('/:id/alumnos', (req, res) => {
  const id = req.params.id;
  const query = `
    SELECT a.DNI, a.nombre, a.apellidos, a.correo, t.siglas AS titulacion_siglas
    FROM alumnos a
    JOIN titulaciones t ON a.titulacion_id = t.id
    WHERE t.graduacion_id = ?
    ORDER BY t.siglas, a.apellidos, a.nombre
  `;
  db.query(query, [id], (err, results) => {
    if (err) {
      console.error('Error al obtener alumnos:', err.message);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
    res.json(results);
  });
});

module.exports = router;
