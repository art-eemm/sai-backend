export interface UploadVersionDTO {
  documentId: number;
  rev: string;
  expiration_years?: string;
  expiration_months?: string;
  filePath: string;
  fileOriginalName: string;
  fileSizeBytes: number;
  uploadedBy: number;
}
