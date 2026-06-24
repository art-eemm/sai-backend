import cron from "node-cron";
import pool from "@/config/db.js";
import { MailerService } from "../services/MailService.js";

const mailService = new MailerService();

export const startDocumentExpirationJob = () => {
  cron.schedule("0 8 * * *", async () => {
    console.log("Ejecutando revisión diaria de vencimiento de documentos...");

    try {
      const query = `
        SELECT 
          d.id, d.title, d.origin_code AS code, d.expiration_date, d.created_by_id AS responsable_id, 
          u.email, u.full_name,
          CASE
            WHEN d.expiration_date = CURRENT_DATE + INTERVAL '1 month' THEN '1 mes'
            WHEN d.expiration_date = CURRENT_DATE + INTERVAL '14 days' THEN '2 semanas'
            WHEN d.expiration_date = CURRENT_DATE + INTERVAL '7 days' THEN '1 semana'
          END as time_left
        FROM documents d
        JOIN users u ON d.created_by_id = u.associate_id
        WHERE d.expiration_date IN (
          CURRENT_DATE + INTERVAL '1 month',
          CURRENT_DATE + INTERVAL '14 days',
          CURRENT_DATE + INTERVAL '7 days'
        )
        AND d.status IN ('VIGENTE', 'POR_VENCER')
      `;

      const { rows: expiringDocs } = await pool.query(query);

      if (expiringDocs.length === 0) {
        console.log("No hay documentos próximos a caducar hoy.");
        return;
      }

      for (const doc of expiringDocs) {
        const insertNotifQuery = `
          INSERT INTO notifications (user_id, title, message, origin_code, is_read, created_at)
          VALUES ($1, $2, $3, $4, false, NOW())
        `;

        const notifTitle = "Documento próximo a caducar";
        const notifMessage = `Falta ${doc.time_left} para que caduque el documento ${doc.code}`;

        await pool.query(insertNotifQuery, [
          doc.responsable_id,
          notifTitle,
          notifMessage,
          doc.code,
        ]);

        const expDateStr = doc.expiration_date instanceof Date ? doc.expiration_date.toLocaleDateString("es-MX") : String(doc.expiration_date);

        await mailService.sendSystemNotification({
          to: doc.email,
          recipientName: doc.full_name || "",
          type: "POR_VENCER",
          subject: `Acción Requerida: El documento ${doc.code} caduca en ${doc.time_left}`,
          message: `Te recordamos que el documento asignado a tu cargo caducará en exactamente ${doc.time_left}.`,
          documentTitle: doc.title || "",
          documentCode: doc.code || "",
          expirationDate: expDateStr,
          timeLeft: doc.time_left,
        });

        console.log(
          `Alerta enviada a ${doc.email} por el doc ${doc.code} (${doc.time_left})`,
        );
      }
    } catch (error) {
      console.error("Error al procesar lo documentos vencidos;", error);
    }
  });
};
