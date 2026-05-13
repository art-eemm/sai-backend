import type { IUserRepository } from "@/domain/repositories/IUserRepository.js";
import bcrypt from "bcryptjs";

export class ResetPasswordUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepo.findByEmail(email);

    if (!user || user.reset_code !== code) {
      throw new Error("INVALID_CODE");
    }

    const now = new Date();
    if (!user.reset_code_expires || new Date(user.reset_code_expires) < now) {
      throw new Error("EXPIRED_CODE");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await this.userRepo.updatePasswordAndClearCode(email, hashedPassword);
  }
}
