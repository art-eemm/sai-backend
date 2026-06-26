import nodemailer from "nodemailer";
import type {
  IMailService,
  SystemNotificationEmailOptions,
} from "@/domain/services/IMailService.js";

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
        <div style="margin: 0; padding: 32px 16px; background-color: #f8fafc; font-family: Arial, Helvetica, sans-serif;"><div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 6px 24px rgba(15, 23, 42, 0.06);"><div style="background-color: #5d9f1f; padding: 48px 24px 40px 24px; text-align: center;"><img style="display: block; margin: 0 auto 24px auto; max-width: 250px; width: 250px; height: auto;" src="https://github.com/eguerreropropysol/assets/blob/master/images/logo.png?raw=true" alt="Propysol" width="180" /><h1 style="margin: 0; color: #ffffff; font-size: 30px; font-weight: bold; letter-spacing: -0.5px;">Sistema de Administración Integral</h1><p style="margin: 10px 0 0 0; color: #f4ffe7; font-size: 15px;">Recuperación de contraseña</p></div><div style="padding: 42px 32px;"><h2 style="margin: 0 0 18px 0; color: #0f172a; font-size: 24px; text-align: center;">Restablece tu acceso</h2><p style="margin: 0 0 30px 0; color: #475569; font-size: 16px; line-height: 1.7; text-align: center;">Recibimos una solicitud para restablecer la contraseña de tu cuenta. Ingresa el siguiente código de verificación para continuar con el proceso.</p><div style="background: linear-gradient(135deg, #f8fff0 0%, #f3ffe3 100%); border: 2px solid rgba(128, 200, 53, 0.18); border-radius: 18px; padding: 28px 20px; text-align: center; margin-bottom: 28px;"><p style="margin: 0 0 12px 0; color: #6b7280; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Código de verificación</p><span style="display: inline-block; font-size: 42px; font-weight: bold; letter-spacing: 10px; color: #0f172a;"> ${code} </span></div><div style="background-color: rgba(241, 133, 44, 0.08); border: 1px solid rgba(241, 133, 44, 0.25); border-radius: 14px; padding: 16px 18px; margin-bottom: 26px;"><p style="margin: 0; color: #c25d07; font-size: 14px; line-height: 1.5; text-align: center; font-weight: 500;">Por seguridad, este código expirará en 15 minutos.</p></div><p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.7; text-align: center;">Si no realizaste esta solicitud, puedes ignorar este correo. Tu contraseña seguirá siendo la misma.</p></div><div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center;"><p style="margin: 0 0 6px 0; color: #0f172a; font-size: 13px; font-weight: 600;">Propysol</p><p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.6;">Este es un mensaje automático del Sistema de Administración Integral</p></div></div></div>
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

  async sendSystemNotification(
    options: SystemNotificationEmailOptions,
  ): Promise<void> {
    const {
      to,
      recipientName,
      type,
      subject,
      message,
      documentTitle,
      documentCode,
      expirationDate,
      timeLeft,
    } = options;

    let primaryColor = "#5d9f1f";
    let headerTitle = "Notificación del Sistema";
    let subtitleColor = "#f4ffe7";

    let badgeBg = "#f8fff0";
    let badgeBorder = "#d9efbe";
    let badgeLeftBorder = "#5d9f1f";

    let bannerBg = "#fff4ea";
    let bannerBorder = "#f1852c";
    let bannerText = "#c25d07";
    let bannerMsg =
      "Ingresa a la plataforma del SAI para revisar todos los detalles.";

    const upperType = type?.toUpperCase();

    if (upperType === "APROBADO") {
      primaryColor = "#5d9f1f";
      headerTitle = "Documento Aprobado";
      badgeBg = "#f0fdf4";
      badgeBorder = "#bbf7d0";
      badgeLeftBorder = "#16a34a";
      bannerBg = "#f0fdf4";
      bannerBorder = "#bbf7d0";
      bannerText = "#15803d";
      bannerMsg =
        "El documento ha sido aprobado con éxito. Por favor ingresa a firmarlo.";
    } else if (upperType === "CON_OBSERVACIONES") {
      primaryColor = "#dc2626";
      headerTitle = "Documento con Observaciones";
      badgeBg = "#fef2f2";
      badgeBorder = "#fca5a5";
      badgeLeftBorder = "#dc2626";
      bannerBg = "#fffbeb";
      bannerBorder = "#fde68a";
      bannerText = "#b45309";
      bannerMsg =
        "Por favor revisa las observaciones del revisor y sube una nueva versión corregida.";
    } else if (upperType === "EN_REVISION") {
      primaryColor = "#0284c7";
      headerTitle = "Revisión de Documento";
      badgeBg = "#f0f9ff";
      badgeBorder = "#bae6fd";
      badgeLeftBorder = "#0284c7";
      bannerBg = "#f0f9ff";
      bannerBorder = "#bae6fd";
      bannerText = "#0369a1";
      bannerMsg =
        "Se requiere de tu revisión para este documento lo antes posible.";
    } else if (upperType === "VIGENTE") {
      primaryColor = "#5d9f1f";
      headerTitle = "Nuevo Documento Publicado";
      badgeBg = "#f7fee7";
      badgeBorder = "#d9f99d";
      badgeLeftBorder = "#84cc16";
      bannerBg = "#f7fee7";
      bannerBorder = "#d9f99d";
      bannerText = "#4d7c0f";
      bannerMsg =
        "Una nueva versión oficial ha sido publicada y está disponible para consulta.";
    } else if (upperType === "POR_VENCER" || upperType === "VENCIDO") {
      primaryColor = "#f1852c";
      headerTitle = "Aviso de Caducidad";
      badgeBg = "#fffaf5";
      badgeBorder = "#fed7aa";
      badgeLeftBorder = "#f1852c";
      bannerBg = "#f8fff0";
      bannerBorder = "#cfe8ad";
      bannerText = "#3f6212";
      bannerMsg =
        "Ingresa al Sistema de Administración Integral (SAI) para iniciar el proceso de revisión y actualización correspondiente.";
    } else {
      primaryColor = "#5d9f1f";
      headerTitle = "Notificación del Sistema";
      badgeBg = "#f5f3ff";
      badgeBorder = "#ddd6fe";
      badgeLeftBorder = "#5d9f1f";
      bannerBg = "#f9fafb";
      bannerBorder = "#e5e7eb";
      bannerText = "#4b5563";
      bannerMsg =
        "Ingresa a la plataforma del SAI para revisar todos los detalles.";
    }

    const emailHtml = `
      <div style="margin: 0; padding: 24px; background-color: #f8fafc; font-family: Arial, Helvetica, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <div style="background-color: ${primaryColor}; padding: 32px 24px; text-align: center;">
            <img style="display: block; margin: 0 auto 16px auto; max-width: 200px; width: 200px; height: auto;" src="https://github.com/eguerreropropysol/assets/blob/master/images/logo.png?raw=true" alt="Propysol" width="200" />
            <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: bold; letter-spacing: -0.5px;">${headerTitle}</h1>
            <p style="margin: 6px 0 0 0; color: ${subtitleColor}; font-size: 14px;">Sistema de Administración Integral (SAI)</p>
          </div>
          <div style="padding: 32px 28px;">
            <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.7;">Hola <strong>${recipientName || ""}</strong>,</p>
            <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.7;">Tienes una actualización importante del sistema:</p>
            
            <div style="background-color: ${badgeBg}; border: 1px solid ${badgeBorder}; border-left: 5px solid ${badgeLeftBorder}; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
              <p style="margin: 0 0 10px 0; color: #0f172a; font-size: 15px; line-height: 1.5;"><strong>Asunto:</strong> ${subject}</p>
              <p style="margin: 0 0 10px 0; color: #0f172a; font-size: 15px; line-height: 1.5;"><strong>Documento:</strong> ${documentTitle || "N/A"}</p>
              <p style="margin: 0 0 10px 0; color: #0f172a; font-size: 15px; line-height: 1.5;"><strong>Procedencia:</strong> ${documentCode || "N/A"}</p>
              ${expirationDate ? `<p style="margin: 0 0 10px 0; color: #0f172a; font-size: 15px; line-height: 1.5;"><strong>Vence:</strong> ${expirationDate}</p>` : ""}
              ${timeLeft ? `<p style="margin: 0 0 10px 0; color: #0f172a; font-size: 15px; line-height: 1.5;"><strong>Tiempo restante:</strong> ${timeLeft}</p>` : ""}
              <div style="margin-top: 14px; padding-top: 14px; border-top: 1px dashed ${badgeBorder}; color: #374151; font-size: 15px; line-height: 1.6;">
                ${message.replace(/\n/g, "<br/>")}
              </div>
            </div>
            
            <div style="background-color: ${bannerBg}; border: 1px solid ${bannerBorder}; border-radius: 10px; padding: 14px 16px; margin-bottom: 22px;">
              <p style="margin: 0; color: ${bannerText}; font-size: 14px; line-height: 1.6; text-align: center; font-weight: 500;">
                ${bannerMsg}
              </p>
            </div>
            
            <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.7;">Este aviso se genera automáticamente. No respondas a este correo.</p>
          </div>
          <div style="border-top: 1px solid #e2e8f0; padding: 22px; text-align: center; background-color: #f8fafc;">
            <p style="margin: 0 0 6px 0; color: #0f172a; font-size: 13px; font-weight: bold;">Propysol</p>
            <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.6;">Este es un mensaje automático del Sistema de Administración Integral</p>
          </div>
        </div>
      </div>
    `;

    const mailOptions = {
      from: '"Sistema SAI Propysol" <no-reply@propysol.com>',
      to,
      subject: subject,
      html: emailHtml,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendPasswordChangedConfirm(to: string): Promise<void> {
    const mailOptions = {
      from: '"Sistema SAI Propysol" <no-reply@propysol.com>',
      to,
      subject: "Confirmación de cambio de contraseña",
      html: `
        <div style="margin: 0; padding: 32px 16px; background-color: #f8fafc; font-family: Arial, Helvetica, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 6px 24px rgba(15, 23, 42, 0.06);">
            <div style="background-color: #5d9f1f; padding: 48px 24px 40px 24px; text-align: center;">
              <img style="display: block; margin: 0 auto 24px auto; max-width: 250px; width: 250px; height: auto;" src="https://github.com/eguerreropropysol/assets/blob/master/images/logo.png?raw=true" alt="Propysol" width="180" />
              <h1 style="margin: 0; color: #ffffff; font-size: 30px; font-weight: bold; letter-spacing: -0.5px;">Sistema de Administración Integral</h1>
              <p style="margin: 10px 0 0 0; color: #f4ffe7; font-size: 15px;">Seguridad de la cuenta</p>
            </div>
            <div style="padding: 42px 32px;">
              <h2 style="margin: 0 0 18px 0; color: #0f172a; font-size: 24px; text-align: center;">Contraseña cambiada</h2>
              <p style="margin: 0 0 30px 0; color: #475569; font-size: 16px; line-height: 1.7; text-align: center;">
                Te informamos que la contraseña de tu cuenta en el Sistema de Administración Integral (SAI) ha sido cambiada recientemente de manera exitosa.
              </p>
              <div style="background-color: rgba(241, 133, 44, 0.08); border: 1px solid rgba(241, 133, 44, 0.25); border-radius: 14px; padding: 16px 18px; margin-bottom: 26px;">
                <p style="margin: 0; color: #c25d07; font-size: 14px; line-height: 1.5; text-align: center; font-weight: 500;">
                  Si tú no realizaste este cambio, por favor comunícate de inmediato con el departamento de TIC para asegurar tu cuenta.
                </p>
              </div>
              <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.7; text-align: center;">
                Este es un aviso automático de seguridad, por favor no respondas a este mensaje.
              </p>
            </div>
            <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center;">
              <p style="margin: 0 0 6px 0; color: #0f172a; font-size: 13px; font-weight: 600;">Propysol</p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.6;">Este es un mensaje automático del Sistema de Administración Integral</p>
            </div>
          </div>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }
}
