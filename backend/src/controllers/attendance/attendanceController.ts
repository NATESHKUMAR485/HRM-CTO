import { Request, Response } from 'express';
import { AttendanceService } from '../../services/attendance/attendanceService';
import { validateRequest } from '../../middleware/validation';
import { 
  createAttendanceRecordSchema,
  updateAttendanceRecordSchema,
  requestAttendanceCorrectionSchema,
  approveAttendanceCorrectionSchema,
  attendanceFiltersSchema,
  attendanceReportFiltersSchema,
  bulkAttendanceSchema
} from '../../validators/attendance';
import { ApiResponse } from '../../types/attendance';

export class AttendanceController {
  private attendanceService: AttendanceService;

  constructor() {
    this.attendanceService = new AttendanceService();
  }

  // =============================================
  // ATTENDANCE RECORDS
  // =============================================

  /**
   * Get attendance records with filters and pagination
   */
  async getAttendanceRecords(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const filters = validateRequest(attendanceFiltersSchema, req.query);
      
      const result = await this.attendanceService.getAttendanceRecords(tenantId, filters);
      
      const response: ApiResponse = {
        success: true,
        data: result.data,
        pagination: {
          page: parseInt(req.query.page as string) || 1,
          limit: parseInt(req.query.limit as string) || 20,
          total: result.total,
          totalPages: Math.ceil(result.total / (parseInt(req.query.limit as string) || 20))
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch attendance records'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Get single attendance record by ID
   */
  async getAttendanceRecordById(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const { id } = req.params;

      const attendanceRecord = await this.attendanceService.getAttendanceRecordById(tenantId, id);
      
      if (!attendanceRecord) {
        const response: ApiResponse = {
          success: false,
          message: 'Attendance record not found'
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: attendanceRecord
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch attendance record'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Create new attendance record
   */
  async createAttendanceRecord(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const markedBy = req.user.id;
      const recordData = validateRequest(createAttendanceRecordSchema, req.body);

      const attendanceRecord = await this.attendanceService.createAttendanceRecord(tenantId, recordData, markedBy);

      const response: ApiResponse = {
        success: true,
        message: 'Attendance record created successfully',
        data: attendanceRecord
      };

      res.status(201).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create attendance record'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Update attendance record
   */
  async updateAttendanceRecord(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const updatedBy = req.user.id;
      const { id } = req.params;
      const recordData = validateRequest(updateAttendanceRecordSchema, req.body);

      const attendanceRecord = await this.attendanceService.updateAttendanceRecord(tenantId, id, recordData, updatedBy);

      const response: ApiResponse = {
        success: true,
        message: 'Attendance record updated successfully',
        data: attendanceRecord
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update attendance record'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Request attendance correction
   */
  async requestAttendanceCorrection(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const requestedBy = req.user.id;
      const correctionData = validateRequest(requestAttendanceCorrectionSchema, req.body);

      const result = await this.attendanceService.requestAttendanceCorrection(tenantId, correctionData, requestedBy);

      const response: ApiResponse = {
        success: true,
        message: 'Correction request submitted successfully',
        data: result
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to submit correction request'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Approve/reject attendance correction
   */
  async approveAttendanceCorrection(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const approverId = req.user.id;
      const { id } = req.params;
      const { action, comments, rejection_reason } = validateRequest(approveAttendanceCorrectionSchema, req.body);

      const attendanceRecord = await this.attendanceService.approveAttendanceCorrection(tenantId, id, approverId, action, comments, rejection_reason);

      const response: ApiResponse = {
        success: true,
        message: `Correction request ${action}ed successfully`,
        data: attendanceRecord
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to process correction request'
      };
      res.status(400).json(response);
    }
  }

  // =============================================
  // BULK OPERATIONS
  // =============================================

  /**
   * Bulk create attendance records
   */
  async bulkCreateAttendanceRecords(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const { records, marked_by, notes } = validateRequest(bulkAttendanceSchema, req.body);

      const result = await this.attendanceService.bulkCreateAttendanceRecords(tenantId, records, marked_by);

      const response: ApiResponse = {
        success: result.successful > 0,
        message: `Processed ${records.length} records: ${result.successful} successful, ${result.failed} failed`,
        data: result
      };

      if (result.failed > 0) {
        response.errors = result.errors.map(err => err.error);
      }

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to process bulk attendance records'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Import attendance from CSV/Excel
   */
  async importAttendanceRecords(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const markedBy = req.user.id;
      const { file_url, file_type, notes } = req.body;

      // This would handle file parsing and processing
      // For now, return a placeholder response
      const response: ApiResponse = {
        success: true,
        message: 'Attendance import initiated',
        data: {
          file_url,
          file_type,
          status: 'processing',
          estimated_completion: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to import attendance records'
      };
      res.status(400).json(response);
    }
  }

  // =============================================
  // ATTENDANCE STATUSES
  // =============================================

  /**
   * Get attendance statuses
   */
  async getAttendanceStatuses(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const filters = {
        status: req.query.status || 'active'
      };

      const result = await this.attendanceService.getAttendanceStatuses(tenantId, filters);

      const response: ApiResponse = {
        success: true,
        data: result.data
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch attendance statuses'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Create attendance status (Admin only)
   */
  async createAttendanceStatus(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const createdBy = req.user.id;
      const statusData = req.body;

      const attendanceStatus = await this.attendanceService.createAttendanceStatus(tenantId, statusData, createdBy);

      const response: ApiResponse = {
        success: true,
        message: 'Attendance status created successfully',
        data: attendanceStatus
      };

      res.status(201).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create attendance status'
      };
      res.status(400).json(response);
    }
  }

  // =============================================
  // SHIFT MANAGEMENT
  // =============================================

  /**
   * Get shift templates
   */
  async getShiftTemplates(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const filters = {
        status: req.query.status || 'active'
      };

      const result = await this.attendanceService.getShiftTemplates(tenantId, filters);

      const response: ApiResponse = {
        success: true,
        data: result.data
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch shift templates'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Create shift template (Admin only)
   */
  async createShiftTemplate(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const createdBy = req.user.id;
      const shiftData = req.body;

      const shiftTemplate = await this.attendanceService.createShiftTemplate(tenantId, shiftData, createdBy);

      const response: ApiResponse = {
        success: true,
        message: 'Shift template created successfully',
        data: shiftTemplate
      };

      res.status(201).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create shift template'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Get employee shifts
   */
  async getEmployeeShifts(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const filters = {
        employee_id: req.query.employee_id,
        shift_template_id: req.query.shift_template_id,
        status: req.query.status || 'active'
      };

      const result = await this.attendanceService.getEmployeeShifts(tenantId, filters);

      const response: ApiResponse = {
        success: true,
        data: result.data
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch employee shifts'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Assign shift to employees
   */
  async createEmployeeShift(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const assignedBy = req.user.id;
      const shiftData = req.body;

      const employeeShifts = await this.attendanceService.createEmployeeShift(tenantId, shiftData, assignedBy);

      const response: ApiResponse = {
        success: true,
        message: 'Employee shifts assigned successfully',
        data: employeeShifts
      };

      res.status(201).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to assign employee shifts'
      };
      res.status(400).json(response);
    }
  }

  // =============================================
  // ATTENDANCE REPORTS
  // =============================================

  /**
   * Get attendance summary
   */
  async getAttendanceSummary(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const date = req.query.date as string || new Date().toISOString().split('T')[0];

      const summary = await this.attendanceService.getAttendanceSummary(tenantId, date);

      const response: ApiResponse = {
        success: true,
        data: {
          date,
          summary
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch attendance summary'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Get department attendance summary
   */
  async getDepartmentAttendanceSummary(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const fromDate = req.query.from_date as string;
      const toDate = req.query.to_date as string;

      if (!fromDate || !toDate) {
        throw new Error('from_date and to_date are required');
      }

      const summary = await this.attendanceService.getDepartmentAttendanceSummary(tenantId, fromDate, toDate);

      const response: ApiResponse = {
        success: true,
        data: {
          period: {
            from: fromDate,
            to: toDate
          },
          departments: summary
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch department summary'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Get late arrival report
   */
  async getLateArrivalReport(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const fromDate = req.query.from_date as string;
      const toDate = req.query.to_date as string;

      if (!fromDate || !toDate) {
        throw new Error('from_date and to_date are required');
      }

      const report = await this.attendanceService.getLateArrivalReport(tenantId, fromDate, toDate);

      const response: ApiResponse = {
        success: true,
        data: {
          period: {
            from: fromDate,
            to: toDate
          },
          report
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate late arrival report'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Get absence report
   */
  async getAbsenceReport(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const fromDate = req.query.from_date as string;
      const toDate = req.query.to_date as string;

      if (!fromDate || !toDate) {
        throw new Error('from_date and to_date are required');
      }

      const report = await this.attendanceService.getAbsenceReport(tenantId, fromDate, toDate);

      const response: ApiResponse = {
        success: true,
        data: {
          period: {
            from: fromDate,
            to: toDate
          },
          report
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate absence report'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Get attendance reports
   */
  async getAttendanceReports(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const filters = validateRequest(attendanceReportFiltersSchema, req.query);
      const { report_type, format = 'csv' } = filters;

      const response: ApiResponse = {
        success: true,
        message: `Attendance ${report_type} report generated`,
        data: {
          report_type,
          format,
          generated_at: new Date(),
          download_url: `/api/v1/attendance/reports/download/${report_type}`
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate attendance report'
      };
      res.status(400).json(response);
    }
  }

  // =============================================
  // DASHBOARD DATA
  // =============================================

  /**
   * Get attendance dashboard data
   */
  async getAttendanceDashboard(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const today = new Date().toISOString().split('T')[0];

      const [dailySummary, recentRecords] = await Promise.all([
        this.attendanceService.getAttendanceSummary(tenantId, today),
        this.attendanceService.getAttendanceRecords(tenantId, {
          page: 1,
          limit: 10,
          sort_by: 'created_at',
          sort_order: 'DESC'
        })
      ]);

      const response: ApiResponse = {
        success: true,
        data: {
          today_summary: dailySummary,
          recent_records: recentRecords.data,
          correction_requests: recentRecords.data.filter((record: any) => 
            record.correction_requested && !record.correction_approved
          ).length
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch dashboard data'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Get team attendance dashboard (for managers)
   */
  async getTeamAttendanceDashboard(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const today = new Date().toISOString().split('T')[0];
      const thisMonth = new Date().toISOString().substring(0, 7); // YYYY-MM

      const [todaySummary, monthlySummary] = await Promise.all([
        this.attendanceService.getAttendanceSummary(tenantId, today),
        this.attendanceService.getAttendanceRecords(tenantId, {
          attendance_date_from: thisMonth + '-01',
          attendance_date_to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
        })
      ]);

      const response: ApiResponse = {
        success: true,
        data: {
          today_summary: todaySummary,
          monthly_summary: {
            total_records: monthlySummary.total,
            attendance_percentage: (todaySummary.attendance_percentage || 0) // Simplified
          },
          pending_corrections: 0, // Would calculate from correction requests
          team_attendance_trends: [] // Would generate trend data
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch team dashboard data'
      };
      res.status(400).json(response);
    }
  }
}