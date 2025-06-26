CREATE DATABASE IF NOT EXISTS graduacion;
USE graduacion;

CREATE TABLE graduaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL UNIQUE,
    fecha DATE NOT NULL,
    segundo_plazo_activado BOOLEAN DEFAULT FALSE,
    max_acompanantes_por_alumno INT DEFAULT 1,
    registro_bloqueado BOOLEAN DEFAULT FALSE
);

CREATE TABLE salones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    aforo_total INT NOT NULL,
    fecha_acto DATE NOT NULL,
    graduacion_id INT,
    FOREIGN KEY (graduacion_id) REFERENCES graduaciones(id) ON DELETE SET NULL
);

CREATE TABLE zonas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    butacas_totales INT NOT NULL,
    butacas_libres INT NOT NULL,
    butacas_ocupadas INT NOT NULL,
    salon_id INT NOT NULL,
    FOREIGN KEY (salon_id) REFERENCES salones(id) ON DELETE CASCADE
);

CREATE TABLE titulaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    siglas VARCHAR(20) NOT NULL,
    graduacion_id INT NULL,
    FOREIGN KEY (graduacion_id) REFERENCES graduaciones(id) ON DELETE CASCADE
);

CREATE TABLE alumnos (
    DNI VARCHAR(20) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    correo VARCHAR(150) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    contrasena VARCHAR(255) NOT NULL,
    titulacion_id INT NOT NULL,
    acompanantes_solicitados INT DEFAULT 0,
    acompanantes_concedidos INT DEFAULT 0,
    reset_token VARCHAR(100) NULL,
    reset_expires BIGINT NULL,
    FOREIGN KEY (titulacion_id) REFERENCES titulaciones(id)
);

CREATE TABLE administradores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    login VARCHAR(100) NOT NULL,
    correo VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);

DELIMITER $$

CREATE TRIGGER evitar_eliminacion_titulacion
BEFORE DELETE ON titulaciones
FOR EACH ROW
BEGIN
    DECLARE num_alumnos INT;
    SELECT COUNT(*) INTO num_alumnos FROM alumnos WHERE titulacion_id = OLD.id;
    IF num_alumnos > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No se puede eliminar la titulación porque hay alumnos asociados a ella';
    END IF;
END$$

DELIMITER ;



