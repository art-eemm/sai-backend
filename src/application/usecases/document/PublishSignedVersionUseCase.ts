import type {
  IDocumentRepository,
  CreateVersionData,
} from "@/domain/repositories/IDocumentRepository.js";
import type { IFileService } from "@/domain/services/IFileService.js";
import path from "path";

export class PublishSignedVersionUseCase {
  constructor(
    private readonly documentRepo: IDocumentRepository,
    private readonly fileService: IFileService,
  ) {}

  async execute(data: {
    documentId: number;
    filePath: string;
    fileSizeBytes: number;
    uploadedBy: number;
    rev: string;
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

    const versionData: CreateVersionData = {
      document_id: data.documentId,
      revision_number: data.rev,
      file_url: finalPath,
      file_type: ext,
      size_kb: Math.round(data.fileSizeBytes / 1024),
      uploaded_by_id: data.uploadedBy,
      revision_date: new Date().toISOString(),
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
