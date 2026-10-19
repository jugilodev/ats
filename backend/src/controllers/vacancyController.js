import {
  createVacancy,
  changeVacancyStatus,
  deleteVacancy,
  getVacancies,
  editVacancy,
} from "../services/catalogService.js";

export const listVacancies = async (_req, res) => {
  res.json({ vacantes: await getVacancies() });
};

export const addVacancy = async (req, res) => {
  const vacante = await createVacancy(req.body, req.user.id);
  res.status(201).json({ vacante });
};

export const updateVacancy = async (req, res) => {
  const vacante = await editVacancy(req.params.id, req.body);
  res.json({ vacante });
};

export const updateVacancyStatus = async (req, res) => {
  const vacante = await changeVacancyStatus(
    req.params.id,
    req.body.activa,
  );
  res.json({ vacante });
};

export const removeVacancy = async (req, res) => {
  await deleteVacancy(req.params.id);
  res.json({ message: "Vacante eliminada" });
};
