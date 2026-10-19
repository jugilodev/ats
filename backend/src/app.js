import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import authRoutes from "./routes/authRoutes.js";
import agendaRoutes from "./routes/agendaRoutes.js";
import applicantRoutes from "./routes/applicantRoutes.js";
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
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/agenda", agendaRoutes);
app.use("/api/aspirantes", applicantRoutes);
app.use("/api/requisitos", requirementRoutes);
app.use("/api/vacantes", vacancyRoutes);

app.use((error, _req, res, _next) => {
  const statusCode = error.statusCode ?? 500;

  if (statusCode === 500) {
    console.error("Error no controlado en la API:", error);
  }

  res.status(statusCode).json({
    message:
      statusCode === 500 ? "Error interno del servidor" : error.message,
  });
});

export default app;
