import pool from "../db.js";

export const findRequirements = async () => {
  const result = await pool.query(
    `SELECT id, nombre, descripcion, creado_en
     FROM requisitos
     ORDER BY nombre`,
  );
  return result.rows;
};

export const insertRequirement = async ({ nombre, descripcion }) => {
  const result = await pool.query(
    `INSERT INTO requisitos (nombre, descripcion)
     VALUES ($1, $2)
     RETURNING id, nombre, descripcion, creado_en`,
    [nombre, descripcion || null],
  );
  return result.rows[0];
};

export const removeRequirementIfUnused = async (id) => {
  const result = await pool.query(
    `DELETE FROM requisitos r
     WHERE r.id = $1
       AND NOT EXISTS (
         SELECT 1
         FROM vacante_requisitos vr
         WHERE vr.requisito_id = r.id
       )
     RETURNING r.id`,
    [id],
  );

  if (result.rowCount > 0) return "deleted";

  const exists = await pool.query("SELECT 1 FROM requisitos WHERE id = $1", [id]);
  return exists.rowCount > 0 ? "in_use" : "not_found";
};

export const findVacancies = async () => {
  const result = await pool.query(
    `SELECT
       v.id,
       v.nombre,
       v.descripcion,
       v.activa,
       v.creado_en,
       COALESCE(
         json_agg(
           json_build_object(
             'id', r.id,
             'nombre', r.nombre,
             'descripcion', r.descripcion,
             'obligatorio', vr.obligatorio,
             'peso', vr.peso
           )
           ORDER BY r.nombre
         ) FILTER (WHERE r.id IS NOT NULL),
         '[]'::json
       ) AS requisitos,
       COALESCE(
         (
           SELECT json_agg(
             json_build_object(
               'id', kq.id,
               'nombre', kq.nombre,
               'respuesta_esperada', kq.respuesta_esperada
             )
             ORDER BY kq.id
           )
           FROM killer_questions kq
           WHERE kq.vacante_id = v.id
         ),
         '[]'::json
       ) AS killer_questions
     FROM vacantes v
     LEFT JOIN vacante_requisitos vr ON vr.vacante_id = v.id
     LEFT JOIN requisitos r ON r.id = vr.requisito_id
     GROUP BY v.id
     ORDER BY v.creado_en DESC`,
  );
  return result.rows;
};

export const insertVacancy = async (
  { nombre, descripcion, requisitos, killer_questions },
  userId,
) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const vacancyResult = await client.query(
      `INSERT INTO vacantes (nombre, descripcion, creado_por_usuario_id)
       VALUES ($1, $2, $3)
       RETURNING id, nombre, descripcion, activa, creado_en`,
      [nombre, descripcion || null, userId],
    );
    const vacancy = vacancyResult.rows[0];

    for (const requisito of requisitos) {
      await client.query(
        `INSERT INTO vacante_requisitos
           (vacante_id, requisito_id, obligatorio, peso)
         VALUES ($1, $2, $3, $4)`,
        [
          vacancy.id,
          requisito.requisito_id,
          requisito.obligatorio,
          requisito.peso,
        ],
      );
    }

    for (const question of killer_questions) {
      await client.query(
        `INSERT INTO killer_questions
           (vacante_id, nombre, respuesta_esperada)
         VALUES ($1, $2, $3)`,
        [vacancy.id, question.nombre, question.respuesta_esperada],
      );
    }

    await client.query("COMMIT");
    return {
      ...vacancy,
      requisitos: requisitos.map((requisito) => ({
        id: requisito.requisito_id,
        obligatorio: requisito.obligatorio,
        peso: requisito.peso,
      })),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const updateVacancy = async (
  id,
  { nombre, descripcion, requisitos, killer_questions },
) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const vacancyResult = await client.query(
      `UPDATE vacantes
       SET nombre = $2, descripcion = $3, actualizado_en = NOW()
       WHERE id = $1
       RETURNING id, nombre, descripcion, activa, creado_en`,
      [id, nombre, descripcion || null],
    );

    if (vacancyResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    // Replace all assigned requirements together so an edit cannot be partially saved.
    await client.query(
      "DELETE FROM vacante_requisitos WHERE vacante_id = $1",
      [id],
    );

    for (const requisito of requisitos) {
      await client.query(
        `INSERT INTO vacante_requisitos
           (vacante_id, requisito_id, obligatorio, peso)
         VALUES ($1, $2, $3, $4)`,
        [id, requisito.requisito_id, requisito.obligatorio, requisito.peso],
      );
    }

    await client.query(
      "DELETE FROM killer_questions WHERE vacante_id = $1",
      [id],
    );

    for (const question of killer_questions) {
      await client.query(
        `INSERT INTO killer_questions
           (vacante_id, nombre, respuesta_esperada)
         VALUES ($1, $2, $3)`,
        [id, question.nombre, question.respuesta_esperada],
      );
    }

    await client.query("COMMIT");
    return {
      ...vacancyResult.rows[0],
      requisitos: requisitos.map((requisito) => ({
        id: requisito.requisito_id,
        obligatorio: requisito.obligatorio,
        peso: requisito.peso,
      })),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const setVacancyActive = async (id, active) => {
  const result = await pool.query(
    `UPDATE vacantes
     SET activa = $2, actualizado_en = NOW()
     WHERE id = $1
     RETURNING id, nombre, activa`,
    [id, active],
  );
  return result.rows[0] ?? null;
};

export const removeVacancy = async (id) => {
  const result = await pool.query(
    "DELETE FROM vacantes WHERE id = $1 RETURNING id",
    [id],
  );
  return result.rowCount > 0;
};
