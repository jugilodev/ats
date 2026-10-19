const validateApplicant = (req, res, next) => {
  const {
    nombre,
    apellido,
    numero_cedula: numeroCedula,
    numero_celular: numeroCelular,
    correo,
  } = req.body ?? {};

  const textFields = [
    [nombre, 100],
    [apellido, 100],
    [numeroCedula, 30],
    [numeroCelular, 30],
    [correo, 254],
  ];

  if (
    textFields.some(
      ([value, maxLength]) =>
        typeof value !== "string" ||
        !value.trim() ||
        value.trim().length > maxLength,
    ) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())
  ) {
    return res.status(400).json({
      message:
        "Datos inválidos: nombre, apellido, cédula, celular y un correo válido son obligatorios",
    });
  }

  req.body = {
    nombre: nombre.trim(),
    apellido: apellido.trim(),
    numero_cedula: numeroCedula.trim(),
    numero_celular: numeroCelular.trim(),
    correo: correo.trim().toLowerCase(),
  };

  return next();
};

export default validateApplicant;
