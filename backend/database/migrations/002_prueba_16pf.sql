CREATE TABLE IF NOT EXISTS preguntas16pf (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pregunta TEXT NOT NULL CHECK (BTRIM(pregunta) <> ''),
  opcion_a TEXT NOT NULL CHECK (BTRIM(opcion_a) <> ''),
  opcion_b TEXT NOT NULL CHECK (BTRIM(opcion_b) <> ''),
  opcion_c TEXT NOT NULL CHECK (BTRIM(opcion_c) <> ''),
  orden INTEGER NOT NULL UNIQUE CHECK (orden > 0),
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT preguntas16pf_opciones_distintas_check CHECK (
    LOWER(BTRIM(opcion_a)) <> LOWER(BTRIM(opcion_b))
    AND LOWER(BTRIM(opcion_a)) <> LOWER(BTRIM(opcion_c))
    AND LOWER(BTRIM(opcion_b)) <> LOWER(BTRIM(opcion_c))
  )
);

CREATE TABLE IF NOT EXISTS pruebas16pf_intentos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  aspirante_id BIGINT NOT NULL UNIQUE
    REFERENCES aspirantes (id) ON DELETE RESTRICT,
  estado VARCHAR(20) NOT NULL DEFAULT 'en_progreso',
  iniciada_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completada_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pruebas16pf_intentos_estado_check CHECK (
    (estado = 'en_progreso' AND completada_en IS NULL)
    OR
    (estado = 'completada' AND completada_en IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS pruebas16pf_respuestas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  intento_id BIGINT NOT NULL
    REFERENCES pruebas16pf_intentos (id) ON DELETE RESTRICT,
  pregunta_id BIGINT NOT NULL
    REFERENCES preguntas16pf (id) ON DELETE RESTRICT,
  opcion_elegida CHAR(1) NOT NULL
    CHECK (opcion_elegida IN ('A', 'B', 'C')),
  respondida_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pruebas16pf_respuestas_intento_pregunta_unique
    UNIQUE (intento_id, pregunta_id)
);

CREATE INDEX IF NOT EXISTS preguntas16pf_activas_orden_idx
  ON preguntas16pf (orden)
  WHERE activa = TRUE;

CREATE INDEX IF NOT EXISTS pruebas16pf_intentos_estado_idx
  ON pruebas16pf_intentos (estado, iniciada_en);

CREATE INDEX IF NOT EXISTS pruebas16pf_respuestas_pregunta_idx
  ON pruebas16pf_respuestas (pregunta_id, intento_id);
