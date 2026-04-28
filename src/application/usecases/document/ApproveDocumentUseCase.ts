import { IDocumentRepository } from "@/domain/repositories/IDocumentRepository.js";

export class ApproveDocumentUseCase {
  constructor(private readonly documentRepo: IDocumentRepository) {}

  async execute(
    docId: number,
    adminId: number,
    responsableId: number,
  ): Promise<void> {
    return await this.documentRepo.approveDocument(
      docId,
      adminId,
      responsableId,
    );
  }
}
