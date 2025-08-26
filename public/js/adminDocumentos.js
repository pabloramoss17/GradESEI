document.addEventListener('DOMContentLoaded', async () => {
  // Cargar actos de graduación
  const res = await fetch('/api/graduaciones', {
    headers: { 'Authorization': localStorage.getItem('adminToken') }
  });
  const actos = await res.json();
  const actosList = document.getElementById('actos-list');
  actosList.innerHTML = '';

  if (!actos.length) {
    actosList.innerHTML = '<div>No hay actos de graduación registrados.</div>';
    return;
  }

  const tiposDoc = [
    { tipo: 'diploma', label: 'Diplomas' },
    { tipo: 'entrada', label: 'Entradas' },
    { tipo: 'pegatina', label: 'Pegatinas' }
  ];

  for (const acto of actos) {
    const box = document.createElement('div');
    box.className = 'acto-box';

    // Título del acto
    const titulo = document.createElement('div');
    titulo.className = 'acto-titulo';
    titulo.textContent = acto.nombre || `Acto ${acto.id}`;
    box.appendChild(titulo);

    tiposDoc.forEach(doc => {
      const row = document.createElement('div');
      row.className = 'doc-row';

      // Etiqueta
      const label = document.createElement('label');
      label.textContent = doc.label;
      row.appendChild(label);

      // Input para subir plantilla
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.docx';
      fileInput.title = `Subir plantilla Word para ${doc.label}`;
      row.appendChild(fileInput);

      // Botón subir plantilla
      const uploadBtn = document.createElement('button');
      uploadBtn.className = 'icon-btn';
      uploadBtn.innerHTML = '&#128190;';
      uploadBtn.title = 'Subir plantilla';
      uploadBtn.onclick = async () => {
        if (!fileInput.files.length) {
          alert('Selecciona un archivo Word (.docx)');
          return;
        }
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '⏳';
        const formData = new FormData();
        formData.append('plantilla', fileInput.files[0]);
        const res = await fetch(`/api/documentos/plantilla/${acto.id}?tipo=${doc.tipo}`, {
          method: 'POST',
          headers: { 'Authorization': localStorage.getItem('adminToken') },
          body: formData
        });
        if (res.ok) {
          alert('Plantilla subida correctamente');
        } else {
          alert('Error al subir la plantilla');
        }
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '&#128190;';
      };
      row.appendChild(uploadBtn);

      // Botón generar documentos Word personalizados
      const genWordBtn = document.createElement('button');
      genWordBtn.className = 'icon-btn';
      genWordBtn.innerHTML = '&#128209;';
      genWordBtn.title = `Descargar documentos Word personalizados (${doc.label})`;
      genWordBtn.onclick = async () => {
        genWordBtn.disabled = true;
        genWordBtn.innerHTML = '⏳';
        const res = await fetch(`/api/documentos/word/${acto.id}?tipo=${doc.tipo}`, {
          headers: { 'Authorization': localStorage.getItem('adminToken') }
        });
        if (res.ok) {
          const blob = await res.blob();
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `${acto.nombre}_${doc.label}_documentos.docx`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          alert('Error al generar los documentos Word');
        }
        genWordBtn.disabled = false;
        genWordBtn.innerHTML = '&#128209;';
      };
      row.appendChild(genWordBtn);

      box.appendChild(row);
    });

    actosList.appendChild(box);
  }
});