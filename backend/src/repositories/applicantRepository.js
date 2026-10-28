import pool from "../db.js";

const applicantFields = `
  id,
  nombre,
  apellido,
  numero_cedula,
  numero_celular,
  correo,
  creado_en,
  actualizado_en
`;

export const findApplicants = async ({ limit, offset }) => {
  const [applicantsResult, countResult] = await Promise.all([
    pool.query(
      `SELECT a.id, a.nombre, a.apellido, a.numero_cedula,
              a.numero_celular, a.correo, a.creado_en, a.actualizado_en,
              autorizacion.estado AS autorizacion_estado,
              autorizacion.enviada_en AS autorizacion_enviada_en,
              autorizacion.expira_en AS autorizacion_expira_en,
              prueba.estado AS prueba16pf_estado,
              prueba.invitacion_enviada_en AS prueba16pf_enviada_en,
              prueba.invitacion_expira_en AS prueba16pf_expira_en,
              (SELECT COUNT(*)::int
               FROM pruebas16pf_intento_preguntas ip
               WHERE ip.intento_id = prueba.id) AS prueba16pf_total,
              (SELECT COUNT(*)::int
               FROM pruebas16pf_respuestas r
               WHERE r.intento_id = prueba.id) AS prueba16pf_respondidas
       FROM aspirantes a
       LEFT JOIN aspirante_autorizaciones_datos autorizacion
         ON autorizacion.aspirante_id = a.id
       LEFT JOIN pruebas16pf_intentos prueba
         ON prueba.aspirante_id = a.id
       ORDER BY a.apellido, a.nombre, a.id
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    ),
    pool.query("SELECT COUNT(*) FROM aspirantes"),
  ]);

  return {
    aspirantes: applicantsResult.rows,
    total: Number(countResult.rows[0].count),
  };
};

export const insertApplicant = async (
  { nombre, apellido, numero_cedula, numero_celular, correo },
  userId,
) => {
  const result = await pool.query(
    `INSERT INTO aspirantes
       (nombre, apellido, numero_cedula, numero_celular, correo, creado_por_usuario_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${applicantFields}`,
    [nombre, apellido, numero_cedula, numero_celular, correo, userId],
  );
  return result.rows[0];
};

export const updateApplicant = async (
  id,
  { nombre, apellido, numero_cedula, numero_celular, correo },
) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await client.query(
      `UPDATE aspirantes
       SET nombre = $2,
           apellido = $3,
           numero_cedula = $4,
           numero_celular = $5,
           correo = $6,
           actualizado_en = NOW()
       WHERE id = $1
       RETURNING ${applicantFields}`,
      [id, nombre, apellido, numero_cedula, numero_celular, correo],
    );

    if (!result.rowCount) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query(
      `UPDATE aspirante_autorizaciones_datos
       SET estado = 'vencida', actualizado_en = NOW()
       WHERE aspirante_id = $1
         AND estado = 'pendiente'
         AND (
           nombre_aspirante <> $2
           OR apellido_aspirante <> $3
           OR cedula_aspirante <> $4
           OR correo_aspirante <> $5
         )`,
      [id, nombre, apellido, numero_cedula, correo],
    );

    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const deleteApplicant = async (id) => {
  const result = await pool.query(
    "DELETE FROM aspirantes WHERE id = $1 RETURNING id",
    [id],
  );
  return result.rowCount > 0;
};
