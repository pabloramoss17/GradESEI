document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('adminLoginForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const login = document.getElementById('login').value.trim();
    const contrasena = document.getElementById('contrasena').value;

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, contrasena })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('adminToken', data.token);
        window.location.href = '/admin/main.html';
      } else {
        alert(data.error || 'Credenciales incorrectas');
      }
    } catch (err) {
      alert('Error al conectar con el servidor');
    }
  });
});