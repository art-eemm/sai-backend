import type { IDocumentRepository } from "@/domain/repositories/IDocumentRepository.js";
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
    private readonly pdfService: IPDFService,
    private readonly fileService: IFileService,
  ) {}

  async execute(dto: UploadVersionDTO) {
    this.fileService.ensureUploadsDir();

    const doc = await this.documentRepo.findById(dto.documentId);
    if (!doc) return null;

    const pdfDate = await this.pdfService.extractDate(dto.filePath);
    const years = parseInt(dto.expiration_years ?? "0") || 0;
    const months = parseInt(dto.expiration_months ?? "0") || 0;
    const finalDate =
      years > 0 || months > 0
        ? calculateExpiration(new Date(), years, months)
        : pdfDate;

    const fileSize = Math.round(dto.fileSizeBytes / 1024);
    const newFilePath = this.fileService.renameToCodeRev(
      dto.filePath,
      doc.origin_code,
      dto.rev,
    );
    const fileType = mapExtensionToFileType(dto.fileOriginalName);

    await this.documentRepo.createVersion({
      document_id: dto.documentId,
      revision_number: dto.rev,
      file_url: newFilePath,
      file_type: fileType,
      size_kb: fileSize,
      uploaded_by_id: dto.uploadedBy,
      revision_date: finalDate,
    });

    console.log("=== INICIO DE RASTREO ===");
    console.log("1. Estado del documento antes de procesar:", doc.status);

    const targetStatus =
      doc.status === "CON_OBSERVACIONES" ? "CON_OBSERVACIONES" : "VIGENTE";
    console.log("2. Target Status decidido:", targetStatus);
    await this.documentRepo.updateExpiration(
      dto.documentId,
      finalDate,
      targetStatus,
    );
    console.log(
      "3. Se actualizó la expiración. Revisando si se manda a SAI...",
    );

    if (doc.status === "CON_OBSERVACIONES") {
      console.log("4. ¡Es una corrección! Enviando a sendToReview...");
      await this.documentRepo.sendToReview(doc.id, doc.created_by_id!);
      console.log("5. Mando a revisión exitoso. Debería estar EN_REVISION.");
    } else {
      console.log("4. NO es una corrección. Se ignoró el envío a revisión.");
    }
    console.log("=== FIN DE RASTREO ===");

    // await this.documentRepo.updateExpiration(
    //   dto.documentId,
    //   finalDate,
    //   "Vigente",
    // );

    return {
      message: "Nueva versión del documento subida correctamente",
      revision: dto.rev,
      expirationDate: finalDate,
    };
  }
}
