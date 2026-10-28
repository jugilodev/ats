import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";
import AppError from "../errors/AppError.js";
import { assertMailConfiguration, sendEmail } from "./mailer.js";
import {
  clearLoginBlock,
  completeExamAttempt,
  findExamInvitation,
  getExamState,
  getLoginBlock,
  invalidateExamInvitation,
  markExamInvitationSent,
  prepareExamInvitation,
  recordFailedLogin,
  saveExamAnswer,
  startExamAttempt,
} from "../repositories/examRepository.js";

const invitationLifetimeMs = 24 * 60 * 60 * 1000;
const sessionLifetime = "12h";
const maxLoginFailures = 10;

const instructions = `A continuación encontrará una serie de frases que permitirán conocer sus actitudes e intereses. En general, no existen respuestas correctas o incorrectas, porque las personas tienen distintos intereses y ven las cosas desde distintos puntos de vista. Conteste con sinceridad; de esta forma se podrá conocer mejor su forma de ser. Seleccione sus respuestas en esta página. Las frases contienen tres posibles respuestas (A, B y C) y normalmente la alternativa B viene con un interrogante, para ser señalada cuando no es posible decidirse entre la A y la C. Las frases están ordenadas numéricamente; siga esta numeración al contestar. Lea atentamente cada frase y las posibles respuestas; así le será más fácil decidirse.

Al contestar tenga en cuenta lo siguiente: no piense demasiado el contenido de las frases ni emplee mucho tiempo en decidirse. Evite señalar la respuesta B (?), excepto cuando le sea imposible decidirse por las otras dos. Procure no dejar ninguna pregunta sin contestar. Conteste sinceramente. No señale sus respuestas pensando en lo que “es bueno” o lo que “interesa” para impresionar al examinador.`;

const examples = [
  {
    pregunta: "Cuando tengo tiempo libre, prefiero:",
    opcion_a: "Leer o realizar una actividad tranquila.",
    opcion_b: "? No estoy seguro; depende del día.",
    opcion_c: "Compartir una actividad con otras personas.",
  },
  {
    pregunta: "Al comenzar una tarea nueva, normalmente:",
    opcion_a: "Organizo los pasos antes de empezar.",
    opcion_b: "? A veces planifico y a veces improviso.",
    opcion_c: "Empiezo y voy decidiendo sobre la marcha.",
  },
  {
    pregunta: "En una conversación grupal suelo:",
    opcion_a: "Expresar mis ideas con facilidad.",
    opcion_b: "? Depende de las personas y del tema.",
    opcion_c: "Escuchar primero lo que dicen los demás.",
  },
];

const hashToken = (token) =>
  createHash("sha256").update(token).digest("hex");

const hashIp = (ipAddress) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new AppError("Falta configurar JWT_SECRET en el backend", 503);
  return createHmac("sha256", secret).update(ipAddress || "unknown").digest("hex");
};

const matchesCredential = (provided, expected) => {
  const left = createHash("sha256").update(provided).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
};

const validateToken = (token) => {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
    throw new AppError(
      "El enlace de invitación no es válido o venció. Solicita que te envíen uno nuevo",
      404,
    );
  }
  return hashToken(token);
};

const getPublicBaseUrl = () => {
  const publicUrl = process.env.PUBLIC_APP_URL;
  if (!publicUrl) throw new AppError("Falta configurar PUBLIC_APP_URL en el backend", 503);

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
  return baseUrl;
};

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);

const buildInvitationEmail = ({ applicant, token, expiresAt, publicBaseUrl }) => {
  const name = `${applicant.nombre} ${applicant.apellido}`;
  const link = new URL(
    `/prueba-16pf/${token}`,
    `${publicBaseUrl.origin}${publicBaseUrl.pathname.replace(/\/$/, "")}/`,
  ).toString();
  const expiry = expiresAt.toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    dateStyle: "long",
    timeStyle: "short",
  });
  const documentId = escapeHtml(applicant.numero_cedula);
  const safeName = escapeHtml(name);
  const safeLink = escapeHtml(link);

  return {
    to: applicant.correo,
    subject: "Invitación para responder la prueba 16PF",
    text: `Hola ${name}:\n\nHas sido invitado(a) a responder la prueba 16PF. Ingresa desde este enlace: ${link}\n\nUsuario: ${applicant.numero_cedula}\nContraseña: ${applicant.numero_cedula}\n\nEl enlace vence el ${expiry} (hora de Colombia). Si vence antes de que completes la prueba, solicita que te envíen uno nuevo; tus respuestas guardadas se conservarán.\n\nPor seguridad, no compartas este mensaje.`,
    html: `<p>Hola ${safeName}:</p>
      <p>Has sido invitado(a) a responder la prueba 16PF. Ingresa desde este enlace:</p>
      <p><a href="${safeLink}">Abrir prueba 16PF</a></p>
      <p><strong>Usuario:</strong> ${documentId}<br><strong>Contraseña:</strong> ${documentId}</p>
      <p>El enlace vence el ${escapeHtml(expiry)} (hora de Colombia). Si vence antes de que completes la prueba, solicita que te envíen uno nuevo; tus respuestas guardadas se conservarán.</p>
      <p>Por seguridad, no compartas este mensaje.</p>`,
  };
};

