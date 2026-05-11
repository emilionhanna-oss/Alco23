/**
 * Configuración centralizada del API.
 *
 * La URL base del backend se controla por variable de entorno:
 * - VITE_API_URL (opcional)
 * - Default: http://localhost:3000
 */

const normalizeBaseUrl = (url: string): string => url.replace(/\/+$/, '');

export const BACKEND_URL = normalizeBaseUrl(
  (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:3000'
);

export const API_CONFIG = {
  // URL base del backend
  BACKEND_URL,
  
  // Timeouts (en milisegundos)
  FETCH_TIMEOUT: 5000,
  
  // Endpoints
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/api/auth/login',
      REGISTER: '/api/auth/register',
      SEDES: '/api/auth/sedes',
      LOGOUT: '/api/auth/logout',
    },
    COURSES: {
      LIST: '/api/cursos',
      DETAIL: (id: string) => `/api/cursos/${id}`,
      UPDATE: (id: string) => `/api/cursos/${id}`,
      ASSIGN_STUDENTS: (id: string) => `/api/cursos/${id}/alumnos`,
    },
    USERS: {
      LIST: '/api/usuarios',
      UPDATE: (id: string) => `/api/usuarios/${id}`,
    },
    USER: {
      PROFILE: '/api/user/profile',
      UPDATE: '/api/user/profile',
    },
  },
};

/**
 * Construye la URL completa del endpoint
 */
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BACKEND_URL}${endpoint}`;
};
