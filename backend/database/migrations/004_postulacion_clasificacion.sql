ALTER TABLE postulaciones
  ADD COLUMN IF NOT EXISTS descripcion TEXT,
  ADD COLUMN IF NOT EXISTS paso BOOLEAN;

COMMENT ON COLUMN postulaciones.paso IS
  'TRUE: clasificado; FALSE: no clasificado; NULL: todavía sin clasificación.';
