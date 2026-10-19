import {
  createApplicant,
  editApplicant,
  getApplicants,
  removeApplicant,
} from "../services/applicantService.js";

export const listApplicants = async (req, res) => {
  res.json(await getApplicants(req.query.pagina ?? "1"));
};

export const addApplicant = async (req, res) => {
  res.status(201).json({
    aspirante: await createApplicant(req.body, req.user.id),
  });
};

export const updateApplicant = async (req, res) => {
  res.json({
    aspirante: await editApplicant(req.params.id, req.body),
  });
};

export const deleteApplicant = async (req, res) => {
  await removeApplicant(req.params.id);
  res.json({ message: "Aspirante eliminado" });
};
