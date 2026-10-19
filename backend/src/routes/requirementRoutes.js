import { Router } from "express";
import {
  addRequirement,
  listRequirements,
  removeRequirement,
} from "../controllers/requirementController.js";
import authenticate from "../middleware/authenticate.js";
import validateRequirement from "../middleware/validateRequirement.js";

const router = Router();

router.use(authenticate);
router.get("/", listRequirements);
router.post("/", validateRequirement, addRequirement);
router.delete("/:id", removeRequirement);

export default router;
