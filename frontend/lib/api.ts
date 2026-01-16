import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  ResearchSession,
  ResearchHistoryResponse,
  CreateResearchRequest,
  ContinueResearchRequest,
  ResearchFile,
} from '@/types';

// API base URL - can be configured via environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

// Function to get CSRF token from cookies
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // For Django session/csrf cookies
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
});

// Request interceptor to add CSRF token and auth token
apiClient.interceptors.request.use(
  (config) => {
    // Add CSRF token from cookie
    const csrfToken = getCookie('csrftoken');
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
    
    // Add auth token from localStorage if available
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login or clear auth
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        // Optionally redirect to login
      }
    }
    return Promise.reject(error);
  }
);

// API functions
export const api = {
  // Get CSRF token
  getCsrfToken: async (): Promise<void> => {
    await apiClient.get('/csrf/');
  },

  // Research endpoints
  startResearch: async (data: CreateResearchRequest): Promise<ResearchSession> => {
    // Ensure CSRF token is set
    await api.getCsrfToken();
    const response = await apiClient.post('/research/start', data);
    return response.data;
  },

  getResearchDetails: async (researchId: string): Promise<ResearchSession> => {
    const response = await apiClient.get(`/research/${researchId}`);
    return response.data;
  },

  getResearchHistory: async (page: number = 1, pageSize: number = 20): Promise<ResearchHistoryResponse> => {
    const response = await apiClient.get('/research/history', {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },

  continueResearch: async (researchId: string, data: ContinueResearchRequest): Promise<ResearchSession> => {
    const response = await apiClient.post(`/research/${researchId}/continue`, data);
    return response.data;
  },

  // File endpoints
  uploadFile: async (researchId: string, file: File): Promise<ResearchFile> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post(`/research/${researchId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getFiles: async (researchId: string): Promise<ResearchFile[]> => {
    const response = await apiClient.get(`/research/${researchId}/files/`);
    return response.data;
  },

  getFileDetails: async (researchId: string, fileId: string): Promise<ResearchFile> => {
    const response = await apiClient.get(`/research/${researchId}/files/${fileId}/`);
    return response.data;
  },

  deleteFile: async (researchId: string, fileId: string): Promise<void> => {
    await apiClient.delete(`/research/${researchId}/files/${fileId}/`);
  },
};

export default apiClient;

