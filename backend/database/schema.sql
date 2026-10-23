CREATE TABLE IF NOT EXISTS usuarios (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL CHECK (BTRIM(nombre) <> ''),
  apellido VARCHAR(100) NOT NULL CHECK (BTRIM(apellido) <> ''),
  numero_celular VARCHAR(30) NOT NULL CHECK (BTRIM(numero_celular) <> ''),
  numero_cedula VARCHAR(30) NOT NULL CHECK (BTRIM(numero_cedula) <> ''),
  correo VARCHAR(254) NOT NULL CHECK (BTRIM(correo) <> ''),
  -- Guardar aquí únicamente el hash generado por el backend, nunca la contraseña original.
  contrasena_hash TEXT NOT NULL,
  rol VARCHAR(20) NOT NULL DEFAULT 'reclutador'
    CHECK (rol IN ('admin', 'reclutador')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT usuarios_numero_cedula_unique UNIQUE (numero_cedula)
);

CREATE UNIQUE INDEX IF NOT EXISTS usuarios_correo_lower_unique
  ON usuarios (LOWER(correo));

  
CREATE TABLE IF NOT EXISTS aspirantes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL CHECK (BTRIM(nombre) <> ''),
  apellido VARCHAR(100) NOT NULL CHECK (BTRIM(apellido) <> ''),
  numero_cedula VARCHAR(30) NOT NULL UNIQUE CHECK (BTRIM(numero_cedula) <> ''),
  numero_celular VARCHAR(30) NOT NULL CHECK (BTRIM(numero_celular) <> ''),
  correo VARCHAR(254) NOT NULL CHECK (BTRIM(correo) <> ''),
  creado_por_usuario_id BIGINT NOT NULL
    REFERENCES usuarios (id) ON DELETE RESTRICT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS aspirantes_correo_lower_idx
  ON aspirantes (LOWER(correo));

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

CREATE TABLE IF NOT EXISTS vacantes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL CHECK (BTRIM(nombre) <> ''),
  descripcion TEXT,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  creado_por_usuario_id BIGINT NOT NULL
    REFERENCES usuarios (id) ON DELETE RESTRICT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS killer_questions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  vacante_id BIGINT NOT NULL
    REFERENCES vacantes (id) ON DELETE CASCADE,
  nombre VARCHAR(500) NOT NULL CHECK (BTRIM(nombre) <> ''),
  respuesta_esperada VARCHAR(2) NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  ALTER TABLE killer_questions
    DROP CONSTRAINT IF EXISTS killer_questions_respuesta_esperada_check;

  IF (
    SELECT data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'killer_questions'
      AND column_name = 'respuesta_esperada'
  ) = 'boolean' THEN
    ALTER TABLE killer_questions
      ALTER COLUMN respuesta_esperada TYPE VARCHAR(2)
      USING CASE WHEN respuesta_esperada THEN 'si' ELSE 'no' END;
  ELSE
    UPDATE killer_questions
    SET respuesta_esperada = CASE LOWER(BTRIM(respuesta_esperada))
      WHEN 'true' THEN 'si'
      WHEN 'sí' THEN 'si'
      WHEN 'false' THEN 'no'
      ELSE LOWER(BTRIM(respuesta_esperada))
    END;

    ALTER TABLE killer_questions
      ALTER COLUMN respuesta_esperada TYPE VARCHAR(2)
      USING LOWER(BTRIM(respuesta_esperada));
  END IF;

  ALTER TABLE killer_questions
    ADD CONSTRAINT killer_questions_respuesta_esperada_check
    CHECK (respuesta_esperada IN ('si', 'no'));
END $$;

CREATE INDEX IF NOT EXISTS killer_questions_vacante_idx
  ON killer_questions (vacante_id, id);

CREATE TABLE IF NOT EXISTS requisitos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL CHECK (BTRIM(nombre) <> ''),
  descripcion TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS requisitos_nombre_lower_unique
  ON requisitos (LOWER(nombre));

-- El puntaje depende de la vacante, igual que el peso en cargo_requisitos del proyecto anterior.
CREATE TABLE IF NOT EXISTS vacante_requisitos (
  vacante_id BIGINT NOT NULL
    REFERENCES vacantes (id) ON DELETE CASCADE,
  requisito_id BIGINT NOT NULL
    REFERENCES requisitos (id) ON DELETE RESTRICT,
  obligatorio BOOLEAN NOT NULL DEFAULT TRUE,
  peso SMALLINT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (vacante_id, requisito_id)
);

-- Migra asociaciones existentes conservando sus pesos como requisitos opcionales.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'vacante_requisitos'
      AND column_name = 'puntaje'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'vacante_requisitos'
      AND column_name = 'peso'
  ) THEN
    ALTER TABLE public.vacante_requisitos RENAME COLUMN puntaje TO peso;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'vacante_requisitos'
      AND column_name = 'obligatorio'
  ) THEN
    ALTER TABLE public.vacante_requisitos
      ADD COLUMN obligatorio BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

