export interface TokenPayload {
  id: number;
  name: string;
  role: string;
  email: string;
  department?: string | null;
}

export class GetProfileUseCase {
  execute(user: TokenPayload) {
    // devolvemos sólo los campos solicitados por el frontend
    return {
      message: "Perfil recuperado",
      user: {
        fullname: user.name,
        role: user.role,
        email: user.email,
        department: user.department ?? null,
      },
    };
  }
}
