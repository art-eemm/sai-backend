export interface UploadDocumentDTO {
  title?: string;
  category?: string;
  origin_code?: string;
  rev: string;
  expiration_years?: string;
  expiration_months?: string;
  document_date?: string;
  filePath: string;
  fileOriginalName: string;
  fileSizeBytes: number;
  createdBy: number | null;
}
