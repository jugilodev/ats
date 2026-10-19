import { Router } from "express";
import {
  addApplicant,
  deleteApplicant,
  listApplicants,
  updateApplicant,
} from "../controllers/applicantController.js";
import authenticate from "../middleware/authenticate.js";
import validateApplicant from "../middleware/validateApplicant.js";

const router = Router();

router.use(authenticate);
router.get("/", listApplicants);
router.post("/", validateApplicant, addApplicant);
router.put("/:id", validateApplicant, updateApplicant);
router.delete("/:id", deleteApplicant);

export default router;
