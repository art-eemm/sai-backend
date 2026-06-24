import type {
  IDocumentRepository,
  CreateVersionData,
} from "@/domain/repositories/IDocumentRepository.js";
import type { IFileService } from "@/domain/services/IFileService.js";
import type { IUserRepository } from "@/domain/repositories/IUserRepository.js";
import type { IMailService } from "@/domain/services/IMailService.js";
import path from "path";

export class PublishSignedVersionUseCase {
  constructor(
    private readonly documentRepo: IDocumentRepository,
    private readonly fileService: IFileService,
    private readonly userRepo: IUserRepository,
    private readonly mailerService: IMailService,
  ) {}

  async execute(data: {
    documentId: number;
    filePath: string;
    fileSizeBytes: number;
    uploadedBy: number;
    rev: string;
    documentDate?: string | undefined;
  }) {
    const document = await this.documentRepo.findById(data.documentId);
    if (!document) {
      throw new Error("Documento no encontrado");
    }

    const finalPath = this.fileService.renameToCodeRev(
      data.filePath,
      document.origin_code,
      data.rev,
    );

    const ext = path.extname(finalPath).replace(".", "").toUpperCase();

    const latestVersion = (document as any).versions?.[0];
    const fallbackDate = latestVersion?.revision_date 
      ? (latestVersion.revision_date instanceof Date 
          ? latestVersion.revision_date.toISOString() 
          : String(latestVersion.revision_date))
      : new Date().toISOString();

    const revisionDate = (data.documentDate && data.documentDate.trim() !== "") 
      ? data.documentDate 
      : fallbackDate;

    const versionData: CreateVersionData = {
      document_id: data.documentId,
      revision_number: data.rev,
      file_url: finalPath,
      file_type: ext,
      size_kb: Math.round(data.fileSizeBytes / 1024),
      uploaded_by_id: data.uploadedBy,
      revision_date: revisionDate,
    };

    await this.documentRepo.createVersion(versionData);
    await this.documentRepo.publishSignedDocument(
      data.documentId,
      data.uploadedBy,
    );

    return {
      success: true,
      message: "Documento publicado y vigente",
      documentId: data.documentId,
      finalPath,
    };
  }
}
