import { Router } from "express";
import {
  addVacancy,
  listVacancies,
  removeVacancy,
  updateVacancy,
  updateVacancyStatus,
} from "../controllers/vacancyController.js";
import authenticate from "../middleware/authenticate.js";
import validateVacancy from "../middleware/validateVacancy.js";
import validateVacancyStatus from "../middleware/validateVacancyStatus.js";

const router = Router();

router.use(authenticate);
router.get("/", listVacancies);
router.post("/", validateVacancy, addVacancy);
router.put("/:id", validateVacancy, updateVacancy);
router.patch("/:id/status", validateVacancyStatus, updateVacancyStatus);
router.delete("/:id", removeVacancy);

export default router;
