const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const app = express();

// Configurar express-session antes de las rutas
app.use(session({
  secret: 'mi_clave_secreta',   // Puedes cambiar esta clave a algo más seguro
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }  // Cambiar a true cuando tengas HTTPS
}));


// Importar los controladores
const alumnosRoutes = require('./controllers/alumnosController');
const adminRoutes = require('./controllers/adminController');
const graduacionesRoutes = require('./controllers/graduacionesController');
const titulacionesRoutes = require('./controllers/titulacionesController');
const salonesRoutes = require('./controllers/salonesController');

const PORT = 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Rutas API
app.use('/api/alumnos', alumnosRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/graduaciones', graduacionesRoutes);
app.use('/api/titulaciones', titulacionesRoutes);
app.use('/api/salones', salonesRoutes);

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
