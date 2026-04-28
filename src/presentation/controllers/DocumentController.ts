import type { Request, Response } from "express";
import type { CustomRequest } from "@/presentation/middlewares/auth.js";
import type { UploadDocumentUseCase } from "@/application/usecases/document/UploadDocumentUseCase.js";
import type { GetDocumentsUseCase } from "@/application/usecases/document/GetDocumentsUseCase.js";
import type { GetDocumentByIdUseCase } from "@/application/usecases/document/GetDocumentByIdUseCase.js";
import type { EditDocumentUseCase } from "@/application/usecases/document/EditDocumentUseCase.js";
import type { DeleteDocumentUseCase } from "@/application/usecases/document/DeleteDocumentUseCase.js";
import type { UploadVersionUseCase } from "@/application/usecases/document/UploadVersionUseCase.js";
import type { CompareVersionsUseCase } from "@/application/usecases/document/CompareVersionsUseCase.js";
import type { ApproveDocumentUseCase } from "@/application/usecases/document/ApproveDocumentUseCase.js";
import type { SendToReviewUseCase } from "@/application/usecases/document/SendToReviewUseCase.js";
import type { PublishSignedVersionUseCase } from "@/application/usecases/document/PublishSignedVersionUseCase.js";
import type { RejectDocumentUseCase } from "@/application/usecases/document/RejectDocumentUseCase.js";
import type { EditDocumentDTO } from "@/application/dtos/document/EditDocumentDTO.js";

export class DocumentController {
  constructor(
    private readonly uploadDocumentUC: UploadDocumentUseCase,
    private readonly getDocumentsUC: GetDocumentsUseCase,
    private readonly getDocumentByIdUC: GetDocumentByIdUseCase,
    private readonly editDocumentUC: EditDocumentUseCase,
    private readonly deleteDocumentUC: DeleteDocumentUseCase,
    private readonly uploadVersionUC: UploadVersionUseCase,
    private readonly compareVersionsUC: CompareVersionsUseCase,
    private readonly sendToReviewUC: SendToReviewUseCase,
    private readonly approveDocumentUC: ApproveDocumentUseCase,
    private readonly rejectDocumentUC: RejectDocumentUseCase,
    private readonly publishSignedVersionUC: PublishSignedVersionUseCase,
  ) {}

