import type { Request, Response } from "express";
import type { CustomRequest } from "@/presentation/middlewares/auth.js";
import type { LoginUseCase } from "@/application/usecases/auth/LoginUseCase.js";
import type { GetProfileUseCase } from "@/application/usecases/auth/GetProfileUseCase.js";

export class AuthController {
  constructor(
    private readonly loginUC: LoginUseCase,
    private readonly getProfileUC: GetProfileUseCase,
  ) {}

  login = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: "Email y password son requeridos" });
      return;
    }
    try {
      const result = await this.loginUC.execute({ email, password });
      res.json(result);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      if (msg === "USER_NOT_FOUND") {
        res.status(404).json({ error: "Usuario no encontrado" });
      } else if (msg === "INVALID_PASSWORD") {
        res.status(401).json({ error: "Contraseña incorrecta" });
      } else {
        res.status(500).json({ error: "Error interno" });
      }
    }
  };

  getProfile = (req: Request, res: Response): void => {
    const user = (req as CustomRequest).user;
    if (!user) {
      res.status(401).json({ error: "Autenticación requerida" });
      return;
    }
    res.json(this.getProfileUC.execute(user));
  };
}
