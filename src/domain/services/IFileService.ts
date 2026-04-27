export interface IFileService {
  ensureUploadsDir(): void;
  renameToCodeRev(currentPath: string, originCode: string, revisionNumber: string): string;
}
