import {
  answerApplicantQuestion,
  finishApplicantExam,
  getApplicantExamState,
  loginExamApplicant,
  sendExamInvitation,
  startApplicantExam,
} from "../services/examService.js";

export const inviteApplicant = async (req, res) => {
  res.json(await sendExamInvitation(req.params.id));
};

export const loginApplicant = async (req, res) => {
  const result = await loginExamApplicant({
    token: req.params.token,
    usuario: req.body?.usuario,
    contrasena: req.body?.contrasena,
    ipAddress: req.ip,
  });

  res.cookie("prueba16pf_token", result.sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 12 * 60 * 60 * 1000,
    path: "/api/pruebas16pf/portal",
  });
  res.set("Cache-Control", "no-store");
  res.json({ nombre: result.nombre, estado: result.estado });
};

export const getApplicantExam = async (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(
    await getApplicantExamState(
      req.examApplicant.attemptId,
      req.query.orden,
    ),
  );
};

export const startApplicantExamController = async (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(await startApplicantExam(req.examApplicant.attemptId));
};

export const saveApplicantAnswer = async (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(
    await answerApplicantQuestion(
      req.examApplicant.attemptId,
      req.body,
    ),
  );
};

export const finishApplicantExamController = async (req, res) => {
  res.set("Cache-Control", "no-store");
  const result = await finishApplicantExam(req.examApplicant.attemptId);
  res.clearCookie("prueba16pf_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/pruebas16pf/portal",
  });
  res.json(result);
};
