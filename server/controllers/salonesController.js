const express = require('express');
const router = express.Router();
const db = require('../db');
const { Parser } = require('json2csv'); // npm install json2csv

// Obtener todos los salones con zonas y graduación asociada
router.get('/all', (req, res) => {
  const querySalones = `
    SELECT s.id, s.nombre, s.aforo_total, s.aforo_ocupado, s.aforo_libre, s.fecha_acto, s.graduacion_id, 
           g.nombre AS graduacion_nombre, g.registro_bloqueado, g.segundo_plazo_activado
    FROM salones s
    LEFT JOIN graduaciones g ON s.graduacion_id = g.id
    ORDER BY s.fecha_acto DESC, s.id DESC
  `;
  db.query(querySalones, (err, salones) => {
    if (err) return res.status(500).json({ error: 'Error interno' });
    if (!salones.length) return res.json([]);
    // Obtener zonas de todos los salones
    const salonIds = salones.map(s => s.id);
    db.query('SELECT * FROM zonas WHERE salon_id IN (?)', [salonIds], (err, zonas) => {
      if (err) return res.status(500).json({ error: 'Error interno' });
      salones.forEach(salon => {
        salon.zonas = zonas.filter(z => z.salon_id === salon.id);
      });
      res.json(salones);
    });
  });
});

// Crear salón
router.post('/', (req, res) => {
  const { nombre, aforo_total, graduacion_id } = req.body;
  if (!nombre || !aforo_total || !graduacion_id) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }
  // Obtener la fecha de la graduación
  db.query('SELECT fecha FROM graduaciones WHERE id = ?', [graduacion_id], (err, rows) => {
    if (err || !rows.length) return res.status(400).json({ error: 'Graduación no encontrada' });
    const fecha_acto = rows[0].fecha;
    db.query(
      'INSERT INTO salones (nombre, aforo_total, aforo_ocupado, aforo_libre, fecha_acto, graduacion_id) VALUES (?, ?, 0, ?, ?, ?)',
      [nombre, aforo_total, aforo_total, fecha_acto, graduacion_id],
      (err, result) => {
        if (err) return res.status(500).json({ error: 'Error interno' });
        res.json({ mensaje: 'Salón creado correctamente', id: result.insertId });
      }
    );
  });
});

// Editar salón
router.put('/:id', (req, res) => {
  const id = req.params.id;
  const { nombre, aforo_total, graduacion_id } = req.body;
  if (!nombre || !aforo_total || !graduacion_id) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }
  // Obtener la fecha de la graduación
  db.query('SELECT fecha FROM graduaciones WHERE id = ?', [graduacion_id], (err, rows) => {
    if (err || !rows.length) return res.status(400).json({ error: 'Graduación no encontrada' });
    const fecha_acto = rows[0].fecha;
    db.query(
      'UPDATE salones SET nombre = ?, aforo_total = ?, fecha_acto = ?, graduacion_id = ? WHERE id = ?',
      [nombre, aforo_total, fecha_acto, graduacion_id, id],
      (err) => {
        if (err) return res.status(500).json({ error: 'Error interno' });
        // Recalcula aforo_libre y aforo_ocupado
        actualizarAforoSalon(id, () => {
          res.json({ mensaje: 'Salón actualizado correctamente' });
        });
      }
    );
  });
});

// Eliminar salón
router.delete('/:id', (req, res) => {
  const id = req.params.id;
  // Elimina primero las zonas asociadas
  db.query('DELETE FROM zonas WHERE salon_id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: 'Error interno' });
    db.query('DELETE FROM salones WHERE id = ?', [id], (err) => {
      if (err) return res.status(500).json({ error: 'Error interno' });
      res.json({ mensaje: 'Salón eliminado correctamente' });
    });
  });
});

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