  upload = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No se ha subido ningún archivo" });
        return;
      }

      const user = (req as CustomRequest).user;
      const createdBy = user?.id ?? null;
      const userRole = (user as any)?.role;

      const rev = req.body.rev;
      if (!rev) {
        res.status(400).json({ error: "La versión es obligatoria." });
        return;
      }
      const dto: import("@/application/dtos/document/UploadDocumentDTO.js").UploadDocumentDTO =
        {
          filePath: req.file.path,
          fileOriginalName: req.file.originalname,
          fileSizeBytes: req.file.size,
          createdBy,
          rev: String(rev),
        };
      if (req.body.title) dto.title = String(req.body.title);
      if (req.body.category) dto.category = String(req.body.category);
      if (req.body.origin_code) dto.origin_code = String(req.body.origin_code);
      if (req.body.expiration_years)
        dto.expiration_years = String(req.body.expiration_years);
      if (req.body.expiration_months)
        dto.expiration_months = String(req.body.expiration_months);
      const isAdmin = userRole.toUpperCase().includes("ADMIN");
      const result = await this.uploadDocumentUC.execute(dto, isAdmin);
      res.status(201).json(result);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error desconocido";
      console.error("uploadDocument:", msg);
      res
        .status(500)
        .json({ error: "Error al procesar el documento", details: msg });
    }
  };

  private paramId = (req: Request): number =>
    parseInt(String(req.params["id"] ?? "0"));

  getAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const filter: import("@/domain/repositories/IDocumentRepository.js").DocumentFilter =
        {};
      if (req.query["search"]) filter.search = String(req.query["search"]);
      if (req.query["category"])
        filter.category = String(req.query["category"]);
      const docs = await this.getDocumentsUC.execute(filter);
      res.json(docs);
    } catch {
      res.status(500).json({ error: "Error al obtener documentos" });
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const doc = await this.getDocumentByIdUC.execute(this.paramId(req));
      if (!doc) {
        res.status(404).json({ error: "Documento no encontrado" });
        return;
      }
      res.json(doc);
    } catch {
      res.status(500).json({ error: "Error al obtener el documento" });
    }
  };

  edit = async (req: Request, res: Response): Promise<void> => {
    try {
      const doc = await this.editDocumentUC.execute(
        this.paramId(req),
        req.body as EditDocumentDTO,
      );
      if (!doc) {
        res.status(404).json({ error: "Documento no encontrado" });
        return;
      }
      res.json({ message: "Documento actualizado", document: doc });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error desconocido";
      res
        .status(500)
        .json({ error: "Error al editar el documento", details: msg });
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const deleted = await this.deleteDocumentUC.execute(this.paramId(req));
      if (!deleted) {
        res.status(404).json({ error: "Documento no encontrado" });
        return;
      }
      res.json({ message: "Documento eliminado correctamente" });
    } catch {
      res.status(500).json({ error: "Error al eliminar el documento" });
    }
  };

  uploadVersion = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No se ha subido ningún archivo" });
        return;
      }
      const uploadedBy = (req as CustomRequest).user?.id ?? null;
      const rev = req.body.rev;
      if (!rev) {
        res.status(400).json({ error: "La versión es obligatoria." });
        return;
      }
      const versionDto: import("@/application/dtos/document/UploadVersionDTO.js").UploadVersionDTO =
        {
          documentId: this.paramId(req),
          filePath: req.file.path,
          fileOriginalName: req.file.originalname,
          fileSizeBytes: req.file.size,
          uploadedBy,
          rev: String(rev),
        };
      if (req.body.expiration_years)
        versionDto.expiration_years = String(req.body.expiration_years);
      if (req.body.expiration_months)
        versionDto.expiration_months = String(req.body.expiration_months);
      const result = await this.uploadVersionUC.execute(versionDto);
      if (!result) {
        res.status(404).json({ error: "Documento no encontrado" });
        return;
      }
      res.status(201).json(result);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error desconocido";
      res
        .status(500)
        .json({ error: "Error al subir nueva versión", details: msg });
    }
  };

  compare = async (req: Request, res: Response): Promise<void> => {
    const revA = String(req.query["revA"] ?? "");
    const revB = String(req.query["revB"] ?? "");

    if (!revA || !revB || revA === revB) {
      res.status(400).json({
        error: "Se requieren dos versiones distintas y válidas (revA y revB)",
      });
      return;
    }

    try {
      const result = await this.compareVersionsUC.execute({
        documentId: this.paramId(req),
        revA,
        revB,
      });
      res.json(result);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      if (msg === "NOT_FOUND") {
        res.status(404).json({ error: "Documento no encontrado" });
      } else if (msg === "VERSIONS_NOT_FOUND") {
        res.status(404).json({ error: "Una o ambas revisiones no existen" });
      } else if (msg.startsWith("FILE_NOT_FOUND:")) {
        res.status(404).json({
          error: `Archivo de ${msg.split(":")[1]} no encontrado en disco`,
        });
      } else {
        res
          .status(500)
          .json({ error: "Error al comparar versiones", details: msg });
      }
    }
  };

  sendToReview = async (req: Request, res: Response): Promise<void> => {
    try {
      const docId = this.paramId(req);
      const responsableId = (req as CustomRequest).user?.id;

      await this.sendToReviewUC.execute(docId, responsableId!);
      res.json({ message: "Documento enviado a revisión correctamente" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  approve = async (req: Request, res: Response): Promise<void> => {
    try {
      const docId = this.paramId(req);
      const adminId = (req as CustomRequest).user?.id;
      const doc = await this.getDocumentByIdUC.execute(docId);
      if (!doc) {
        res.status(404).json({ error: "Documento no encontrado" });
        return;
      }

      await this.approveDocumentUC.execute(docId, adminId!, doc.created_by_id!);
      res.json({ message: "Documento aprobado para firma" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  reject = async (req: Request, res: Response): Promise<void> => {
    try {
      const docId = this.paramId(req);
      const adminId = (req as CustomRequest).user?.id;
      const { comments } = req.body;
      console.log("Comentario recibido en el backend:", comments);

      if (!comments) {
        res
          .status(400)
          .json({ error: "El comentario llegó vacío al servidor." });
        return;
      }

      const doc = await this.getDocumentByIdUC.execute(docId);
      if (!doc) {
        res.status(404).json({ error: "Documento no encontrado" });
        return;
      }

      console.log("Creador original del documento:", doc.created_by_id);

      await this.rejectDocumentUC.execute(
        docId,
        adminId!,
        doc.created_by_id!,
        comments,
      );
      res.json({ message: "Documento rechazado con observaciones" });
    } catch (error: any) {
      console.error("Error al rechazar en el controlador:", error.message);
      res.status(500).json({ error: error.message });
    }
  };

  publishSigned = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No se ha subido el archivo firmado" });
        return;
      }

      const uploadedBy = (req as CustomRequest).user?.id;
      const { rev } = req.body;

      const result = await this.publishSignedVersionUC.execute({
        documentId: this.paramId(req),
        filePath: req.file.path,
        fileSizeBytes: req.file.size,
        uploadedBy: uploadedBy!,
        rev: String(rev),
      });

      res.status(201).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}
