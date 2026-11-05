import { Router } from "express";
import { getSignedConsentPdfController } from "../controllers/signedConsentController.js";
import { sendAuthorization } from "../controllers/consentController.js";
import authenticate from "../middleware/authenticate.js";

const router = Router();

router.use(authenticate);
router.get("/:id/tratamiento/pdf", getSignedConsentPdfController);
router.post("/:id/tratamiento/enviar", sendAuthorization);

export default router;
