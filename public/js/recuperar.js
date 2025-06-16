document.getElementById('recuperarForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const correo = document.getElementById('correo').value.trim();
  try {
    const res = await fetch('/api/alumnos/recuperar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo })
    });
    const data = await res.json();
    if (res.ok) {
      alert('Revisa tu correo para restablecer la contraseña.');
      window.location.href = '/alumno/login.html';
    } else {
      alert(data.error || 'Error al enviar el correo');
    }
  } catch (err) {
    alert('Error al conectar con el servidor');
  }
});