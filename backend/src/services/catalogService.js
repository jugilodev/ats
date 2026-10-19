import AppError from "../errors/AppError.js";
import {
  findRequirements,
  findVacancies,
  insertRequirement,
  insertVacancy,
  removeRequirementIfUnused,
  removeVacancy,
  setVacancyActive,
  updateVacancy,
} from "../repositories/catalogRepository.js";

export const getRequirements = () => findRequirements();

export const createRequirement = async (requirement) => {
  try {
    return await insertRequirement(requirement);
  } catch (error) {
    if (error.code === "23505") {
      throw new AppError("Ya existe un requisito con ese nombre", 409);
    }
    throw error;
  }
};

export const deleteRequirement = async (id) => {
  const result = await removeRequirementIfUnused(id);
  if (result === "in_use") {
    throw new AppError("No se puede borrar un requisito asignado a una vacante", 409);
  }
  if (result === "not_found") {
    throw new AppError("Requisito no encontrado", 404);
  }
};

export const getVacancies = () => findVacancies();

export const createVacancy = async (vacancy, userId) => {
  try {
    return await insertVacancy(vacancy, userId);
  } catch (error) {
    if (error.code === "23503") {
      throw new AppError("El usuario o alguno de los requisitos no existe", 400);
    }
    throw error;
  }
};

export const editVacancy = async (id, vacancy) => {
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) {
    throw new AppError("Identificador de vacante inválido", 400);
  }

  try {
    const updatedVacancy = await updateVacancy(id, vacancy);
    if (!updatedVacancy) throw new AppError("Vacante no encontrada", 404);
    return updatedVacancy;
  } catch (error) {
    if (error.code === "23503") {
      throw new AppError("Alguno de los requisitos seleccionados no existe", 400);
    }
    throw error;
  }
};

export const changeVacancyStatus = async (id, active) => {
  const vacancy = await setVacancyActive(id, active);
  if (!vacancy) throw new AppError("Vacante no encontrada", 404);
  return vacancy;
};

export const deleteVacancy = async (id) => {
  try {
    const deleted = await removeVacancy(id);
    if (!deleted) throw new AppError("Vacante no encontrada", 404);
  } catch (error) {
    if (error.code === "23503") {
      throw new AppError(
        "No se puede borrar una vacante que tiene postulaciones; puedes inhabilitarla",
        409,
      );
    }
    throw error;
  }
};
