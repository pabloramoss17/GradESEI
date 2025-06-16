USE graduacion;

-- Eliminar en orden inverso de dependencias para evitar errores de claves foráneas
DELETE FROM alumnos;
DELETE FROM administradores;
DELETE FROM zonas;
DELETE FROM salones;
DELETE FROM titulaciones;
DELETE FROM graduaciones;

-- Reiniciar contadores AUTO_INCREMENT (aunque algunos no se usen por tener claves no numéricas)
ALTER TABLE graduaciones AUTO_INCREMENT = 1;
ALTER TABLE salones AUTO_INCREMENT = 1;
ALTER TABLE zonas AUTO_INCREMENT = 1;
ALTER TABLE titulaciones AUTO_INCREMENT = 1;
ALTER TABLE administradores AUTO_INCREMENT = 1;
