import type { IFileService } from "@/domain/services/IFileService.js";
import fs from "fs";
import path from "path";

const sanitize = (str: string): string =>
  str.replace(/[^a-zA-Z0-9_\-\.]/g, "_").replace(/_+/g, "_");

export class FileService implements IFileService {
  ensureUploadsDir(): void {
    const dir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  renameToCodeRev(currentPath: string, originCode: string, revisionNumber: string): string {
    const dir = path.dirname(currentPath);
    const ext = path.extname(currentPath);
    const safeName = sanitize(originCode);
    const safeRev = sanitize(revisionNumber);
    const base = `${safeName}_VER_${safeRev}${ext}`;
    const newPath = path.join(dir, base);

    const finalPath = fs.existsSync(newPath)
      ? path.join(dir, `${safeName}_VER_${safeRev}_${Date.now()}${ext}`)
      : newPath;

    fs.renameSync(currentPath, finalPath);
    return finalPath;
  }
}
