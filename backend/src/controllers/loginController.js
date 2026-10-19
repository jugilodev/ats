import { authenticateUser } from "../services/authService.js";

const login = async (req, res) => {
  const { token, user } = await authenticateUser(req.body);

  res.cookie("ats_token", token, {
    httpOnly: true, // JavaScript del navegador no puede leer el token.
    secure: process.env.NODE_ENV === "production", // En producción, solo se envía por HTTPS.
    sameSite: "lax", // Reduce envíos desde otros sitios sin bloquear navegación normal.
    maxAge: 2 * 60 * 60 * 1000, // Duración en milisegundos: 2 horas.
    path: "/", // La cookie se envía a todas las rutas de la API.
  });
  res.json({ usuario: user });
};

export default login;
