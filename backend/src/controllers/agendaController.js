import {
  assignApplicant,
  addAgendaSlot,
  editAgendaSlot,
  getAvailableApplicants,
  getAgenda,
  removeAgendaSlot,
  unassignApplicant,
  updateAgendaTemplate,
} from "../services/agendaService.js";

export const listAgenda = async (_req, res) => {
  res.json(await getAgenda());
};

export const saveAgendaTemplate = async (req, res) => {
  res.json(await updateAgendaTemplate(req.body?.horarios));
};

export const listAvailableApplicants = async (_req, res) => {
  res.json({ postulantes: await getAvailableApplicants() });
};

export const createAgendaSlot = async (req, res) => {
  res.status(201).json(
    await addAgendaSlot(req.params.fecha, req.body),
  );
};

export const updateAgendaSlot = async (req, res) => {
  res.json(await editAgendaSlot(req.params.id, req.body));
};

export const deleteAgendaSlot = async (req, res) => {
  res.json(await removeAgendaSlot(req.params.id));
};

export const addApplicantToSlot = async (req, res) => {
  res.json(
    await assignApplicant(req.params.id, req.body?.aspirante_id),
  );
};

export const deleteApplicantFromSlot = async (req, res) => {
  res.json(
    await unassignApplicant(req.params.id, req.params.aspiranteId),
  );
};
