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
  reset_code?: string | null;
  reset_code_expires?: string | null;
  las_code_sent?: string | null;
  profile_pic_url?: string | null;
  phone?: string | null;
  extension?: string | null;
}
