import { apiClient } from './client';
import { ApiResponse, AuthTokens, RegisterData, LoginData, User } from '@/types';

export const authApi = {
  register: async (data: RegisterData): Promise<ApiResponse<AuthTokens>> => {
    return apiClient.post('/api/auth/register', data);
  },

  login: async (data: LoginData): Promise<ApiResponse<AuthTokens>> => {
    return apiClient.post('/api/auth/login', data);
  },

  logout: async (refreshToken: string): Promise<ApiResponse> => {
    return apiClient.post('/api/auth/logout', { refreshToken });
  },

  refreshToken: async (refreshToken: string): Promise<ApiResponse<{ accessToken: string }>> => {
    return apiClient.post('/api/auth/refresh-token', { refreshToken });
  },

  getCurrentUser: async (): Promise<ApiResponse<{ user: User }>> => {
    return apiClient.get('/api/auth/me');
  },
};
