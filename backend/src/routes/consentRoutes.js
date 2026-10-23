import { Router } from "express";
import {
  getAuthorization,
  signAuthorization,
} from "../controllers/consentController.js";

const router = Router();

router.get("/:token", getAuthorization);
router.post("/:token/firmar", signAuthorization);

export default router;
