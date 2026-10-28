import { Router } from "express";
import {
  listReportPostulations,
  sendApplicant16pfGuideController,
} from "../controllers/applicantReportController.js";
import { inviteApplicant } from "../controllers/examController.js";
import authenticate from "../middleware/authenticate.js";

const router = Router();

router.use(authenticate);
router.get("/:id/informe-16pf/postulaciones", listReportPostulations);
router.post(
  "/:id/informe-16pf/postulaciones/:postulacionId/enviar",
  sendApplicant16pfGuideController,
);
router.post("/:id/prueba-16pf/enviar", inviteApplicant);

export default router;
