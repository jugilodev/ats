ALTER TABLE pruebas16pf_intentos
  DROP CONSTRAINT IF EXISTS pruebas16pf_intentos_estado_check;

ALTER TABLE pruebas16pf_intentos
  ADD COLUMN IF NOT EXISTS invitacion_token_hash CHAR(64) UNIQUE,
  ADD COLUMN IF NOT EXISTS invitacion_expira_en TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invitacion_enviada_en TIMESTAMPTZ;

ALTER TABLE pruebas16pf_intentos
  ALTER COLUMN estado SET DEFAULT 'invitada',
  ALTER COLUMN iniciada_en DROP NOT NULL,
  ALTER COLUMN iniciada_en DROP DEFAULT;

UPDATE pruebas16pf_intentos
SET estado = 'en_progreso'
WHERE estado = 'invitada' AND iniciada_en IS NOT NULL;

ALTER TABLE pruebas16pf_intentos
  ADD CONSTRAINT pruebas16pf_intentos_estado_check CHECK (
    (estado = 'invitada' AND iniciada_en IS NULL AND completada_en IS NULL)
    OR
    (estado = 'en_progreso' AND iniciada_en IS NOT NULL AND completada_en IS NULL)
    OR
    (estado = 'completada' AND iniciada_en IS NOT NULL AND completada_en IS NOT NULL)
  );

CREATE TABLE IF NOT EXISTS pruebas16pf_intento_preguntas (
  intento_id BIGINT NOT NULL
    REFERENCES pruebas16pf_intentos (id) ON DELETE RESTRICT,
  pregunta_id BIGINT NOT NULL
    REFERENCES preguntas16pf (id) ON DELETE RESTRICT,
  orden INTEGER NOT NULL CHECK (orden > 0),
  pregunta TEXT NOT NULL,
  opcion_a TEXT NOT NULL,
  opcion_b TEXT NOT NULL,
  opcion_c TEXT NOT NULL,
  PRIMARY KEY (intento_id, pregunta_id),
  CONSTRAINT pruebas16pf_intento_preguntas_orden_unique
    UNIQUE (intento_id, orden)
);

CREATE TABLE IF NOT EXISTS pruebas16pf_login_bloqueos (
  ip_hash CHAR(64) PRIMARY KEY,
  intentos_fallidos SMALLINT NOT NULL DEFAULT 0
    CHECK (intentos_fallidos BETWEEN 0 AND 10),
  ventana_inicia_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  bloqueado_hasta TIMESTAMPTZ,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pruebas16pf_intentos_invitacion_expira_idx
  ON pruebas16pf_intentos (invitacion_expira_en)
  WHERE estado <> 'completada';

CREATE INDEX IF NOT EXISTS pruebas16pf_intento_preguntas_orden_idx
  ON pruebas16pf_intento_preguntas (intento_id, orden);
