import AppError from "../errors/AppError.js";
import { findPostulationCvPath } from "../repositories/applicantCvRepository.js";
import { openCvFile } from "./cvStorage.js";

const validateId = (id, label) => {
  if (!/^\d+$/.test(String(id)) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) {
    throw new AppError(`Identificador de ${label} inválido`, 400);
  }
  return Number(id);
};

export const getApplicantPostulationCv = async (applicantId, postulationId) => {
  const validApplicantId = validateId(applicantId, "aspirante");
  const validPostulationId = validateId(postulationId, "postulación");
  const postulation = await findPostulationCvPath(
    validApplicantId,
    validPostulationId,
  );

  if (!postulation) {
    throw new AppError("La postulación no existe para este aspirante", 404);
  }
  if (!postulation.cv_ruta?.trim()) {
    throw new AppError("Esta postulación no tiene una hoja de vida registrada", 404);
  }

  return openCvFile({
    rootDir: process.env.CV_ROOT_DIR,
    pathPrefix: process.env.CV_N8N_PATH_PREFIX,
    storedPath: postulation.cv_ruta,
  });
};
