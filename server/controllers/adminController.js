const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

router.post('/login', (req, res) => {
  const { login, contrasena } = req.body;
  if (!login || !contrasena) return res.status(400).json({ error: 'Faltan datos' });

  db.query('SELECT * FROM administradores WHERE login = ?', [login], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error interno' });
    if (results.length === 0) return res.status(401).json({ error: 'Login o contraseña incorrectos' });

    const admin = results[0];
    bcrypt.compare(contrasena, admin.password, (err, isMatch) => {
      if (err || !isMatch) return res.status(401).json({ error: 'Login o contraseña incorrectos' });

      const token = jwt.sign(
        { adminId: admin.id, login: admin.login },
        '_clave_secreta',
        { expiresIn: '2h' }
      );
      res.json({ token });
    });
  });
});

// Solicitar recuperación de contraseña
router.post('/recuperar', (req, res) => {
  const { correo } = req.body;
  if (!correo) return res.status(400).json({ error: 'Correo requerido' });

  db.query('SELECT * FROM administradores WHERE correo = ?', [correo], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error interno' });
    if (results.length === 0) return res.status(404).json({ error: 'Correo no encontrado' });

    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 1000 * 60 * 30; // 30 minutos

    db.query('UPDATE administradores SET reset_token = ?, reset_expires = ? WHERE correo = ?', [token, expires, correo], (err) => {
      if (err) return res.status(500).json({ error: 'Error interno' });

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'pabloramos1703@gmail.com',
          pass: 'knky qoyp akuj ttro'
        }
      });

      const resetUrl = `http://localhost:3000/admin/reset.html?token=${token}`;
      const mailOptions = {
        from: 'GradESEI <no-reply@gradesei.com>',
        to: correo,
        subject: 'Recuperación de contraseña GradESEI (Administrador)',
        text: `Haz clic en el siguiente enlace para restablecer tu contraseña: ${resetUrl}`
      };

      transporter.sendMail(mailOptions, (err) => {
        if (err) return res.status(500).json({ error: 'Error al enviar el correo' });
        res.json({ message: 'Correo de recuperación enviado' });
      });
    });
  });
});

module.exports = router;
