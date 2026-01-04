import { Request, Response } from 'express';
import { HolidayService } from '../../services/holidays/holidayService';
import { ApiResponse } from '../../types/holidays';

export class HolidayController {
  private holidayService: HolidayService;

  constructor() {
    this.holidayService = new HolidayService();
  }

  // =============================================
  // HOLIDAYS MANAGEMENT
  // =============================================

  /**
   * Get holidays with filters and pagination
   */
  async getHolidays(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const filters = {
        year: req.query.year ? parseInt(req.query.year as string) : undefined,
        month: req.query.month ? parseInt(req.query.month as string) : undefined,
        location_id: req.query.location_id as string,
        holiday_type: req.query.holiday_type as string,
        is_recurring: req.query.is_recurring ? req.query.is_recurring === 'true' : undefined,
        status: req.query.status || 'active',
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        sort_by: req.query.sort_by as string || 'holiday_date',
        sort_order: req.query.sort_order as string || 'ASC'
      };

      const result = await this.holidayService.getHolidays(tenantId, filters);

      const response: ApiResponse = {
        success: true,
        data: result.data,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / filters.limit)
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch holidays'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Get single holiday by ID
   */
  async getHolidayById(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const { id } = req.params;

      const holiday = await this.holidayService.getHolidayById(tenantId, id);

      if (!holiday) {
        const response: ApiResponse = {
          success: false,
          message: 'Holiday not found'
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: holiday
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch holiday'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Create new holiday
   */
  async createHoliday(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const createdBy = req.user.id;
      const holidayData = req.body;

      const holiday = await this.holidayService.createHoliday(tenantId, holidayData, createdBy);

      const response: ApiResponse = {
        success: true,
        message: 'Holiday created successfully',
        data: holiday
      };

      res.status(201).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create holiday'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Update holiday
   */
  async updateHoliday(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const updatedBy = req.user.id;
      const { id } = req.params;
      const holidayData = req.body;

      const holiday = await this.holidayService.updateHoliday(tenantId, id, holidayData, updatedBy);

      const response: ApiResponse = {
        success: true,
        message: 'Holiday updated successfully',
        data: holiday
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update holiday'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Delete holiday
   */
  async deleteHoliday(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const deletedBy = req.user.id;
      const { id } = req.params;

      await this.holidayService.deleteHoliday(tenantId, id, deletedBy);

      const response: ApiResponse = {
        success: true,
        message: 'Holiday deleted successfully'
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete holiday'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Get holidays by location
   */
  async getHolidaysByLocation(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const { location_id } = req.params;
      const filters = {
        year: req.query.year ? parseInt(req.query.year as string) : undefined,
        status: req.query.status || 'active'
      };

      const result = await this.holidayService.getHolidays(tenantId, {
        ...filters,
        location_id
      });

      const response: ApiResponse = {
        success: true,
        data: {
          location_id,
          holidays: result.data
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch location holidays'
      };
      res.status(400).json(response);
    }
  }

  // =============================================
  // LOCATIONS MANAGEMENT
  // =============================================

  /**
   * Get locations
   */
  async getLocations(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const filters = {
        status: req.query.status || 'active',
        is_head_office: req.query.is_head_office ? req.query.is_head_office === 'true' : undefined,
        timezone: req.query.timezone as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        sort_by: req.query.sort_by as string || 'name',
        sort_order: req.query.sort_order as string || 'ASC'
      };

      const result = await this.holidayService.getLocations(tenantId, filters);

      const response: ApiResponse = {
        success: true,
        data: result.data,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / filters.limit)
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch locations'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Get single location by ID
   */
  async getLocationById(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const { id } = req.params;

      const location = await this.holidayService.getLocationById(tenantId, id);

      if (!location) {
        const response: ApiResponse = {
          success: false,
          message: 'Location not found'
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: location
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch location'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Create new location
   */
  async createLocation(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const createdBy = req.user.id;
      const locationData = req.body;

      const location = await this.holidayService.createLocation(tenantId, locationData, createdBy);

      const response: ApiResponse = {
        success: true,
        message: 'Location created successfully',
        data: location
      };

      res.status(201).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create location'
      };
      res.status(400).json(response);
    }
  }

  // =============================================
  // WEEKLY OFFS MANAGEMENT
  // =============================================

  /**
   * Get weekly offs
   */
  async getWeeklyOffs(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const filters = {
        location_id: req.query.location_id as string,
        day_of_week: req.query.day_of_week ? parseInt(req.query.day_of_week as string) : undefined,
        is_active: req.query.is_active !== 'false', // Default to true
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        sort_by: req.query.sort_by as string || 'day_of_week',
        sort_order: req.query.sort_order as string || 'ASC'
      };

      const result = await this.holidayService.getWeeklyOffs(tenantId, filters);

      const response: ApiResponse = {
        success: true,
        data: result.data,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / filters.limit)
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch weekly offs'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Update weekly offs
   */
  async updateWeeklyOffs(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const updatedBy = req.user.id;
      const { location_id } = req.params;
      const weeklyOffData = req.body;

      const weeklyOffs = await this.holidayService.updateWeeklyOffs(tenantId, {
        location_id,
        weekly_offs: weeklyOffData.weekly_offs
      }, updatedBy);

      const response: ApiResponse = {
        success: true,
        message: 'Weekly offs updated successfully',
        data: weeklyOffs
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update weekly offs'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Get weekly offs summary
   */
  async getWeeklyOffsSummary(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;

      const result = await this.holidayService.getWeeklyOffs(tenantId, { is_active: true });
      const weeklyOffs = result.data;

      const summary = {
        total_weekly_offs: weeklyOffs.length,
        active_weekly_offs: weeklyOffs.filter(wo => wo.is_active).length,
        half_day_offs: weeklyOffs.filter(wo => wo.is_half_day).length,
        full_day_offs: weeklyOffs.filter(wo => !wo.is_half_day).length,
        weekly_off_distribution: this.calculateWeeklyDistribution(weeklyOffs),
        locations_with_weekly_offs: new Set(weeklyOffs.map(wo => wo.location_id)).size
      };

      const response: ApiResponse = {
        success: true,
        data: summary
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch weekly offs summary'
      };
      res.status(400).json(response);
    }
  }

  // =============================================
  // CALENDAR & WORKING DAYS
  // =============================================

  /**
   * Get holiday calendar
   */
  async getHolidayCalendar(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const month = req.query.month ? parseInt(req.query.month as string) : undefined;

      const calendar = await this.holidayService.getHolidayCalendar(tenantId, year, month);

      const response: ApiResponse = {
        success: true,
        data: calendar
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch holiday calendar'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Calculate working days between dates
   */
  async calculateWorkingDays(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const { from_date, to_date } = req.query;

      if (!from_date || !to_date) {
        throw new Error('from_date and to_date are required');
      }

      const workingDaysCalculation = await this.holidayService.calculateWorkingDays(
        tenantId,
        from_date as string,
        to_date as string,
        req.query.location_id as string
      );

      const response: ApiResponse = {
        success: true,
        data: workingDaysCalculation
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to calculate working days'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Get upcoming holidays
   */
  async getUpcomingHolidays(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const days = parseInt(req.query.days as string) || 30;

      const upcomingHolidays = await this.holidayService.getUpcomingHolidays(tenantId, days);

      const response: ApiResponse = {
        success: true,
        data: {
          days_ahead: days,
          holidays: upcomingHolidays
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch upcoming holidays'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Get holiday impact analysis
   */
  async getHolidayImpactAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const { date } = req.query;

      if (!date) {
        throw new Error('date is required');
      }

      const impact = await this.holidayService.getHolidayImpactAnalysis(tenantId, date as string);

      const response: ApiResponse = {
        success: true,
        data: {
          date,
          impact_analysis: impact
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate impact analysis'
      };
      res.status(400).json(response);
    }
  }

  // =============================================
  // BULK OPERATIONS
  // =============================================

  /**
   * Bulk create holidays
   */
  async bulkCreateHolidays(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const createdBy = req.user.id;
      const { holidays } = req.body;

      if (!holidays || !Array.isArray(holidays)) {
        throw new Error('Holidays array is required');
      }

      const result = await this.holidayService.bulkCreateHolidays(tenantId, holidays, createdBy);

      const response: ApiResponse = {
        success: result.successful > 0,
        message: `Processed ${holidays.length} holidays: ${result.successful} successful, ${result.failed} failed`,
        data: result
      };

      if (result.failed > 0) {
        response.errors = result.errors.map(err => err.error);
      }

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to process bulk holidays'
      };
      res.status(400).json(response);
    }
  }

  // =============================================
  // REPORTS
  // =============================================

  /**
   * Get holiday summary report
   */
  async getHolidaySummaryReport(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const year = parseInt(req.query.year as string) || new Date().getFullYear();

      const [holidays, weeklyOffs] = await Promise.all([
        this.holidayService.getHolidays(tenantId, { year }),
        this.holidayService.getWeeklyOffs(tenantId, {})
      ]);

      const holidayData = holidays.data;
      const weeklyOffData = weeklyOffs.data;

      const summary = {
        year,
        total_holidays: holidayData.length,
        national_holidays: holidayData.filter(h => h.holiday_type === 'national').length,
        regional_holidays: holidayData.filter(h => h.holiday_type === 'regional').length,
        company_holidays: holidayData.filter(h => h.holiday_type === 'company').length,
        religious_holidays: holidayData.filter(h => h.holiday_type === 'religious').length,
        optional_holidays: holidayData.filter(h => h.is_optional).length,
        recurring_holidays: holidayData.filter(h => h.is_recurring).length,
        location_specific_holidays: holidayData.filter(h => h.location_specific).length,
        total_weekly_offs: weeklyOffData.length,
        active_weekly_offs: weeklyOffData.filter(wo => wo.is_active).length
      };

      const response: ApiResponse = {
        success: true,
        data: summary
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate holiday summary'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Get compliance report
   */
  async getHolidayComplianceReport(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const year = parseInt(req.query.year as string) || new Date().getFullYear();

      // This would check against compliance rules
      const compliance = {
        year,
        total_working_days: 250, // Would calculate based on working days
        total_holidays: 0, // Would get from database
        total_weekly_offs: 0, // Would get from database
        actual_working_days: 0, // Would calculate
        compliance_requirements: {
          minimum_holidays: 10,
          mandatory_weekly_offs: 2,
          compliance_percentage: 100,
          is_compliant: true
        },
        violations: [],
        recommendations: []
      };

      const response: ApiResponse = {
        success: true,
        data: compliance
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate compliance report'
      };
      res.status(400).json(response);
    }
  }

  // =============================================
  // HELPER METHODS
  // =============================================

  private calculateWeeklyDistribution(weeklyOffs: any[]): any[] {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const distribution = dayNames.map((name, index) => ({
      day_of_week: index,
      day_name: name,
      count: weeklyOffs.filter(wo => wo.day_of_week === index).length
    }));

    return distribution;
  }
}