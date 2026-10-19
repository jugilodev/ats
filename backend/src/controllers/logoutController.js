const logout = (_req, res) => {
  // Para borrarla, se usa el mismo nombre y la misma ruta que al crearla.
  res.clearCookie("ats_token", { path: "/" });
  res.json({ message: "Sesión cerrada correctamente" });
};

export default logout;
