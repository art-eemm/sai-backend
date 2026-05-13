export interface IMailService {
  sendResetCode(to: string, code: string): Promise<void>;
  sendNewDocumentAvailable(
    to: string[],
    documentName: string,
    category: string,
  ): Promise<void>;
  sendMail(to: string, subject: string, html: string): Promise<void>;
}
