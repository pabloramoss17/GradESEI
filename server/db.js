const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',       // Cambia si usas otro usuario
    password: '2571',       // Añade tu contraseña si tienes
    database: 'graduacion'
});

db.connect((err) => {
    if (err) {
        console.error('❌ Error al conectar a MySQL en db.js:', err.message);
    } else {
        console.log('✅ Conexión a MySQL establecida en db.js');
    }
});

module.exports = db;