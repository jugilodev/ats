import nodemailer from "nodemailer";
import AppError from "../errors/AppError.js";

export const assertMailConfiguration = () => {
  const { SMTP_HOST, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
  const port = Number(process.env.SMTP_PORT || 587);

  if (
    !SMTP_HOST?.trim() ||
    !SMTP_USER?.trim() ||
    !SMTP_PASSWORD ||
    !SMTP_FROM?.trim() ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65_535
  ) {
    throw new AppError(
      "Falta configurar SMTP_HOST, SMTP_USER, SMTP_PASSWORD, SMTP_FROM y un SMTP_PORT válido en el backend",
      503,
    );
  }
};

export const sendEmail = async ({ to, subject, text, html }) => {
  assertMailConfiguration();

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  try {
    return await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      text,
      html,
    });
  } finally {
    transporter.close();
  }
};
