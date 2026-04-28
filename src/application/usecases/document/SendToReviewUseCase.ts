import type { IDocumentRepository } from "@/domain/repositories/IDocumentRepository.js";

export class SendToReviewUseCase {
  constructor(private readonly documentRepo: IDocumentRepository) {}

  async execute(docId: number, responsableId: number): Promise<void> {
    const doc = await this.documentRepo.findById(docId);
    if (!doc) throw new Error("Documento no encontrado");

    return await this.documentRepo.sendToReview(docId, responsableId);
  }
}
