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

          const input = document.createElement('input');
          input.className = 'titulacion-info';
          input.type = 'text';
          input.value = titulacion.nombre;
          input.disabled = true;

          // Botón editar
          const editBtn = document.createElement('button');
          editBtn.className = 'icon-btn';
          editBtn.title = 'Editar';
          editBtn.innerHTML = '&#9998;';
          editBtn.addEventListener('click', async () => {
            // Habilita edición
            input.disabled = false;
            input.focus();
            editBtn.style.display = 'none';

            // Botón guardar
            const saveBtn = document.createElement('button');
            saveBtn.className = 'icon-btn';
            saveBtn.title = 'Guardar';
            saveBtn.innerHTML = '&#128190;'; // icono de guardar
            row.insertBefore(saveBtn, deleteBtn);

            saveBtn.addEventListener('click', async () => {
              const nuevoNombre = input.value.trim();
              if (!nuevoNombre) {
                alert('El nombre no puede estar vacío');
                return;
              }
              // Llama al endpoint para modificar
              const res = await fetch(`/api/titulaciones/${titulacion.id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': localStorage.getItem('adminToken')
                },
                body: JSON.stringify({ nombre: nuevoNombre })
              });
              if (res.ok) {
                input.disabled = true;
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

          row.appendChild(input);
          row.appendChild(editBtn);
          row.appendChild(deleteBtn);

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
  const addInput = document.getElementById('nuevo-nombre-titulacion');
  const cancelarBtn = document.getElementById('cancelar-add-titulacion');

  addLink.addEventListener('click', (e) => {
    e.preventDefault();
    addForm.style.display = 'flex';
    addInput.value = '';
    addInput.focus();
    addLink.style.display = 'none';
  });

  cancelarBtn.addEventListener('click', (e) => {
    e.preventDefault();
    addForm.style.display = 'none';
    addLink.style.display = '';
  });

  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = addInput.value.trim();
    if (!nombre) {
      alert('El nombre no puede estar vacío');
      return;
    }
    try {
      // Puedes pedir el graduacion_id al usuario o usar uno por defecto (aquí se usa 1)
      const res = await fetch('/api/titulaciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('adminToken')
        },
        body: JSON.stringify({ nombre, graduacion_id: 1 })
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
});