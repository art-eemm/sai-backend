import pool from "@/config/db.js";
import type {
  IDocumentRepository,
  DocumentFilter,
  DocumentCreateData,
  DocumentUpdateData,
  CreateVersionData,
} from "@/domain/repositories/IDocumentRepository.js";
import type { Document } from "@/domain/entities/Document.js";
import type { DocumentVersion } from "@/domain/entities/DocumentVersion.js";

export class PostgresDocumentRepository implements IDocumentRepository {
  async findAll(filter: DocumentFilter): Promise<Document[]> {
    const params: unknown[] = [];
    let idx = 1;

    let sql = `
      SELECT
        d.id, d.origin_code, d.title, d.category, d.status,
        d.expiration_date, d.created_at,
        u.full_name AS uploaded_by
      FROM documents d
      LEFT JOIN users u ON d.created_by_id = u.associate_id
      WHERE d.is_active = true`;

    if (filter.search) {
      sql += ` AND (d.title ILIKE $${idx} OR d.origin_code ILIKE $${idx})`;
      params.push(`%${filter.search}%`);
      idx++;
    }

    if (filter.category) {
      sql += ` AND d.category = $${idx}`;
      params.push(filter.category);
    }

    sql += ` ORDER BY d.created_at DESC`;
    const result = await pool.query(sql, params);
    return result.rows as Document[];
  }

  async findById(id: number) {
    const docResult = await pool.query(
      `SELECT d.*, u.full_name AS uploaded_by
       FROM documents d
       LEFT JOIN users u ON d.created_by_id = u.associate_id
       WHERE d.id = $1 AND d.is_active = true`,
      [id],
    );
    if (docResult.rows.length === 0) return null;

    const versionsResult = await pool.query(
      `SELECT id, revision_number, file_url, file_type, size_kb, uploaded_at, revision_date, description
       FROM document_versions
       WHERE document_id = $1
       ORDER BY revision_number DESC`,
      [id],
    );

    const versions: DocumentVersion[] = (versionsResult.rows as DocumentVersion[]).map((v) => ({
      ...v,
      revision_label: v.revision_number,
    }));

    return { ...(docResult.rows[0] as Document), versions };
  }

  async create(data: DocumentCreateData): Promise<Document> {
    const result = await pool.query(
      `INSERT INTO documents
         (title, category, origin_code, expiration_date, created_by_id, status, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.title,
        data.category,
        data.origin_code,
        data.expiration_date,
        data.created_by_id,
        data.status,
        data.is_active,
      ],
    );
    return result.rows[0] as Document;
  }

  async update(id: number, data: DocumentUpdateData): Promise<Document | null> {
    const result = await pool.query(
      `UPDATE documents
       SET title            = COALESCE($1, title),
           category         = COALESCE($2, category),
           origin_code      = COALESCE($3, origin_code),
           status           = COALESCE($4, status),
           expiration_date  = COALESCE($5, expiration_date)
       WHERE id = $6 AND is_active = true
       RETURNING *`,
      [
        data.title ?? null,
        data.category ?? null,
        data.origin_code ?? null,
        data.status ?? null,
        data.expiration_date ?? null,
        id,
      ],
    );
    return (result.rows[0] as Document) ?? null;
  }

  async softDelete(id: number): Promise<boolean> {
    const result = await pool.query(
      `UPDATE documents SET is_active = false
       WHERE id = $1 AND is_active = true RETURNING id`,
      [id],
    );
    return result.rows.length > 0;
  }

  async syncExpiredStatus(): Promise<void> {
    await pool.query(
      `UPDATE documents
       SET status = 'Vencido'
       WHERE is_active = true
         AND expiration_date IS NOT NULL
         AND expiration_date < CURRENT_DATE
         AND status <> 'Vencido'`,
    );
  }

  async getCurrentExpiration(id: number): Promise<string | null> {
    const result = await pool.query(
      `SELECT expiration_date FROM documents WHERE id = $1`,
      [id],
    );
    return (result.rows[0] as { expiration_date: string | null } | undefined)?.expiration_date ?? null;
  }

  async createVersion(data: CreateVersionData): Promise<DocumentVersion> {
    const result = await pool.query(
      `INSERT INTO document_versions
         (document_id, revision_number, file_url, file_type, size_kb, uploaded_by_id, revision_date, uploaded_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [
        data.document_id,
        data.revision_number,
        data.file_url,
        data.file_type,
        data.size_kb,
        data.uploaded_by_id,
        data.revision_date,
      ],
    );
    return result.rows[0] as DocumentVersion;
  }

  async findVersionsByRevisions(
    documentId: number,
    revisions: string[],
  ): Promise<DocumentVersion[]> {
    const result = await pool.query(
      `SELECT revision_number, file_url, uploaded_at
       FROM document_versions
       WHERE document_id = $1 AND revision_number = ANY($2)
       ORDER BY revision_number`,
      [documentId, revisions],
    );
    return result.rows as DocumentVersion[];
  }

  async updateExpiration(id: number, date: string | null, status: string): Promise<void> {
    await pool.query(
      `UPDATE documents
       SET expiration_date = COALESCE($1, expiration_date),
           status = $2
       WHERE id = $3`,
      [date, status, id],
    );
  }
}
