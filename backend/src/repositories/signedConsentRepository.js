import pool from "../db.js";

export const findSignedConsentByApplicantId = async (applicantId) => {
  const result = await pool.query(
    `SELECT id, nombre_aspirante, apellido_aspirante, cedula_aspirante,
            version_texto, texto_aceptado, cedula_confirmada, firma_data_url,
            firmada_en
     FROM aspirante_autorizaciones_datos
     WHERE aspirante_id = $1 AND estado = 'firmada'`,
    [applicantId],
  );
  return result.rows[0] ?? null;
};
