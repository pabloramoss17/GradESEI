document.addEventListener('DOMContentLoaded', () => {
  // Obtener el token del localStorage SIEMPRE actualizado
  function getToken() {
    return localStorage.getItem('token');
  }

  if (!getToken()) {
    alert('No estás autenticado');
    window.location.href = '/alumno/login.html';  // Redirigir al login si no hay token
    return;
  }

  // Botón cerrar sesión
  const logoutBtn = document.querySelector('.logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('token');
      window.location.href = '/alumno/login.html';
    });
  }

  // Primero obtenemos la lista de titulaciones
  fetch('/api/titulaciones')
    .then(response => response.json())
    .then(titulaciones => {
      // Luego obtenemos la info del alumno
      fetch('/api/alumnos/info', {
        method: 'GET',
        headers: {
          'Authorization': getToken(), // SIEMPRE lee el token actualizado
        },
      })
      .then(response => response.json())
      .then(data => {
        if (data.alumno) {
          document.getElementById('correo').value = data.alumno.correo;
          document.getElementById('nombre').value = data.alumno.nombre;
          document.getElementById('apellidos').value = data.alumno.apellidos;
          document.getElementById('telefono').value = data.alumno.telefono;
          document.getElementById('dni').value = data.alumno.DNI;
          // Buscar el nombre de la titulación
          const titulacion = titulaciones.find(t => t.id === data.alumno.titulacion_id);
          document.getElementById('titulacion').value = titulacion ? titulacion.nombre : 'Desconocida';
          document.getElementById('acompanantes').value = data.alumno.acompanantes_solicitados;
        }
      })
      .catch(err => {
        console.error('Error al obtener la información:', err);
        alert('Error al cargar la información del alumno');
      });
    })
    .catch(err => {
      console.error('Error al obtener las titulaciones:', err);
      alert('Error al cargar las titulaciones');
    });
});
