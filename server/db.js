const mysql = require('mysql2');

let db;

if (process.env.MYSQL_URL) {
    db = mysql.createConnection(process.env.MYSQL_URL);
    // Si se proporciona MYSQL_URL, se utiliza para la conexión
} else {
    db = mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    });
}

db.connect((err) => {
    if (err) {
        console.error('❌ Error al conectar a MySQL en db.js:', err.message);
    } else {
        console.log('✅ Conexión a MySQL establecida en db.js');
    }
});

module.exports = db;