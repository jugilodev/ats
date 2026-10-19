import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Falta configurar DATABASE_URL en el archivo .env");
}

const pool = new Pool({
  connectionString,
});

pool.on("error", (error) => {
  console.error("Error inesperado en el pool de PostgreSQL:", error);
});

export default pool;
