import type { IDocumentRepository } from "@/domain/repositories/IDocumentRepository.js";

export class GetDocumentByIdUseCase {
  constructor(private readonly documentRepo: IDocumentRepository) {}

  async execute(id: number) {
    await this.documentRepo.syncExpiredStatus();
    return this.documentRepo.findById(id);
  }
}
