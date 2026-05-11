import type { Document } from "../entities/Document.js";
import type { DocumentVersion } from "../entities/DocumentVersion.js";

export interface DocumentFilter {
  search?: string;
  category?: string;
}

export interface DocumentCreateData {
  title: string;
  category: string;
  origin_code: string;
  expiration_date: string | null;
  created_by_id: number | null;
  status: string;
  is_active: boolean;
}

export interface DocumentUpdateData {
  title?: string;
  category?: string;
  origin_code?: string;
  status?: string;
  expiration_date?: string | null;
}

export interface CreateVersionData {
  document_id: number;
  revision_number: string;
  file_url: string;
  file_type: string;
  size_kb: number;
  uploaded_by_id: number | null;
  revision_date: string | null;
}

export interface IDocumentRepository {
  findAll(filter: DocumentFilter): Promise<Document[]>;
  findById(
    id: number,
  ): Promise<(Document & { versions: DocumentVersion[] }) | null>;
  create(data: DocumentCreateData): Promise<Document>;
  update(id: number, data: DocumentUpdateData): Promise<Document | null>;
  softDelete(id: number): Promise<boolean>;
  syncExpiredStatus(): Promise<void>;
  getCurrentExpiration(id: number): Promise<string | null>;
  createVersion(data: CreateVersionData): Promise<DocumentVersion>;
  findVersionsByRevisions(
    documentId: number,
    revisions: string[],
  ): Promise<DocumentVersion[]>;
  updateExpiration(
    id: number,
    date: string | null,
    status: string,
  ): Promise<void>;
  updateStatus(id: number, status: string, isctive?: boolean): Promise<void>;
  publishSignedDocument(docId: number, responsableId: number): Promise<void>;
  addReviewComment(data: {
    document_id: number;
    reviewer_id: number;
    comments: string;
    status_asigned: string;
  }): Promise<void>;
  createNotification(data: {
    user_id: number;
    document_id: number;
    type: string;
    message: string;
  }): Promise<void>;
  sendToReview(docId: number, responsableId: number): Promise<void>;
  approveDocument(
    docId: number,
    adminId: number,
    responsableId: number,
  ): Promise<void>;
  rejectDocument(
    docId: number,
    adminId: number,
    responsableId: number,
    comments: string,
  ): Promise<void>;
}
