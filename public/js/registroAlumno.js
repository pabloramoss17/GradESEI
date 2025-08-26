document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registroForm");

  // Cargar titulaciones en el <select>
  fetch('/api/titulaciones')
    .then(response => response.json())
    .then(data => {
      const select = document.getElementById("titulacion");
      data.forEach(titulacion => {
        const option = document.createElement("option");
        option.value = titulacion.id;
        option.textContent = titulacion.nombre;
        select.appendChild(option);
      });
    })
    .catch(err => {
      console.error("Error al cargar titulaciones:", err);
      alert("No se pudieron cargar las titulaciones");
    });

  // Lógica de registro
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const correo = document.getElementById("correo").value.trim();
    const nombre = document.getElementById("nombre").value.trim();
    const apellidos = document.getElementById("apellidos").value.trim();
    const telefono = document.getElementById("telefono").value.trim();
    const dni = document.getElementById("dni").value.trim();
    const titulacion = document.getElementById("titulacion").value;
    const acompanantes = document.getElementById("acompanantes").value;
    const contrasena = document.getElementById("contrasena").value;
    const repetir = document.getElementById("repetir").value;

    const dominiosValidos = ["@esei.uvigo.gal", "@alumnado.uvigo.gal"];
    const esCorreoValido = dominiosValidos.some(d => correo.endsWith(d));

    if (!esCorreoValido) {
      alert("Correo no válido. Usa uno institucional como:\n" + dominiosValidos.join(" o "));
      return;
    }

    if (contrasena !== repetir) {
      alert("Las contraseñas no coinciden.");
      return;
    }

    const contraseñaSeguraRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;
    if (!contraseñaSeguraRegex.test(contrasena)) {
      alert("La contraseña debe tener entre 6 y 20 caracteres, incluir al menos una letra mayúscula, una minúscula y un número.");
      return;
    }

    if (!nombre || !apellidos || !telefono || !dni || !titulacion) {
      alert("Todos los campos son obligatorios.");
      return;
    }

    try {
      // 1. Obtener la titulación
      const resTitulacion = await fetch(`/api/titulaciones/${titulacion}`);
      const datosTitulacion = await resTitulacion.json();
      if (!datosTitulacion.graduacion_id) {
        alert("No hay acto de graduación asociado a esta titulación. No es posible registrarse.");
        return;
      }

      // 2. Obtener la graduación asociada
      const resGraduacion = await fetch(`/api/graduaciones/${datosTitulacion.graduacion_id}`);
      const datosGraduacion = await resGraduacion.json();
      const graduacion = datosGraduacion.graduacion || datosGraduacion; // según cómo devuelvas el objeto

      // 3. Comprobar si el registro está bloqueado
      if (graduacion.registro_bloqueado) {
        alert("El registro está bloqueado para esta titulación. No es posible registrarse.");
        return;
      }
    } catch (err) {
      alert("No se pudo comprobar el estado de la titulación. Inténtalo más tarde.");
      return;
    }

    try {
      const res = await fetch("/api/alumnos/registro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          correo,
          nombre,
          apellidos,
          telefono,
          dni,
          titulacion,
          acompanantes_solicitados: acompanantes,
          contrasena
        })
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);
        window.location.href = "/alumno/main.html";
      } else {
        alert(data.error || "Error al registrarse");
      }
    } catch (error) {
      alert("Error de conexión con el servidor");
    }
  });
});
