import nodemailer from "nodemailer";
import type { IMailService } from "@/domain/services/IMailService.js";

export class MailerService implements IMailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMT_PORT) || 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendResetCode(to: string, code: string): Promise<void> {
    const mailOptions = {
      from: '"Sistema SAI Propysol" <no-reply@propysol.com>',
      to,
      subject: "Código de recuperación de contraseña",
      html: `
        <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #0f172a; text-align: center;">Recuperación de Contraseña</h2>
          <p style="color: #475569; font-size: 16px;">Has solicitado restablecer tu contraseña. Usa el siguiente código de 6 dígitos para continuar:</p>
          <div style="background-color: #f1f5f9; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #0f172a;">${code}</span>
          </div>
          <p style="color: #475569; font-size: 14px;">Este código expirará en 15 minutos.</p>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 30px; text-align: center;">Si no solicitaste este cambio, puedes ignorar este correo.</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendNewDocumentAvailable(
    to: string[],
    documentName: string,
    category: string,
  ): Promise<void> {
    const mailOptions = {
      from: '"Sistema SAI Propysol" <no-reply@propysol.com>',
      to: "no-reply@propysol.com",
      bcc: to,
      subject: `Nuevo documento disponible: ${documentName}`,
      html: `
      <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 12px;">
        <h2 style="color: #16a34a;">¡Documento Aprobado!</h2>
        <p>Te informamos que un nuevo documento ha sido publicado y ya se encuentra disponible para su consulta en la plataforma.</p>
        <div style="background: #f9fafb; padding: 15px; border-left: 4px solid #16a34a; margin: 20px 0;">
          <strong>Documento:</strong> ${documentName}<br>
          <strong>Categoría:</strong> ${category}
        </div>
        <p style="font-size: 14px; color: #666;">Puedes acceder a través de tu panel de usuario en el SAI.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #999; text-align: center;">Este es un mensaje automático del Sistema de Administración Integral.</p>
      </div>
    `,
    };

    await this.transporter.sendMail(mailOptions);
  }
}
