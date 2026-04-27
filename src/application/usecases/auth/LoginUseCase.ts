import type { IUserRepository } from "@/domain/repositories/IUserRepository.js";
import type { LoginDTO } from "@/application/dtos/auth/LoginDTO.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export class LoginUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(dto: LoginDTO) {
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user) throw new Error("USER_NOT_FOUND");

    const valid = await bcrypt.compare(dto.password, user.password_hash);
    if (!valid) throw new Error("INVALID_PASSWORD");

    // construimos payload que incluye el id pero no lo expone en la respuesta
    const payload = {
      id: user.associate_id,
      name: user.full_name,
      role: user.role,
      email: user.email,
      code: user.code,
      department: user.department ?? null,
    };

    const token = jwt.sign(payload, process.env["JWT_SECRET"] as string, {
      expiresIn: "1h",
    });

    return {
      token,
      user: {
        name: user.full_name,
        role: user.role,
        departent: user.department,
        code: user.code,
      }, // sólo nombre y rol
    };
  }
}