export const sendExamInvitation = async (id) => {
  if (!/^\d+$/.test(String(id)) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) {
    throw new AppError("Identificador de aspirante inválido", 400);
  }

  assertMailConfiguration();
  const publicBaseUrl = getPublicBaseUrl();
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + invitationLifetimeMs);
  const prepared = await prepareExamInvitation({
    applicantId: Number(id),
    tokenHash,
    expiresAt,
  });

  if (prepared.notFound) throw new AppError("Aspirante no encontrado", 404);
  if (prepared.completed) throw new AppError("Este aspirante ya completó la prueba", 409);
  if (prepared.noQuestions) {
    throw new AppError("No hay preguntas activas para iniciar la prueba", 409);
  }

  try {
    await sendEmail(buildInvitationEmail({
      applicant: prepared.aspirante,
      token,
      expiresAt,
      publicBaseUrl,
    }));
  } catch (error) {
    await invalidateExamInvitation(tokenHash);
    console.error("No se pudo enviar invitación 16PF:", error.code || "SMTP error");
    throw new AppError(
      "No se pudo enviar la invitación. Revisa la configuración SMTP e inténtalo de nuevo",
      502,
    );
  }

  const sent = await markExamInvitationSent(tokenHash);
  if (!sent) {
    throw new AppError(
      "La invitación cambió mientras se enviaba el correo. Intenta enviarla de nuevo",
      409,
    );
  }

  return {
    estado: prepared.estado,
    expira_en: expiresAt,
  };
};

export const loginExamApplicant = async ({
  token,
  usuario,
  contrasena,
  ipAddress,
}) => {
  const ipHash = hashIp(ipAddress);
  if (await getLoginBlock(ipHash)) {
    throw new AppError("No se pudo iniciar sesión. Intenta de nuevo más tarde", 429);
  }

  let invitation;
  try {
    const tokenHash = validateToken(token);
    invitation = await findExamInvitation(tokenHash);
  } catch (error) {
    if (error.statusCode !== 404) throw error;
  }

  if (invitation?.expired) {
    throw new AppError("El enlace venció. Solicita que te envíen una invitación nueva", 410);
  }

  const validCredentials =
    invitation &&
    typeof usuario === "string" &&
    typeof contrasena === "string" &&
    usuario.length <= 30 &&
    contrasena.length <= 30 &&
    matchesCredential(usuario, invitation.numero_cedula) &&
    matchesCredential(contrasena, invitation.numero_cedula);

  if (!validCredentials) {
    const failure = await recordFailedLogin(ipHash);
    throw new AppError(
      failure.intentos_fallidos >= maxLoginFailures
        ? "Se alcanzó el límite de intentos. Espera 15 minutos para volver a intentar"
        : "Usuario, contraseña o enlace incorrectos",
      failure.intentos_fallidos >= maxLoginFailures ? 429 : 401,
    );
  }

  if (!process.env.JWT_SECRET) {
    throw new AppError("Falta configurar JWT_SECRET en el backend", 503);
  }

  await clearLoginBlock(ipHash);
  return {
    nombre: invitation.nombre,
    estado: invitation.estado,
    sessionToken: jwt.sign(
      {
        tipo: "prueba16pf",
        aspiranteId: String(invitation.aspirante_id),
        intentoId: String(invitation.intento_id),
      },
      process.env.JWT_SECRET,
      { expiresIn: sessionLifetime },
    ),
  };
};

export const getApplicantExamState = async (attemptId, requestedOrder) => {
  let order = null;
  if (requestedOrder !== undefined) {
    order = Number(requestedOrder);
    if (!Number.isSafeInteger(order) || order < 1) {
      throw new AppError("Número de pregunta inválido", 400);
    }
  }

  const state = await getExamState(attemptId, order);
  if (!state) throw new AppError("Intento de prueba no encontrado", 404);

  if (state.estado === "invitada") {
    return {
      ...state,
      instrucciones: instructions,
      ejemplos: examples,
    };
  }
  return state;
};

export const startApplicantExam = async (attemptId) => {
  const result = await startExamAttempt(attemptId);
  if (result.notFound) throw new AppError("Intento de prueba no encontrado", 404);
  if (result.completed) throw new AppError("La prueba ya fue completada", 409);
  if (result.noQuestions) {
    throw new AppError("No hay preguntas activas para iniciar la prueba", 409);
  }
  return getApplicantExamState(attemptId);
};

export const answerApplicantQuestion = async (attemptId, body) => {
  const questionId = Number(body?.pregunta_id);
  const option = body?.opcion_elegida;
  if (!Number.isSafeInteger(questionId) || questionId < 1) {
    throw new AppError("Identificador de pregunta inválido", 400);
  }
  if (!["A", "B", "C"].includes(option)) {
    throw new AppError("Selecciona una de las opciones A, B o C", 400);
  }

  const result = await saveExamAnswer({ attemptId, questionId, option });
  if (result.notFound) throw new AppError("Intento de prueba no encontrado", 404);
  if (result.unavailable) {
    throw new AppError("La prueba no está disponible para guardar respuestas", 409);
  }
  if (result.questionNotFound) {
    throw new AppError("La pregunta no pertenece a este intento", 404);
  }
  const requestedOrder =
    body?.numero === undefined ? undefined : Number(body.numero);
  return getApplicantExamState(attemptId, requestedOrder);
};

export const finishApplicantExam = async (attemptId) => {
  const result = await completeExamAttempt(attemptId);
  if (result.notFound) throw new AppError("Intento de prueba no encontrado", 404);
  if (result.unavailable) throw new AppError("La prueba todavía no ha iniciado", 409);
  if (result.incomplete) {
    throw new AppError(
      `Responde todas las preguntas antes de finalizar. Te faltan ${result.total - result.respondidas}.`,
      409,
    );
  }
  return { message: "Prueba completada exitosamente" };
};
