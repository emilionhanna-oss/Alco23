/**
 * Tipos TypeScript con propiedades opcionales para datos en transición
 */

// ============ USUARIO ============
export interface User {
  id?: string;
  email: string;
  name?: string;
  rol?: string[];
  nombre?: string;
  nombreCompleto?: string;
  genero?: 'femenino' | 'masculino' | 'no_binario' | 'otro';
  avatar?: string;
  rut?: string;
  sede?: string;
  cargo?: string;
  estado?: 'pendiente' | 'activo' | 'vencido';
  fechaRegistro?: string | null;
  fechaExpiracion?: string | null;
  firmaTexto?: string;
  firmaImagenDataUrl?: string;
}

// ============ AUTENTICACIÓN ============
export interface LoginResponse {
  mensaje?: string;
  usuario?: User;
  token?: string;
}

export interface RegisterResponse {
  mensaje?: string;
  usuario?: User;
  token?: string;
  id?: string;
}

// ============ CURSOS ============
export interface Course {
  id?: string;
  title?: string;
  description?: string;
  instructor?: string;
  duration?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  enrolledStudents?: number;
  image?: string;
  progress?: number; // 0-100
  alumnosInscritos?: string[];
  instructorId?: string;
}

export interface CourseDetail extends Course {
  content?: string;
  modules?: Module[];
  modulos?: CursoModulo[];
  students?: User[];
}

// ============ CURSOS (BACKEND - FUENTE DE VERDAD) ============
export type CursoModuloTipo = 'video' | 'lectura' | 'quiz' | 'practica_presencial';

export interface CursoModulo {
  id?: number;
  tituloModulo?: string;
  tipo?: CursoModuloTipo;
  contenido?: unknown;
  materialDescargable?: string | null;
  completado?: boolean;
  practicaEstado?: 'pendiente' | 'aprobado' | 'rechazado' | null;
}

export interface CursoBackend {
  id: string;
  titulo: string;
  imagen?: string;
  progreso?: number; // 0-100
  descripcion: string;
  instructorId?: string;
  alumnosInscritos?: string[];
  modulos: CursoModulo[];
}

export interface Module {
  id?: string;
  title?: string;
  description?: string;
  lessons?: Lesson[];
}

export interface Lesson {
  id?: string;
  title?: string;
  content?: string;
  videoUrl?: string;
  completed?: boolean;
}

// ============ API RESPONSES ============
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  message: string;
  status?: number;
  originalError?: Error;
}
