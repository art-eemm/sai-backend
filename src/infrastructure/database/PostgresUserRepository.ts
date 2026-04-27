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
}
