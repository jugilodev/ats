import { Router } from "express";
import {
  addApplicantToSlot,
  createAgendaSlot,
  deleteApplicantFromSlot,
  deleteAgendaSlot,
  listAvailableApplicants,
  listAgenda,
  saveAgendaTemplate,
  updateAgendaSlot,
} from "../controllers/agendaController.js";
import authenticate from "../middleware/authenticate.js";

const router = Router();

router.use(authenticate);
router.get("/", listAgenda);
router.get("/postulantes-disponibles", listAvailableApplicants);
router.put("/plantilla", saveAgendaTemplate);
router.post("/fechas/:fecha/horarios", createAgendaSlot);
router.post("/horarios/:id/postulantes", addApplicantToSlot);
router.delete(
  "/horarios/:id/postulantes/:aspiranteId",
  deleteApplicantFromSlot,
);
router.patch("/horarios/:id", updateAgendaSlot);
router.delete("/horarios/:id", deleteAgendaSlot);

export default router;
