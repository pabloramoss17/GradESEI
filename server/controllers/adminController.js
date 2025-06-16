const express = require('express');
const router = express.Router();

// Login administrador
router.post('/login', (req, res) => {
    res.send('Login de administrador');
});

module.exports = router;
