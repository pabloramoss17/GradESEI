USE graduacion;

-- Insertar graduación
INSERT INTO graduaciones (
    nombre, fecha, segundo_plazo_activado, max_acompanantes_por_alumno, registro_bloqueado
)
VALUES (
    'Graduación ESEI 2025', '2025-06-30', FALSE, 2, FALSE
);

-- Insertar salón vinculado a la graduación
INSERT INTO salones (
    nombre, aforo_total, fecha_acto, graduacion_id
)
VALUES (
    'Auditorio ESEI', 300, '2025-06-30', 1
);

-- Insertar zonas dentro del salón
INSERT INTO zonas (
    nombre, butacas_totales, butacas_libres, butacas_ocupadas, salon_id
)
VALUES
('Zona A', 100, 100, 0, 1),
('Zona B', 100, 100, 0, 1),
('Zona C', 100, 100, 0, 1);

-- Insertar titulación asociada a la graduación
INSERT INTO titulaciones (nombre, graduacion_id)
VALUES ('Enxeñaría Informática', 1);

-- Insertar alumnos de prueba con campos actualizados
-- Contraseña ya encriptada (hash de "Contrasena123")
INSERT INTO alumnos (
    DNI, nombre, apellidos, correo, telefono, contrasena, titulacion_id,
    acompanantes_solicitados, acompanantes_concedidos
)
VALUES
('12345678A', 'Ana', 'Pérez', 'ana.perez@uvigo.gal', '600000001',
 '$2a$10$Uvhd05Am0XRSbZjeDxoYQOC5KhMiF7GvFZK4vFoMFj/UsECZyL84W', 1, 2, 1),

('87654321B', 'Luis', 'Gómez', 'luis.gomez@esei.uvigo.es', '600000002',
 '$2a$10$Uvhd05Am0XRSbZjeDxoYQOC5KhMiF7GvFZK4vFoMFj/UsECZyL84W', 1, 1, 0);

-- Insertar administrador
INSERT INTO administradores (login, correo, password)
VALUES ('Administrador', 'admin@esei.uvigo.es', '$2b$10$QT9P6iM6MKbBErzMSJ8smOBQGlS16jFSPBQ28v1HwrfW.5YeZCCZW');
