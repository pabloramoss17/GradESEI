document.addEventListener('DOMContentLoaded', async () => {
  // Botón cerrar sesión
  const logoutBtn = document.querySelector('.logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('token');
      window.location.href = '/alumno/login.html';
    });
  }

  function getToken() {
    return localStorage.getItem('token');
  }

  if (!getToken()) {
    alert('No estás autenticado');
    window.location.href = '/alumno/login.html';
    return;
  }

  try {
    // 1. Obtener datos del alumno (para saber su titulacion y acompañantes concedidos)
    const resAlumno = await fetch('/api/alumnos/info', {
      method: 'GET',
      headers: { 'Authorization': getToken() }
    });
    const dataAlumno = await resAlumno.json();
    if (!dataAlumno.alumno) throw new Error('No se pudo obtener el alumno');

    // 2. Obtener datos de la titulación
    const resTitulacion = await fetch(`/api/titulaciones/${dataAlumno.alumno.titulacion_id}`);
    const titulacion = await resTitulacion.json();
    if (!titulacion.titulacion) throw new Error('No se pudo obtener la titulación');

    // 3. Obtener datos del acto de graduación
    const resActo = await fetch(`/api/graduaciones/${titulacion.titulacion.graduacion_id}`);
    const acto = await resActo.json();
    if (!acto.graduacion) throw new Error('No se pudo obtener el acto de graduación');

    // 4. Obtener datos del salón
    const resSalon = await fetch(`/api/salones?graduacion_id=${acto.graduacion.id}`);
    const salones = await resSalon.json();
    const salon = salones.length > 0 ? salones[0] : null;

    // Rellenar los campos
    document.getElementById('acto-nombre').value = acto.graduacion.nombre;

    // Formatear la fecha a dd/mm/yyyy
    const fechaISO = acto.graduacion.fecha;
    let fechaFormateada = '';
    if (fechaISO) {
      const fechaObj = new Date(fechaISO);
      const dia = String(fechaObj.getDate()).padStart(2, '0');
      const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
      const anio = fechaObj.getFullYear();
      fechaFormateada = `${dia}/${mes}/${anio}`;
    }
    document.getElementById('acto-fecha').value = fechaFormateada;

    document.getElementById('salon-nombre').value = salon ? salon.nombre : '';
    document.getElementById('salon-aforo').value = salon ? salon.aforo_total : '';
    document.getElementById('acompanantes-concedidos').value = dataAlumno.alumno.acompanantes_concedidos ?? '';

  } catch (err) {
    alert('Error al cargar la información del acto');
    console.error(err);
  }
});