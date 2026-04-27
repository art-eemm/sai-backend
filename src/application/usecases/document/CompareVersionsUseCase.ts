import type { IDocumentRepository } from "@/domain/repositories/IDocumentRepository.js";
import type { IPDFService } from "@/domain/services/IPDFService.js";
import { diffWords, diffLines } from "diff";
import fs from "fs";

export interface CompareVersionsDTO {
  documentId: number;
  revA: string;
  revB: string;
}

export class CompareVersionsUseCase {
  constructor(
    private readonly documentRepo: IDocumentRepository,
    private readonly pdfService: IPDFService,
  ) {}

  async execute(dto: CompareVersionsDTO) {
    const { documentId, revA, revB } = dto;

    const doc = await this.documentRepo.findById(documentId);
    if (!doc) throw new Error("NOT_FOUND");

    const versions = await this.documentRepo.findVersionsByRevisions(documentId, [revA, revB]);
    if (versions.length < 2) throw new Error("VERSIONS_NOT_FOUND");

    const versionMap = new Map(versions.map((v) => [v.revision_number, v]));
    const vA = versionMap.get(revA);
    const vB = versionMap.get(revB);

    if (!vA || !vB) throw new Error("VERSIONS_NOT_FOUND");
    if (!fs.existsSync(vA.file_url)) throw new Error(`FILE_NOT_FOUND:${revA}`);
    if (!fs.existsSync(vB.file_url)) throw new Error(`FILE_NOT_FOUND:${revB}`);

    const [textA, textB] = await Promise.all([
      this.pdfService.extractText(vA.file_url),
      this.pdfService.extractText(vB.file_url),
    ]);

    const normalize = (t: string) =>
      t.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
    const cleanA = normalize(textA);
    const cleanB = normalize(textB);

    // Diff a nivel de palabras (inline)
    const wordChanges = diffWords(cleanA, cleanB);
    let added = 0, removed = 0, unchanged = 0;
    const inline: { type: "added" | "removed" | "unchanged"; value: string }[] = [];

    for (const part of wordChanges) {
      const type = part.added ? "added" : part.removed ? "removed" : "unchanged";
      if (part.added) added += part.value.length;
      else if (part.removed) removed += part.value.length;
      else unchanged += part.value.length;
      inline.push({ type, value: part.value });
    }

    // Diff a nivel de líneas (side-by-side)
    const lineChanges = diffLines(cleanA, cleanB);
    const sideBySide: {
      left: { line: string; type: "unchanged" | "removed" }[];
      right: { line: string; type: "unchanged" | "added" }[];
    } = { left: [], right: [] };

    for (const part of lineChanges) {
      const lines = part.value.replace(/\n$/, "").split("\n");
      if (part.removed) {
        for (const l of lines) {
          sideBySide.left.push({ line: l, type: "removed" });
          sideBySide.right.push({ line: "", type: "unchanged" });
        }
      } else if (part.added) {
        for (const l of lines) {
          sideBySide.left.push({ line: "", type: "unchanged" });
          sideBySide.right.push({ line: l, type: "added" });
        }
      } else {
        for (const l of lines) {
          sideBySide.left.push({ line: l, type: "unchanged" });
          sideBySide.right.push({ line: l, type: "unchanged" });
        }
      }
    }

    const total = added + removed + unchanged;

    return {
      document: { id: doc.id, title: doc.title, origin_code: doc.origin_code },
      comparison: {
        revA: { number: revA, label: revA, uploadedAt: vA.uploaded_at },
        revB: { number: revB, label: revB, uploadedAt: vB.uploaded_at },
      },
      stats: {
        totalChars: total,
        addedChars: added,
        removedChars: removed,
        unchangedChars: unchanged,
        changePercent: total > 0 ? Math.round(((added + removed) / total) * 100) : 0,
      },
      inline,
      sideBySide,
    };
  }
}
