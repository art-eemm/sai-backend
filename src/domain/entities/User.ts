export interface User {
  associate_id: number;
  full_name: string;
  email: string;
  password_hash: string;
  role: string;
  /** identificador de departamento en la tabla de usuarios (puede ser null) */
  department_id?: number | null;
  /** nombre legible del departamento (se obtiene mediante join) */
  department?: string | null;
  code?: string | null;
}
