import { createHash, randomBytes } from "node:crypto";
import AppError from "../errors/AppError.js";
import { assertMailConfiguration, sendEmail } from "./mailer.js";
import {
  acceptConsent,
  expirePendingConsent,
  findConsentByToken,
  markConsentEmailSent,
  prepareConsent,
} from "../repositories/consentRepository.js";

const tokenLifetimeMs = 24 * 60 * 60 * 1000;
const defaultPolicyVersion = "borrador-1";
const defaultPolicyText = `AUTORIZACIÓN PARA EL TRATAMIENTO DE DATOS PERSONALES

Yo, {{nombre_completo}}, identificado(a) con cédula de ciudadanía número {{cedula}}, autorizo de manera previa, expresa e informada a [NOMBRE DE LA ORGANIZACIÓN] para recolectar, almacenar, consultar, usar y actualizar mis datos personales con el propósito de gestionar mi perfil y participación en procesos de selección, contactarme sobre oportunidades laborales y conservar el historial de mis postulaciones.

Mis datos serán tratados con medidas razonables de seguridad y acceso limitado al personal autorizado. No serán utilizados para finalidades distintas a las aquí descritas ni compartidos con terceros salvo autorización, necesidad relacionada con el proceso o requerimiento legal.

Puedo solicitar consulta, actualización, corrección o supresión de mis datos, así como revocar esta autorización cuando sea procedente, mediante [CORREO DE CONTACTO DE LA ORGANIZACIÓN]. La información sobre el responsable, sus datos de contacto y el procedimiento completo para ejercer mis derechos debe ser completada por la organización antes de utilizar esta plantilla.

Declaro que leí y comprendí esta autorización y que otorgo mi consentimiento libre, previo, expreso e informado.`;

const getPolicyVersion = () => {
  const version = process.env.DATA_TREATMENT_VERSION?.trim() || defaultPolicyVersion;
  if (version.length > 50) {
    throw new AppError("DATA_TREATMENT_VERSION no puede superar 50 caracteres", 503);
  }
  return version;
};

const renderPolicyText = (applicant) => {
  const policy = process.env.DATA_TREATMENT_TEXT?.trim() || defaultPolicyText;
  return policy
    .replaceAll("{{nombre}}", applicant.nombre)
    .replaceAll("{{apellido}}", applicant.apellido)
    .replaceAll(
      "{{nombre_completo}}",
      `${applicant.nombre} ${applicant.apellido}`,
    )
    .replaceAll("{{cedula}}", applicant.numero_cedula);
};

const hashToken = (token) =>
  createHash("sha256").update(token).digest("hex");

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);

const buildEmail = ({ applicant, url, expiresAt }) => {
  const name = `${applicant.nombre} ${applicant.apellido}`;
  const expiry = expiresAt.toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    dateStyle: "long",
    timeStyle: "short",
  });

  return {
    subject: "Autorización de tratamiento de datos personales",
    text: `Hola ${name}:\n\nPara continuar con la gestión de tu perfil en nuestro proceso de selección, te invitamos a revisar y aceptar la autorización para el tratamiento de tus datos personales.\n\nAbre este enlace desde tu celular o computador para leer el documento, confirmar tu cédula y firmar: ${url}\n\nEl enlace vence el ${expiry} (hora de Colombia) y solo puede utilizarse una vez.\n\nSi no reconoces esta solicitud, puedes ignorar este mensaje.`,
    html: `<p>Hola ${escapeHtml(name)}:</p>
      <p>Para continuar con la gestión de tu perfil en nuestro proceso de selección, te invitamos a revisar y aceptar la autorización para el tratamiento de tus datos personales.</p>
      <p><a href="${escapeHtml(url)}">Leer y firmar la autorización</a></p>
      <p>Abre el enlace desde tu celular o computador. Deberás confirmar tu cédula y firmar. El enlace vence el ${escapeHtml(expiry)} (hora de Colombia) y solo puede utilizarse una vez.</p>
      <p>Si no reconoces esta solicitud, puedes ignorar este mensaje.</p>`,
  };
};

const validateToken = (token) => {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
    throw new AppError("El enlace de autorización no es válido", 400);
  }
  return hashToken(token);
};

