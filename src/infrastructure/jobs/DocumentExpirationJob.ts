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
          d.id, d.title, d.code, d.expiration_date, d.responsable_id, 
          u.email, u.full_name,
          CASE
            WHEN d.expiration_date = CURRENT_DATE + INTERVAL '1 month' THEN '1 mes'
            WHEN d.expiration_date = CURRENT_DATE + INTERVAL '14 days' THEN '2 semanas'
            WHEN d.expiration_date = CURRENT_DATE + INTERVAL '7 days' THEN '1 semana'
          END as time_left
        FROM documents d
        JOIN users u ON d.responsable_id = u.associate_id
        WHERE d.expiration_date IN (
          CURRENT_DATE + INTERVAL '1 month',
          CURRENT_DATE + INTERVAL '14 days',
          CURRENT_DATE + INTERVAL '7 days'
        )
        AND d.estado = 'VIGENTE'
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

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <h2 style="color: #d97706;">Aviso de Caducidad de Documento</h2>
            <p>Hola <strong>${doc.full_name}</strong>,</p>
            <p>Te recordamos que el documento que tienes a tu cargo caducará en exactamente <strong>${doc.time_left}</strong>.</p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Título:</strong> ${doc.title}</p>
              <p style="margin: 5px 0;"><strong>Código:</strong> ${doc.code}</p>
              <p style="margin: 0;"><strong>Fecha de Vencimiento:</strong> ${doc.expiration_date.toLocaleDateString()}</p>
            </div>
            <p>Por favor, ingresa al Sistema de Administración Integral (SAI) para iniciar su proceso de revisión.</p>
          </div>
        `;

        await mailService.sendMail(
          doc.email,
          `Acción Requerida: El documento ${doc.code} caduca en ${doc.time_left}`,
          emailHtml,
        );

        console.log(
          `Alerta enviada a ${doc.email} por el doc ${doc.code} (${doc.time_left})`,
        );
      }
    } catch (error) {
      console.error("Error al procesar lo documentos vencidos;", error);
    }
  });
};
