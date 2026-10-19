import AppError from "../errors/AppError.js";
import {
  addDays,
  getBogotaDateTime,
  isColombianBusinessDay,
} from "./agendaCalendar.js";
import {
  assignApplicantToSlot,
  deleteAgendaSlot,
  ensureAgendaHorizon,
  findAvailableApplicants,
  findAgenda,
  insertAgendaSlot,
  removeApplicantFromSlot,
  replaceAgendaTemplate,
  updateAgendaSlot,
} from "../repositories/agendaRepository.js";

const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const validateSlot = (slot) => {
  if (
    !timePattern.test(slot?.hora) ||
    !Number.isInteger(Number(slot?.cupos)) ||
    Number(slot.cupos) < 1 ||
    Number(slot.cupos) > 100
  ) {
    throw new AppError("Cada horario debe tener hora válida y entre 1 y 100 cupos", 400);
  }
  return { hora: slot.hora, cupos: Number(slot.cupos) };
};

const validateId = (id) => {
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) {
    throw new AppError("Identificador de horario inválido", 400);
  }
  return Number(id);
};

const validateDate = (date) => {
  const parsedDate = new Date(`${date}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== date
  ) {
    throw new AppError("Fecha de agenda inválida", 400);
  }
  return date;
};

const businessDatesFrom = (startDate, limit = 60) => {
  const dates = [];
  for (let offset = 0; offset < limit; offset += 1) {
    const date = addDays(startDate, offset);
    if (isColombianBusinessDay(date)) dates.push(date);
  }
  return dates;
};

export const maintainAgenda = async (dateTime = getBogotaDateTime()) =>
  ensureAgendaHorizon(
    businessDatesFrom(dateTime.date),
    dateTime.date,
    dateTime.time,
  );

export const getAgenda = async () => {
  const dateTime = getBogotaDateTime();
  await maintainAgenda(dateTime);
  return findAgenda(dateTime.date);
};

export const getAvailableApplicants = () => findAvailableApplicants();

export const updateAgendaTemplate = async (slots) => {
  if (!Array.isArray(slots) || slots.length < 1 || slots.length > 20) {
    throw new AppError("La plantilla debe tener entre 1 y 20 horarios", 400);
  }

  const normalizedSlots = slots.map(validateSlot);
  if (new Set(normalizedSlots.map((slot) => slot.hora)).size !== slots.length) {
    throw new AppError("La plantilla no puede repetir horas", 400);
  }

  try {
    await replaceAgendaTemplate(normalizedSlots);
  } catch (error) {
    if (error.code === "23505") {
      throw new AppError("La plantilla no puede repetir horas", 409);
    }
    throw error;
  }

  return getAgenda();
};

export const addAgendaSlot = async (date, slot) => {
  const validDate = validateDate(date);
  const normalizedSlot = validateSlot(slot);
  try {
    const created = await insertAgendaSlot(validDate, normalizedSlot);
    if (!created) throw new AppError("La fecha no está disponible para editar", 404);
  } catch (error) {
    if (error.code === "23505") {
      throw new AppError("Ya existe un horario a esa hora para esta fecha", 409);
    }
    throw error;
  }
  return getAgenda();
};

export const editAgendaSlot = async (id, slot) => {
  const validId = validateId(id);
  const normalizedSlot = validateSlot(slot);
  try {
    const updated = await updateAgendaSlot(validId, normalizedSlot);
    if (updated.notFound) throw new AppError("Horario no encontrado", 404);
    if (updated.capacityExceeded) {
      throw new AppError(
        `No se pueden reducir los cupos por debajo de los ${updated.occupied} postulantes asignados`,
        409,
      );
    }
  } catch (error) {
    if (error.code === "23505") {
      throw new AppError("Ya existe un horario a esa hora para esta fecha", 409);
    }
    throw error;
  }
  return getAgenda();
};

export const removeAgendaSlot = async (id) => {
  const validId = validateId(id);
  let deleted;
  try {
    deleted = await deleteAgendaSlot(validId);
  } catch (error) {
    if (error.code === "23503") {
      throw new AppError(
        "Retira los postulantes asignados antes de quitar este horario",
        409,
      );
    }
    throw error;
  }
  if (!deleted) throw new AppError("Horario no encontrado", 404);
  return getAgenda();
};

export const assignApplicant = async (slotId, applicantId) => {
  const validSlotId = validateId(slotId);
  const validApplicantId = validateId(String(applicantId));

  try {
    const result = await assignApplicantToSlot(validSlotId, validApplicantId);
    if (result.notFound) throw new AppError("Horario no encontrado", 404);
    if (result.full) throw new AppError("No hay cupos disponibles en este horario", 409);
  } catch (error) {
    if (error.code === "23505") {
      throw new AppError("Este postulante ya tiene un horario asignado", 409);
    }
    if (error.code === "23503") {
      throw new AppError("Postulante no encontrado", 404);
    }
    throw error;
  }

  return getAgenda();
};

export const unassignApplicant = async (slotId, applicantId) => {
  const validSlotId = validateId(slotId);
  const validApplicantId = validateId(String(applicantId));
  const removed = await removeApplicantFromSlot(validSlotId, validApplicantId);
  if (!removed) throw new AppError("La asignación no existe", 404);
  return getAgenda();
};

export const startAgendaGenerator = async () => {
  const scheduleNextRun = () => {
    const now = new Date();
    const { time } = getBogotaDateTime(now);
    const [hour, minute] = time.split(":").map(Number);
    const currentParts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Bogota",
      second: "2-digit",
    }).formatToParts(now);
    const second = Number(currentParts.find((part) => part.type === "second").value);
    const millisecondsUntilMidnight =
      (24 * 60 - (hour * 60 + minute)) * 60_000 -
      second * 1_000 -
      now.getMilliseconds();

    const timer = setTimeout(async () => {
      try {
        const result = await maintainAgenda();
        console.info("Agenda diaria actualizada:", result);
      } catch (error) {
        console.error("No se pudo generar la agenda diaria:", error);
      } finally {
        scheduleNextRun();
      }
    }, millisecondsUntilMidnight);
    timer.unref();
  };

  try {
    const result = await maintainAgenda();
    console.info("Agenda inicializada:", result);
  } finally {
    scheduleNextRun();
  }
};
