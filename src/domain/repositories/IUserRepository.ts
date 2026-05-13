import type { User } from "../entities/User.js";

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findAllEmails(): Promise<string[]>;
  saveResetCode(
    email: string,
    code: string,
    expiresAt: Date,
    lastSent: Date,
  ): Promise<void>;
  updatePasswordAndClearCode(
    email: string,
    newPasswordHash: string,
  ): Promise<void>;
  findByAssociateId(id: number): Promise<User | null>;
  updateProfile(
    userId: number,
    data: { password_hash?: string; profile_pic_url?: string },
  ): Promise<void>;
}