// Crear zona "Invitaciones primera ronda"
router.post('/:salonId/repartir-invitaciones-primera', async (req, res) => {
  const salonId = req.params.salonId;
  try {
    // 1. Comprobar condiciones
    const [salon] = await db.promise().query(
      `SELECT s.*, g.registro_bloqueado, g.segundo_plazo_activado, g.id as graduacion_id
       FROM salones s
       JOIN graduaciones g ON s.graduacion_id = g.id
       WHERE s.id = ?`, [salonId]
    ).then(r => r[0]);
    if (!salon) return res.status(404).json({ error: 'Salón no encontrado' });
    if (!salon.registro_bloqueado) return res.status(400).json({ error: 'El registro no está bloqueado' });
    if (!salon.segundo_plazo_activado) return res.status(400).json({ error: 'El segundo plazo no está activado' });

    // 2. Comprobar zona alumnos registrados
    const [zonaAlumnos] = await db.promise().query(
      `SELECT * FROM zonas WHERE salon_id = ? AND LOWER(nombre) = 'alumnos registrados'`, [salonId]
    ).then(r => r[0]);
    if (!zonaAlumnos) return res.status(400).json({ error: 'Debe existir la zona "Alumnos registrados"' });

    // 3. Comprobar si ya existe la zona de primera ronda
    const [zonaPrimera] = await db.promise().query(
      `SELECT * FROM zonas WHERE salon_id = ? AND LOWER(nombre) = 'invitaciones primera ronda'`, [salonId]
    ).then(r => r[0]);
    if (zonaPrimera) return res.status(400).json({ error: 'La primera tanda ya ha sido repartida' });

    // 4. Obtener alumnos de la graduación
    const alumnos = await db.promise().query(
      `SELECT a.DNI, a.acompanantes_solicitados, a.acompanantes_concedidos
       FROM alumnos a
       JOIN titulaciones t ON a.titulacion_id = t.id
       WHERE t.graduacion_id = ?`, [salon.graduacion_id]
    ).then(r => r[0]);
    if (!alumnos.length) return res.status(400).json({ error: 'No hay alumnos registrados' });

    // 5. Calcular reparto
    let aforo_libre = salon.aforo_libre;
    let nAlumnos = alumnos.length;
    let invitacionesPorAlumno = Math.floor(aforo_libre / nAlumnos);
    if (invitacionesPorAlumno < 1) return res.status(400).json({ error: 'No hay aforo suficiente para repartir invitaciones' });

    // 6. Asignar invitaciones, respetando solicitudes
    let totalAsignadas = 0;
    for (const alumno of alumnos) {
      let concedidas = Math.min(invitacionesPorAlumno, alumno.acompanantes_solicitados);
      await db.promise().query(
        `UPDATE alumnos SET acompanantes_concedidos = ? WHERE DNI = ?`,
        [concedidas, alumno.DNI]
      );
      totalAsignadas += concedidas;
    }

    // 7. Crear zona "Invitaciones primera ronda"
    await db.promise().query(
      `INSERT INTO zonas (nombre, butacas_reservadas, salon_id) VALUES (?, ?, ?)`,
      ['Invitaciones primera ronda', totalAsignadas, salonId]
    );

    // 8. Actualizar aforo del salón
    await actualizarAforoSalonPromise(salonId);

    res.json({ mensaje: 'Primera tanda repartida correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Crear zona "Invitaciones segunda ronda"
router.post('/:salonId/repartir-invitaciones-segunda', async (req, res) => {
  const salonId = req.params.salonId;
  try {
    // 1. Comprobar condiciones
    const [salon] = await db.promise().query(
      `SELECT s.*, g.registro_bloqueado, g.segundo_plazo_activado, g.id as graduacion_id
       FROM salones s
       JOIN graduaciones g ON s.graduacion_id = g.id
       WHERE s.id = ?`, [salonId]
    ).then(r => r[0]);
    if (!salon) return res.status(404).json({ error: 'Salón no encontrado' });
    if (!salon.registro_bloqueado) return res.status(400).json({ error: 'El registro no está bloqueado' });
    if (!salon.segundo_plazo_activado) return res.status(400).json({ error: 'El segundo plazo no está activado' });

    // 2. Comprobar zonas
    const [zonaAlumnos] = await db.promise().query(
      `SELECT * FROM zonas WHERE salon_id = ? AND LOWER(nombre) = 'alumnos registrados'`, [salonId]
    ).then(r => r[0]);
    if (!zonaAlumnos) return res.status(400).json({ error: 'Debe existir la zona "Alumnos registrados"' });

    const [zonaPrimera] = await db.promise().query(
      `SELECT * FROM zonas WHERE salon_id = ? AND LOWER(nombre) = 'invitaciones primera ronda'`, [salonId]
    ).then(r => r[0]);
    if (!zonaPrimera) return res.status(400).json({ error: 'Primero reparte la primera tanda' });

    const [zonaSegunda] = await db.promise().query(
      `SELECT * FROM zonas WHERE salon_id = ? AND LOWER(nombre) = 'invitaciones segunda ronda'`, [salonId]
    ).then(r => r[0]);
    if (zonaSegunda) return res.status(400).json({ error: 'La segunda tanda ya ha sido repartida' });

    // 3. Obtener alumnos que aún pueden recibir más acompañantes
    const alumnos = await db.promise().query(
      `SELECT a.DNI, a.nombre, a.apellidos, a.acompanantes_solicitados, a.acompanantes_concedidos, a.acompanantes_concedidos_segunda
       FROM alumnos a
       JOIN titulaciones t ON a.titulacion_id = t.id
       WHERE t.graduacion_id = ?`, [salon.graduacion_id]
    ).then(r => r[0]);

    // 4. Calcular acompañantes pendientes por alumno
    const pendientes = alumnos.filter(a =>
      a.acompanantes_solicitados > (a.acompanantes_concedidos + a.acompanantes_concedidos_segunda)
    );
    let aforo_libre = salon.aforo_libre;
    let nPendientes = pendientes.length;

    let asignaciones = [];
    let csvs = [];

    if (aforo_libre >= nPendientes && nPendientes > 0) {
      // Reparto equitativo: 1 a cada uno
      for (const alumno of pendientes) {
        await db.promise().query(
          `UPDATE alumnos SET acompanantes_concedidos_segunda = acompanantes_concedidos_segunda + 1 WHERE DNI = ?`,
          [alumno.DNI]
        );
        asignaciones.push({ ...alumno, concedidos_segunda: 1 });
      }
      // Crear zona
      await db.promise().query(
        `INSERT INTO zonas (nombre, butacas_reservadas, salon_id) VALUES (?, ?, ?)`,
        ['Invitaciones segunda ronda', nPendientes, salonId]
      );
    } else if (nPendientes > 0 && aforo_libre > 0) {
      // Sorteo: repartir aforo_libre invitaciones entre los pendientes
      let alumnosSorteo = [...pendientes];
      let premiados = [];
      for (let sorteo = 1; sorteo <= 3; sorteo++) {
        alumnosSorteo = alumnosSorteo
          .map(a => ({ ...a, sort: Math.random() }))
          .sort((a, b) => a.sort - b.sort)
          .slice(0, aforo_libre);
        // CSV para este sorteo
        const parser = new Parser({ fields: ['DNI', 'nombre', 'apellidos'] });
        const csv = parser.parse(alumnosSorteo);
        csvs.push({ sorteo, csv });
        if (sorteo === 3) premiados = alumnosSorteo;
      }
      // Asignar SOLO a los del tercer sorteo si cumplen la condición
      let asignados = 0;
      for (const alumno of premiados) {
        // Chequea que no supere lo solicitado
        const a = alumnos.find(x => x.DNI === alumno.DNI);
        if (a && (a.acompanantes_solicitados >= (a.acompanantes_concedidos + a.acompanantes_concedidos_segunda + 1))) {
          await db.promise().query(
            `UPDATE alumnos SET acompanantes_concedidos_segunda = acompanantes_concedidos_segunda + 1 WHERE DNI = ?`,
            [alumno.DNI]
          );
          asignados++;
        }
      }
      await db.promise().query(
        `INSERT INTO zonas (nombre, butacas_reservadas, salon_id) VALUES (?, ?, ?)`,
        ['Invitaciones segunda ronda', asignados, salonId]
      );
    } else {
      return res.status(400).json({ error: 'No hay aforo suficiente para repartir la segunda tanda' });
    }

    // Actualizar aforo
    await actualizarAforoSalonPromise(salonId);

    // Unir los CSVs en uno solo
    let csvFinal = '';
    csvs.forEach(({ sorteo, csv }) => {
      csvFinal += `SORTEO ${sorteo}\n${csv}\n\n`;
    });

    res.setHeader('Content-Disposition', 'attachment; filename="sorteo_invitaciones.csv"');
    res.setHeader('Content-Type', 'text/csv');
    res.send(csvFinal);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
});

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

// Helper para promesas
function actualizarAforoSalonPromise(salon_id) {
  return new Promise((resolve, reject) => {
    db.query('SELECT aforo_total FROM salones WHERE id = ?', [salon_id], (err, salones) => {
      if (err || !salones.length) return reject(err);
      const aforo_total = salones[0].aforo_total;
      db.query('SELECT IFNULL(SUM(butacas_reservadas),0) AS ocupadas FROM zonas WHERE salon_id = ?', [salon_id], (err, zonas) => {
        if (err) return reject(err);
        const aforo_ocupado = zonas[0].ocupadas;
        const aforo_libre = aforo_total - aforo_ocupado;
        db.query('UPDATE salones SET aforo_ocupado = ?, aforo_libre = ? WHERE id = ?', [aforo_ocupado, aforo_libre, salon_id], (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    });
  });
}

module.exports = router;
