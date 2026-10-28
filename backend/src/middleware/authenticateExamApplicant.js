import jwt from "jsonwebtoken";
import AppError from "../errors/AppError.js";

const isPositiveId = (value) =>
  typeof value === "string" &&
  /^\d+$/.test(value) &&
  Number.isSafeInteger(Number(value)) &&
  Number(value) > 0;

const authenticateExamApplicant = (req, _res, next) => {
  if (!process.env.JWT_SECRET) {
    return next(new AppError("Falta configurar JWT_SECRET en el backend", 503));
  }

  const token = req.cookies?.prueba16pf_token;
  if (!token) return next(new AppError("Inicia sesión para continuar", 401));

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (
      payload.tipo !== "prueba16pf" ||
      !isPositiveId(payload.aspiranteId) ||
      !isPositiveId(payload.intentoId)
    ) {
      return next(new AppError("La sesión de prueba no es válida", 401));
    }

    req.examApplicant = {
      applicantId: Number(payload.aspiranteId),
      attemptId: Number(payload.intentoId),
    };
    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return next(new AppError("La sesión de prueba venció. Ingresa de nuevo desde tu enlace", 401));
    }
    return next(error);
  }
};

export default authenticateExamApplicant;
