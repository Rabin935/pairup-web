import axios from 'axios';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:5000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to every request
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle responses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userInfo');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// Auth API endpoints
export const authAPI = {
  login: (email: string, password: string) =>
    apiClient.post('api/auth/login', { email, password }),
  register: (data: any) =>
    apiClient.post('api/auth/register', data),
  forgotPassword: (email: string) =>
    apiClient.post('api/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) =>
    apiClient.post(`api/auth/reset-password/${token}`, { newPassword }),
  getUserProfile: (id: string) =>
    apiClient.get(`/auth/${id}`),
  updateUserProfile: (id: string, data: FormData) =>
    apiClient.put(`/auth/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  createUser: (data: FormData) =>
    apiClient.post('/auth/user', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// Users API endpoints (admin)
export const usersAPI = {
  getUsers: () =>
    apiClient.get('/users'),
  getUserById: (id: string) =>
    apiClient.get(`/users/${id}`),
  updateUser: (id: string, data: any) =>
    apiClient.put(`/users/${id}`, data),
  deleteUser: (id: string) =>
    apiClient.delete(`/users/${id}`),
};
