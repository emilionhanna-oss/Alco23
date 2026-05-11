CREATE TABLE IF NOT EXISTS sedes (id SERIAL PRIMARY KEY, nombre VARCHAR(100) NOT NULL UNIQUE, region VARCHAR(100)); INSERT INTO sedes (nombre, region) VALUES ('Hualpen (Region del Biobio)', 'Region del Biobio'), ('Coyhaique (Region de Aysen)', 'Region de Aysen') ON CONFLICT (nombre) DO NOTHING; 
CREATE TABLE IF NOT EXISTS usuarios (id SERIAL PRIMARY KEY, email VARCHAR(255) NOT NULL UNIQUE, password_hash VARCHAR(128) NOT NULL, password_salt VARCHAR(64) NOT NULL, nombre_completo VARCHAR(150) NOT NULL, nombre VARCHAR(60), rut VARCHAR(12) NOT NULL UNIQUE, genero VARCHAR(20) NOT NULL, sede_id INT REFERENCES sedes(id) ON UPDATE CASCADE ON DELETE SET NULL, cargo VARCHAR(120), estado VARCHAR(20) NOT NULL DEFAULT 'pendiente', fecha_registro TIMESTAMP NOT NULL DEFAULT NOW(), fecha_expiracion TIMESTAMP, firma_texto TEXT, firma_imagen_data_url TEXT); 
CREATE TABLE IF NOT EXISTS usuario_roles (id SERIAL PRIMARY KEY, usuario_id INT NOT NULL REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE, rol VARCHAR(20) NOT NULL, UNIQUE (usuario_id, rol)); 
CREATE TABLE IF NOT EXISTS aprobaciones_cuenta (id SERIAL PRIMARY KEY, usuario_id INT NOT NULL REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE, admin_id INT REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL, accion VARCHAR(20) NOT NULL, fecha TIMESTAMP NOT NULL DEFAULT NOW(), nota TEXT); 
CREATE TABLE IF NOT EXISTS sesiones_jwt (id SERIAL PRIMARY KEY, usuario_id INT NOT NULL REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE, jti VARCHAR(64) NOT NULL UNIQUE, emitido_en TIMESTAMP NOT NULL, expira_en TIMESTAMP NOT NULL, revocado BOOLEAN NOT NULL DEFAULT FALSE); 
CREATE TABLE IF NOT EXISTS cursos (id SERIAL PRIMARY KEY, titulo VARCHAR(200) NOT NULL, descripcion TEXT, imagen_url VARCHAR(500), instructor_id INT REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL, publicado BOOLEAN NOT NULL DEFAULT FALSE, creado_en TIMESTAMP NOT NULL DEFAULT NOW(), actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()); 
CREATE TABLE IF NOT EXISTS modulos (id SERIAL PRIMARY KEY, curso_id INT NOT NULL REFERENCES cursos(id) ON UPDATE CASCADE ON DELETE CASCADE, titulo VARCHAR(200) NOT NULL, tipo VARCHAR(30) NOT NULL, contenido JSONB, material_url VARCHAR(500), orden SMALLINT NOT NULL DEFAULT 0); 
CREATE TABLE IF NOT EXISTS inscripciones (id SERIAL PRIMARY KEY, usuario_id INT NOT NULL REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE, curso_id INT NOT NULL REFERENCES cursos(id) ON UPDATE CASCADE ON DELETE CASCADE, inscrito_en TIMESTAMP NOT NULL DEFAULT NOW(), UNIQUE (usuario_id, curso_id)); 
CREATE TABLE IF NOT EXISTS progreso_modulos (id SERIAL PRIMARY KEY, usuario_id INT NOT NULL REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE, modulo_id INT NOT NULL REFERENCES modulos(id) ON UPDATE CASCADE ON DELETE CASCADE, completado BOOLEAN NOT NULL DEFAULT FALSE, completado_en TIMESTAMP, UNIQUE (usuario_id, modulo_id)); 
CREATE TABLE IF NOT EXISTS intentos_quiz (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE,
  modulo_id INT NOT NULL REFERENCES modulos(id) ON UPDATE CASCADE ON DELETE CASCADE,
  intento_numero INT NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'en_progreso',
  puntuacion INT DEFAULT 0,
  iniciado_en TIMESTAMP DEFAULT NOW(),
  completado_en TIMESTAMP,
  tiempo_utilizado_segundos INT,
  fecha_desbloq_temporal TIMESTAMP,
  UNIQUE (usuario_id, modulo_id, intento_numero)
);

CREATE TABLE IF NOT EXISTS respuestas_quiz (id SERIAL PRIMARY KEY, usuario_id INT NOT NULL REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE, modulo_id INT NOT NULL REFERENCES modulos(id) ON UPDATE CASCADE ON DELETE CASCADE, intento_id INT REFERENCES intentos_quiz(id) ON UPDATE CASCADE ON DELETE CASCADE, respuesta JSONB NOT NULL, calificado BOOLEAN DEFAULT FALSE, enviado_en TIMESTAMP NOT NULL DEFAULT NOW());

CREATE TABLE IF NOT EXISTS practica_presencial_evaluaciones (id SERIAL PRIMARY KEY, usuario_id INT NOT NULL REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE, modulo_id INT NOT NULL REFERENCES modulos(id) ON UPDATE CASCADE ON DELETE CASCADE, estado VARCHAR(20) NOT NULL DEFAULT 'pendiente', notas TEXT, evaluado_en TIMESTAMP, UNIQUE (usuario_id, modulo_id));


CREATE TABLE IF NOT EXISTS certificados_emitidos (id SERIAL PRIMARY KEY, hash VARCHAR(64) UNIQUE NOT NULL, usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE, curso_id INT REFERENCES cursos(id) ON DELETE CASCADE, emitido_en TIMESTAMP DEFAULT NOW());

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Nota: Los usuarios iniciales se crean mediante el seeder (seed.js)
-- que hashea las contraseñas correctamente con scryptSync.
-- No insertamos usuarios aquí en el schema.

-- Buscar usuarios por email (login)
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- Buscar usuarios por estado (listar pendientes, activos)
CREATE INDEX IF NOT EXISTS idx_usuarios_estado ON usuarios(estado);

-- Buscar usuarios por sede (filtrar por sede)
CREATE INDEX IF NOT EXISTS idx_usuarios_sede_id ON usuarios(sede_id);

-- Buscar roles de un usuario (se hace en cada request autenticado)
CREATE INDEX IF NOT EXISTS idx_usuario_roles_usuario_id ON usuario_roles(usuario_id);

-- Buscar cursos de un instructor
CREATE INDEX IF NOT EXISTS idx_cursos_instructor_id ON cursos(instructor_id);

-- Buscar módulos de un curso (se hace en cada GET de curso)
CREATE INDEX IF NOT EXISTS idx_modulos_curso_id ON modulos(curso_id);

-- Buscar inscripciones de un usuario (listar sus cursos)
CREATE INDEX IF NOT EXISTS idx_inscripciones_usuario_id ON inscripciones(usuario_id);

-- Buscar inscripciones de un curso (listar sus alumnos)
CREATE INDEX IF NOT EXISTS idx_inscripciones_curso_id ON inscripciones(curso_id);

-- Buscar progreso de un usuario
CREATE INDEX IF NOT EXISTS idx_progreso_usuario_id ON progreso_modulos(usuario_id);

-- Buscar respuestas de quiz por usuario y módulo
CREATE INDEX IF NOT EXISTS idx_respuestas_usuario_id ON respuestas_quiz(usuario_id);

