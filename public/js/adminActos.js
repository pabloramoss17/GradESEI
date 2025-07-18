document.addEventListener('DOMContentLoaded', () => {
  const actosList = document.querySelector('.actos-list');
  const addLink = document.querySelector('.add-link');
  const modalBg = document.getElementById('modal-bg');
  const modalForm = document.getElementById('acto-form');
  const cancelarModal = document.getElementById('cancelar-modal');
  let actos = [];
  let titulaciones = [];
  let editActoId = null;

  // Cerrar sesión
  document.querySelector('.logout-btn').addEventListener('click', e => {
    e.preventDefault();
    localStorage.removeItem('adminToken');
    window.location.href = '/admin/login.html';
  });

  // Cargar titulaciones para el selector
  async function cargarTitulaciones() {
    const res = await fetch('/api/titulaciones', {
      headers: { 'Authorization': localStorage.getItem('adminToken') }
    });
    titulaciones = await res.json();
  }

  // Cargar actos
  async function cargarActos() {
    await cargarTitulaciones();
    const res = await fetch('/api/graduaciones', {
      headers: { 'Authorization': localStorage.getItem('adminToken') }
    });
    actos = await res.json();
    renderActos();
  }

  // Renderizar actos
  function renderActos() {
    // Elimina filas anteriores
    actosList.querySelectorAll('.acto-row').forEach(e => e.remove());
    actos.forEach(acto => {
      const row = document.createElement('div');
      row.className = 'acto-row';

      // Formatea la fecha a dd/mm/aaaa
      let fechaFormateada = '';
      if (acto.fecha) {
        const d = new Date(acto.fecha);
        if (!isNaN(d)) {
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          fechaFormateada = `${day}/${month}/${year}`;
        } else {
          fechaFormateada = acto.fecha;
        }
      }

      // Info acto con campos en negrita y separación
      const info = document.createElement('div');
      info.className = 'acto-info';
      info.innerHTML =
        `<b>Nombre:</b> ${acto.nombre}<br>
<b>Fecha:</b> ${fechaFormateada}<br>
<b>Titulaciones:</b> ${acto.titulaciones.map(t => t.nombre + ' (' + t.siglas + ')').join(', ')}<br>
<b>Registro bloqueado:</b> ${acto.registro_bloqueado ? 'Sí' : 'No'}<br>
<b>Segundo plazo:</b> ${acto.segundo_plazo_activado ? 'Sí' : 'No'}`;

      // Filtrar alumnos
      const filtrar = document.createElement('a');
      filtrar.className = 'filtrar-link';
      filtrar.textContent = 'Filtrar alumnos';
      filtrar.addEventListener('click', () => descargarAlumnos(acto.id));

      // Acciones
      const actions = document.createElement('div');
      actions.className = 'acto-actions';

      // Editar
      const editBtn = document.createElement('button');
      editBtn.className = 'icon-btn';
      editBtn.title = 'Editar';
      editBtn.innerHTML = '&#9998;';
      editBtn.addEventListener('click', () => abrirModal(acto));

      // Eliminar
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'icon-btn';
      deleteBtn.title = 'Eliminar';
      deleteBtn.innerHTML = '&#128465;';
      deleteBtn.addEventListener('click', async () => {
        if (confirm('¿Seguro que quieres eliminar este acto?')) {
          const res = await fetch(`/api/graduaciones/${acto.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': localStorage.getItem('adminToken') }
          });
          if (res.ok) cargarActos();
          else alert('Error al eliminar el acto');
        }
      });

      info.appendChild(filtrar);
      row.appendChild(info);
      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);
      row.appendChild(actions);

      // Inserta antes del enlace de añadir acto
      actosList.insertBefore(row, addLink);
    });
  }

  // Descargar alumnos registrados en titulaciones asociadas al acto
  async function descargarAlumnos(actoId) {
    const res = await fetch(`/api/graduaciones/${actoId}/alumnos`, {
      headers: { 'Authorization': localStorage.getItem('adminToken') }
    });
    if (!res.ok) return alert('Error al obtener alumnos');
    const alumnos = await res.json();
    // Generar CSV con BOM UTF-8 y nombre de titulación
    let csv = '\uFEFFDNI,Nombre,Apellidos,Correo,Titulación\n';
    alumnos.forEach(a => {
      csv += `${a.DNI},"${a.nombre}","${a.apellidos}","${a.correo}","${a.titulacion_nombre}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'alumnos_acto.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Abrir modal para editar/crear acto
  function abrirModal(acto = null) {
    editActoId = acto ? acto.id : null;
    document.getElementById('acto-nombre').value = acto ? acto.nombre : '';
    // Formatea la fecha a YYYY-MM-DD para el input, pero muestra dd/mm/aaaa en el placeholder
    let fecha = '';
    let fechaPlaceholder = 'dd/mm/aaaa';
    if (acto && acto.fecha) {
      const d = new Date(acto.fecha);
      if (!isNaN(d)) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        fecha = `${year}-${month}-${day}`; // Para el input type="date"
        fechaPlaceholder = `${day}/${month}/${year}`;
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(acto.fecha)) {
        fecha = acto.fecha;
        const [year, month, day] = acto.fecha.split('-');
        fechaPlaceholder = `${day}/${month}/${year}`;
      }
    }
    const inputFecha = document.getElementById('acto-fecha');
    inputFecha.value = fecha;
    inputFecha.placeholder = fechaPlaceholder;
    document.getElementById('acto-bloqueado').checked = acto ? !!acto.registro_bloqueado : false;
    document.getElementById('acto-segundo-plazo').checked = acto ? !!acto.segundo_plazo_activado : false;

    // Selector de titulaciones como checkboxes
    const checkboxesDiv = document.getElementById('acto-titulaciones-checkboxes');
    checkboxesDiv.innerHTML = '';
    const asociadas = acto ? acto.titulaciones.map(tt => tt.id) : [];
    titulaciones.forEach(t => {
      const label = document.createElement('label');
      label.style.display = 'block';
      label.style.marginBottom = '4px';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = t.id;
      checkbox.checked = asociadas.includes(t.id);
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(` ${t.nombre} (${t.siglas})`));
      checkboxesDiv.appendChild(label);
    });

    modalBg.style.display = 'flex';
  }

  // Cerrar modal
  cancelarModal.addEventListener('click', () => {
    modalBg.style.display = 'none';
    editActoId = null;
  });

  // Guardar acto (crear o editar)
  modalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('acto-nombre').value.trim();
    const fecha = document.getElementById('acto-fecha').value;
    const registro_bloqueado = document.getElementById('acto-bloqueado').checked;
    const segundo_plazo_activado = document.getElementById('acto-segundo-plazo').checked;
    const titulacionesSel = Array.from(document.querySelectorAll('#acto-titulaciones-checkboxes input[type="checkbox"]:checked')).map(cb => Number(cb.value));
    if (!nombre || !fecha || !titulacionesSel.length) {
      alert('Rellena todos los campos');
      return;
    }
    const body = {
      nombre,
      fecha,
      registro_bloqueado,
      segundo_plazo_activado,
      titulaciones: titulacionesSel
    };
    let res;
    if (editActoId) {
      res = await fetch(`/api/graduaciones/${editActoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('adminToken')
        },
        body: JSON.stringify(body)
      });
    } else {
      res = await fetch('/api/graduaciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('adminToken')
        },
        body: JSON.stringify(body)
      });
    }
    if (res.ok) {
      modalBg.style.display = 'none';
      cargarActos();
    } else {
      alert('Error al guardar el acto');
    }
  });

  // Añadir acto
  addLink.addEventListener('click', (e) => {
    e.preventDefault();
    abrirModal();
  });

  // Cerrar modal al hacer click fuera
  modalBg.addEventListener('click', (e) => {
    if (e.target === modalBg) {
      modalBg.style.display = 'none';
      editActoId = null;
    }
  });

  cargarActos();
});