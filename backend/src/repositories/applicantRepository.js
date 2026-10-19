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
      `SELECT ${applicantFields}
       FROM aspirantes
       ORDER BY apellido, nombre, id
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
  const result = await pool.query(
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
  return result.rows[0] ?? null;
};

export const deleteApplicant = async (id) => {
  const result = await pool.query(
    "DELETE FROM aspirantes WHERE id = $1 RETURNING id",
    [id],
  );
  return result.rowCount > 0;
};
