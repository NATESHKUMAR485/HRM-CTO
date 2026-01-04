import { Department } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any[];
}

class DepartmentApiClient {
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

  async getDepartments(): Promise<Department[]> {
    const response = await this.request<Department[]>('/v1/departments');
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch departments');
    }
    
    return response.data;
  }

  async getDepartment(id: string): Promise<Department> {
    const response = await this.request<Department>(`/v1/departments/${id}`);
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch department');
    }
    
    return response.data;
  }

  async createDepartment(departmentData: Partial<Department>): Promise<Department> {
    const response = await this.request<Department>('/v1/departments', {
      method: 'POST',
      body: JSON.stringify(departmentData),
    });
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to create department');
    }
    
    return response.data;
  }

  async updateDepartment(id: string, departmentData: Partial<Department>): Promise<Department> {
    const response = await this.request<Department>(`/v1/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(departmentData),
    });
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to update department');
    }
    
    return response.data;
  }

  async deleteDepartment(id: string): Promise<void> {
    const response = await this.request(`/v1/departments/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete department');
    }
  }

  async getDepartmentHierarchy(): Promise<any[]> {
    const response = await this.request<any[]>('/v1/departments/hierarchy');
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch department hierarchy');
    }
    
    return response.data;
  }

  async getDepartmentEmployees(id: string): Promise<any[]> {
    const response = await this.request<any[]>(`/v1/departments/${id}/employees`);
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch department employees');
    }
    
    return response.data;
  }

  async transferEmployees(id: string, employeeIds: string[], reason: string): Promise<void> {
    const response = await this.request(`/v1/departments/${id}/transfer-employees`, {
      method: 'POST',
      body: JSON.stringify({ 
        employee_ids: employeeIds,
        reason 
      }),
    });
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to transfer employees');
    }
  }
}

export const departmentApi = new DepartmentApiClient();