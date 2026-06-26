import { Router, type Router as ExpressRouter } from "express";
import { validateToken } from "@/presentation/middlewares/auth.js";
import { AuthController } from "@/presentation/controllers/AuthController.js";
import { PostgresUserRepository } from "@/infrastructure/database/PostgresUserRepository.js";
import { LoginUseCase } from "@/application/usecases/auth/LoginUseCase.js";
import { GetProfileUseCase } from "@/application/usecases/auth/GetProfileUseCase.js";
import { SendResetCodeUseCase } from "@/application/usecases/auth/SendResetCodeUseCase.js";
import { ResetPasswordUseCase } from "@/application/usecases/auth/ResetPasswordUseCase.js";
import { MailerService } from "@/infrastructure/services/MailService.js";
import { VerifyResetCodeUseCase } from "@/application/usecases/auth/VerifyResetCodeUseCase.js";
import { UpdateProfileUseCase } from "@/application/usecases/auth/UpdateProfileUseCase.js";
import { upload } from "../middlewares/upload.js";

// ── Dependency wiring ─────────────────────────────────────────────────────────
const userRepo = new PostgresUserRepository();
const mailerService = new MailerService();

const controller = new AuthController(
  new LoginUseCase(userRepo),
  new GetProfileUseCase(userRepo),
  new SendResetCodeUseCase(userRepo, mailerService),
  new ResetPasswordUseCase(userRepo, mailerService),
  new VerifyResetCodeUseCase(userRepo),
  new UpdateProfileUseCase(userRepo, mailerService),
);

// ── Routes ────────────────────────────────────────────────────────────────────
const router: ExpressRouter = Router();

router.post("/login", (req, res) => controller.login(req, res));
router.get("/profile", validateToken, (req, res) =>
  controller.getProfile(req, res),
);
router.post("/send-reset-code", (req, res) =>
  controller.sendResetCode(req, res),
);
router.post("/reset-password", (req, res) =>
  controller.resetPassword(req, res),
);
router.post("/verify-reset-code", (req, res) =>
  controller.verifyResetCode(req, res),
);
router.put("/profile", validateToken, upload.single("avatar"), (req, res) =>
  controller.updateProfile(req, res),
);

export default router;
