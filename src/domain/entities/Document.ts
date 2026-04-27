export interface Document {
  id: number;
  title: string;
  category: string;
  origin_code: string;
  expiration_date: string | null;
  created_by_id: number | null;
  status: string;
  is_active: boolean;
  created_at: string;
  uploaded_by?: string;
}
