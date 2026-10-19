const validateCreateUser = (req, res, next) => {
  const {
    nombre,
    apellido,
    numero_celular: numeroCelular,
    numero_cedula: numeroCedula,
    correo,
    contrasena,
    rol = "reclutador",
  } = req.body ?? {};

  const requiredTextFields = [
    nombre,
    apellido,
    numeroCelular,
    numeroCedula,
    correo,
  ];

  if (
    requiredTextFields.some(
      (value) => typeof value !== "string" || !value.trim(),
    ) ||
    typeof contrasena !== "string" ||
    contrasena.length < 8 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim()) ||
    !["admin", "reclutador"].includes(rol)
  ) {
    return res.status(400).json({
      message:
        "Datos inválidos: revisa los campos requeridos, la contraseña (mínimo 8 caracteres) y el rol",
    });
  }

  req.body = {
    nombre: nombre.trim(),
    apellido: apellido.trim(),
    numero_celular: numeroCelular.trim(),
    numero_cedula: numeroCedula.trim(),
    correo: correo.trim().toLowerCase(),
    contrasena,
    rol,
  };

  return next();
};

export default validateCreateUser;
