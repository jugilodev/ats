import { Router } from "express";
import {
  finishApplicantExamController,
  getApplicantExam,
  loginApplicant,
  saveApplicantAnswer,
  startApplicantExamController,
} from "../controllers/examController.js";
import authenticateExamApplicant from "../middleware/authenticateExamApplicant.js";

const router = Router();

router.post("/invitaciones/:token/ingresar", loginApplicant);
router.use("/portal", authenticateExamApplicant);
router.get("/portal/estado", getApplicantExam);
router.post("/portal/iniciar", startApplicantExamController);
router.put("/portal/respuestas", saveApplicantAnswer);
router.post("/portal/finalizar", finishApplicantExamController);

export default router;
