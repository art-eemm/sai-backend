import app from "./app.js";
import dotenv from "dotenv";
import pool from "./config/db.js";
import { startDocumentExpirationJob } from "./infrastructure/jobs/DocumentExpirationJob.js";

dotenv.config();

const PORT = process.env.PORT || 4000;

// Arrancar servidor
const main = async () => {
  try {
    await pool.query("SELECT NOW()");
    console.log("Base de datos conectada.");

    app.listen(PORT, () => {
      console.log(`Servidor del SAI corriendo en: http://localhost:${PORT}`);
      startDocumentExpirationJob();
    });
  } catch (error) {
    console.error("Error al iniciar el servidor:", error);
  }
};

main();
