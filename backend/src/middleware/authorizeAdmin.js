import AppError from "../errors/AppError.js";

const authorizeAdmin = (req, _res, next) => {
  if (req.user?.rol !== "admin") {
    return next(new AppError("Solo los administradores pueden crear usuarios", 403));
  }

  return next();
};

export default authorizeAdmin;
