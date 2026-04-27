import { Router, type Router as ExpressRouter } from "express";
import { validateToken } from "@/presentation/middlewares/auth.js";
import { AuthController } from "@/presentation/controllers/AuthController.js";
import { PostgresUserRepository } from "@/infrastructure/database/PostgresUserRepository.js";
import { LoginUseCase } from "@/application/usecases/auth/LoginUseCase.js";
import { GetProfileUseCase } from "@/application/usecases/auth/GetProfileUseCase.js";

// ── Dependency wiring ─────────────────────────────────────────────────────────
const userRepo = new PostgresUserRepository();
const controller = new AuthController(
  new LoginUseCase(userRepo),
  new GetProfileUseCase(),
);

// ── Routes ────────────────────────────────────────────────────────────────────
const router: ExpressRouter = Router();

router.post("/login", (req, res) => controller.login(req, res));
router.get("/profile", validateToken, (req, res) => controller.getProfile(req, res));

export default router;
