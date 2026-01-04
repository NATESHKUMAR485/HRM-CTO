import { Pool } from 'pg';
import { EmployeeDocument } from '../types';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

export class DocumentService {
  private pool: Pool;
  private uploadDir: string;

  constructor(pool: Pool) {
    this.pool = pool;
    this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Upload document for employee
   */
  async uploadDocument(
    tenantId: string,
    employeeId: string,
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
    documentType: string,
    description: string,
    tags: string[] = [],
    uploadedBy: string
  ): Promise<EmployeeDocument> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const fileName = `${uuidv4()}${fileExtension}`;
      const filePath = path.join(this.uploadDir, fileName);
      
      // Ensure employee-specific directory exists
      const employeeDir = path.join(this.uploadDir, employeeId);
      if (!fs.existsSync(employeeDir)) {
        fs.mkdirSync(employeeDir, { recursive: true });
      }
      
      const fullPath = path.join(employeeDir, fileName);
      
      // Write file to disk
      fs.writeFileSync(fullPath, file.buffer);
      
      // Check for existing documents of same type to determine version
      const versionQuery = `
        SELECT COALESCE(MAX(version), 0) + 1 as next_version
        FROM employee_documents 
        WHERE tenant_id = $1 AND employee_id = $2 AND document_type = $3
      `;
      const versionResult = await client.query(versionQuery, [tenantId, employeeId, documentType]);
      const nextVersion = versionResult.rows[0].next_version;
      
      // Mark previous versions as not latest
      await client.query(
        `UPDATE employee_documents 
         SET is_latest_version = false 
         WHERE tenant_id = $1 AND employee_id = $2 AND document_type = $3`,
        [tenantId, employeeId, documentType]
      );
      
      // Insert document record
      const query = `
        INSERT INTO employee_documents (
          tenant_id, employee_id, document_type, file_name, file_path, file_size, mime_type,
          version, is_latest_version, uploaded_by, tags, description, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;
      
      const result = await client.query(query, [
        tenantId,
        employeeId,
        documentType,
        file.originalname,
        fullPath,
        file.size,
        file.mimetype,
        nextVersion,
        true,
        uploadedBy,
        JSON.stringify(tags),
        description,
        'active'
      ]);
      
      await client.query('COMMIT');
      
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      
      // Clean up file if database operation failed
      const filePath = path.join(this.uploadDir, employeeId, `${uuidv4()}${path.extname(file.originalname)}`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get documents for employee
   */
  async getEmployeeDocuments(tenantId: string, employeeId: string): Promise<EmployeeDocument[]> {
    const query = `
      SELECT ed.*, 
        u.first_name || ' ' || u.last_name as uploaded_by_name
      FROM employee_documents ed
      LEFT JOIN users u ON ed.uploaded_by = u.id
      WHERE ed.tenant_id = $1 AND ed.employee_id = $2 AND ed.status = 'active'
      ORDER BY ed.document_type, ed.version DESC, ed.created_at DESC
    `;
    
    const result = await this.pool.query(query, [tenantId, employeeId]);
    
    return result.rows.map(row => ({
      ...row,
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags,
      uploaded_by_name: row.uploaded_by_name
    }));
  }

  /**
   * Get document by ID
   */
  async getDocumentById(tenantId: string, documentId: string): Promise<EmployeeDocument | null> {
    const query = `
      SELECT ed.*, 
        u.first_name || ' ' || u.last_name as uploaded_by_name,
        e.first_name || ' ' || e.last_name as employee_name
      FROM employee_documents ed
      LEFT JOIN users u ON ed.uploaded_by = u.id
      LEFT JOIN employees e ON ed.employee_id = e.id
      WHERE ed.tenant_id = $1 AND ed.id = $2 AND ed.status = 'active'
    `;
    
    const result = await this.pool.query(query, [tenantId, documentId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      ...row,
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags,
      uploaded_by_name: row.uploaded_by_name,
      employee_name: row.employee_name
    };
  }

  /**
   * Download document
   */
  async downloadDocument(tenantId: string, documentId: string): Promise<{ filePath: string; fileName: string; mimeType: string }> {
    const document = await this.getDocumentById(tenantId, documentId);
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    if (!fs.existsSync(document.file_path)) {
      throw new Error('File not found on disk');
    }
    
    return {
      filePath: document.file_path,
      fileName: document.file_name,
      mimeType: document.mime_type
    };
  }

  /**
   * Delete document
   */
  async deleteDocument(tenantId: string, documentId: string, deletedBy: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get document details
      const documentQuery = 'SELECT * FROM employee_documents WHERE tenant_id = $1 AND id = $2';
      const documentResult = await client.query(documentQuery, [tenantId, documentId]);
      
      if (documentResult.rows.length === 0) {
        throw new Error('Document not found');
      }
      
      const document = documentResult.rows[0];
      
      // Soft delete in database
      await client.query(
        'UPDATE employee_documents SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE tenant_id = $2 AND id = $3',
        ['deleted', tenantId, documentId]
      );
      
      // Delete file from disk (optional - could keep for audit purposes)
      if (fs.existsSync(document.file_path)) {
        try {
          fs.unlinkSync(document.file_path);
        } catch (error) {
          console.warn('Could not delete file from disk:', error);
        }
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get document version history
   */
  async getDocumentVersions(tenantId: string, employeeId: string, documentType: string): Promise<EmployeeDocument[]> {
    const query = `
      SELECT ed.*, 
        u.first_name || ' ' || u.last_name as uploaded_by_name
      FROM employee_documents ed
      LEFT JOIN users u ON ed.uploaded_by = u.id
      WHERE ed.tenant_id = $1 
      AND ed.employee_id = $2 
      AND ed.document_type = $3 
      AND ed.status != 'deleted'
      ORDER BY ed.version DESC, ed.created_at DESC
    `;
    
    const result = await this.pool.query(query, [tenantId, employeeId, documentType]);
    
    return result.rows.map(row => ({
      ...row,
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags,
      uploaded_by_name: row.uploaded_by_name
    }));
  }

  /**
   * Update document metadata
   */
  async updateDocument(
    tenantId: string,
    documentId: string,
    updateData: {
      description?: string;
      tags?: string[];
      document_type?: string;
    },
    updatedBy: string
  ): Promise<EmployeeDocument> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Build update query dynamically
      const updateFields = [];
      const updateParams: any[] = [tenantId, documentId];
      let paramCount = 3;
      
      for (const [key, value] of Object.entries(updateData)) {
        if (value !== undefined) {
          updateFields.push(`${key} = $${paramCount}`);
          
          if (key === 'tags') {
            updateParams.push(JSON.stringify(value));
          } else {
            updateParams.push(value);
          }
          paramCount++;
        }
      }
      
      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }
      
      const updateQuery = `
        UPDATE employee_documents 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $1 AND id = $2
        RETURNING *
      `;
      
      const result = await client.query(updateQuery, updateParams);
      
      if (result.rows.length === 0) {
        throw new Error('Document not found');
      }
      
      await client.query('COMMIT');
      
      const row = result.rows[0];
      return {
        ...row,
        tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get documents by type for all employees (for reporting)
   */
  async getDocumentsByType(tenantId: string, documentType: string): Promise<any[]> {
    const query = `
      SELECT 
        ed.id,
        ed.document_type,
        ed.file_name,
        ed.file_size,
        ed.version,
        ed.created_at,
        e.first_name || ' ' || e.last_name as employee_name,
        e.employee_number,
        u.first_name || ' ' || u.last_name as uploaded_by_name
      FROM employee_documents ed
      JOIN employees e ON ed.employee_id = e.id
      LEFT JOIN users u ON ed.uploaded_by = u.id
      WHERE ed.tenant_id = $1 
      AND ed.document_type = $2 
      AND ed.is_latest_version = true 
      AND ed.status = 'active'
      ORDER BY e.last_name, e.first_name, ed.created_at DESC
    `;
    
    const result = await this.pool.query(query, [tenantId, documentType]);
    return result.rows;
  }

  /**
   * Clean up orphaned files
   */
  async cleanupOrphanedFiles(): Promise<{ deleted: number; errors: string[] }> {
    const errors: string[] = [];
    let deleted = 0;
    
    try {
      // Get all active document paths
      const query = 'SELECT file_path FROM employee_documents WHERE status = $1';
      const result = await this.pool.query(query, ['active']);
      
      const activePaths = new Set(result.rows.map(row => row.file_path));
      
      // Check files in upload directory
      const walkDir = (dir: string) => {
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            walkDir(fullPath);
          } else {
            // Check if file is referenced in database
            if (!activePaths.has(fullPath)) {
              try {
                fs.unlinkSync(fullPath);
                deleted++;
              } catch (error) {
                errors.push(`Failed to delete ${fullPath}: ${error}`);
              }
            }
          }
        }
      };
      
      walkDir(this.uploadDir);
    } catch (error) {
      errors.push(`Cleanup failed: ${error}`);
    }
    
    return { deleted, errors };
  }

  /**
   * Validate file before upload
   */
  validateFile(file: { mimetype: string; size: number; originalname: string }): { valid: boolean; error?: string } {
    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return { valid: false, error: 'File size exceeds 10MB limit' };
    }
    
    // Check file type
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];
    
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return { valid: false, error: 'File type not allowed' };
    }
    
    // Check filename
    if (!file.originalname || file.originalname.length > 255) {
      return { valid: false, error: 'Invalid filename' };
    }
    
    return { valid: true };
  }
}