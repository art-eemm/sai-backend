import type { IDocumentRepository } from "@/domain/repositories/IDocumentRepository.js";
import type { IPDFService } from "@/domain/services/IPDFService.js";
import type { IFileService } from "@/domain/services/IFileService.js";
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
  ) {}

  async execute(dto: UploadDocumentDTO, isAdmin: boolean = false) {
    this.fileService.ensureUploadsDir();

    const pdfDate = await this.pdfService.extractDate(dto.filePath);
    const CATEGORIAS_CON_VIGENCIA = [
      "procedimientos",
      "instructivos",
      "complementarios",
    ];
    const canExpire = CATEGORIAS_CON_VIGENCIA.includes(
      (dto.category ?? "").toLowerCase(),
    );
    let expirationDate: Date | string | null = null;

    if (canExpire) {
      const years = parseInt(dto.expiration_years ?? "0") || 0;
      const months = parseInt(dto.expiration_months ?? "0") || 0;

      if (years > 0 || months > 0) {
        expirationDate = calculateExpiration(new Date(), years, months);
      } else {
        expirationDate = pdfDate;
      }
    }

    // const finalDate =
    //   years > 0 || months > 0
    //     ? calculateExpiration(new Date(), years, months)
    //     : pdfDate;

    const initialStatus = isAdmin ? "VIGENTE" : "NUEVO";
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

    const revisionDate = pdfDate ? pdfDate : new Date().toISOString();

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

    return {
      message: "Documento almacenado exitosamente",
      document: doc,
      revision: dto.rev,
      expirationDate: expirationDate,
    };
  }
}
