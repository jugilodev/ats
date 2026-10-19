const validateLogin = (req, res, next) => {
  const { correo, contrasena } = req.body ?? {};

  if (
    typeof correo !== "string" ||
    typeof contrasena !== "string" ||
    !correo.trim() ||
    !contrasena
  ) {
    return res.status(400).json({
      message: "Correo y contraseña son requeridos",
    });
  }

  req.body = {
    correo: correo.trim(),
    contrasena,
  };

  return next();
};

export default validateLogin;
