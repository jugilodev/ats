const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export const apiRequest = async (path, options = {}) => {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "No se pudo completar la solicitud");
  }

  return data;
};
