import type { IDocumentRepository } from "@/domain/repositories/IDocumentRepository.js";
import type { IUserRepository } from "@/domain/repositories/IUserRepository.js";
import type { IPDFService } from "@/domain/services/IPDFService.js";
import type { IFileService } from "@/domain/services/IFileService.js";
import { calculateExpiration } from "@/domain/utils/dateUtils.js";
import type { UploadVersionDTO } from "@/application/dtos/document/UploadVersionDTO.js";

const mapExtensionToFileType = (fileName: string): string => {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "PDF";
  if (ext === "doc" || ext === "docx") return "WORD";
  if (ext === "xls" || ext === "xlsx") return "EXCEL";
  if (ext === "ppt" || ext === "pptx") return "PPTX";
  return "PDF";
};

export class UploadVersionUseCase {
  constructor(
    private readonly documentRepo: IDocumentRepository,
    private readonly userRepo: IUserRepository,
    private readonly pdfService: IPDFService,
    private readonly fileService: IFileService,
  ) {}

  async execute(dto: UploadVersionDTO) {
    this.fileService.ensureUploadsDir();

    const docId = Number(dto.documentId);
    const uploaderId = Number(dto.uploadedBy);

    const doc = await this.documentRepo.findById(docId);
    if (!doc) return null;

    const user = await this.userRepo.findByAssociateId(uploaderId);
    const isAdmin = user?.role?.includes("ADMIN");

    const years = parseInt(dto.expiration_years ?? "0") || 0;
    const months = parseInt(dto.expiration_months ?? "0") || 0;
    const pdfDate = await this.pdfService.extractDate(dto.filePath);
    const baseDateStr = (dto.document_date && dto.document_date.trim() !== "") ? dto.document_date : (pdfDate || new Date().toISOString());
    const finalDate = calculateExpiration(baseDateStr, years, months);

    const fileSize = Math.round(dto.fileSizeBytes / 1024);
    const newFilePath = this.fileService.renameToCodeRev(
      dto.filePath,
      doc.origin_code,
      dto.rev,
    );
    const fileType = mapExtensionToFileType(dto.fileOriginalName);

    await this.documentRepo.createVersion({
      document_id: docId,
      revision_number: dto.rev,
      file_url: newFilePath,
      file_type: fileType,
      size_kb: fileSize,
      uploaded_by_id: uploaderId,
      revision_date: baseDateStr,
    });

    let targetStatus = "EN_REVISION";

    if (isAdmin) {
      targetStatus = "VIGENTE";
      if (finalDate) {
        const today = new Date().toISOString().slice(0, 10);
        if (finalDate < today) targetStatus = "VENCIDO";
      }
    } else if (doc.status === "CON_OBSERVACIONES") {
      targetStatus = "EN_REVISION";
    }

    await this.documentRepo.updateExpiration(docId, finalDate, targetStatus);

    if (!isAdmin) {
      await this.documentRepo.sendToReview(docId, doc.created_by_id!);
    }

    return {
      message: isAdmin
        ? "Documento actualizado y publicado (VIGENTE)"
        : "Versión enviada a revisión",
      revision: dto.rev,
      expirationDate: finalDate,
    };
  }
}
