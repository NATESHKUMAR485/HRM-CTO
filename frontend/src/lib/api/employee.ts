import { 
  Employee, 
  EmployeeListResponse, 
  Department, 
  EmployeeSearchFilters,
  PaginationOptions,
  BulkOperationResult,
  EmployeeAllowance,
  EmployeeDeduction,
  EmployeeBankDetails,
  EmployeeTaxInfo,
  EmployeeSkill,
  EmployeeCertification,
  EmployeeDocument,
  EmployeeBenefit,
  EmployeeSalaryHistory,
  EmployeeEmploymentHistory
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any[];
}

class EmployeeApiClient {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = localStorage.getItem('access_token');
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Employee CRUD Operations
  async getEmployees(
    filters: EmployeeSearchFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<EmployeeListResponse> {
    const queryParams = new URLSearchParams();
    
    // Add filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, v));
        } else {
          queryParams.append(key, value.toString());
        }
      }
    });

    // Add pagination
    queryParams.append('page', pagination.page.toString());
    queryParams.append('limit', pagination.limit.toString());
    
    if (pagination.sort_by) {
      queryParams.append('sort_by', pagination.sort_by);
    }
    if (pagination.sort_order) {
      queryParams.append('sort_order', pagination.sort_order);
    }

    const response = await this.request<EmployeeListResponse>(
      `/v1/employees?${queryParams.toString()}`
    );
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch employees');
    }
    
    return response.data;
  }

  async getEmployee(id: string): Promise<Employee> {
    const response = await this.request<Employee>(`/v1/employees/${id}`);
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch employee');
    }
    
    return response.data;
  }

  async createEmployee(employeeData: Partial<Employee>): Promise<Employee> {
    const response = await this.request<Employee>('/v1/employees', {
      method: 'POST',
      body: JSON.stringify(employeeData),
    });
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to create employee');
    }
    
    return response.data;
  }

  async updateEmployee(id: string, employeeData: Partial<Employee>): Promise<Employee> {
    const response = await this.request<Employee>(`/v1/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(employeeData),
    });
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to update employee');
    }
    
    return response.data;
  }

  async deleteEmployee(id: string): Promise<void> {
    const response = await this.request(`/v1/employees/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete employee');
    }
  }

  // Employee Status Management
  async terminateEmployee(id: string, terminationData: {
    termination_date: Date;
    termination_reason: string;
  }): Promise<void> {
    const response = await this.request(`/v1/employees/${id}/terminate`, {
      method: 'PUT',
      body: JSON.stringify(terminationData),
    });
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to terminate employee');
    }
  }

  async activateEmployee(id: string, reason?: string): Promise<void> {
    const response = await this.request(`/v1/employees/${id}/activate`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to activate employee');
    }
  }

  async suspendEmployee(id: string, suspensionData: {
    reason: string;
    suspension_end_date?: Date;
  }): Promise<void> {
    const response = await this.request(`/v1/employees/${id}/suspend`, {
      method: 'PUT',
      body: JSON.stringify(suspensionData),
    });
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to suspend employee');
    }
  }

  async completeProbation(id: string): Promise<void> {
    const response = await this.request(`/v1/employees/${id}/complete-probation`, {
      method: 'PUT',
    });
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to complete probation');
    }
  }

  // Compensation Management
  async getEmployeeCompensation(id: string): Promise<any> {
    const response = await this.request(`/v1/employees/${id}/compensation`);
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch compensation');
    }
    
    return response.data;
  }

  async updateEmployeeCompensation(id: string, compensationData: any): Promise<any> {
    const response = await this.request(`/v1/employees/${id}/compensation`, {
      method: 'PUT',
      body: JSON.stringify(compensationData),
    });
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to update compensation');
    }
    
    return response.data;
  }

  async getSalaryHistory(id: string): Promise<EmployeeSalaryHistory[]> {
    const response = await this.request<EmployeeSalaryHistory[]>(`/v1/employees/${id}/salary-history`);
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch salary history');
    }
    
    return response.data;
  }

  async requestSalaryChange(id: string, salaryData: any): Promise<any> {
    const response = await this.request(`/v1/employees/${id}/salary-change-request`, {
      method: 'POST',
      body: JSON.stringify(salaryData),
    });
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to request salary change');
    }
    
    return response.data;
  }

  // Bank & Tax Details
  async getBankDetails(id: string): Promise<EmployeeBankDetails> {
    const response = await this.request<EmployeeBankDetails>(`/v1/employees/${id}/bank-details`);
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch bank details');
    }
    
    return response.data;
  }

  async updateBankDetails(id: string, bankData: Partial<EmployeeBankDetails>): Promise<EmployeeBankDetails> {
    const response = await this.request<EmployeeBankDetails>(`/v1/employees/${id}/bank-details`, {
      method: 'PUT',
      body: JSON.stringify(bankData),
    });
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to update bank details');
    }
    
    return response.data;
  }

  async getTaxInfo(id: string): Promise<EmployeeTaxInfo> {
    const response = await this.request<EmployeeTaxInfo>(`/v1/employees/${id}/tax-info`);
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch tax info');
    }
    
    return response.data;
  }

  async updateTaxInfo(id: string, taxData: Partial<EmployeeTaxInfo>): Promise<EmployeeTaxInfo> {
    const response = await this.request<EmployeeTaxInfo>(`/v1/employees/${id}/tax-info`, {
      method: 'PUT',
      body: JSON.stringify(taxData),
    });
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to update tax info');
    }
    
    return response.data;
  }

  // Skills & Certifications
  async getSkills(id: string): Promise<EmployeeSkill[]> {
    const response = await this.request<EmployeeSkill[]>(`/v1/employees/${id}/skills`);
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch skills');
    }
    
    return response.data;
  }

  async addSkill(id: string, skillData: Partial<EmployeeSkill>): Promise<EmployeeSkill> {
    const response = await this.request<EmployeeSkill>(`/v1/employees/${id}/skills`, {
      method: 'POST',
      body: JSON.stringify(skillData),
    });
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to add skill');
    }
    
    return response.data;
  }

  async updateSkill(id: string, skillId: string, skillData: Partial<EmployeeSkill>): Promise<EmployeeSkill> {
    const response = await this.request<EmployeeSkill>(`/v1/employees/${id}/skills/${skillId}`, {
      method: 'PUT',
      body: JSON.stringify(skillData),
    });
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to update skill');
    }
    
    return response.data;
  }

  async removeSkill(id: string, skillId: string): Promise<void> {
    const response = await this.request(`/v1/employees/${id}/skills/${skillId}`, {
      method: 'DELETE',
    });
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to remove skill');
    }
  }

  async getCertifications(id: string): Promise<EmployeeCertification[]> {
    const response = await this.request<EmployeeCertification[]>(`/v1/employees/${id}/certifications`);
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch certifications');
    }
    
    return response.data;
  }

  async addCertification(id: string, certData: Partial<EmployeeCertification>): Promise<EmployeeCertification> {
    const response = await this.request<EmployeeCertification>(`/v1/employees/${id}/certifications`, {
      method: 'POST',
      body: JSON.stringify(certData),
    });
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to add certification');
    }
    
    return response.data;
  }

  async updateCertification(id: string, certId: string, certData: Partial<EmployeeCertification>): Promise<EmployeeCertification> {
    const response = await this.request<EmployeeCertification>(`/v1/employees/${id}/certifications/${certId}`, {
      method: 'PUT',
      body: JSON.stringify(certData),
    });
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to update certification');
    }
    
    return response.data;
  }

  async removeCertification(id: string, certId: string): Promise<void> {
    const response = await this.request(`/v1/employees/${id}/certifications/${certId}`, {
      method: 'DELETE',
    });
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to remove certification');
    }
  }

  // Document Management
  async getDocuments(id: string): Promise<EmployeeDocument[]> {
    const response = await this.request<EmployeeDocument[]>(`/v1/employees/${id}/documents`);
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch documents');
    }
    
    return response.data;
  }

  async uploadDocument(
    id: string,
    file: File,
    documentType: string,
    description?: string,
    tags?: string[]
  ): Promise<EmployeeDocument> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    if (description) formData.append('description', description);
    if (tags) formData.append('tags', JSON.stringify(tags));

    const token = localStorage.getItem('access_token');
    
    const response = await fetch(`${API_BASE_URL}/v1/employees/${id}/documents`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to upload document');
    }

    return data.data;
  }

  async downloadDocument(id: string, docId: string): Promise<Blob> {
    const token = localStorage.getItem('access_token');
    
    const response = await fetch(`${API_BASE_URL}/v1/employees/${id}/documents/${docId}`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error('Failed to download document');
    }

    return response.blob();
  }

  async deleteDocument(id: string, docId: string): Promise<void> {
    const response = await this.request(`/v1/employees/${id}/documents/${docId}`, {
      method: 'DELETE',
    });
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete document');
    }
  }

  // Benefits Management
  async getBenefits(id: string): Promise<EmployeeBenefit[]> {
    const response = await this.request<EmployeeBenefit[]>(`/v1/employees/${id}/benefits`);
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch benefits');
    }
    
    return response.data;
  }

  async addBenefit(id: string, benefitData: Partial<EmployeeBenefit>): Promise<EmployeeBenefit> {
    const response = await this.request<EmployeeBenefit>(`/v1/employees/${id}/benefits`, {
      method: 'POST',
      body: JSON.stringify(benefitData),
    });
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to add benefit');
    }
    
    return response.data;
  }

  async updateBenefit(id: string, benefitId: string, benefitData: Partial<EmployeeBenefit>): Promise<EmployeeBenefit> {
    const response = await this.request<EmployeeBenefit>(`/v1/employees/${id}/benefits/${benefitId}`, {
      method: 'PUT',
      body: JSON.stringify(benefitData),
    });
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to update benefit');
    }
    
    return response.data;
  }

  async removeBenefit(id: string, benefitId: string): Promise<void> {
    const response = await this.request(`/v1/employees/${id}/benefits/${benefitId}`, {
      method: 'DELETE',
    });
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to remove benefit');
    }
  }

  // Organization Chart
  async getOrganizationChart(): Promise<any[]> {
    const response = await this.request<any[]>('/v1/employees/org-chart');
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch organization chart');
    }
    
    return response.data;
  }

  // Bulk Operations
  async bulkImport(data: any[], updateExisting = false): Promise<BulkOperationResult> {
    const response = await this.request<BulkOperationResult>('/v1/employees/bulk-import', {
      method: 'POST',
      body: JSON.stringify({ data, update_existing: updateExisting }),
    });
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to import employees');
    }
    
    return response.data;
  }

  async bulkExport(filters: EmployeeSearchFilters = {}): Promise<Blob> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, v));
        } else {
          queryParams.append(key, value.toString());
        }
      }
    });

    const token = localStorage.getItem('access_token');
    
    const response = await fetch(`${API_BASE_URL}/v1/employees/bulk-export?${queryParams.toString()}`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error('Failed to export employees');
    }

    return response.blob();
  }

  // Audit & Compliance
  async getAuditLogs(id: string): Promise<any[]> {
    const response = await this.request<any[]>(`/v1/employees/${id}/audit-logs`);
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch audit logs');
    }
    
    return response.data;
  }

  async getExpiringCertifications(daysAhead = 30): Promise<any[]> {
    const response = await this.request<any[]>(`/v1/employees/alerts?days_ahead=${daysAhead}`);
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch expiring certifications');
    }
    
    return response.data;
  }
}

export const employeeApi = new EmployeeApiClient();