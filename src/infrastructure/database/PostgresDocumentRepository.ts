import fs from "fs";
import path from "path";
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
import { MailerService } from "@/infrastructure/services/MailService.js";

export class PostgresDocumentRepository implements IDocumentRepository {
  private readonly mailService = new MailerService();

  private getFriendlyTitle(type: string): string {
    switch (type?.toUpperCase()) {
      case "APROBADO":
        return "Documento Aprobado";
      case "RECHAZADO":
        return "Documento con Observaciones (Rechazado)";
      case "NUEVA_REVISION":
        return "Nueva Revisión de Documento Requerida";
      case "PUBLICADO":
        return "Nuevo Documento Publicado Oficialmente";
      case "NUEVO_DOCUMENTO":
        return "Nuevo Documento Disponible";
      default:
        return "Notificación del Sistema (SAI)";
    }
  }

  private async sendEmailForNotification(
    userId: number,
    title: string,
    message: string,
    type: string,
    documentId?: number,
  ): Promise<void> {
    try {
      const userRes = await pool.query(
        "SELECT email, full_name FROM users WHERE associate_id = $1 OR id = $1",
        [userId],
      );
      if (userRes.rows.length === 0) return;

      const { email, full_name } = userRes.rows[0];
      if (!email) return;

      let docTitle = "";
      let docCode = "";
      let expDateStr: string | undefined = undefined;

      if (documentId) {
        const docRes = await pool.query(
          "SELECT title, origin_code, expiration_date FROM documents WHERE id = $1",
          [documentId],
        );
        if (docRes.rows.length > 0) {
          docTitle = docRes.rows[0].title || "";
          docCode = docRes.rows[0].origin_code || "";
          if (docRes.rows[0].expiration_date) {
            const rawDate = docRes.rows[0].expiration_date;
            expDateStr =
              rawDate instanceof Date
                ? rawDate.toLocaleDateString("es-MX")
                : String(rawDate).split("T")[0];
          }
        }
      }

      await this.mailService.sendSystemNotification({
        to: email,
        recipientName: full_name || "",
        type: type,
        subject: title,
        message: message,
        documentTitle: docTitle,
        documentCode: docCode,
        expirationDate: expDateStr,
      });
      console.log(
        `Notificación por correo enviada a ${email} para el usuario ${userId}`,
      );
    } catch (error) {
      console.error(
        `Error al enviar correo de notificación al usuario ${userId}:`,
        error,
      );
    }
  }

