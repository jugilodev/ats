const validateVacancy = (req, res, next) => {
  const {
    nombre,
    descripcion = "",
    requisitos = [],
    killer_questions = [],
  } = req.body ?? {};

  if (
    typeof nombre !== "string" ||
    !nombre.trim() ||
    typeof descripcion !== "string" ||
    !Array.isArray(requisitos) ||
    !Array.isArray(killer_questions)
  ) {
    return res.status(400).json({ message: "Datos de vacante inválidos" });
  }

  const seenIds = new Set();
  for (const requisito of requisitos) {
    const id = Number(requisito?.requisito_id);
    const obligatorio = requisito?.obligatorio;
    const peso = requisito?.peso === null ? null : Number(requisito?.peso);
    if (
      !Number.isSafeInteger(id) ||
      id <= 0 ||
      typeof obligatorio !== "boolean" ||
      (obligatorio && peso !== null) ||
      (!obligatorio &&
        (!Number.isInteger(peso) || peso < 1 || peso > 3)) ||
      seenIds.has(id)
    ) {
      return res.status(400).json({
        message:
          "Cada requisito debe ser único; si es obligatorio no lleva puntuación y, si no, requiere una puntuación de 1 a 3",
      });
    }
    seenIds.add(id);
  }

  for (const question of killer_questions) {
    if (
      typeof question?.nombre !== "string" ||
      !question.nombre.trim() ||
      question.nombre.trim().length > 500 ||
      !["si", "no"].includes(question.respuesta_esperada)
    ) {
      return res.status(400).json({
        message:
          "Cada Killer Question debe tener un nombre y una respuesta esperada: si o no",
      });
    }
  }

  req.body = {
    nombre: nombre.trim(),
    descripcion: descripcion.trim(),
    requisitos: requisitos.map(({ requisito_id, obligatorio, peso }) => ({
      requisito_id: Number(requisito_id),
      obligatorio,
      peso: obligatorio ? null : Number(peso),
    })),
    killer_questions: killer_questions.map(
      ({ nombre: question, respuesta_esperada }) => ({
        nombre: question.trim(),
        respuesta_esperada,
      }),
    ),
  };
  return next();
};

export default validateVacancy;
