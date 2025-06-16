document.addEventListener('DOMContentLoaded', async () => {
  // Siempre obtenemos el token actualizado de localStorage
  function getToken() {
    return localStorage.getItem('token');
  }

  if (!getToken()) {
    alert('No estás autenticado');
    window.location.href = '/alumno/login.html';
    return;
  }

  // Cargar titulaciones
  let titulaciones = [];
  try {
    const resT = await fetch('/api/titulaciones');
    titulaciones = await resT.json();
    const select = document.getElementById('titulacion');
    titulaciones.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.nombre;
      select.appendChild(opt);
    });
  } catch (err) {
    alert('Error al cargar titulaciones');
    return;
  }

  // Cargar datos del alumno
  fetch('/api/alumnos/info', {
    method: 'GET',
    headers: { 'Authorization': getToken() }
  })
  .then(res => res.json())
  .then(data => {
    if (data.alumno) {
      document.getElementById('dni').value = data.alumno.DNI;
      document.getElementById('correo').value = data.alumno.correo;
      document.getElementById('nombre').value = data.alumno.nombre;
      document.getElementById('apellidos').value = data.alumno.apellidos;
      document.getElementById('telefono').value = data.alumno.telefono;
      document.getElementById('acompanantes').value = data.alumno.acompanantes_solicitados;
      document.getElementById('titulacion').value = data.alumno.titulacion_id;
    }
  })
  .catch(err => {
    alert('Error al cargar tus datos');
    console.error(err);
  });

  // Guardar cambios
  document.getElementById('modificar-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const dni = document.getElementById('dni').value.trim();
    const correo = document.getElementById('correo').value.trim();
    const nombre = document.getElementById('nombre').value.trim();
    const apellidos = document.getElementById('apellidos').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const acompanantes = parseInt(document.getElementById('acompanantes').value, 10) || 0;
    const titulacion_id = parseInt(document.getElementById('titulacion').value, 10);

    try {
      const res = await fetch('/api/alumnos/actualizar', {
        method: 'PUT',
        headers: {
          'Authorization': getToken(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ dni, correo, nombre, apellidos, telefono, acompanantes_solicitados: acompanantes, titulacion_id })
      });

      const result = await res.json();

      if (res.ok) {
        if (result.token) {
          localStorage.setItem('token', result.token);
          alert('Datos actualizados correctamente. Tu sesión sigue activa.');
          window.location.reload(); // recarga la página para usar el nuevo token
          return;
        } else {
          alert('Datos actualizados correctamente.');
          window.location.href = '/alumno/main.html';
        }
      } else {
        alert(result.error || 'Error al actualizar');
      }
    } catch (err) {
      alert('Error al conectar con el servidor');
      console.error(err);
    }
  });
});