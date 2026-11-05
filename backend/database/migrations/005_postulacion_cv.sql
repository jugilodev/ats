ALTER TABLE postulaciones
  ADD COLUMN IF NOT EXISTS cv_ruta TEXT;

COMMENT ON COLUMN postulaciones.cv_ruta IS
  'Ruta del CV de esta postulación bajo el prefijo de almacenamiento configurado para n8n.';
