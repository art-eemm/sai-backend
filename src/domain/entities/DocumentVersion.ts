export interface DocumentVersion {
  id: number;
  document_id: number;
  revision_number: string;
  file_url: string;
  file_type: string;
  size_kb: number;
  uploaded_by_id: number | null;
  revision_date: string | null;
  uploaded_at: string;
  description?: string;
  revision_label?: string;
}
