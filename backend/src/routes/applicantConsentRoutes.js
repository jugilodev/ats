import { Router } from "express";
import { sendAuthorization } from "../controllers/consentController.js";
import authenticate from "../middleware/authenticate.js";

const router = Router();

router.use(authenticate);
router.post("/:id/tratamiento/enviar", sendAuthorization);

export default router;
