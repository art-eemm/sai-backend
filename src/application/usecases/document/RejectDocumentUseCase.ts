import type { IDocumentRepository } from "@/domain/repositories/IDocumentRepository.js";

export class RejectDocumentUseCase {
  constructor(private readonly documentRepo: IDocumentRepository) {}

  async execute(
    docId: number,
    adminId: number,
    responsableId: number,
    comments: string,
    correctionFilePath?: string,
  ): Promise<void> {
    if (!comments || comments.trim().length === 0) {
      throw new Error("Los comentarios de rechazo son obligatorios.");
    }

    return await this.documentRepo.rejectDocument(
      docId,
      adminId,
      responsableId,
      comments,
      correctionFilePath,
    );
  }
}
