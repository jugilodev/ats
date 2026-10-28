import pool from "../db.js";

export const findApplicantReportPostulations = async (applicantId) => {
  const result = await pool.query(
    `SELECT p.id AS postulacion_id,
            p.vacante_id,
            p.estado AS postulacion_estado,
            p.creado_en,
            v.nombre AS vacante_nombre
     FROM postulaciones p
     JOIN vacantes v ON v.id = p.vacante_id
     WHERE p.aspirante_id = $1
     ORDER BY p.creado_en DESC, p.id DESC`,
    [applicantId],
  );
  return result.rows;
};

export const findApplicantExamReportData = async (applicantId, applicationId) => {
  const result = await pool.query(
    `SELECT a.id AS aspirante_id,
            a.nombre AS aspirante_nombre,
            a.apellido AS aspirante_apellido,
            i.id AS intento_id,
            i.estado AS prueba_estado,
            p.id AS postulacion_id,
            p.estado AS postulacion_estado,
            v.id AS vacante_id,
            v.nombre AS vacante_nombre,
            v.descripcion AS vacante_descripcion,
            COALESCE((
              SELECT json_agg(
                json_build_object(
                  'numero', ip.orden,
                  'pregunta', ip.pregunta,
                  'opcion', r.opcion_elegida,
                  'respuesta', CASE r.opcion_elegida
                    WHEN 'A' THEN ip.opcion_a
                    WHEN 'B' THEN ip.opcion_b
                    WHEN 'C' THEN ip.opcion_c
                  END
                )
                ORDER BY ip.orden
              )
              FROM pruebas16pf_intento_preguntas ip
              JOIN pruebas16pf_respuestas r
                ON r.intento_id = ip.intento_id
               AND r.pregunta_id = ip.pregunta_id
              WHERE ip.intento_id = i.id
            ), '[]'::json) AS respuestas,
            (
              SELECT COUNT(*)::int
              FROM pruebas16pf_intento_preguntas ip
              WHERE ip.intento_id = i.id
            ) AS preguntas_total,
            (
              SELECT COUNT(*)::int
              FROM pruebas16pf_respuestas r
              WHERE r.intento_id = i.id
            ) AS preguntas_respondidas,
            COALESCE((
              SELECT json_agg(
                json_build_object(
                  'nombre', req.nombre,
                  'descripcion', req.descripcion,
                  'obligatorio', vr.obligatorio,
                  'peso', vr.peso
                )
                ORDER BY vr.obligatorio DESC, req.nombre
              )
              FROM vacante_requisitos vr
              JOIN requisitos req ON req.id = vr.requisito_id
              WHERE vr.vacante_id = v.id
            ), '[]'::json) AS requisitos
     FROM aspirantes a
     JOIN pruebas16pf_intentos i ON i.aspirante_id = a.id
     JOIN postulaciones p ON p.aspirante_id = a.id
     JOIN vacantes v ON v.id = p.vacante_id
     WHERE a.id = $1
       AND p.id = $2
     LIMIT 1`,
    [applicantId, applicationId],
  );
  return result.rows[0] ?? null;
};