export const sendTreatmentAuthorization = async (id) => {
  if (!/^\d+$/.test(String(id)) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) {
    throw new AppError("Identificador de aspirante inválido", 400);
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + tokenLifetimeMs);
  const publicUrl = process.env.PUBLIC_APP_URL;
  if (!publicUrl) {
    throw new AppError("Falta configurar PUBLIC_APP_URL en el backend", 503);
  }

  let baseUrl;
  try {
    baseUrl = new URL(publicUrl);
  } catch {
    throw new AppError("PUBLIC_APP_URL no contiene una URL válida", 503);
  }
  if (!["http:", "https:"].includes(baseUrl.protocol)) {
    throw new AppError("PUBLIC_APP_URL debe utilizar HTTP o HTTPS", 503);
  }
  if (process.env.NODE_ENV === "production" && baseUrl.protocol !== "https:") {
    throw new AppError("PUBLIC_APP_URL debe utilizar HTTPS en producción", 503);
  }
  assertMailConfiguration();

  const prepared = await prepareConsent({
    applicantId: Number(id),
    tokenHash,
    expiresAt,
    policyVersion: getPolicyVersion(),
    policyText: renderPolicyText,
  });

  if (prepared.notFound) throw new AppError("Aspirante no encontrado", 404);
  if (prepared.signed) {
    throw new AppError("Este aspirante ya firmó la autorización", 409);
  }

  const url = new URL(
    `/autorizacion/${token}`,
    `${baseUrl.origin}${baseUrl.pathname.replace(/\/$/, "")}/`,
  ).toString();

  try {
    await sendEmail({
      to: prepared.applicant.correo,
      ...buildEmail({ applicant: prepared.applicant, url, expiresAt }),
    });
  } catch (error) {
    await expirePendingConsent(tokenHash);
    console.error("No se pudo enviar correo de autorización:", error.code || "SMTP error");
    throw new AppError(
      "No se pudo enviar el correo. Revisa la configuración SMTP e inténtalo de nuevo",
      502,
    );
  }

  const emailMarkedSent = await markConsentEmailSent(tokenHash);
  if (!emailMarkedSent) {
    throw new AppError(
      "La solicitud cambió mientras se enviaba el correo. Envía una nueva autorización",
      409,
    );
  }

  return { estado: "pendiente", expira_en: expiresAt };
};

export const getTreatmentAuthorization = async (token) => {
  const tokenHash = validateToken(token);
  const consent = await findConsentByToken(tokenHash);
  if (consent?.expired) {
    throw new AppError("El enlace de autorización venció. Solicita que te envíen uno nuevo", 410);
  }
  if (!consent) {
    throw new AppError("El enlace de autorización no es válido o ya fue utilizado", 404);
  }
  return {
    aspirante: {
      nombre: consent.nombre_aspirante,
      apellido: consent.apellido_aspirante,
      cedula: consent.cedula_aspirante,
    },
    version: consent.version_texto,
    texto: consent.texto_aceptado,
    expira_en: consent.expira_en,
  };
};

export const signTreatmentAuthorization = async (token, body) => {
  const tokenHash = validateToken(token);
  const { acepto, cedula, firma } = body ?? {};
  if (acepto !== true) {
    throw new AppError("Debes aceptar expresamente el tratamiento de datos", 400);
  }
  if (typeof cedula !== "string" || !cedula.trim()) {
    throw new AppError("Escribe tu número de cédula", 400);
  }
  if (
    typeof firma !== "string" ||
    firma.length > 500_000 ||
    !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(firma)
  ) {
    throw new AppError("Agrega tu firma en el recuadro antes de continuar", 400);
  }
  const signatureBytes = Buffer.from(firma.slice("data:image/png;base64,".length), "base64");
  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const pngEnd = Buffer.from([0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
  if (
    signatureBytes.length < 45 ||
    !signatureBytes.subarray(0, pngHeader.length).equals(pngHeader) ||
    !signatureBytes.subarray(-pngEnd.length).equals(pngEnd) ||
    signatureBytes.readUInt32BE(16) < 1 ||
    signatureBytes.readUInt32BE(20) < 1 ||
    signatureBytes.readUInt32BE(16) > 2_000 ||
    signatureBytes.readUInt32BE(20) > 1_000
  ) {
    throw new AppError("El formato de la firma no es válido", 400);
  }

  const result = await acceptConsent({
    tokenHash,
    confirmedId: cedula.trim(),
    signatureDataUrl: firma,
  });
  if (result.expired) {
    throw new AppError("El enlace de autorización venció. Solicita que te envíen uno nuevo", 410);
  }
  if (result.invalid) {
    throw new AppError("El enlace de autorización no es válido o ya fue utilizado", 404);
  }
  if (result.idMismatch) {
    throw new AppError("La cédula no coincide con la registrada para este aspirante", 403);
  }
  return { message: "Autorización firmada correctamente" };
};
