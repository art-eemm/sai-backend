import type { IUserRepository } from "@/domain/repositories/IUserRepository.js";

export class GetProfileUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(userId: number) {
    const user = await this.userRepo.findByAssociateId(userId);

    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    return {
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      department: user.department ?? "Sin asignar",
      profile_pic_url: user.profile_pic_url ?? null,
      phone: user.phone ?? "N/A",
      extension: user.extension ?? "N/A",
    };
  }
}
