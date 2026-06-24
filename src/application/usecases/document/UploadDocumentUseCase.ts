import type { IDocumentRepository } from "@/domain/repositories/IDocumentRepository.js";
import type { IPDFService } from "@/domain/services/IPDFService.js";
import type { IFileService } from "@/domain/services/IFileService.js";
import type { IUserRepository } from "@/domain/repositories/IUserRepository.js";
import type { IMailService } from "@/domain/services/IMailService.js";
import { calculateExpiration } from "@/domain/utils/dateUtils.js";
import type { UploadDocumentDTO } from "@/application/dtos/document/UploadDocumentDTO.js";

const mapExtensionToFileType = (fileName: string): string => {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "pdf") return "PDF";
  if (ext === "doc" || ext === "docx") return "WORD";
  if (ext === "xls" || ext === "xlsx") return "EXCEL";
  if (ext === "ppt" || ext === "pptx") return "PPTX";

  return "PDF";
};

export class UploadDocumentUseCase {
  constructor(
    private readonly documentRepo: IDocumentRepository,
    private readonly pdfService: IPDFService,
    private readonly fileService: IFileService,
    private readonly userRepo: IUserRepository,
    private readonly mailerService: IMailService,
  ) {}

  async execute(dto: UploadDocumentDTO, isAdmin: boolean = false) {
    this.fileService.ensureUploadsDir();

    const pdfDate = await this.pdfService.extractDate(dto.filePath);
    const CATEGORIAS_CON_VIGENCIA = [
      "procedimientos",
      "instructivos",
      "complementarios",
      "manuales",
    ];
    const canExpire = CATEGORIAS_CON_VIGENCIA.includes(
      (dto.category ?? "").toLowerCase(),
    );
    let expirationDate: Date | string | null = null;
    const baseDate = (dto.document_date && dto.document_date.trim() !== "") ? dto.document_date : (pdfDate || new Date().toISOString());

    if (canExpire) {
      const years = parseInt(dto.expiration_years ?? "0") || 0;
      const months = parseInt(dto.expiration_months ?? "0") || 0;

      if (years > 0 || months > 0) {
        expirationDate = calculateExpiration(baseDate, years, months);
      } else {
        expirationDate = pdfDate || null;
      }
    }

    // const finalDate =
    //   years > 0 || months > 0
    //     ? calculateExpiration(new Date(), years, months)
    //     : pdfDate;

    const initialStatus = isAdmin ? "VIGENTE" : "EN_REVISION";
    const fileSize = Math.round(dto.fileSizeBytes / 1024);
    const code = dto.origin_code ?? "PENDIENTE";
    const fileType = mapExtensionToFileType(dto.fileOriginalName);

    const doc = await this.documentRepo.create({
      title: dto.title ?? dto.fileOriginalName,
      category: dto.category ?? "General",
      origin_code: code,
      expiration_date: expirationDate,
      created_by_id: dto.createdBy,
      status: initialStatus,
      is_active: true,
    });

    const newFilePath = this.fileService.renameToCodeRev(
      dto.filePath,
      code,
      dto.rev,
    );

    const revisionDate = (dto.document_date && dto.document_date.trim() !== "") ? dto.document_date : (pdfDate ? pdfDate : new Date().toISOString());

    await this.documentRepo.createVersion({
      document_id: doc.id,
      revision_number: dto.rev,
      file_url: newFilePath,
      file_type: fileType,
      size_kb: fileSize,
      uploaded_by_id: dto.createdBy,
      revision_date: revisionDate,
    });

    await this.documentRepo.updateExpiration(
      doc.id,
      expirationDate ? expirationDate.toString() : null,
      initialStatus,
    );

    if (initialStatus === "VIGENTE") {
      try {
        const docName = doc.title || "Nuevo Documento";

        if (this.documentRepo.createMassiveNotification) {
          this.documentRepo
            .createMassiveNotification(
              doc.id,
              `Nuevo documento publicado: ${docName}`,
              "NUEVO_DOCUMENTO",
            )
            .catch((err) =>
              console.error("Error guardando notificaciones en BD:", err),
            );
        }
      } catch (error) {
        console.error("Error al procesar notificaciones:", error);
      }
    } else {
      if (!isAdmin && dto.createdBy) {
        try {
          await this.documentRepo.sendToReview(doc.id, dto.createdBy);
        } catch (error) {
          console.error("Error al enviar automáticamente a revisión:", error);
        }
      }
    }

    return {
      message: isAdmin
        ? "Documento almacenado exitosamente"
        : "Documento enviado a revisión",
      document: doc,
      revision: dto.rev,
      expirationDate: expirationDate,
    };
  }
}
