import AppError from "../errors/AppError.js";
import {
  deleteApplicant,
  findApplicants,
  insertApplicant,
  updateApplicant,
} from "../repositories/applicantRepository.js";

const pageSize = 15;

const validateId = (id) => {
  if (!/^\d+$/.test(String(id)) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) {
    throw new AppError("Identificador de aspirante inválido", 400);
  }
  return Number(id);
};

export const getApplicants = async (requestedPage) => {
  const page = Number(requestedPage);
  if (!Number.isSafeInteger(page) || page < 1) {
    throw new AppError("Número de página inválido", 400);
  }

  const { aspirantes, total } = await findApplicants({
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  return {
    aspirantes,
    paginacion: {
      pagina: page,
      por_pagina: pageSize,
      total,
      paginas: Math.ceil(total / pageSize),
    },
  };
};

export const createApplicant = async (applicant, userId) => {
  try {
    return await insertApplicant(applicant, userId);
  } catch (error) {
    if (error.code === "23505") {
      throw new AppError("Ya existe un aspirante con ese número de cédula", 409);
    }
    throw error;
  }
};

export const editApplicant = async (id, applicant) => {
  const validId = validateId(id);
  try {
    const updated = await updateApplicant(validId, applicant);
    if (!updated) throw new AppError("Aspirante no encontrado", 404);
    return updated;
  } catch (error) {
    if (error.code === "23505") {
      throw new AppError("Ya existe un aspirante con ese número de cédula", 409);
    }
    throw error;
  }
};

export const removeApplicant = async (id) => {
  const validId = validateId(id);
  try {
    const deleted = await deleteApplicant(validId);
    if (!deleted) throw new AppError("Aspirante no encontrado", 404);
  } catch (error) {
    if (error.code === "23503") {
      throw new AppError(
        "No se puede eliminar este aspirante porque tiene postulaciones, una entrevista asignada o una autorización registrada",
        409,
      );
    }
    throw error;
  }
};
