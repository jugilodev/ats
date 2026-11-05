import pool from "../db.js";

export const findPostulationCvPath = async (applicantId, postulationId) => {
  const result = await pool.query(
    `SELECT p.cv_ruta
     FROM postulaciones p
     WHERE p.aspirante_id = $1 AND p.id = $2`,
    [applicantId, postulationId],
  );
  return result.rows[0] ?? null;
};