ALTER TABLE vacante_requisitos ALTER COLUMN peso DROP NOT NULL;
ALTER TABLE vacante_requisitos
  DROP CONSTRAINT IF EXISTS vacante_requisitos_puntaje_check;
ALTER TABLE vacante_requisitos
  DROP CONSTRAINT IF EXISTS vacante_requisitos_peso_check;
UPDATE vacante_requisitos
SET obligatorio = TRUE, peso = NULL
WHERE peso = 0;
ALTER TABLE vacante_requisitos
  ADD CONSTRAINT vacante_requisitos_peso_check CHECK (
    (obligatorio = TRUE AND peso IS NULL)
    OR
    (obligatorio = FALSE AND peso BETWEEN 1 AND 3)
  );

CREATE INDEX IF NOT EXISTS vacante_requisitos_requisito_idx
  ON vacante_requisitos (requisito_id);

-- Separa los datos del aspirante de sus postulaciones; puede aplicar a distintas vacantes.
CREATE TABLE IF NOT EXISTS postulaciones (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  aspirante_id BIGINT NOT NULL
    REFERENCES aspirantes (id) ON DELETE RESTRICT,
  vacante_id BIGINT NOT NULL
    REFERENCES vacantes (id) ON DELETE RESTRICT,
  estado VARCHAR(30) NOT NULL DEFAULT 'nueva',
  creado_por_usuario_id BIGINT NOT NULL
    REFERENCES usuarios (id) ON DELETE RESTRICT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT postulaciones_aspirante_vacante_unique
    UNIQUE (aspirante_id, vacante_id)
);

CREATE INDEX IF NOT EXISTS postulaciones_vacante_estado_idx
  ON postulaciones (vacante_id, estado);

CREATE TABLE IF NOT EXISTS agenda_plantilla_horarios (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  hora TIME NOT NULL UNIQUE,
  cupos SMALLINT NOT NULL CHECK (cupos BETWEEN 1 AND 100),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agenda_fechas_generadas (
  fecha DATE PRIMARY KEY,
  generado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agenda_horarios (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fecha DATE NOT NULL
    REFERENCES agenda_fechas_generadas (fecha) ON DELETE CASCADE,
  hora TIME NOT NULL,
  cupos SMALLINT NOT NULL CHECK (cupos BETWEEN 1 AND 100),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT agenda_horarios_fecha_hora_unique UNIQUE (fecha, hora)
);

CREATE TABLE IF NOT EXISTS agenda_asignaciones (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  agenda_horario_id BIGINT NOT NULL
    REFERENCES agenda_horarios (id) ON DELETE RESTRICT,
  aspirante_id BIGINT NOT NULL
    REFERENCES aspirantes (id) ON DELETE RESTRICT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT agenda_asignaciones_aspirante_unique UNIQUE (aspirante_id)
);

CREATE INDEX IF NOT EXISTS agenda_asignaciones_horario_idx
  ON agenda_asignaciones (agenda_horario_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agenda_horarios_fecha_fkey'
      AND conrelid = 'agenda_horarios'::regclass
  ) THEN
    ALTER TABLE agenda_horarios
      ADD CONSTRAINT agenda_horarios_fecha_fkey
      FOREIGN KEY (fecha)
      REFERENCES agenda_fechas_generadas (fecha)
      ON DELETE CASCADE;
  END IF;
END $$;

INSERT INTO agenda_plantilla_horarios (hora, cupos)
SELECT horarios.hora::TIME, 3
FROM (VALUES ('07:00'), ('09:00'), ('11:00'), ('14:00'), ('16:00')) AS horarios(hora)
WHERE NOT EXISTS (SELECT 1 FROM agenda_plantilla_horarios);
