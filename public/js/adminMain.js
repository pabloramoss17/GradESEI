document.addEventListener('DOMContentLoaded', () => {
  // Botón cerrar sesión
  const logoutBtn = document.querySelector('.logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('adminToken');
      window.location.href = '/admin/login.html';
    });
  }

  // Cargar titulaciones dinámicamente
  async function cargarTitulaciones() {
    try {
      const res = await fetch('/api/titulaciones', {
        headers: { 'Authorization': localStorage.getItem('adminToken') }
      });
      const data = await res.json();
      const lista = document.querySelector('.titulaciones-list');
      // Limpia las filas anteriores (excepto el título y el enlace de añadir)
      lista.querySelectorAll('.titulacion-row').forEach(e => e.remove());

      if (data && Array.isArray(data)) {
        data.forEach(titulacion => {
          const row = document.createElement('div');
          row.className = 'titulacion-row';

          // Campo nombre
          const inputNombre = document.createElement('input');
          inputNombre.className = 'titulacion-info';
          inputNombre.type = 'text';
          inputNombre.value = titulacion.nombre;
          inputNombre.disabled = true;

          // Campo siglas
          const inputSiglas = document.createElement('input');
          inputSiglas.className = 'titulacion-info';
          inputSiglas.type = 'text';
          inputSiglas.value = titulacion.siglas;
          inputSiglas.disabled = true;
          inputSiglas.style.maxWidth = '120px';
          inputSiglas.style.marginLeft = '8px';

          // Botón editar
          const editBtn = document.createElement('button');
          editBtn.className = 'icon-btn';
          editBtn.title = 'Editar';
          editBtn.innerHTML = '&#9998;';
          editBtn.addEventListener('click', async () => {
            inputNombre.disabled = false;
            inputSiglas.disabled = false;
            inputNombre.focus();
            editBtn.style.display = 'none';

            // Botón guardar
            const saveBtn = document.createElement('button');
            saveBtn.className = 'icon-btn';
            saveBtn.title = 'Guardar';
            saveBtn.innerHTML = '&#128190;';
            row.insertBefore(saveBtn, deleteBtn);

            saveBtn.addEventListener('click', async () => {
              const nuevoNombre = inputNombre.value.trim();
              const nuevasSiglas = inputSiglas.value.trim();
              if (!nuevoNombre || !nuevasSiglas) {
                alert('El nombre y las siglas no pueden estar vacíos');
                return;
              }
              const res = await fetch(`/api/titulaciones/${titulacion.id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': localStorage.getItem('adminToken')
                },
                body: JSON.stringify({ nombre: nuevoNombre, siglas: nuevasSiglas })
              });
              if (res.ok) {
                inputNombre.disabled = true;
                inputSiglas.disabled = true;
                editBtn.style.display = '';
                saveBtn.remove();
                cargarTitulaciones();
              } else {
                alert('Error al modificar la titulación');
              }
            });
          });

          // Botón borrar
          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'icon-btn';
          deleteBtn.title = 'Eliminar';
          deleteBtn.innerHTML = '&#128465;';
          deleteBtn.addEventListener('click', async () => {
            if (confirm('¿Seguro que quieres eliminar esta titulación?')) {
              const res = await fetch(`/api/titulaciones/${titulacion.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': localStorage.getItem('adminToken') }
              });
              if (res.ok) {
                cargarTitulaciones();
              } else {
                alert('Error al eliminar la titulación');
              }
            }
          });

          // Botón gestionar alumnos
          const alumnosBtn = document.createElement('button');
          alumnosBtn.className = 'icon-btn';
          alumnosBtn.title = 'Gestionar alumnos';
          alumnosBtn.innerHTML = '&#128101;'; // icono de grupo/personas

          alumnosBtn.addEventListener('click', async () => {
            await mostrarAlumnosTitulacion(titulacion.id, titulacion.nombre);
          });

          row.appendChild(inputNombre);
          row.appendChild(inputSiglas);
          row.appendChild(editBtn);
          row.appendChild(deleteBtn);
          row.appendChild(alumnosBtn);

          // Inserta antes del enlace de añadir titulación
          const addLink = lista.querySelector('.add-link');
          lista.insertBefore(row, addLink);
        });
      }
    } catch (err) {
      alert('Error al cargar titulaciones');
    }
  }

  cargarTitulaciones();

  // Mostrar formulario de añadir titulación
  const addLink = document.querySelector('.add-link');
  const addForm = document.getElementById('add-titulacion-form');
  const addInputNombre = document.getElementById('nuevo-nombre-titulacion');
  const addInputSiglas = document.getElementById('nuevas-siglas-titulacion');
  const cancelarBtn = document.getElementById('cancelar-add-titulacion');

  addLink.addEventListener('click', (e) => {
    e.preventDefault();
    addForm.style.display = 'flex';
    addInputNombre.value = '';
    addInputSiglas.value = '';
    addInputNombre.focus();
    addLink.style.display = 'none';
  });

  cancelarBtn.addEventListener('click', (e) => {
    e.preventDefault();
    addForm.style.display = 'none';
    addLink.style.display = '';
  });

  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = addInputNombre.value.trim();
    const siglas = addInputSiglas.value.trim();
    if (!nombre || !siglas) {
      alert('El nombre y las siglas no pueden estar vacíos');
      return;
    }
    try {
      const res = await fetch('/api/titulaciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('adminToken')
        },
        body: JSON.stringify({ nombre, siglas }) // <--- solo nombre y siglas
      });
      if (res.ok) {
        addForm.style.display = 'none';
        addLink.style.display = '';
        cargarTitulaciones();
      } else {
        const data = await res.json();
        alert(data.error || 'Error al añadir la titulación');
      }
    } catch (err) {
      alert('Error al conectar con el servidor');
    }
  });

  async function mostrarAlumnosTitulacion(titulacionId, titulacionNombre) {
    // Crea el modal o panel
    let modal = document.getElementById('alumnos-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'alumnos-modal';
      modal.style.position = 'fixed';
      modal.style.top = '0';
      modal.style.left = '0';
      modal.style.width = '100vw';
      modal.style.height = '100vh';
      modal.style.background = 'rgba(0,0,0,0.4)';
      modal.style.zIndex = '9999';
      modal.style.display = 'flex';
      modal.style.alignItems = 'center';
      modal.style.justifyContent = 'center';

      const content = document.createElement('div');
      content.id = 'alumnos-modal-content';
      modal.appendChild(content);
      document.body.appendChild(modal);
    }

    const content = modal.querySelector('#alumnos-modal-content');
    content.innerHTML = `
      <h2 style="margin-bottom:18px; margin-left:8px;">Alumnos de ${titulacionNombre}</h2>
      <div id="alumnos-list"></div>
      <button id="cerrar-modal-alumnos" style="margin-left:8px;">Cerrar</button>
    `;

    // Cerrar modal
    content.querySelector('#cerrar-modal-alumnos').onclick = () => modal.remove();

    // Cargar alumnos
    const res = await fetch(`/api/alumnos/por-titulacion/${titulacionId}`, {
      headers: { 'Authorization': localStorage.getItem('adminToken') }
    });
    const alumnos = await res.json();
    const lista = content.querySelector('#alumnos-list');
    lista.innerHTML = '';

    // Estructura de columnas
    const columnas = [
      { label: 'DNI', campo: 'DNI', class: 'col-dni' },
      { label: 'Nombre', campo: 'nombre', class: 'col-nombre' },
      { label: 'Apellidos', campo: 'apellidos', class: 'col-apellidos' },
      { label: 'Correo', campo: 'correo', class: 'col-correo' },
      { label: 'Teléfono', campo: 'telefono', class: 'col-telefono' },
      { label: 'Acomp. solicitados', campo: 'acompanantes_solicitados', class: 'col-acompanantes' },
      { label: '', campo: 'guardar', class: 'col-guardar' },
      { label: '', campo: 'eliminar', class: 'col-eliminar' }
    ];

    // Encabezado alineado con los datos
    const headerRow = document.createElement('div');
    headerRow.className = 'alumnos-header-row';
    columnas.forEach(col => {
      if (col.campo === 'guardar' || col.campo === 'eliminar') {
        const btn = document.createElement('button');
        btn.disabled = true;
        btn.className = col.class;
        headerRow.appendChild(btn);
      } else {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = col.label;
        input.disabled = true;
        input.className = col.class;
        headerRow.appendChild(input);
      }
    });
    lista.appendChild(headerRow);

    // Filas de alumnos
    if (!alumnos.length) {
      lista.innerHTML += '<div>No hay alumnos inscritos en esta titulación.</div>';
      return;
    }

    alumnos.forEach(alumno => {
      const row = document.createElement('div');
      row.className = 'alumnos-row';
      columnas.forEach(col => {
        if (col.campo === 'guardar') {
          const saveBtn = document.createElement('button');
          saveBtn.className = `icon-btn ${col.class}`;
          saveBtn.title = 'Guardar cambios';
          saveBtn.innerHTML = '&#128190;';
          saveBtn.onclick = async () => {
            const campos = row.querySelectorAll('input');
            const datos = {};
            campos.forEach(inp => datos[inp.dataset.campo] = inp.value);
            const res = await fetch(`/api/alumnos/${alumno.DNI}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('adminToken')
              },
              body: JSON.stringify(datos)
            });
            if (res.ok) {
              alert('Alumno actualizado');
            } else {
              alert('Error al actualizar alumno');
            }
          };
          row.appendChild(saveBtn);
        } else if (col.campo === 'eliminar') {
          const deleteBtn = document.createElement('button');
          deleteBtn.className = `icon-btn ${col.class}`;
          deleteBtn.title = 'Eliminar alumno';
          deleteBtn.innerHTML = '&#128465;';
          deleteBtn.onclick = async () => {
            if (confirm('¿Seguro que quieres eliminar este alumno?')) {
              const res = await fetch(`/api/alumnos/${alumno.DNI}`, {
                method: 'DELETE',
                headers: { 'Authorization': localStorage.getItem('adminToken') }
              });
              if (res.ok) {
                row.remove();
              } else {
                alert('Error al eliminar alumno');
              }
            }
          };
          row.appendChild(deleteBtn);
        } else {
          const input = document.createElement('input');
          input.type = col.campo === 'acompanantes_solicitados' ? 'number' : 'text';
          input.value = alumno[col.campo];
          input.disabled = col.campo === 'DNI';
          input.className = `alumno-info ${col.class}`;
          input.dataset.campo = col.campo;
          row.appendChild(input);
        }
      });
      lista.appendChild(row);
    });
  }
});