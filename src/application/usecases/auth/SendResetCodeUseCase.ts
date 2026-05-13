import type { IUserRepository } from "@/domain/repositories/IUserRepository.js";
import type { IMailService } from "@/domain/services/IMailService.js";

export class SendResetCodeUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly mailerService: IMailService,
  ) {}

  async execute(email: string): Promise<void> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) return;

    if (user.las_code_sent) {
      const now = new Date();
      const lastSent = new Date(user.las_code_sent);
      const diffMinutes = (now.getTime() - lastSent.getTime()) / 60000;

      if (diffMinutes < 5) {
        throw new Error("WAIT_5_MINUTES");
      }
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60000);

    await this.userRepo.saveResetCode(email, code, expiresAt, now);
    await this.mailerService.sendResetCode(email, code);
  }
}
