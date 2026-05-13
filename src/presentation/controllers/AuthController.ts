import type { Request, Response } from "express";
import type { CustomRequest } from "@/presentation/middlewares/auth.js";
import type { LoginUseCase } from "@/application/usecases/auth/LoginUseCase.js";
import type { GetProfileUseCase } from "@/application/usecases/auth/GetProfileUseCase.js";
import type { SendResetCodeUseCase } from "@/application/usecases/auth/SendResetCodeUseCase.js";
import type { ResetPasswordUseCase } from "@/application/usecases/auth/ResetPasswordUseCase.js";
import type { VerifyResetCodeUseCase } from "@/application/usecases/auth/VerifyResetCodeUseCase.js";
import type { UpdateProfileUseCase } from "@/application/usecases/auth/UpdateProfileUseCase.js";

export class AuthController {
  constructor(
    private readonly loginUC: LoginUseCase,
    private readonly getProfileUC: GetProfileUseCase,
    private readonly sendResetCodeUC: SendResetCodeUseCase,
    private readonly resetPasswordUC: ResetPasswordUseCase,
    private readonly verifyResetCodeUC: VerifyResetCodeUseCase,
    private readonly updateProfileUC: UpdateProfileUseCase,
  ) {}

  login = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };
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

  getProfile = async (req: Request, res: Response): Promise<void> => {
    const user = (req as CustomRequest).user;
    if (!user) {
      res.status(401).json({ error: "Autenticación requerida" });
      return;
    }

    try {
      const profile = await this.getProfileUC.execute(user.id);
      res.status(200).json(profile);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      if (msg === "USER_NOT_FOUND") {
        res.status(404).json({ error: "Usuario no encontrado" });
      } else {
        console.error("Error en getProfile:", msg);
        res.status(500).json({ error: "Error interno del servidor" });
      }
    }
  };

  sendResetCode = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ error: "El email es requerido" });
        return;
      }

      await this.sendResetCodeUC.execute(email);
      res
        .status(200)
        .json({ message: "Si el correo existe, enviaremos un código." });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      if (msg === "WAIT_5_MINUTES") {
        res.status(429).json({
          error: "Debes esperar 5 minutos para solicitar otro código.",
        });
      } else {
        console.error("Error en sendResetCode:", msg);
        res.status(500).json({ error: "Error interno del servidor" });
      }
    }
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, code, newPassword } = req.body;
      if (!email || !code || !newPassword) {
        res
          .status(400)
          .json({ error: "Email, código y nueva contraseña son requeridos" });
        return;
      }

      await this.resetPasswordUC.execute(email, code, newPassword);
      res.status(200).json({ message: "Contraseña actualizada exitosamente" });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      if (msg === "INVALID_CODE") {
        res.status(400).json({ error: "El código es incorrecto." });
      } else if (msg === "EXPIRED_CODE") {
        res
          .status(400)
          .json({ error: "El código ha expirado. Solicita uno nuevo." });
      } else {
        console.error("Error en resetPassword:", msg);
        res.status(500).json({ error: "Error interno del servidor" });
      }
    }
  };

  verifyResetCode = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        res.status(400).json({ error: "Email y código son requeridos" });
        return;
      }

      await this.verifyResetCodeUC.execute(email, code);
      res.status(200).json({ message: "Código válido" });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      if (msg === "INVALID_CODE") {
        res.status(400).json({ error: "El código es incorrecto." });
      } else if (msg === "EXPIRED_CODE") {
        res
          .status(400)
          .json({ error: "El código ha expirado. Solicita uno nuevo." });
      } else {
        console.error("Error en verifyResetCode:", msg);
        res.status(500).json({ error: "Error interno del servidor" });
      }
    }
  };

  updateProfile = async (req: Request, res: Response): Promise<void> => {
    const user = (req as CustomRequest).user;
    if (!user) {
      res.status(401).json({ error: "Autenticación requerida" });
      return;
    }

    try {
      const { currentPassword, newPassword } = req.body;

      const updatePayload: {
        currentPassword?: string;
        newPassword?: string;
        profile_pic_url?: string;
      } = {};

      if (currentPassword) updatePayload.currentPassword = currentPassword;
      if (newPassword) updatePayload.newPassword = newPassword;

      if (req.file) {
        updatePayload.profile_pic_url = `/uploads/${req.file.filename}`;
      }

      await this.updateProfileUC.execute(user.id, updatePayload);

      res.status(200).json({
        message: "Perfil actualizado correctamente",
        avatar: updatePayload.profile_pic_url,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      if (msg === "INVALID_CURRENT_PASSWORD") {
        res.status(400).json({ error: "La contraseña actual es incorrecta" });
      } else {
        console.error("Error en updateProfile:", msg);
        res.status(500).json({ error: "Error interno al actualizar perfil" });
      }
    }
  };
}
