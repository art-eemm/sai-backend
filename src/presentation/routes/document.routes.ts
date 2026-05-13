import { Router, type Router as ExpressRouter } from "express";
import { validateToken } from "@/presentation/middlewares/auth.js";
import { upload } from "@/presentation/middlewares/upload.js";
import { DocumentController } from "@/presentation/controllers/DocumentController.js";
import { PostgresDocumentRepository } from "@/infrastructure/database/PostgresDocumentRepository.js";
import { PdfService } from "@/infrastructure/services/PdfService.js";
import { FileService } from "@/infrastructure/services/FileService.js";
import { UploadDocumentUseCase } from "@/application/usecases/document/UploadDocumentUseCase.js";
import { GetDocumentsUseCase } from "@/application/usecases/document/GetDocumentsUseCase.js";
import { GetDocumentByIdUseCase } from "@/application/usecases/document/GetDocumentByIdUseCase.js";
import { EditDocumentUseCase } from "@/application/usecases/document/EditDocumentUseCase.js";
import { DeleteDocumentUseCase } from "@/application/usecases/document/DeleteDocumentUseCase.js";
import { UploadVersionUseCase } from "@/application/usecases/document/UploadVersionUseCase.js";
import { CompareVersionsUseCase } from "@/application/usecases/document/CompareVersionsUseCase.js";
import { SendToReviewUseCase } from "@/application/usecases/document/SendToReviewUseCase.js";
import { ApproveDocumentUseCase } from "@/application/usecases/document/ApproveDocumentUseCase.js";
import { RejectDocumentUseCase } from "@/application/usecases/document/RejectDocumentUseCase.js";
import { PublishSignedVersionUseCase } from "@/application/usecases/document/PublishSignedVersionUseCase.js";
import { PostgresUserRepository } from "@/infrastructure/database/PostgresUserRepository.js";
import { MailerService } from "@/infrastructure/services/MailService.js";

// ── Dependency wiring (Dependency Inversion) ──────────────────────────────────
const documentRepo = new PostgresDocumentRepository();
const pdfService = new PdfService();
const fileService = new FileService();
const userRepo = new PostgresUserRepository();
const mailerService = new MailerService();

const controller = new DocumentController(
  new UploadDocumentUseCase(
    documentRepo,
    pdfService,
    fileService,
    userRepo,
    mailerService,
  ),
  new GetDocumentsUseCase(documentRepo),
  new GetDocumentByIdUseCase(documentRepo),
  new EditDocumentUseCase(documentRepo),
  new DeleteDocumentUseCase(documentRepo),
  new UploadVersionUseCase(documentRepo, userRepo, pdfService, fileService),
  new CompareVersionsUseCase(documentRepo, pdfService),
  new SendToReviewUseCase(documentRepo),
  new ApproveDocumentUseCase(documentRepo),
  new RejectDocumentUseCase(documentRepo),
  new PublishSignedVersionUseCase(
    documentRepo,
    fileService,
    userRepo,
    mailerService,
  ),
);

// ── Routes ────────────────────────────────────────────────────────────────────
const router: ExpressRouter = Router();

router.get("/", (req, res) => controller.getAll(req, res));
router.get("/notifications", validateToken, controller.getNotifications);
router.put(
  "/notifications/:id/read",
  validateToken,
  controller.markNotificationAsRead,
);
router.delete("/notifications", validateToken, controller.clearNotifications);
router.post("/upload", validateToken, upload.single("pdffile"), (req, res) =>
  controller.upload(req, res),
);
router.get("/:id", (req, res) => controller.getById(req, res));
router.put("/:id", validateToken, (req, res) => controller.edit(req, res));
router.delete("/:id", validateToken, (req, res) => controller.delete(req, res));
router.post(
  "/:id/version",
  validateToken,
  upload.single("pdffile"),
  (req, res) => controller.uploadVersion(req, res),
);
router.get("/:id/compare", validateToken, (req, res) =>
  controller.compare(req, res),
);
router.post("/:id/send-to-review", validateToken, (req, res) =>
  controller.sendToReview(req, res),
);
router.post("/:id/approve", validateToken, (req, res) =>
  controller.approve(req, res),
);
router.post("/:id/reject", validateToken, (req, res) =>
  controller.reject(req, res),
);
router.post(
  "/:id/publish-signed",
  validateToken,
  upload.single("pdffile"),
  (req, res) => controller.publishSigned(req, res),
);

export default router;
