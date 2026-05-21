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
        <div style="margin: 0; padding: 32px 16px; background-color: #f8fafc; font-family: Arial, Helvetica, sans-serif;"><div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 6px 24px rgba(15, 23, 42, 0.06);"><div style="background-color: #5d9f1f; padding: 48px 24px 40px 24px; text-align: center;"><img style="display: block; margin: 0 auto 24px auto; max-width: 250px; width: 250px; height: auto;" src="https://github.com/eguerreropropysol/assets/blob/master/images/logo.png?raw=true" alt="Propysol" width="180" /><h1 style="margin: 0; color: #ffffff; font-size: 30px; font-weight: bold; letter-spacing: -0.5px;">Sistema de Administración Integral</h1><p style="margin: 10px 0 0 0; color: #f4ffe7; font-size: 15px;">Recuperación de contraseña</p></div><div style="padding: 42px 32px;"><h2 style="margin: 0 0 18px 0; color: #0f172a; font-size: 24px; text-align: center;">Restablece tu acceso</h2><p style="margin: 0 0 30px 0; color: #475569; font-size: 16px; line-height: 1.7; text-align: center;">Recibimos una solicitud para restablecer la contraseña de tu cuenta. Ingresa el siguiente código de verificación para continuar con el proceso.</p><div style="background: linear-gradient(135deg, #f8fff0 0%, #f3ffe3 100%); border: 2px solid rgba(128, 200, 53, 0.18); border-radius: 18px; padding: 28px 20px; text-align: center; margin-bottom: 28px;"><p style="margin: 0 0 12px 0; color: #6b7280; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Código de verificación</p><span style="display: inline-block; font-size: 42px; font-weight: bold; letter-spacing: 10px; color: #0f172a;"> ${code} </span></div><div style="background-color: rgba(241, 133, 44, 0.08); border: 1px solid rgba(241, 133, 44, 0.25); border-radius: 14px; padding: 16px 18px; margin-bottom: 26px;"><p style="margin: 0; color: #c25d07; font-size: 14px; line-height: 1.5; text-align: center; font-weight: 500;">Por seguridad, este código expirará en 15 minutos.</p></div><p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.7; text-align: center;">Si no realizaste esta solicitud, puedes ignorar este correo. Tu contraseña seguirá siendo la misma.</p></div><div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center;"><p style="margin: 0 0 6px 0; color: #0f172a; font-size: 13px; font-weight: 600;">Propysol</p><p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.6;">Sistema de Administración Integral</p></div></div></div>
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
      to,
      bcc: to,
      subject: `Nuevo documento disponible: ${documentName}`,
      html: `
      <div style="margin: 0; padding: 24px; background-color: #ffffff; font-family: Arial, Helvetica, sans-serif;"><div style="max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden;"><div style="background-color: #5d9f1f; padding: 48px 24px 40px 24px; text-align: center;"><img style="display: block; margin: 0 auto 24px auto; max-width: 250px; width: 250px; height: auto;" src="https://github.com/eguerreropropysol/assets/blob/master/images/logo.png?raw=true" alt="Propysol" width="180" /><h1 style="margin: 0; color: #ffffff; font-size: 30px; font-weight: bold; letter-spacing: -0.5px;">Nuevo Documento</h1><p style="margin: 10px 0 0 0; color: #f4ffe7; font-size: 15px;">Sistema de Administración Integral</p></div><div style="padding: 32px 28px;"><p style="margin: 0 0 22px 0; color: #374151; font-size: 16px; line-height: 1.7;">Te informamos que un nuevo documento ha sido publicado y ya se encuentra disponible para su consulta dentro de la plataforma.</p><div style="background-color: #f8fff0; border: 1px solid #d9efbe; border-left: 5px solid #80c835; border-radius: 10px; padding: 18px 18px; margin-bottom: 24px;"><p style="margin: 0 0 10px 0; color: #0f172a; font-size: 15px;"><strong>Documento:</strong> ${documentName}</p><p style="margin: 0; color: #0f172a; font-size: 15px;"><strong>Categoría:</strong> ${category}</p></div><div style="background-color: #fff4ea; border: 1px solid #f1852c; border-radius: 10px; padding: 14px 16px; margin-bottom: 22px;"><p style="margin: 0; color: #c25d07; font-size: 14px; line-height: 1.6;">Ya puedes consultar el nuevo documento en el portal del SAI</p></div><p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.7;">Si tienes problemas para visualizar el documento, contacta al administrador del sistema.</p></div><div style="border-top: 1px solid #eeeeee; padding: 22px; text-align: center;"><p style="margin: 0 0 6px 0; color: #0f172a; font-size: 13px; font-weight: bold;">Propysol</p><p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.6;">Este es un mensaje automático del Sistema de Administración Integral.</p></div></div></div>
    `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendMail(to: string, subject: string, html: string): Promise<void> {
    const mailOptions = {
      from: '"Sistema SAI Propysol" <no-reply@propysol.com>',
      to,
      subject,
      html,
    };

    await this.transporter.sendMail(mailOptions);
  }
}
