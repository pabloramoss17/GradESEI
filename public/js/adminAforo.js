document.addEventListener('DOMContentLoaded', () => {
  const salonesList = document.getElementById('salones-list');
  const modalZonaBg = document.getElementById('modal-zona-bg');
  const modalZonaForm = document.getElementById('zona-form');
  const modalSalonBg = document.getElementById('modal-salon-bg');
  const modalSalonForm = document.getElementById('salon-form');
  const addSalonLink = document.getElementById('add-salon-link');
  const salonNombreInput = document.getElementById('salon-nombre');
  const salonAforoInput = document.getElementById('salon-aforo');
  const salonGraduacionSelect = document.getElementById('salon-graduacion');
  const salonFechaGraduacion = document.getElementById('salon-fecha-graduacion');
  let currentSalonId = null;
  let editSalonId = null;
  let editZonaId = null;
  let graduaciones = [];

  // Cerrar sesión
  document.querySelector('.logout-btn').addEventListener('click', e => {
    e.preventDefault();
    localStorage.removeItem('adminToken');
    window.location.href = '/admin/login.html';
  });

  // Cargar graduaciones para el select
  async function cargarGraduaciones() {
    const res = await fetch('/api/graduaciones', {
      headers: { 'Authorization': localStorage.getItem('adminToken') }
    });
    graduaciones = await res.json();
    salonGraduacionSelect.innerHTML = '';
    graduaciones.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.id;
      opt.textContent = g.nombre;
      salonGraduacionSelect.appendChild(opt);
    });
    // Mostrar fecha de la graduación seleccionada
    salonGraduacionSelect.onchange = () => {
      const g = graduaciones.find(g => g.id == salonGraduacionSelect.value);
      salonFechaGraduacion.textContent = g ? `Fecha: ${formateaFecha(g.fecha)}` : '';
    };
    salonGraduacionSelect.onchange();
  }

  // Cargar salones y zonas
  async function cargarSalones() {
    const res = await fetch('/api/salones/all', {
      headers: { 'Authorization': localStorage.getItem('adminToken') }
    });
    const salones = await res.json();
    renderSalones(salones);
  }

  function formateaFecha(fechaIso) {
    if (!fechaIso) return '';
    const d = new Date(fechaIso);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const anio = d.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }

  // Renderizar salones y zonas
  function renderSalones(salones) {
    salonesList.innerHTML = '<div class="salones-titulo">Salones actuales:</div>';
    salones.forEach(salon => {
      const row = document.createElement('div');
      row.className = 'salon-row';

      // Cabecera con nombre y botones a la derecha
      const header = document.createElement('div');
      header.className = 'salon-header';

      const nombreSalon = document.createElement('div');
      nombreSalon.innerHTML = `<b>${salon.nombre}</b>`;

      const acciones = document.createElement('div');
      acciones.className = 'salon-actions';

      // Botón editar salón
      const editSalonBtn = document.createElement('button');
      editSalonBtn.className = 'icon-btn';
      editSalonBtn.title = 'Editar salón';
      editSalonBtn.innerHTML = '&#9998;';
      editSalonBtn.onclick = () => abrirModalSalon(salon);

      // Botón eliminar salón
      const delSalonBtn = document.createElement('button');
      delSalonBtn.className = 'icon-btn';
      delSalonBtn.title = 'Eliminar salón';
      delSalonBtn.innerHTML = '&#128465;';
      delSalonBtn.onclick = async () => {
        if (confirm('¿Seguro que quieres eliminar este salón y todas sus zonas?')) {
          const res = await fetch(`/api/salones/${salon.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': localStorage.getItem('adminToken') }
          });
          if (res.ok) cargarSalones();
          else alert('Error al eliminar el salón');
        }
      };

      acciones.appendChild(editSalonBtn);
      acciones.appendChild(delSalonBtn);

      header.appendChild(nombreSalon);
      header.appendChild(acciones);
      row.appendChild(header);

      // Info del salón
      const info = document.createElement('div');
      info.className = 'salon-info';
      info.innerHTML = `
        <b>Aforo total:</b> ${salon.aforo_total} &nbsp; 
        <b>Ocupado:</b> ${salon.aforo_ocupado} &nbsp; 
        <b>Libre:</b> ${salon.aforo_libre}<br>
        <b>Fecha:</b> ${formateaFecha(salon.fecha_acto)}<br>
        <b>Graduación:</b> ${salon.graduacion_nombre || '-'}`;
      row.appendChild(info);

      // Lista de zonas
      const zonasList = document.createElement('div');
      zonasList.className = 'zonas-list';
      salon.zonas.forEach(zona => {
        const zonaRow = document.createElement('div');
        zonaRow.className = 'zona-row';

        const zonaInfo = document.createElement('span');
        zonaInfo.innerHTML = `<b>${zona.nombre}</b> | Butacas reservadas: ${zona.butacas_reservadas}`;

        // Editar zona
        const editBtn = document.createElement('button');
        editBtn.className = 'icon-btn';
        editBtn.title = 'Editar zona';
        editBtn.innerHTML = '&#9998;';
        editBtn.onclick = () => abrirModalZona(salon.id, zona);

        // Eliminar zona
        const delBtn = document.createElement('button');
        delBtn.className = 'icon-btn';
        delBtn.title = 'Eliminar zona';
        delBtn.innerHTML = '&#128465;';
        delBtn.onclick = async () => {
          if (confirm('¿Seguro que quieres eliminar esta zona?')) {
            const res = await fetch(`/api/zonas/${zona.id}`, {
              method: 'DELETE',
              headers: { 'Authorization': localStorage.getItem('adminToken') }
            });
            if (res.ok) cargarSalones();
            else alert('Error al eliminar la zona');
          }
        };

        zonaRow.appendChild(zonaInfo);
        zonaRow.appendChild(editBtn);
        zonaRow.appendChild(delBtn);
        zonasList.appendChild(zonaRow);
      });

      // Botón añadir zona
      const addZonaBtn = document.createElement('a');
      addZonaBtn.className = 'add-zona-link';
      addZonaBtn.textContent = 'Añadir zona';
      addZonaBtn.onclick = () => abrirModalZona(salon.id);
      zonasList.appendChild(addZonaBtn);

      // Botón o mensaje para crear zona alumnos registrados
      const existeZonaAlumnos = salon.zonas.some(
        z => z.nombre.trim().toLowerCase() === 'alumnos registrados'
      );

      if (existeZonaAlumnos) {
        const msg = document.createElement('div');
        msg.className = 'info-msg';
        msg.textContent = "La zona 'Alumnos registrados' ya está creada.";
        zonasList.appendChild(msg);
      } else if (salon.registro_bloqueado) {
        const crearZonaAlumnosBtn = document.createElement('a');
        crearZonaAlumnosBtn.className = 'add-zona-link';
        crearZonaAlumnosBtn.textContent = 'Crear zona alumnos registrados';
        crearZonaAlumnosBtn.onclick = async () => {
          const res = await fetch(`/api/zonas/salones/${salon.id}/crear-zona-alumnos`, {
            method: 'POST',
            headers: { 'Authorization': localStorage.getItem('adminToken') }
          });
          if (res.ok) cargarSalones();
          else {
            const data = await res.json();
            alert(data.error || 'Error al crear zona alumnos registrados');
          }
        };
        zonasList.appendChild(crearZonaAlumnosBtn);
      } else {
        const msg = document.createElement('div');
        msg.className = 'info-msg';
        msg.textContent = "No se puede crear la zona de alumnos registrados porque el registro aún está abierto.";
        zonasList.appendChild(msg);
      }

      // --- Botones de reparto de invitaciones ---
      const puedeRepartir =
        salon.registro_bloqueado &&
        salon.segundo_plazo_activado &&
        salon.zonas.some(z => z.nombre.trim().toLowerCase() === 'alumnos registrados');

      // Comprobar si ya se ha repartido la primera y segunda tanda
      const zonaPrimera = salon.zonas.find(z => z.nombre.trim().toLowerCase() === 'invitaciones primera ronda');
      const zonaSegunda = salon.zonas.find(z => z.nombre.trim().toLowerCase() === 'invitaciones segunda ronda');

      // Mensaje de por qué no se puede repartir
      let motivo = '';
      if (!salon.registro_bloqueado) motivo = 'El registro no está bloqueado.';
      else if (!salon.segundo_plazo_activado) motivo = 'El segundo plazo no está activado.';
      else if (!salon.zonas.some(z => z.nombre.trim().toLowerCase() === 'alumnos registrados')) motivo = 'Debe existir la zona "Alumnos registrados".';

      // Botón primera tanda
      const btnPrimera = document.createElement('button');
      btnPrimera.textContent = 'Repartir primera tanda de invitaciones';
      btnPrimera.className = 'reparto-btn';
      btnPrimera.disabled = !puedeRepartir || zonaPrimera;
      btnPrimera.onclick = async () => {
        if (confirm('¿Seguro que quieres repartir la primera tanda de invitaciones?')) {
          const res = await fetch(`/api/salones/${salon.id}/repartir-invitaciones-primera`, {
            method: 'POST',
            headers: { 'Authorization': localStorage.getItem('adminToken') }
          });
          if (res.ok) cargarSalones();
          else {
            const data = await res.json();
            alert(data.error || 'Error al repartir invitaciones');
          }
        }
      };

      // Botón segunda tanda
      const btnSegunda = document.createElement('button');
      btnSegunda.textContent = 'Repartir segunda tanda de invitaciones';
      btnSegunda.className = 'reparto-btn';
      btnSegunda.disabled = !puedeRepartir || !zonaPrimera || zonaSegunda;
      btnSegunda.onclick = async () => {
        if (confirm('¿Seguro que quieres repartir la segunda tanda de invitaciones?')) {
          const res = await fetch(`/api/salones/${salon.id}/repartir-invitaciones-segunda`, {
            method: 'POST',
            headers: { 'Authorization': localStorage.getItem('adminToken') }
          });
          
          if (res.ok) {
            const data = await res.json(); // Ahora siempre devuelve JSON
            
            // Mostrar mensaje del reparto
            alert(data.mensaje);
            
            // Si hay CSV, descargarlo
            if (data.hayCSV) {
              descargarCSV(data.csvContent, data.csvFilename);
            }
            
            cargarSalones();
          } else {
            const data = await res.json();
            alert(data.error || 'Error al repartir segunda tanda');
          }
        }
      };

      // Mensajes de ayuda
      const msg = document.createElement('div');
      msg.className = 'info-msg';
      if (!puedeRepartir) msg.textContent = motivo;
      else if (zonaPrimera && !zonaSegunda) msg.textContent = 'Primera tanda ya repartida. Puedes repartir la segunda.';
      else if (zonaPrimera && zonaSegunda) msg.textContent = 'Ambas tandas ya han sido repartidas.';

      row.appendChild(zonasList);
      row.appendChild(btnPrimera);
      row.appendChild(btnSegunda);
      // Solo añade el recuadro de mensaje si hay texto
      if (msg.textContent) row.appendChild(msg);
      salonesList.appendChild(row);
    });
  }

  // Modal zona (crear/editar)
  function abrirModalZona(salonId, zona = null) {
    currentSalonId = salonId;
    editZonaId = zona ? zona.id : null;
    document.getElementById('zona-nombre').value = zona ? zona.nombre : '';
    document.getElementById('zona-butacas').value = zona ? zona.butacas_reservadas : '';
    modalZonaBg.style.display = 'flex';
  }

  // Guardar zona (crear/editar)
  modalZonaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('zona-nombre').value.trim();
    const butacas_reservadas = Number(document.getElementById('zona-butacas').value);
    if (!nombre || !butacas_reservadas || !currentSalonId) {
      alert('Rellena todos los campos');
      return;
    }

    // Obtener el salón actual para comprobar el aforo
    const salon = Array.from(document.querySelectorAll('.salon-row')).find(row =>
      row.querySelector('.salon-header b').textContent ===
      document.querySelector('.salon-header b').textContent
    );
    const salonObj = window.__salonesCargados?.find(s => s.id === currentSalonId);
    //Pide los datos del salón al backend:
    let aforo_total = 0, aforo_ocupado = 0;
    if (salonObj) {
      aforo_total = salonObj.aforo_total;
      aforo_ocupado = salonObj.aforo_ocupado;
      // Si estamos editando una zona, restamos sus butacas previas
      if (editZonaId) {
        const zonaPrev = salonObj.zonas.find(z => z.id === editZonaId);
        if (zonaPrev) aforo_ocupado -= zonaPrev.butacas_reservadas;
      }
    } else {
      // Fallback: pedir al backend
      const res = await fetch(`/api/salones/all`, {
        headers: { 'Authorization': localStorage.getItem('adminToken') }
      });
      const salones = await res.json();
      const s = salones.find(s => s.id === currentSalonId);
      if (s) {
        aforo_total = s.aforo_total;
        aforo_ocupado = s.aforo_ocupado;
        if (editZonaId) {
          const zonaPrev = s.zonas.find(z => z.id === editZonaId);
          if (zonaPrev) aforo_ocupado -= zonaPrev.butacas_reservadas;
        }
      }
    }

    // Comprobación de aforo
    if (butacas_reservadas + aforo_ocupado > aforo_total) {
      alert('No se pueden reservar más butacas de las disponibles en el aforo total del salón.');
      return;
    }

    let res;
    if (editZonaId) {
      res = await fetch(`/api/zonas/${editZonaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('adminToken')
        },
        body: JSON.stringify({ nombre, butacas_reservadas })
      });
    } else {
      res = await fetch('/api/zonas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('adminToken')
        },
        body: JSON.stringify({ nombre, butacas_reservadas, salon_id: currentSalonId })
      });
    }
    if (res.ok) {
      modalZonaBg.style.display = 'none';
      cargarSalones();
    } else {
      const data = await res.json();
      alert(data.error || 'Error al guardar la zona');
    }
  });

  // Cancelar modal zona
  document.getElementById('cancelar-zona-modal').onclick = () => {
    modalZonaBg.style.display = 'none';
  };

  // Modal salón (crear/editar)
  function abrirModalSalon(salon = null) {
    editSalonId = salon ? salon.id : null;
    salonNombreInput.value = salon ? salon.nombre : '';
    salonAforoInput.value = salon ? salon.aforo_total : '';
    cargarGraduaciones().then(() => {
      salonGraduacionSelect.value = salon ? salon.graduacion_id : (graduaciones[0] ? graduaciones[0].id : '');
      salonGraduacionSelect.onchange();
      modalSalonBg.style.display = 'flex';
    });
  }

  // Guardar salón (crear/editar)
  modalSalonForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = salonNombreInput.value.trim();
    const aforo_total = Number(salonAforoInput.value);
    const graduacion_id = Number(salonGraduacionSelect.value);
    if (!nombre || !aforo_total || !graduacion_id) {
      alert('Rellena todos los campos');
      return;
    }
    let res;
    if (editSalonId) {
      res = await fetch(`/api/salones/${editSalonId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('adminToken')
        },
        body: JSON.stringify({ nombre, aforo_total, graduacion_id })
      });
    } else {
      res = await fetch('/api/salones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('adminToken')
        },
        body: JSON.stringify({ nombre, aforo_total, graduacion_id })
      });
    }
    if (res.ok) {
      modalSalonBg.style.display = 'none';
      cargarSalones();
    } else {
      const data = await res.json();
      alert(data.error || 'Error al guardar el salón');
    }
  });

  // Cancelar modal salón
  document.getElementById('cancelar-salon-modal').onclick = () => {
    modalSalonBg.style.display = 'none';
  };

  // Botón añadir salón
  addSalonLink.onclick = (e) => {
    e.preventDefault();
    abrirModalSalon();
  };

  cargarSalones();
});

// Función para descargar CSV
function descargarCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { 
    type: 'text/csv;charset=utf-8;' 
  });
  
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}