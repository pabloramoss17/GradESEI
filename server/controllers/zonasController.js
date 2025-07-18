const express = require('express');
const router = express.Router();
const db = require('../db');

// Crear zona
router.post('/', (req, res) => {
  let { nombre, butacas_reservadas, salon_id } = req.body;
  butacas_reservadas = Number(butacas_reservadas);
  salon_id = Number(salon_id);
  if (!nombre || !butacas_reservadas || !salon_id || butacas_reservadas < 1) {
    return res.status(400).json({ error: 'Faltan datos obligatorios o butacas inválidas' });
  }
  db.query(
    'INSERT INTO zonas (nombre, butacas_reservadas, salon_id) VALUES (?, ?, ?)',
    [nombre, butacas_reservadas, salon_id],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Error interno' });
      actualizarAforoSalon(salon_id, () => {
        res.json({ mensaje: 'Zona creada correctamente', id: result.insertId });
      });
    }
  );
});

// Editar zona
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  let { nombre, butacas_reservadas } = req.body;
  butacas_reservadas = Number(butacas_reservadas);
  if (!nombre || !butacas_reservadas || butacas_reservadas < 1) {
    return res.status(400).json({ error: 'Faltan datos obligatorios o butacas inválidas' });
  }
  db.query('SELECT salon_id FROM zonas WHERE id = ?', [id], (err, zonas) => {
    if (err || !zonas.length) return res.status(400).json({ error: 'Zona no encontrada' });
    const salon_id = zonas[0].salon_id;
    db.query(
      'UPDATE zonas SET nombre = ?, butacas_reservadas = ? WHERE id = ?',
      [nombre, butacas_reservadas, id],
      (err) => {
        if (err) return res.status(500).json({ error: 'Error interno' });
        actualizarAforoSalon(salon_id, () => {
          res.json({ mensaje: 'Zona actualizada correctamente' });
        });
      }
    );
  });
});

// Eliminar zona
router.delete('/:id', (req, res) => {
  const id = req.params.id;
  db.query('SELECT salon_id, nombre FROM zonas WHERE id = ?', [id], (err, zonas) => {
    if (err || !zonas.length) return res.status(400).json({ error: 'Zona no encontrada' });
    const salon_id = zonas[0].salon_id;
    const nombreZona = zonas[0].nombre.trim().toLowerCase();

    // Si es una zona de invitaciones, poner a cero los acompañantes correspondientes
    if (nombreZona === 'invitaciones primera ronda' || nombreZona === 'invitaciones segunda ronda') {
      // Obtener graduacion_id
      db.query('SELECT graduacion_id FROM salones WHERE id = ?', [salon_id], (err, rows) => {
        if (err || !rows.length) return res.status(400).json({ error: 'Salón no encontrado' });
        const graduacion_id = rows[0].graduacion_id;
        let campo = nombreZona === 'invitaciones primera ronda'
          ? 'acompanantes_concedidos'
          : 'acompanantes_concedidos_segunda';
        db.query(
          `UPDATE alumnos a
           JOIN titulaciones t ON a.titulacion_id = t.id
           SET a.${campo} = 0
           WHERE t.graduacion_id = ?`,
          [graduacion_id],
          (err) => {
            if (err) return res.status(500).json({ error: 'Error interno' });
            // Eliminar la zona
            db.query('DELETE FROM zonas WHERE id = ?', [id], (err) => {
              if (err) return res.status(500).json({ error: 'Error interno' });
              actualizarAforoSalon(salon_id, () => {
                res.json({ mensaje: 'Zona eliminada correctamente y acompañantes puestos a cero' });
              });
            });
          }
        );
      });
    } else {
      // Eliminar la zona normal
      db.query('DELETE FROM zonas WHERE id = ?', [id], (err) => {
        if (err) return res.status(500).json({ error: 'Error interno' });
        actualizarAforoSalon(salon_id, () => {
          res.json({ mensaje: 'Zona eliminada correctamente' });
        });
      });
    }
  });
});

// Crear zona "alumnos" automáticamente
router.post('/salones/:salonId/crear-zona-alumnos', (req, res) => {
  const salonId = req.params.salonId;
  // Primero, comprueba si ya existe la zona "Alumnos registrados" en este salón
  db.query('SELECT id FROM zonas WHERE salon_id = ? AND LOWER(nombre) = ?', [salonId, 'alumnos registrados'], (err, zonas) => {
    if (err) return res.status(500).json({ error: 'Error interno' });
    if (zonas.length > 0) return res.status(400).json({ error: 'Ya existe la zona "Alumnos registrados" en este salón' });

    db.query('SELECT graduacion_id FROM salones WHERE id = ?', [salonId], (err, rows) => {
      if (err || !rows.length) return res.status(400).json({ error: 'Salón no encontrado' });
      const graduacion_id = rows[0].graduacion_id;
      db.query('SELECT registro_bloqueado FROM graduaciones WHERE id = ?', [graduacion_id], (err, rows2) => {
        if (err || !rows2.length) return res.status(400).json({ error: 'Graduación no encontrada' });
        if (!rows2[0].registro_bloqueado) return res.status(400).json({ error: 'El registro no está bloqueado' });
        db.query(`
          SELECT COUNT(*) AS total FROM alumnos a
          JOIN titulaciones t ON a.titulacion_id = t.id
          WHERE t.graduacion_id = ?
        `, [graduacion_id], (err, rows3) => {
          if (err) return res.status(500).json({ error: 'Error interno' });
          const total = rows3[0].total;
          db.query('INSERT INTO zonas (nombre, butacas_reservadas, salon_id) VALUES (?, ?, ?)', ['Alumnos registrados', total, salonId], (err, result) => {
            if (err) return res.status(500).json({ error: 'Error interno' });
            actualizarAforoSalon(salonId, () => {
              res.json({ mensaje: 'Zona alumnos creada', id: result.insertId });
            });
          });
        });
      });
    });
  });
});

// Función para actualizar aforo ocupado y libre
function actualizarAforoSalon(salon_id, callback) {
  db.query('SELECT aforo_total FROM salones WHERE id = ?', [salon_id], (err, salones) => {
    if (err || !salones.length) return callback && callback(err);
    const aforo_total = salones[0].aforo_total;
    db.query('SELECT IFNULL(SUM(butacas_reservadas),0) AS ocupadas FROM zonas WHERE salon_id = ?', [salon_id], (err, zonas) => {
      if (err) return callback && callback(err);
      const aforo_ocupado = zonas[0].ocupadas;
      const aforo_libre = aforo_total - aforo_ocupado;
      db.query('UPDATE salones SET aforo_ocupado = ?, aforo_libre = ? WHERE id = ?', [aforo_ocupado, aforo_libre, salon_id], callback);
    });
  });
}

module.exports = router;