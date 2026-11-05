import { randomUUID } from "node:crypto";
import { copyFile, mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import AppError from "../errors/AppError.js";
import { findSignedConsentByApplicantId } from "../repositories/signedConsentRepository.js";
import { renderSignedConsentPdf } from "./signedConsentPdf.js";

const serviceDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultOutputDirectory = path.resolve(
  serviceDirectory,
  "../../documents/consentimientos-firmados",
);

const storePdf = async (buffer, consentId) => {
  const configuredDirectory = process.env.SIGNED_CONSENTS_DIR?.trim();
  const outputDirectory = configuredDirectory
    ? path.resolve(configuredDirectory)
    : defaultOutputDirectory;
  const finalPath = path.join(outputDirectory, `autorizacion-${consentId}.pdf`);
  const temporaryPath = path.join(
    outputDirectory,
    `.autorizacion-${consentId}-${randomUUID()}.tmp`,
  );

  await mkdir(outputDirectory, { recursive: true, mode: 0o700 });
  try {
    await writeFile(temporaryPath, buffer, { flag: "wx", mode: 0o600 });
    await copyFile(temporaryPath, finalPath);
  } finally {
    await unlink(temporaryPath).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  }

  return buffer;
};

export const getSignedConsentPdf = async (applicantId) => {
  if (
    !/^\d+$/.test(String(applicantId)) ||
    !Number.isSafeInteger(Number(applicantId)) ||
    Number(applicantId) <= 0
  ) {
    throw new AppError("Identificador de aspirante inválido", 400);
  }

  const consent = await findSignedConsentByApplicantId(Number(applicantId));
  if (!consent) {
    throw new AppError("El aspirante no tiene una autorización firmada", 404);
  }

  const pdf = await renderSignedConsentPdf(consent);
  await storePdf(pdf, consent.id);
  return pdf;
};
