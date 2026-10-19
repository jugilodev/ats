const validateRequirement = (req, res, next) => {
  const { nombre, descripcion = "" } = req.body ?? {};

  if (
    typeof nombre !== "string" ||
    !nombre.trim() ||
    typeof descripcion !== "string"
  ) {
    return res.status(400).json({
      message: "El nombre es obligatorio y la descripción debe ser texto",
    });
  }

  req.body = { nombre: nombre.trim(), descripcion: descripcion.trim() };
  return next();
};

export default validateRequirement;
