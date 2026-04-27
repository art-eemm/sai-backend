import type { IPDFService } from "@/domain/services/IPDFService.js";
import { formatPDFDate } from "@/domain/utils/dateUtils.js";
import fs from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;

export class PdfService implements IPDFService {
  async extractDate(filePath: string): Promise<string | null> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      const datePattern = /(\d{1,2}[\/\-\.]\w{3}[\/\-\.]\d{2,4})/;
      const match = data.text.match(datePattern);
      return match?.[0] ? formatPDFDate(match[0]) : null;
    } catch {
      return null;
    }
  }

  async extractText(filePath: string): Promise<string> {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  }
}
