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
      idx++;
    }

    if (filter.status && filter.uploaderId) {
      sql += ` AND (d.status = $${idx} OR d.created_by_id = $${idx + 1})`;
      params.push(filter.status);
      params.push(filter.uploaderId);
      idx += 2;
    } else if (filter.status) {
      sql += ` AND d.status = $${idx}`;
      params.push(filter.status);
      idx++;
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

    const reviewsResult = await pool.query(
      `SELECT comments FROM document_reviews WHERE document_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [id],
    );

    const latest_review = reviewsResult.rows[0]?.comments || null;

    const versions: DocumentVersion[] = (
      versionsResult.rows as DocumentVersion[]
    ).map((v) => ({
      ...v,
      revision_label: v.revision_number,
    }));

    return { ...(docResult.rows[0] as Document), versions, latest_review };
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
      `
      UPDATE documents 
      SET status = 'VENCIDO' 
      WHERE expiration_date < CURRENT_DATE 
        AND status NOT IN ('NUEVO', 'EN_REVISION', 'CON_OBSERVACIONES', 'APROBADO_SIN_FIRMA')
        AND updated_at < CURRENT_DATE
    `,
    );
  }

  async getCurrentExpiration(id: number): Promise<string | null> {
    const result = await pool.query(
      `SELECT expiration_date FROM documents WHERE id = $1`,
      [id],
    );
    return (
      (result.rows[0] as { expiration_date: string | null } | undefined)
        ?.expiration_date ?? null
    );
  }

  async createVersion(data: CreateVersionData): Promise<DocumentVersion> {
    const checkResult = await pool.query(
      `SELECT id FROM document_versions WHERE document_id = $1 AND revision_number = $2`,
      [data.document_id, data.revision_number],
    );

    if (checkResult.rows.length > 0) {
      const updateResult = await pool.query(
        `UPDATE document_versions 
         SET file_url = $1, 
             size_kb = $2, 
             revision_date = $3, 
             uploaded_at = NOW()
         WHERE document_id = $4 AND revision_number = $5
         RETURNING *`,
        [
          data.file_url,
          data.size_kb,
          data.revision_date,
          data.document_id,
          data.revision_number,
        ],
      );
      return updateResult.rows[0] as DocumentVersion;
    } else {
      const insertResult = await pool.query(
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
      return insertResult.rows[0] as DocumentVersion;
    }
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

  async updateExpiration(
    id: number,
    date: string | null,
    status: string,
  ): Promise<void> {
    const protectedStatuses = [
      "EN_REVISION",
      "CON_OBSERVACIONES",
      "APROBADO_SIN_FIRMA",
    ];

    const finalStatus =
      date && new Date(date) < new Date() && !protectedStatuses.includes(status)
        ? "VENCIDO"
        : status;

    await pool.query(
      `UPDATE documents
       SET expiration_date = $1,
           status = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [date, finalStatus, id],
    );
  }

  async updateStatus(
    id: number,
    status: string,
    isctive?: boolean,
  ): Promise<void> {
    await pool.query(
      `UPDATE documents SET status = $1, is_active = $2 WHERE id = $3`,
      [status, isctive, id],
    );
  }

  async addReviewComment(data: {
    document_id: number;
    reviewer_id: number;
    comments: string;
    status_asigned: string;
  }): Promise<void> {
    await pool.query(
      `INSERT INTO document_reviews (document_id, reviewer_id, comments, status_assigned) VALUES ($1, $2, $3, $4)`,
      [data.document_id, data.reviewer_id, data.comments, data.status_asigned],
    );
  }

  async createNotification(data: {
    user_id: number;
    document_id: number;
    type: string;
    message: string;
  }): Promise<void> {
    await pool.query(
      `INSERT INTO notifications (user_id, document_id, type, message) VALUES ($1, $2, $3, $4)`,
      [data.user_id, data.document_id, data.type, data.message],
    );
  }

  async createMassiveNotification(
    documentId: number,
    message: string,
    type: string,
  ): Promise<void> {
    const query = `
      INSERT INTO notifications (user_id, document_id, message, type, is_read, created_at)
      SELECT associate_id, $1, $2, $3, false, NOW()
      FROM users
      WHERE is_active = true AND associate_id IS NOT NULL;
    `;

    try {
      await pool.query(query, [documentId, message, type]);
    } catch (error) {
      console.error("Error al insertar notificaciones masivas:", error);
      throw new Error("No se pudieron crear las notificaciones masivas");
    }
  }

  async sendToReview(docId: number, responsableId: number): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE documents SET status = 'EN_REVISION' WHERE id = $1`,
        [docId],
      );

      const notifyResult = await client.query(
        `
        INSERT INTO notifications (user_id, document_id, type, message)
        SELECT COALESCE(associate_id, id), $1, 'NUEVA_REVISION', 'Un documento fue subido/corregido y requiere tu revisión.'
        FROM users
        WHERE role::text ILIKE '%ADMIN%' AND is_active = true
        RETURNING id
        `,
        [docId],
      );

      if (notifyResult.rowCount === 0) {
        console.warn(
          "Advertencia: No se encontraron usuarios con el rol ADMIN_SAI para notificar.",
        );
      }
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  async approveDocument(
    docId: number,
    adminId: number,
    responsableId: number,
  ): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE documents SET status = 'APROBADO_SIN_FIRMA' WHERE id = $1`,
        [docId],
      );
      await client.query(
        `INSERT INTO notifications (user_id, document_id, type, message) VALUES ($1, $2, 'APROBADO', 'Tu documento ha sido aprovado. Por favor, procede a firmarlo.')`,
        [responsableId, docId],
      );
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  async rejectDocument(
    docId: number,
    adminId: number,
    responsableId: number,
    comments: string,
  ): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      await client.query(
        "UPDATE documents SET status = 'CON_OBSERVACIONES' WHERE id = $1",
        [docId],
      );

      await client.query(
        "INSERT INTO document_reviews (document_id, reviewer_id, comments, status_assigned) VALUES ($1, $2, $3, 'CON_OBSERVACIONES')",
        [docId, adminId || null, comments],
      );

      await client.query(
        "INSERT INTO notifications (user_id, document_id, type, message) VALUES ($1, $2, 'RECHAZADO', 'Tu documento tiene observaciones.')",
        [responsableId || null, docId],
      );

      await client.query("COMMIT");
    } catch (e: any) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  async publishSignedDocument(
    docId: number,
    responsableId: number,
  ): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `UPDATE documents 
         SET status = 'VIGENTE', 
             updated_at = NOW() 
         WHERE id = $1`,
        [docId],
      );

      const notifyResult = await client.query(
        `INSERT INTO notifications (user_id, document_id, type, message)
         SELECT associate_id, $1, 'PUBLICADO', 'Se ha publicado una nueva versión oficial de un documento. ¡Por favor revísalo!'
         FROM users 
         WHERE is_active = true 
           AND associate_id IS NOT NULL 
           AND associate_id != $2 
           AND id != $2
         RETURNING id`,
        [docId, responsableId],
      );

      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
}
