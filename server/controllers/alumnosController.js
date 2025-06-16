const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Login alumno
router.post('/login', (req, res) => {
  const { dni, contrasena } = req.body;

  if (!dni || !contrasena) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const query = 'SELECT * FROM alumnos WHERE DNI = ?';
  db.query(query, [dni], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error interno del servidor' });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    // Verificamos si la contraseña es correcta con bcrypt
    bcrypt.compare(contrasena, results[0].contrasena, (err, isMatch) => {
      if (err) {
        return res.status(500).json({ error: 'Error interno del servidor' });
      }

      if (!isMatch) {
        return res.status(401).json({ error: 'Credenciales incorrectas' });
      }

      // Crear un JWT usando el DNI del alumno
      const token = jwt.sign(
        { alumnoId: results[0].DNI }, 
        'mi_clave_secreta',
        { expiresIn: '1h' }
      );

      res.json({
        mensaje: 'Login correcto',
        token: token
      });
    });
  });
});

// Registro alumno
router.post('/registro', (req, res) => {
  const { correo, nombre, apellidos, telefono, dni, titulacion, acompanantes_solicitados, contrasena } = req.body;

  if (!correo || (!correo.endsWith('@esei.uvigo.gal') && !correo.endsWith('@alumnado.uvigo.gal'))) {
    return res.status(400).json({ error: 'Correo institucional no válido' });
  }

  const checkTitulacionQuery = 'SELECT * FROM titulaciones WHERE id = ?';
  db.query(checkTitulacionQuery, [titulacion], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error interno del servidor' });
    }

    if (results.length === 0) {
      return res.status(400).json({ error: 'La titulación no existe' });
    }

    bcrypt.hash(contrasena, 10, (err, hashedContrasena) => {
      if (err) {
        return res.status(500).json({ error: 'Error interno del servidor' });
      }

      const query = `
        INSERT INTO alumnos (correo, nombre, apellidos, telefono, DNI, titulacion_id, acompanantes_solicitados, contrasena)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(query, [correo, nombre, apellidos, telefono, dni, titulacion, acompanantes_solicitados, hashedContrasena], (err) => {
        if (err) {
          return res.status(500).json({ error: 'Error al registrar el alumno' });
        }

        // Crear el token con el DNI
        const token = jwt.sign(
          { alumnoId: dni },
          'mi_clave_secreta',
          { expiresIn: '1h' }
        );

        res.json({
          mensaje: 'Alumno registrado correctamente',
          token: token
        });
      });
    });
  });
});

// Obtener información del alumno
router.get('/info', (req, res) => {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(401).json({ error: 'No se ha proporcionado un token de autenticación' });
  }

  jwt.verify(token, 'mi_clave_secreta', (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido o expirado' });
    }

    const dni = decoded.alumnoId;

    const query = 'SELECT * FROM alumnos WHERE DNI = ?';
    db.query(query, [dni], (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error interno del servidor' });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: 'Alumno no encontrado' });
      }

      res.json({ alumno: results[0] });
    });
  });
});

// Actualizar información del alumno
router.put('/actualizar', (req, res) => {
  const token = req.headers['authorization'];

  if (!token) return res.status(401).json({ error: 'Token no proporcionado' });

  jwt.verify(token, 'mi_clave_secreta', (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }

    const dniActual = decoded.alumnoId;
    const { dni, correo, nombre, apellidos, telefono, acompanantes_solicitados, titulacion_id } = req.body;

    if (!correo || (!correo.endsWith('@esei.uvigo.gal') && !correo.endsWith('@alumnado.uvigo.gal'))) {
      return res.status(400).json({ error: 'Correo institucional no válido' });
    }

    const query = `
      UPDATE alumnos SET DNI = ?, correo = ?, nombre = ?, apellidos = ?, telefono = ?, acompanantes_solicitados = ?, titulacion_id = ?
      WHERE DNI = ?
    `;

    db.query(query, [dni, correo, nombre, apellidos, telefono, acompanantes_solicitados, titulacion_id, dniActual], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Error interno del servidor' });
      }

      let nuevoToken = null;
      if (dni !== dniActual) {
        nuevoToken = jwt.sign(
          { alumnoId: dni },
          'mi_clave_secreta',
          { expiresIn: '1h' }
        );
      }

      res.json({ mensaje: 'Actualizado correctamente', token: nuevoToken });
    });
  });
});

// Solicitar recuperación de contraseña
router.post('/recuperar', (req, res) => {
  const { correo } = req.body;
  if (!correo) return res.status(400).json({ error: 'Correo requerido' });

  // Buscar alumno por correo
  db.query('SELECT * FROM alumnos WHERE correo = ?', [correo], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error interno' });
    if (results.length === 0) return res.status(404).json({ error: 'Correo no encontrado' });

    // Generar token temporal
    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 1000 * 60 * 30; // 30 minutos

    // Guardar token y expiración en la BD (puedes crear campos: reset_token, reset_expires)
    db.query('UPDATE alumnos SET reset_token = ?, reset_expires = ? WHERE correo = ?', [token, expires, correo], (err) => {
      if (err) return res.status(500).json({ error: 'Error interno' });

      // Enviar email con enlace
      const transporter = nodemailer.createTransport({
        // Configura tu SMTP real aquí
        service: 'gmail',
        auth: {
          user: 'pabloramos1703@gmail.com',
          pass: 'knky qoyp akuj ttro'
        }
      });

      const resetUrl = `http://localhost:3000/alumno/reset.html?token=${token}`;
      const mailOptions = {
        from: 'GradESEI <no-reply@gradesei.com>',
        to: correo,
        subject: 'Recuperación de contraseña GradESEI',
        text: `Haz clic en el siguiente enlace para restablecer tu contraseña:\n${resetUrl}\n\nEste enlace caduca en 30 minutos.`
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error al enviar el correo:', error); // <--- Añade este log
          return res.status(500).json({ error: 'No se pudo enviar el correo' });
        }
        res.json({ mensaje: 'Correo de recuperación enviado' });
      });
    });
  });
});

// Restablecer contraseña
router.post('/reset', (req, res) => {
  const { token, nuevaContrasena } = req.body;
  if (!token || !nuevaContrasena) return res.status(400).json({ error: 'Faltan datos' });

  // Buscar alumno por token y comprobar expiración
  db.query('SELECT * FROM alumnos WHERE reset_token = ? AND reset_expires > ?', [token, Date.now()], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error interno' });
    if (results.length === 0) return res.status(400).json({ error: 'Enlace inválido o caducado' });

    // Actualizar contraseña y limpiar token
    const bcrypt = require('bcryptjs');
    bcrypt.hash(nuevaContrasena, 10, (err, hash) => {
      if (err) return res.status(500).json({ error: 'Error interno' });

      db.query('UPDATE alumnos SET contrasena = ?, reset_token = NULL, reset_expires = NULL WHERE reset_token = ?', [hash, token], (err) => {
        if (err) return res.status(500).json({ error: 'Error interno' });
        res.json({ mensaje: 'Contraseña restablecida correctamente' });
      });
    });
  });
});

module.exports = router;
