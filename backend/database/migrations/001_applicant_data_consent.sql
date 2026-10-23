CREATE TABLE IF NOT EXISTS aspirante_autorizaciones_datos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  aspirante_id BIGINT NOT NULL UNIQUE
    REFERENCES aspirantes (id) ON DELETE RESTRICT,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
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
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT aspirante_autorizaciones_datos_estado_check CHECK (
    (
      estado = 'pendiente'
      AND token_hash IS NOT NULL
      AND expira_en IS NOT NULL
      AND firmada_en IS NULL
      AND firma_data_url IS NULL
      AND cedula_confirmada IS NULL
    )
    OR
    (
      estado = 'vencida'
      AND token_hash IS NOT NULL
      AND expira_en IS NOT NULL
      AND firmada_en IS NULL
      AND firma_data_url IS NULL
      AND cedula_confirmada IS NULL
    )
    OR
    (
      estado = 'firmada'
      AND token_hash IS NULL
      AND expira_en IS NULL
      AND firmada_en IS NOT NULL
      AND firma_data_url IS NOT NULL
      AND cedula_confirmada IS NOT NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS aspirante_autorizaciones_datos_estado_idx
  ON aspirante_autorizaciones_datos (estado, expira_en);

ALTER TABLE aspirante_autorizaciones_datos
  ALTER COLUMN enviada_en DROP NOT NULL,
  ALTER COLUMN enviada_en DROP DEFAULT;
