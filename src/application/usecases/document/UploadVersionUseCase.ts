import type { IDocumentRepository } from "@/domain/repositories/IDocumentRepository.js";
import type { IUserRepository } from "@/domain/repositories/IUserRepository.js"; // Importar
import type { IPDFService } from "@/domain/services/IPDFService.js";
import type { IFileService } from "@/domain/services/IFileService.js";
import { calculateExpiration } from "@/domain/utils/dateUtils.js";
import type { UploadVersionDTO } from "@/application/dtos/document/UploadVersionDTO.js";

export class UploadVersionUseCase {
  constructor(
    private readonly documentRepo: IDocumentRepository,
    private readonly userRepo: IUserRepository, // Nueva dependencia
    private readonly pdfService: IPDFService,
    private readonly fileService: IFileService,
  ) {}

  async execute(dto: UploadVersionDTO) {
    this.fileService.ensureUploadsDir();

    const doc = await this.documentRepo.findById(dto.documentId);
    if (!doc) return null;

    const user = await this.userRepo.findByAssociateId(Number(dto.uploadedBy));
    const isAdmin = user?.role?.includes("ADMIN");

    const years = parseInt(dto.expiration_years ?? "0") || 0;
    const months = parseInt(dto.expiration_months ?? "0") || 0;
    const finalDate = calculateExpiration(new Date(), years, months);

    // Guardar la versión física
    await this.documentRepo.createVersion({
      document_id: dto.documentId,
      revision_number: dto.rev,
      file_url: this.fileService.renameToCodeRev(
        dto.filePath,
        doc.origin_code,
        dto.rev,
      ),
      file_type: dto.fileOriginalName.split(".").pop()?.toUpperCase() || "PDF",
      size_kb: Math.round(dto.fileSizeBytes / 1024),
      uploaded_by_id: dto.uploadedBy,
      revision_date: finalDate,
    });

    let targetStatus = "EN_REVISION";

    if (isAdmin) {
      targetStatus = "VIGENTE";
      if (finalDate) {
        const today = new Date().toISOString().split("T")[0];
        if (finalDate < today) targetStatus = "VENCIDO";
      }
    } else if (doc.status === "CON_OBSERVACIONES") {
      targetStatus = "EN_REVISION";
    }

    await this.documentRepo.updateExpiration(
      dto.documentId,
      finalDate,
      targetStatus,
    );

    if (!isAdmin) {
      await this.documentRepo.sendToReview(doc.id, doc.created_by_id!);
    }

    return {
      message: isAdmin ? "Documento publicado" : "Enviado a revisión",
      revision: dto.rev,
      expirationDate: finalDate,
    };
  }
}
