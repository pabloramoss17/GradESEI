🎓 GradESEI
Sistema de gestión de actos de graduación para la Escuela Superior de Ingeniería Informática (ESEI) de la Universidad de Vigo.

📌 Descripción
GradESEI es una aplicación web orientada a los estudiantes de la ESEI que facilita su inscripción, gestión de datos personales y consulta de información relativa al acto de graduación.

Entre sus funcionalidades destacan:

Registro e inicio de sesión seguro.

Modificación de datos personales.

Información detallada del acto según la titulación.

Gestión de acompañantes.

Recuperación de contraseña vía correo electrónico.

Panel de administración (en desarrollo).

🚀 Funcionalidades clave
✅ Registro y login con correo institucional
✅ Edición de datos personales y número de acompañantes
✅ Visualización del acto de graduación asignado
✅ Soporte para recuperación y cambio de contraseña
🚧 Panel de administración próximamente disponible

🛠️ Tecnologías utilizadas
Frontend: HTML5, CSS3, JavaScript (Vanilla)

Backend: Node.js + Express.js

Base de datos: MySQL

Email: Nodemailer (SMTP)

Autenticación: JWT (JSON Web Tokens)

📁 Estructura del proyecto
pgsql
Copiar
Editar
gradesei/
│
├── public/
│   ├── alumno/
│   │   ├── login.html
│   │   ├── registro.html
│   │   ├── main.html
│   │   ├── modDatos.html
│   │   ├── infoActo.html
│   │   ├── recuperar.html
│   │   └── reset.html
│   ├── css/
│   └── js/
│
├── server/
│   ├── controllers/
│   └── server.js
│
├── db/
│   ├── init.sql
│   ├── insert.sql
│   └── reset.sql
│
└── README.md
🧪 Instalación y ejecución
Clona el repositorio

bash
Copiar
Editar
git clone https://github.com/tuusuario/gradesei.git
cd gradesei
Instala las dependencias

bash
Copiar
Editar
npm install
Prepara la base de datos

Crea la base de datos graduacion y ejecuta los scripts en:

pgsql
Copiar
Editar
db/init.sql
db/insert.sql
Configura el correo SMTP

En server/controllers/alumnosController.js, reemplaza con tus credenciales de Gmail (usa contraseña de aplicación).

Inicia el servidor

bash
Copiar
Editar
node server/server.js
Abre la aplicación

Navega a: http://localhost:3000/alumno/login.html

🔐 Seguridad
Solo se permite registro con correos @esei.uvigo.gal o @alumnado.uvigo.gal.

Las contraseñas se almacenan cifradas usando bcrypt.

Los flujos de recuperación y cambio de contraseña están aislados y protegidos.

🔄 Recuperación de contraseña
Accede a la pantalla de login.

Pulsa en "¿Has olvidado tu contraseña?".

Introduce tu correo institucional.

Recibirás un enlace temporal para restablecerla.

📜 Licencia
Este proyecto está licenciado bajo la licencia MIT.

👨‍💻 Autor
Pablo
Escuela Superior de Ingeniería Informática – UVigo
