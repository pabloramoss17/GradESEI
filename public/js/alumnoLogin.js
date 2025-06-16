document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById("loginForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const dni = document.getElementById("dni").value;
    const contrasena = document.getElementById("contrasena").value;

    try {
      const res = await fetch("/api/alumnos/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dni, contrasena }),
      });

      const data = await res.json();

      if (res.ok) {
        // Guardar el token JWT en localStorage o cookies
        localStorage.setItem('token', data.token);

        // Redirigir al alumno a main.html
        window.location.href = "/alumno/main.html";
      } else {
        alert(data.error || "Error al iniciar sesión");
      }
    } catch (error) {
      alert("Error de conexión con el servidor");
    }
  });
});
