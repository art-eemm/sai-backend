import { Pool } from "pg";
import dotenv from "dotenv";

// Carga variables de entorno
dotenv.config();

if (
  !process.env.DB_HOST ||
  !process.env.DB_USER ||
  !process.env.DB_PASSWORD ||
  !process.env.DB_NAME
) {
  console.error("Error: Faltan variables de entorno para la bd");
  process.exit(1);
}

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || "5432"),
});

pool.on("connect", () => {
  console.log("Conexión establecida");
});

// Auto-run schema migration
pool.query(`
  ALTER TABLE document_reviews 
  ADD COLUMN IF NOT EXISTS correction_file_url VARCHAR(500);
`).then(() => {
  console.log("Tabla document_reviews verificada/actualizada con correction_file_url");
}).catch((err) => {
  console.error("Error al actualizar la tabla document_reviews:", err);
});

pool.query(`
  ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'APROBADO_SAI';
`).then(() => {
  console.log("Enum document_status verificado/actualizado con APROBADO_SAI");
}).catch((err) => {
  console.error("Error al actualizar el enum document_status:", err);
});

pool.on("error", (err) => {
  console.error("Error inesperado en el cliente de PostegreSQL", err);
  process.exit(-1);
});

export default pool;
