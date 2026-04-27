import type { IDocumentRepository } from "@/domain/repositories/IDocumentRepository.js";

export class DeleteDocumentUseCase {
  constructor(private readonly documentRepo: IDocumentRepository) {}

  async execute(id: number): Promise<boolean> {
    return this.documentRepo.softDelete(id);
  }
}
