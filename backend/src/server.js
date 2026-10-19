import "dotenv/config";
import app from "./app.js";
import { startAgendaGenerator } from "./services/agendaService.js";

const port = Number(process.env.PORT || 3001);

const server = app.listen(port, () => {
  console.info(`Backend disponible en http://localhost:${port}`);
  startAgendaGenerator().catch((error) => {
    console.error("No se pudo inicializar la agenda:", error);
  });
});
