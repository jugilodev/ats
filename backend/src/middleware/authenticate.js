import jwt from "jsonwebtoken";
import AppError from "../errors/AppError.js";
import { findUserById } from "../repositories/userRepository.js";

const authenticate = async (req, _res, next) => {
  const token = req.cookies?.ats_token;

  if (!token) {
    return next(new AppError("Inicia sesión para continuar", 401));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await findUserById(payload.sub);

    if (!user) {
      return next(new AppError("La sesión ya no es válida", 401));
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return next(new AppError("La sesión no es válida o expiró", 401));
    }

    return next(error);
  }
};

export default authenticate;