  private async deletePreviousCorrectionFiles(docId: number): Promise<void> {
    try {
      // Find all reviews for this document that have a correction_file_url
      const res = await pool.query(
        "SELECT id, correction_file_url FROM document_reviews WHERE document_id = $1 AND correction_file_url IS NOT NULL",
        [docId],
      );

      for (const row of res.rows) {
        const filePath = row.correction_file_url;
        if (filePath) {
          const absolutePath = path.resolve(filePath);
          if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
            console.log(
              `[Auto-Limpieza] Archivo de observaciones eliminado físicamente: ${absolutePath}`,
            );
          }
        }
        // Clear reference in database
        await pool.query(
          "UPDATE document_reviews SET correction_file_url = NULL WHERE id = $1",
          [row.id],
        );
      }
    } catch (error) {
      console.error(
        "[Auto-Limpieza] Error al eliminar archivos de observaciones previos:",
        error,
      );
    }
  }

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
      `SELECT comments, correction_file_url FROM document_reviews WHERE document_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [id],
    );

    const latest_review = reviewsResult.rows[0]?.comments || null;
    const latest_correction_file =
      reviewsResult.rows[0]?.correction_file_url || null;

    const versions: DocumentVersion[] = (
      versionsResult.rows as DocumentVersion[]
    ).map((v) => ({
      ...v,
      revision_label: v.revision_number,
    }));

    return {
      ...(docResult.rows[0] as Document),
      versions,
      latest_review,
      latest_correction_file,
    };
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

    await this.syncExpiredStatus();

    if (result.rows.length === 0) return null;
    const finalDoc = await pool.query(
      `SELECT d.*, u.full_name AS uploaded_by
       FROM documents d
       LEFT JOIN users u ON d.created_by_id = u.associate_id
       WHERE d.id = $1`,
      [id],
    );
    return (finalDoc.rows[0] as Document) ?? null;
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
    // 1. Mark past-expiration documents as VENCIDO
    await pool.query(
      `
      UPDATE documents 
      SET status = 'VENCIDO',
          updated_at = NOW()
      WHERE expiration_date < CURRENT_DATE 
        AND status NOT IN ('NUEVO', 'EN_REVISION', 'CON_OBSERVACIONES', 'APROBADO_SAI', 'APROBADO_SIN_FIRMA', 'VENCIDO')
      `,
    );

    // 2. Mark documents expiring in 1 month or less as POR_VENCER
    await pool.query(
      `
      UPDATE documents 
      SET status = 'POR_VENCER',
          updated_at = NOW()
      WHERE expiration_date >= CURRENT_DATE 
        AND expiration_date <= CURRENT_DATE + INTERVAL '1 month'
        AND status NOT IN ('NUEVO', 'EN_REVISION', 'CON_OBSERVACIONES', 'APROBADO_SAI', 'APROBADO_SIN_FIRMA', 'POR_VENCER', 'VENCIDO')
      `,
    );

    // 3. Restore documents whose expiration is extended to > 1 month back to VIGENTE
    await pool.query(
      `
      UPDATE documents 
      SET status = 'VIGENTE',
          updated_at = NOW()
      WHERE expiration_date > CURRENT_DATE + INTERVAL '1 month'
        AND status IN ('POR_VENCER', 'VENCIDO')
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
    // Delete previous correction files since a new version is being uploaded
    await this.deletePreviousCorrectionFiles(data.document_id);

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
      "APROBADO_SAI",
      "APROBADO_SIN_FIRMA",
    ];

    let finalStatus = status;

    if (date && !protectedStatuses.includes(status)) {
      const expDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expDate.setHours(0, 0, 0, 0);

      if (expDate < today) {
        finalStatus = "VENCIDO";
      } else {
        const oneMonthFromNow = new Date();
        oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
        oneMonthFromNow.setHours(23, 59, 59, 999);

        if (expDate <= oneMonthFromNow) {
          finalStatus = "POR_VENCER";
        } else if (status === "POR_VENCER" || status === "VENCIDO") {
          finalStatus = "VIGENTE";
        }
      }
    }

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

    // Send email asynchronously
    this.sendEmailForNotification(
      data.user_id,
      this.getFriendlyTitle(data.type),
      data.message,
      data.type,
      data.document_id,
    ).catch((err) =>
      console.error("Error al enviar email de notificación:", err),
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

      // Send emails to all active users asynchronously
      pool
        .query(
          "SELECT associate_id FROM users WHERE is_active = true AND associate_id IS NOT NULL",
        )
        .then((res) => {
          for (const row of res.rows) {
            this.sendEmailForNotification(
              row.associate_id,
              this.getFriendlyTitle(type),
              message,
              type,
              documentId,
            ).catch((err) =>
              console.error("Error al enviar email masivo:", err),
            );
          }
        })
        .catch((err) =>
          console.error("Error al obtener usuarios para email masivo:", err),
        );
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

      // Send emails to all admins asynchronously
      client
        .query(
          "SELECT COALESCE(associate_id, id) AS user_id FROM users WHERE role::text ILIKE '%ADMIN%' AND is_active = true",
        )
        .then((res) => {
          for (const admin of res.rows) {
            this.sendEmailForNotification(
              admin.user_id,
              "Nueva Revisión Requerida",
              "Un documento fue subido/corregido y requiere tu revisión.",
              "NUEVA_REVISION",
              docId,
            ).catch((err) =>
              console.error(
                "Error al notificar por email a administrador:",
                err,
              ),
            );
          }
        })
        .catch((err) =>
          console.error("Error al obtener administradores para email:", err),
        );
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
    userRole: string,
  ): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const isGerente = userRole.toUpperCase().includes("GERENTE");

      if (isGerente) {
        await client.query(
          `UPDATE documents SET status = 'APROBADO_SIN_FIRMA' WHERE id = $1`,
          [docId],
        );
        await client.query(
          `
          INSERT INTO notifications (user_id, document_id, type, message)
          SELECT COALESCE(associate_id, id), $1, 'APROBADO', 'El gerente ha aprobado el documento. Por favor sube la versión final firmada.'
          FROM users
          WHERE role::text ILIKE '%ADMIN%' AND is_active = true
          `,
          [docId],
        );
        await client.query(
          `INSERT INTO notifications (user_id, document_id, type, message) VALUES ($1, $2, 'APROBADO', 'El gerente ha otorgado el Visto Bueno a tu documento. Un administrador subirá la versión final.')`,
          [responsableId, docId],
        );
        await client.query("COMMIT");

        // Delete previous correction files since it is approved by Gerente
        await this.deletePreviousCorrectionFiles(docId);

        // Send emails asynchronously
        client
          .query(
            "SELECT COALESCE(associate_id, id) AS user_id FROM users WHERE role::text ILIKE '%ADMIN%' AND is_active = true",
          )
          .then((res) => {
            for (const admin of res.rows) {
              this.sendEmailForNotification(
                admin.user_id,
                "Visto Bueno de Gerencia",
                "El gerente ha aprobado el documento (Visto Bueno). Por favor sube la versión final firmada.",
                "APROBADO",
                docId,
              ).catch((err) =>
                console.error(
                  "Error al notificar por email a administrador de aprobación de Gerente:",
                  err,
                ),
              );
            }
          })
          .catch((err) =>
            console.error("Error al obtener administradores para email:", err),
          );

        this.sendEmailForNotification(
          responsableId,
          "Visto Bueno de Gerencia",
          "El gerente ha otorgado el Visto Bueno a tu documento. Un administrador subirá la versión final.",
          "APROBADO",
          docId,
        ).catch((err) =>
          console.error(
            "Error al enviar email de aprobación a responsable:",
            err,
          ),
        );
      } else {
        await client.query(
          `UPDATE documents SET status = 'APROBADO_SAI' WHERE id = $1`,
          [docId],
        );
        await client.query(
          `
          INSERT INTO notifications (user_id, document_id, type, message)
          SELECT COALESCE(associate_id, id), $1, 'NUEVA_REVISION', 'Un documento fue aprobado por el administrador y requiere tu visto bueno.'
          FROM users
          WHERE role::text ILIKE '%GERENTE%' AND is_active = true
          `,
          [docId],
        );
        await client.query(
          `INSERT INTO notifications (user_id, document_id, type, message) VALUES ($1, $2, 'APROBADO', 'Tu documento fue aprobado por el administrador. Está pendiente de visto bueno de Gerencia.')`,
          [responsableId, docId],
        );
        await client.query("COMMIT");

        // Send emails asynchronously to GERENTEs
        client
          .query(
            "SELECT COALESCE(associate_id, id) AS user_id FROM users WHERE role::text ILIKE '%GERENTE%' AND is_active = true",
          )
          .then((res) => {
            for (const gerente of res.rows) {
              this.sendEmailForNotification(
                gerente.user_id,
                "Revisión Requerida",
                "Un documento fue aprobado por el administrador y requiere tu revisión.",
                "NUEVA_REVISION",
                docId,
              ).catch((err) =>
                console.error(
                  "Error al notificar por email a gerente de aprobación de admin:",
                  err,
                ),
              );
            }
          })
          .catch((err) =>
            console.error("Error al obtener gerentes para email:", err),
          );

        this.sendEmailForNotification(
          responsableId,
          "Documento Aprobado por Administrador",
          "Tu documento fue aprobado por el administrador. Está pendiente de visto bueno de Gerencia.",
          "APROBADO",
          docId,
        ).catch((err) =>
          console.error(
            "Error al enviar email de aprobación por admin a responsable:",
            err,
          ),
        );
      }
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
    correctionFilePath?: string,
  ): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      await client.query(
        "UPDATE documents SET status = 'CON_OBSERVACIONES' WHERE id = $1",
        [docId],
      );

      const normalizedPath = correctionFilePath
        ? correctionFilePath.replace(/\\/g, "/")
        : null;

      await client.query(
        "INSERT INTO document_reviews (document_id, reviewer_id, comments, status_assigned, correction_file_url) VALUES ($1, $2, $3, 'CON_OBSERVACIONES', $4)",
        [docId, adminId || null, comments, normalizedPath],
      );

      // Check reviewer's role to customize notification message
      const reviewerResult = await client.query(
        "SELECT role FROM users WHERE id = $1",
        [adminId],
      );
      const reviewerRole = reviewerResult.rows[0]?.role || "";
      const isGerente = reviewerRole.toUpperCase().includes("GERENTE");

      const notifMessage = isGerente
        ? `Tu documento fue rechazado por gerencia con la siguiente explicación: "${comments}"`
        : "Tu documento tiene observaciones.";

      await client.query(
        "INSERT INTO notifications (user_id, document_id, type, message) VALUES ($1, $2, 'RECHAZADO', $3)",
        [responsableId || null, docId, notifMessage],
      );

      await client.query("COMMIT");

      // Send email asynchronously
      if (responsableId) {
        const emailSubject = isGerente
          ? "Documento Rechazado por Gerencia"
          : "Documento con Observaciones";
        const emailBody = isGerente
          ? `Tu documento fue rechazado por gerencia con la siguiente explicación:\n\n"${comments}"`
          : `Tu documento tiene observaciones cargadas por el revisor:\n\n"${comments}"`;

        this.sendEmailForNotification(
          responsableId,
          emailSubject,
          emailBody,
          "RECHAZADO",
          docId,
        ).catch((err) =>
          console.error("Error al enviar email de observaciones/rechazo:", err),
        );
      }
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

      await this.syncExpiredStatus();

      client
        .query(
          `SELECT associate_id FROM users 
         WHERE is_active = true 
           AND associate_id IS NOT NULL 
           AND associate_id != $1 
           AND id != $1`,
          [responsableId],
        )
        .then((res) => {
          for (const row of res.rows) {
            this.sendEmailForNotification(
              row.associate_id,
              "Nuevo Documento Publicado",
              "Se ha publicado una nueva versión oficial de un documento. ¡Por favor revísalo!",
              "PUBLICADO",
              docId,
            ).catch((err) =>
              console.error("Error al enviar email de publicación:", err),
            );
          }
        })
        .catch((err) =>
          console.error(
            "Error al obtener usuarios para email de publicación:",
            err,
          ),
        );
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
}
