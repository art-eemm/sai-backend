import type { IDocumentRepository, DocumentFilter } from "@/domain/repositories/IDocumentRepository.js";

export class GetDocumentsUseCase {
  constructor(private readonly documentRepo: IDocumentRepository) {}

  async execute(filter: DocumentFilter) {
    await this.documentRepo.syncExpiredStatus();
    return this.documentRepo.findAll(filter);
  }
}
