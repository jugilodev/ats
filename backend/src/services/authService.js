import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import AppError from "../errors/AppError.js";
import { findUserByEmail } from "../repositories/userRepository.js";

export const authenticateUser = async ({ correo, contrasena }) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new AppError("Error de configuración del servidor", 500);
  }

  const user = await findUserByEmail(correo);
  const passwordMatches =
    user && (await bcrypt.compare(contrasena, user.contrasena_hash));

  if (!passwordMatches) {
    throw new AppError("Correo o contraseña inválidos", 401);
  }

  const token = jwt.sign(
    { sub: String(user.id), rol: user.rol },
    jwtSecret,
    { expiresIn: "2h" },
  );

  return {
    token,
    user: {
      id: user.id,
      nombre: user.nombre,
      apellido: user.apellido,
      correo: user.correo,
      rol: user.rol,
    },
  };
};
