import { Router } from "express";
import { inviteApplicant } from "../controllers/examController.js";
import authenticate from "../middleware/authenticate.js";

const router = Router();

router.use(authenticate);
router.post("/:id/prueba-16pf/enviar", inviteApplicant);

export default router;
