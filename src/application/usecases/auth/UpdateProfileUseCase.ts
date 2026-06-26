import type { IUserRepository } from "@/domain/repositories/IUserRepository.js";
import type { IMailService } from "@/domain/services/IMailService.js";
import bcrypt from "bcryptjs";

export class UpdateProfileUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly mailerService: IMailService,
  ) {}

  async execute(
    userId: number,
    data: {
      currentPassword?: string;
      newPassword?: string;
      profile_pic_url?: string;
    },
  ) {
    const user = await this.userRepo.findByAssociateId(userId);
    if (!user) throw new Error("USER_NOT_FOUND");

    const updateData: { password_hash?: string; profile_pic_url?: string } = {};

    if (data.newPassword && data.currentPassword) {
      const isMatch = await bcrypt.compare(
        data.currentPassword,
        user.password_hash,
      );
      if (!isMatch) throw new Error("INVALID_CURRENT_PASSWORD");

      const salt = await bcrypt.genSalt(10);
      updateData.password_hash = await bcrypt.hash(data.newPassword, salt);
    }

    if (data.profile_pic_url) {
      updateData.profile_pic_url = data.profile_pic_url;
    }

    if (Object.keys(updateData).length > 0) {
      await this.userRepo.updateProfile(userId, updateData);

      if (updateData.password_hash) {
        await this.mailerService.sendPasswordChangedConfirm(user.email);
      }
    }
  }
}
