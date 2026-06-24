export interface SystemNotificationEmailOptions {
  to: string;
  recipientName: string;
  type: string;
  subject: string;
  message: string;
  documentTitle: string;
  documentCode: string;
  expirationDate?: string | undefined;
  timeLeft?: string | undefined;
}

export interface IMailService {
  sendResetCode(to: string, code: string): Promise<void>;
  sendMail(to: string, subject: string, html: string): Promise<void>;
  sendSystemNotification(options: SystemNotificationEmailOptions): Promise<void>;
}
