-- Migration: 001_create_quiz_system.sql
-- Description: Crear tablas e índices para sistema de evaluaciones interactivas
-- Date: 2026-05-09

-- Tabla: intentos_quiz
-- Registra cada intento de un usuario en un quiz
CREATE TABLE IF NOT EXISTS intentos_quiz (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE,
  modulo_id INT NOT NULL REFERENCES modulos(id) ON UPDATE CASCADE ON DELETE CASCADE,
  intento_numero INT NOT NULL CHECK (intento_numero IN (1, 2)),
  puntuacion INT CHECK (puntuacion IS NULL OR (puntuacion >= 0 AND puntuacion <= 100)),
  estado VARCHAR(20) NOT NULL DEFAULT 'en_progreso' CHECK (estado IN ('en_progreso', 'completado', 'reprobado', 'bloqueado')),
  iniciado_en TIMESTAMP NOT NULL DEFAULT NOW(),
  completado_en TIMESTAMP,
  fecha_desbloq_temporal TIMESTAMP,
  tiempo_utilizado_segundos INT,
  UNIQUE (usuario_id, modulo_id, intento_numero)
);

-- Índices para intentos_quiz
CREATE INDEX IF NOT EXISTS idx_intentos_usuario_id ON intentos_quiz(usuario_id);
CREATE INDEX IF NOT EXISTS idx_intentos_modulo_id ON intentos_quiz(modulo_id);
CREATE INDEX IF NOT EXISTS idx_intentos_estado ON intentos_quiz(estado);
CREATE INDEX IF NOT EXISTS idx_intentos_fecha_desbloq ON intentos_quiz(fecha_desbloq_temporal);

-- Alterar tabla respuestas_quiz (agregar campos si no existen)
ALTER TABLE respuestas_quiz 
ADD COLUMN IF NOT EXISTS intento_id INT REFERENCES intentos_quiz(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE respuestas_quiz
ADD COLUMN IF NOT EXISTS calificado BOOLEAN DEFAULT FALSE;

-- Índice para respuestas_quiz por intento
CREATE INDEX IF NOT EXISTS idx_respuestas_intento_id ON respuestas_quiz(intento_id);

-- Alterar tabla modulos (agregar campos de configuración si no existen)
ALTER TABLE modulos
ADD COLUMN IF NOT EXISTS calificacion_minima INT DEFAULT 60 CHECK (calificacion_minima >= 0 AND calificacion_minima <= 100);

ALTER TABLE modulos
ADD COLUMN IF NOT EXISTS tiempo_limite_minutos INT CHECK (tiempo_limite_minutos IS NULL OR tiempo_limite_minutos > 0);

-- Índice para búsquedas de módulos por tipo
CREATE INDEX IF NOT EXISTS idx_modulos_tipo ON modulos(tipo);
