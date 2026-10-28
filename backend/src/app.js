import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import authRoutes from "./routes/authRoutes.js";
import agendaRoutes from "./routes/agendaRoutes.js";
import applicantRoutes from "./routes/applicantRoutes.js";
import applicantConsentRoutes from "./routes/applicantConsentRoutes.js";
import applicantExamRoutes from "./routes/applicantExamRoutes.js";
import consentRoutes from "./routes/consentRoutes.js";
import examRoutes from "./routes/examRoutes.js";
import requirementRoutes from "./routes/requirementRoutes.js";
import vacancyRoutes from "./routes/vacancyRoutes.js";

const app = express();
const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: "750kb" }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/agenda", agendaRoutes);
app.use("/api/aspirantes", applicantRoutes);
app.use("/api/aspirantes", applicantConsentRoutes);
app.use("/api/aspirantes", applicantExamRoutes);
app.use("/api/consentimiento-datos", consentRoutes);
app.use("/api/pruebas16pf", examRoutes);
app.use("/api/requisitos", requirementRoutes);
app.use("/api/vacantes", vacancyRoutes);

app.use((error, _req, res, _next) => {
  const statusCode = error.statusCode ?? error.status ?? 500;

  if (statusCode === 500) {
    console.error("Error no controlado en la API:", error);
  }

  res.status(statusCode).json({
    message:
      statusCode === 500 ? "Error interno del servidor" : error.message,
  });
});

export default app;
