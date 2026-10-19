const validateVacancyStatus = (req, res, next) => {
  if (typeof req.body?.activa !== "boolean") {
    return res.status(400).json({ message: "activa debe ser true o false" });
  }

  return next();
};

export default validateVacancyStatus;
