-- Diagrama estructural para importar en dbdiagram.io.
-- Contiene tablas, claves primarias, unicidad y relaciones.
-- Omite valores por defecto, checks e índices operativos no necesarios para el ER.
-- Este archivo es solo para diagramar; no lo ejecutes para crear/actualizar la base.

CREATE TABLE usuarios (
  id BIGINT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  numero_celular VARCHAR(30) NOT NULL,
  numero_cedula VARCHAR(30) NOT NULL UNIQUE,
  correo VARCHAR(254) NOT NULL,
  contrasena_hash TEXT NOT NULL,
  rol VARCHAR(20) NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL,
  actualizado_en TIMESTAMPTZ NOT NULL
);

CREATE TABLE aspirantes (
  id BIGINT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  numero_cedula VARCHAR(30) NOT NULL UNIQUE,
  numero_celular VARCHAR(30) NOT NULL,
  correo VARCHAR(254) NOT NULL,
  creado_por_usuario_id BIGINT NOT NULL REFERENCES usuarios(id),
  creado_en TIMESTAMPTZ NOT NULL,
  actualizado_en TIMESTAMPTZ NOT NULL
);

CREATE TABLE preguntas16pf (
  id BIGINT PRIMARY KEY,
  pregunta TEXT NOT NULL,
  opcion_a TEXT NOT NULL,
  opcion_b TEXT NOT NULL,
  opcion_c TEXT NOT NULL,
  orden INTEGER NOT NULL UNIQUE,
  activa BOOLEAN NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL,
  actualizado_en TIMESTAMPTZ NOT NULL
);

CREATE TABLE pruebas16pf_intentos (
  id BIGINT PRIMARY KEY,
  aspirante_id BIGINT NOT NULL UNIQUE REFERENCES aspirantes(id),
  estado VARCHAR(20) NOT NULL,
  iniciada_en TIMESTAMPTZ,
  completada_en TIMESTAMPTZ,
  invitacion_token_hash CHAR(64) UNIQUE,
  invitacion_expira_en TIMESTAMPTZ,
  invitacion_enviada_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL,
  actualizado_en TIMESTAMPTZ NOT NULL
);

CREATE TABLE pruebas16pf_intento_preguntas (
  intento_id BIGINT NOT NULL REFERENCES pruebas16pf_intentos(id),
  pregunta_id BIGINT NOT NULL REFERENCES preguntas16pf(id),
  orden INTEGER NOT NULL,
  pregunta TEXT NOT NULL,
  opcion_a TEXT NOT NULL,
  opcion_b TEXT NOT NULL,
  opcion_c TEXT NOT NULL,
  PRIMARY KEY (intento_id, pregunta_id),
  UNIQUE (intento_id, orden)
);

CREATE TABLE pruebas16pf_respuestas (
  id BIGINT PRIMARY KEY,
  intento_id BIGINT NOT NULL REFERENCES pruebas16pf_intentos(id),
  pregunta_id BIGINT NOT NULL REFERENCES preguntas16pf(id),
  opcion_elegida CHAR(1) NOT NULL,
  respondida_en TIMESTAMPTZ NOT NULL,
  actualizado_en TIMESTAMPTZ NOT NULL,
  UNIQUE (intento_id, pregunta_id)
);

CREATE TABLE pruebas16pf_login_bloqueos (
  ip_hash CHAR(64) PRIMARY KEY,
  intentos_fallidos SMALLINT NOT NULL,
  ventana_inicia_en TIMESTAMPTZ NOT NULL,
  bloqueado_hasta TIMESTAMPTZ,
  actualizado_en TIMESTAMPTZ NOT NULL
);

CREATE TABLE aspirante_autorizaciones_datos (
  id BIGINT PRIMARY KEY,
  aspirante_id BIGINT NOT NULL UNIQUE REFERENCES aspirantes(id),
  estado VARCHAR(20) NOT NULL,
  token_hash CHAR(64) UNIQUE,
  expira_en TIMESTAMPTZ,
  nombre_aspirante VARCHAR(100) NOT NULL,
  apellido_aspirante VARCHAR(100) NOT NULL,
  cedula_aspirante VARCHAR(30) NOT NULL,
  correo_aspirante VARCHAR(254) NOT NULL,
  version_texto VARCHAR(50) NOT NULL,
  texto_aceptado TEXT NOT NULL,
  cedula_confirmada VARCHAR(30),
  firma_data_url TEXT,
  enviada_en TIMESTAMPTZ,
  firmada_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL,
  actualizado_en TIMESTAMPTZ NOT NULL
);

CREATE TABLE vacantes (
  id BIGINT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  activa BOOLEAN NOT NULL,
  creado_por_usuario_id BIGINT NOT NULL REFERENCES usuarios(id),
  creado_en TIMESTAMPTZ NOT NULL,
  actualizado_en TIMESTAMPTZ NOT NULL
);

CREATE TABLE killer_questions (
  id BIGINT PRIMARY KEY,
  vacante_id BIGINT NOT NULL REFERENCES vacantes(id),
  nombre VARCHAR(500) NOT NULL,
  respuesta_esperada VARCHAR(2) NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL
);

CREATE TABLE requisitos (
  id BIGINT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  creado_en TIMESTAMPTZ NOT NULL
);

CREATE TABLE vacante_requisitos (
  vacante_id BIGINT NOT NULL REFERENCES vacantes(id),
  requisito_id BIGINT NOT NULL REFERENCES requisitos(id),
  obligatorio BOOLEAN NOT NULL,
  peso SMALLINT,
  creado_en TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (vacante_id, requisito_id)
);

CREATE TABLE postulaciones (
  id BIGINT PRIMARY KEY,
  aspirante_id BIGINT NOT NULL REFERENCES aspirantes(id),
  vacante_id BIGINT NOT NULL REFERENCES vacantes(id),
  estado VARCHAR(30) NOT NULL,
  descripcion TEXT,
  paso BOOLEAN,
  cv_ruta TEXT,
  creado_por_usuario_id BIGINT NOT NULL REFERENCES usuarios(id),
  creado_en TIMESTAMPTZ NOT NULL,
  actualizado_en TIMESTAMPTZ NOT NULL,
  UNIQUE (aspirante_id, vacante_id)
);

CREATE TABLE agenda_plantilla_horarios (
  id BIGINT PRIMARY KEY,
  hora TIME NOT NULL UNIQUE,
  cupos SMALLINT NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL,
  actualizado_en TIMESTAMPTZ NOT NULL
);

CREATE TABLE agenda_fechas_generadas (
  fecha DATE PRIMARY KEY,
  generado_en TIMESTAMPTZ NOT NULL
);

CREATE TABLE agenda_horarios (
  id BIGINT PRIMARY KEY,
  fecha DATE NOT NULL REFERENCES agenda_fechas_generadas(fecha),
  hora TIME NOT NULL,
  cupos SMALLINT NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL,
  actualizado_en TIMESTAMPTZ NOT NULL,
  UNIQUE (fecha, hora)
);

CREATE TABLE agenda_asignaciones (
  id BIGINT PRIMARY KEY,
  agenda_horario_id BIGINT NOT NULL REFERENCES agenda_horarios(id),
  aspirante_id BIGINT NOT NULL UNIQUE REFERENCES aspirantes(id),
  creado_en TIMESTAMPTZ NOT NULL
);
