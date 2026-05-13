import pool from "@/config/db.js";
import type { IUserRepository } from "@/domain/repositories/IUserRepository.js";
import type { User } from "@/domain/entities/User.js";

export class PostgresUserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query(
      `SELECT u.*, d.name AS department, d.code AS code
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.email = $1`,
      [email],
    );
    // department_id will be included automatically; department holds the name
    return (result.rows[0] as User | undefined) ?? null;
  }

  async saveResetCode(
    email: string,
    code: string,
    expiresAt: Date,
    lastSent: Date,
  ): Promise<void> {
    await pool.query(
      `UPDATE users
      SET reset_code = $1, reset_code_expires = $2, last_code_sent = $3
      WHERE email = $4`,
      [code, expiresAt, lastSent, email],
    );
  }

  async updatePasswordAndClearCode(
    email: string,
    newPasswordHash: string,
  ): Promise<void> {
    await pool.query(
      `UPDATE users
      SET password_hash = $1, reset_code = NULL, reset_code_expires = NULL, last_code_sent = NULL
      WHERE email = $2`,
      [newPasswordHash, email],
    );
  }

  async findAllEmails(): Promise<string[]> {
    const result = await pool.query("SELECT email FROM users");
    return result.rows.map((row) => row.email);
  }

  async findByAssociateId(id: number): Promise<User | null> {
    const result = await pool.query(
      `SELECT u.*, d.name AS department, d.code AS code
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.associate_id = $1`,
      [id],
    );
    return (result.rows[0] as User | undefined) ?? null;
  }

  async updateProfile(
    userId: number,
    data: { password_hash?: string; profile_pic_url?: string },
  ): Promise<void> {
    const fields = [];
    const values = [];
    let idx = 1;

    if (data.password_hash) {
      fields.push(`password_hash = $${idx++}`);
      values.push(data.password_hash);
    }
    if (data.profile_pic_url) {
      fields.push(`profile_pic_url = $${idx++}`);
      values.push(data.profile_pic_url);
    }

    if (fields.length === 0) return;

    values.push(userId);
    const query = `UPDATE users SET ${fields.join(", ")} WHERE associate_id = $${idx}`;
    await pool.query(query, values);
  }
}
