document.getElementById('resetForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const nuevaContrasena = document.getElementById('nuevaContrasena').value;
  const repiteContrasena = document.getElementById('repiteContrasena').value;

  if (nuevaContrasena !== repiteContrasena) {
    alert('Las contraseñas no coinciden');
    return;
  }

  // Validación de contraseña segura (igual que en el registro)
  const contraseñaSeguraRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;
  if (!contraseñaSeguraRegex.test(nuevaContrasena)) {
    alert("La contraseña debe tener entre 6 y 20 caracteres, incluir al menos una letra mayúscula, una minúscula y un número.");
    return;
  }

  try {
    const res = await fetch('/api/alumnos/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, nuevaContrasena })
    });
    const data = await res.json();
    if (res.ok) {
      alert('Contraseña restablecida correctamente');
      window.location.href = '/alumno/login.html';
    } else {
      alert(data.error || 'Error al restablecer la contraseña');
    }
  } catch (err) {
    alert('Error al conectar con el servidor');
  }
});