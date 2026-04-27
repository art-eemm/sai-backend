import type { IDocumentRepository } from "@/domain/repositories/IDocumentRepository.js";
import { calculateExpiration } from "@/domain/utils/dateUtils.js";
import type { EditDocumentDTO } from "@/application/dtos/document/EditDocumentDTO.js";

export class EditDocumentUseCase {
  constructor(private readonly documentRepo: IDocumentRepository) {}

  async execute(id: number, dto: EditDocumentDTO) {
    let finalExpiration: string | null = dto.expiration_date ?? null;
    const years = parseInt(dto.expiration_years ?? "0") || 0;
    const months = parseInt(dto.expiration_months ?? "0") || 0;

    if (years > 0 || months > 0) {
      const base = await this.documentRepo.getCurrentExpiration(id);
      finalExpiration = calculateExpiration(base ?? new Date(), years, months);
    }

    const updateData: {
      title?: string;
      category?: string;
      origin_code?: string;
      status?: string;
      expiration_date?: string | null;
    } = {};

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.origin_code !== undefined) updateData.origin_code = dto.origin_code;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (finalExpiration !== null || dto.expiration_date === "") {
      updateData.expiration_date = finalExpiration;
    }

    return this.documentRepo.update(id, updateData);
  }
}
