import bcrypt from "bcryptjs";
import AppError from "../errors/AppError.js";
import { insertUser } from "../repositories/userRepository.js";

export const createUser = async ({
  nombre,
  apellido,
  numero_celular,
  numero_cedula,
  correo,
  contrasena,
  rol,
}) => {
  const contrasenaHash = await bcrypt.hash(contrasena, 10);

  try {
    return await insertUser({
      nombre,
      apellido,
      numero_celular,
      numero_cedula,
      correo,
      contrasena_hash: contrasenaHash,
      rol,
    });
  } catch (error) {
    if (error.code === "23505") {
      throw new AppError("El correo o la cédula ya están registrados", 409);
    }

    throw error;
  }
};
