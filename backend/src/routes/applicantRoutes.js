import { Router } from "express";
import {
  addApplicant,
  deleteApplicant,
  listApplicants,
  updateApplicant,
} from "../controllers/applicantController.js";
import { getApplicantPostulationCv } from "../controllers/applicantCvController.js";
import authenticate from "../middleware/authenticate.js";
import validateApplicant from "../middleware/validateApplicant.js";

const router = Router();

router.use(authenticate);
router.get("/", listApplicants);
router.get("/:id/postulaciones/:postulationId/cv", getApplicantPostulationCv);
router.post("/", validateApplicant, addApplicant);
router.put("/:id", validateApplicant, updateApplicant);
router.delete("/:id", deleteApplicant);

export default router;
