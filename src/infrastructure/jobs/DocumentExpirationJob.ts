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
          <div style="margin: 0; padding: 24px; background-color: #ffffff; font-family: Arial, Helvetica, sans-serif;"><div style="max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden;"><div style="background-color: #f1852c; padding: 28px 24px; text-align: center;"><h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: bold;">Aviso de Caducidad</h1><p style="margin: 10px 0 0 0; color: #fff7ed; font-size: 14px;">Sistema de Administración Integral</p></div><div style="padding: 32px 28px;"><p style="margin: 0 0 18px 0; color: #374151; font-size: 16px; line-height: 1.7;">Hola,</p><p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.7;">Te recordamos que el documento asignado a tu cargo caducará en exactamente <strong>${doc.time_left}</strong>.</p><div style="background-color: #fffaf5; border: 1px solid #fed7aa; border-left: 5px solid #f1852c; border-radius: 10px; padding: 18px; margin-bottom: 24px;"><p style="margin: 0 0 12px 0; color: #0f172a; font-size: 15px;"><strong>Título:</strong> ${doc.title}</p><p style="margin: 0 0 12px 0; color: #0f172a; font-size: 15px;"><strong>Código:</strong> ${doc.code}</p><p style="margin: 0; color: #0f172a; font-size: 15px;"><strong>Fecha de vencimiento:</strong> ${doc.expiration_date.toLocaleDateString()}</p></div><div style="background-color: #f8fff0; border: 1px solid #cfe8ad; border-radius: 10px; padding: 14px 16px; margin-bottom: 22px;"><p style="margin: 0; color: #3f6212; font-size: 14px; line-height: 1.6;">Ingresa al Sistema de Administración Integral (SAI) para iniciar el proceso de revisión y actualización correspondiente.</p></div><p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.7;">Este aviso se genera automáticamente como parte del seguimiento de vigencia documental de la plataforma.</p></div><div style="border-top: 1px solid #eeeeee; padding: 22px; text-align: center;"><p style="margin: 0 0 6px 0; color: #0f172a; font-size: 13px; font-weight: bold;">Propysol</p><p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.6;">Este es un mensaje automático del Sistema de Administración Integral</p></div></div></div>
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
