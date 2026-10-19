import pool from "../db.js";

export const findUserById = async (id) => {
  const result = await pool.query(
    `SELECT id, nombre, apellido, correo, rol
     FROM usuarios
     WHERE id = $1`,
    [id],
  );

  return result.rows[0] ?? null;
};

export const findUserByEmail = async (correo) => {
  const result = await pool.query(
    `SELECT id, nombre, apellido, correo, contrasena_hash, rol
     FROM usuarios
     WHERE LOWER(correo) = LOWER($1)
     LIMIT 1`,
    [correo],
  );

  return result.rows[0] ?? null;
};

export const insertUser = async ({
  nombre,
  apellido,
  numero_celular,
  numero_cedula,
  correo,
  contrasena_hash,
  rol,
}) => {
  const result = await pool.query(
    `INSERT INTO usuarios (
       nombre,
       apellido,
       numero_celular,
       numero_cedula,
       correo,
       contrasena_hash,
       rol
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, nombre, apellido, numero_celular, numero_cedula, correo, rol`,
    [
      nombre,
      apellido,
      numero_celular,
      numero_cedula,
      correo,
      contrasena_hash,
      rol,
    ],
  );

  return result.rows[0];
};
