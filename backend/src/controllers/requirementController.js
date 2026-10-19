import {
  createRequirement,
  deleteRequirement,
  getRequirements,
} from "../services/catalogService.js";

export const listRequirements = async (_req, res) => {
  res.json({ requisitos: await getRequirements() });
};

export const addRequirement = async (req, res) => {
  res.status(201).json({
    requisito: await createRequirement(req.body),
  });
};

export const removeRequirement = async (req, res) => {
  await deleteRequirement(req.params.id);
  res.json({ message: "Requisito eliminado" });
};
