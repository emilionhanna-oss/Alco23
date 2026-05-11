/**
 * Servicio API centralizado con manejo de errores silencioso.
 *
 * Nota: los cursos se cargan SOLO desde el backend (no hay fallback a mocks).
 */

import { API_CONFIG, buildApiUrl } from '../config/api.config';
import { 
  ApiResponse, 
  ApiError, 
  User, 
  LoginResponse, 
  RegisterResponse,
  Course,
  CourseDetail,
  CursoBackend 
} from '../types';


/**
 * Wrapper de fetch con timeout configurable
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = API_CONFIG.FETCH_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Servicio de Autenticación
 */
export const authService = {
  /**
   * Intenta hacer login con el servidor real
   * Si falla, retorna un error pero mantiene la app funcionando
   */
  async login(email: string, password: string): Promise<ApiResponse<LoginResponse>> {
    try {
      console.log('🔐 Intentando login con servidor...');
      
      const response = await fetchWithTimeout(
        buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.LOGIN),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Login exitoso desde servidor');
        return {
          success: true,
          data: data as LoginResponse,
        };
      } else {
        console.warn('⚠️ Credenciales inválidas en servidor:', data.mensaje);
        return {
          success: false,
          error: data.mensaje || 'Credenciales inválidas',
        };
      }
    } catch (error) {
      console.error(
        '❌ Error conectando con servidor:',
        error instanceof Error ? error.message : 'Error desconocido'
      );
      
      return {
        success: false,
        error: 'No hay conexión con el servidor. Por favor, verifica que esté encendido.',
      };
    }
  },

  async getRegistrationSedes(): Promise<ApiResponse<string[]>> {
    try {
      const response = await fetchWithTimeout(buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.SEDES), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const body = await response.json();
        const sedes = Array.isArray(body?.sedes)
          ? body.sedes.map((s: unknown) => String(s))
          : [];
        return { success: true, data: sedes };
      }

      let message = `Error del servidor (${response.status}).`;
      try {
        const err = await response.json();
        message = (err?.mensaje as string) || message;
      } catch {
        // ignore
      }

      return { success: false, error: message };
    } catch {
      return {
        success: false,
        error: 'No se pudieron cargar las sedes. Verifica la conexión con el servidor.',
      };
    }
  },

  async register(payload: {
    nombreCompleto: string;
    rut: string;
    genero: 'femenino' | 'masculino' | 'otro';
    sede: string;
    email: string;
    password: string;
    confirmPassword: string;
  }): Promise<ApiResponse<RegisterResponse>> {
    try {
      console.log('✍️ Intentando registro...');

      const response = await fetchWithTimeout(
        buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.REGISTER),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          data: data as RegisterResponse,
        };
      }

      return {
        success: false,
        error: data?.mensaje || 'No se pudo completar el registro',
      };
    } catch (error) {
      console.error('❌ Error en registro:', error);
      return {
        success: false,
        error: 'No hay conexión con el servidor. Por favor, verifica que esté encendido.',
      };
    }
  },
};

/**
 * Servicio de Cursos
 */
export const courseService = {
  /**
   * Obtiene lista de cursos
   * Fuente de verdad: backend (API PostgreSQL).
   * Si el servidor falla, NO inventa cursos.
   */
  async getCourses(options: { all?: boolean } = {}): Promise<ApiResponse<Course[]>> {
    try {
      console.log('📚 Obteniendo lista de cursos...');

      const qs = options.all ? '?all=1' : '';

      const response = await fetchWithTimeout(
        buildApiUrl(`${API_CONFIG.ENDPOINTS.COURSES.LIST}${qs}`),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const normalized: Course[] = Array.isArray(data)
          ? (data as CursoBackend[]).map((curso) => ({
              id: String(curso.id),
              title: curso.titulo,
              description: curso.descripcion,
              image: curso.imagen
                ? curso.imagen.startsWith('http')
                  ? curso.imagen
                  : buildApiUrl(curso.imagen)
                : undefined,
              progress: curso.progreso,
              instructorId: curso.instructorId,
              alumnosInscritos: Array.isArray(curso.alumnosInscritos)
                ? curso.alumnosInscritos.map(String)
                : [],
            }))
          : [];
        console.log('✅ Cursos obtenidos del servidor');
        return {
          success: true,
          data: normalized,
        };
      } else {
        let message = `Error del servidor (${response.status}).`;
        try {
          const err = await response.json();
          message = (err?.mensaje as string) || message;
        } catch {
          // ignore JSON parse errors
        }
        return {
          success: false,
          error: message,
        };
      }
    } catch (error) {
      console.warn(
        '⚠️ No se pudo obtener cursos del servidor:',
        error instanceof Error ? error.message : 'Error desconocido'
      );

      return {
        success: false,
        error: 'No hay conexión con el servidor de cursos. Verifica que el backend esté encendido.',
      };
    }
  },

  /**
   * Obtiene detalle de un curso
   * Fuente de verdad: backend (API PostgreSQL).
   * Si falla, NO inventa cursos.
   */
  async getCourseDetail(courseId: string): Promise<ApiResponse<CourseDetail>> {
    try {
      console.log(`📖 Obteniendo curso ${courseId}...`);

      const response = await fetchWithTimeout(
        buildApiUrl(API_CONFIG.ENDPOINTS.COURSES.DETAIL(courseId)),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Curso obtenido del servidor');
        return {
          success: true,
          data: {
            id: String((data as CursoBackend)?.id ?? courseId),
            title: (data as CursoBackend)?.titulo,
            image: (data as CursoBackend)?.imagen
              ? String((data as CursoBackend)?.imagen).startsWith('http')
                ? (data as CursoBackend)?.imagen
                : buildApiUrl(String((data as CursoBackend)?.imagen))
              : undefined,
            progress: (data as CursoBackend)?.progreso,
            description: (data as CursoBackend)?.descripcion,
            instructorId: (data as CursoBackend)?.instructorId,
            alumnosInscritos: Array.isArray((data as CursoBackend)?.alumnosInscritos)
              ? (data as CursoBackend)?.alumnosInscritos?.map(String)
              : [],
            modulos: (data as CursoBackend)?.modulos,
          } as CourseDetail,
        };
      } else {
        let message = `Error del servidor (${response.status}).`;
        try {
          const err = await response.json();
          message = (err?.mensaje as string) || message;
        } catch {
          // ignore JSON parse errors
        }
        return {
          success: false,
          error: message,
        };
      }
    } catch (error) {
      console.warn(
        `⚠️ No se pudo obtener curso ${courseId} del servidor`
      );

      return {
        success: false,
        error: 'No hay conexión con el servidor de cursos. Verifica que el backend esté encendido.',
      };
    }
  },

  async createCourse(payload: {
    titulo?: string;
    descripcion?: string;
    imagen?: string;
  }): Promise<ApiResponse<Course>> {
    try {
      const response = await fetchWithTimeout(buildApiUrl(API_CONFIG.ENDPOINTS.COURSES.LIST), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const body = await response.json();
        const curso = (body?.curso ?? body) as CursoBackend;

        const normalized: Course = {
          id: String(curso?.id),
          title: curso?.titulo,
          description: curso?.descripcion,
          image: curso?.imagen
            ? String(curso.imagen).startsWith('http')
              ? curso.imagen
              : buildApiUrl(String(curso.imagen))
            : undefined,
          progress: curso?.progreso,
          instructorId: (curso as any)?.instructorId,
          alumnosInscritos: Array.isArray((curso as any)?.alumnosInscritos)
            ? (curso as any).alumnosInscritos.map(String)
            : [],
        };

        return { success: true, data: normalized };
      }

      let message = `Error del servidor (${response.status}).`;
      try {
        const err = await response.json();
        message = (err?.mensaje as string) || message;
      } catch {
        // ignore
      }

      return { success: false, error: message };
    } catch {
      return {
        success: false,
        error: 'No hay conexión con el servidor. Verifica que el backend esté encendido.',
      };
    }
  },

  async updateCourse(
    courseId: string,
    payload: {
      titulo?: string;
      descripcion?: string;
      imagen?: string;
      modulos?: Array<{ tituloModulo: string; tipo: string; contenido: unknown }>;
    }
  ): Promise<ApiResponse<Course>> {
    try {
      const response = await fetchWithTimeout(
        buildApiUrl(API_CONFIG.ENDPOINTS.COURSES.UPDATE(courseId)),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        const body = await response.json();
        const curso = (body?.curso ?? body) as CursoBackend;

        const normalized: Course = {
          id: String(curso?.id ?? courseId),
          title: curso?.titulo,
          description: curso?.descripcion,
          image: curso?.imagen
            ? String(curso.imagen).startsWith('http')
              ? curso.imagen
              : buildApiUrl(String(curso.imagen))
            : undefined,
          progress: curso?.progreso,
          instructorId: (curso as any)?.instructorId,
          alumnosInscritos: Array.isArray((curso as any)?.alumnosInscritos)
            ? (curso as any).alumnosInscritos.map(String)
            : [],
        };

        return { success: true, data: normalized };
      }

      let message = `Error del servidor (${response.status}).`;
      try {
        const err = await response.json();
        message = (err?.mensaje as string) || message;
      } catch {
        // ignore
      }

      return { success: false, error: message };
    } catch {
      return {
        success: false,
        error: 'No hay conexión con el servidor. Verifica que el backend esté encendido.',
      };
    }
  },

  async deleteCourse(courseId: string): Promise<ApiResponse<{ id: string }>> {
    try {
      const response = await fetchWithTimeout(buildApiUrl(API_CONFIG.ENDPOINTS.COURSES.UPDATE(courseId)), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });

      if (response.ok) {
        const body = await response.json();
        const id = String(body?.id ?? courseId);
        return { success: true, data: { id } };
      }

      let message = `Error del servidor (${response.status}).`;
      try {
        const err = await response.json();
        message = (err?.mensaje as string) || message;
      } catch {
        // ignore
      }

      return { success: false, error: message };
    } catch {
      return {
        success: false,
        error: 'No hay conexión con el servidor. Verifica que el backend esté encendido.',
      };
    }
  },

  async assignStudentsToCourse(
    courseId: string,
    alumnosInscritos: string[]
  ): Promise<ApiResponse<Course>> {
    try {
      const response = await fetchWithTimeout(
        buildApiUrl(API_CONFIG.ENDPOINTS.COURSES.ASSIGN_STUDENTS(courseId)),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          },
          body: JSON.stringify({ alumnosInscritos }),
        }
      );

      if (response.ok) {
        const body = await response.json();
        const curso = (body?.curso ?? body) as CursoBackend;

        const normalized: Course = {
          id: String(curso?.id ?? courseId),
          title: curso?.titulo,
          description: curso?.descripcion,
          image: curso?.imagen
            ? String(curso.imagen).startsWith('http')
              ? curso.imagen
              : buildApiUrl(String(curso.imagen))
            : undefined,
          progress: curso?.progreso,
          instructorId: (curso as any)?.instructorId,
          alumnosInscritos: Array.isArray((curso as any)?.alumnosInscritos)
            ? (curso as any).alumnosInscritos.map(String)
            : [],
        };

        return { success: true, data: normalized };
      }

      let message = `Error del servidor (${response.status}).`;
      try {
        const err = await response.json();
        message = (err?.mensaje as string) || message;
      } catch {
        // ignore
      }

      return { success: false, error: message };
    } catch (error) {
      return {
        success: false,
        error: 'No hay conexión con el servidor. Verifica que el backend esté encendido.',
      };
    }
  },

  /**
   * Sube un archivo de material para un módulo
   */
  async uploadModuleMaterial(file: File): Promise<ApiResponse<{ url: string }>> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(buildApiUrl('/api/cursos/upload-material'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (response.ok && data.success) {
        return { success: true, data: { url: data.url } };
      }
      return { success: false, error: data.error || 'Error al subir archivo' };
    } catch (error) {
      console.error(error);
      return { success: false, error: 'Error de conexión al subir archivo' };
    }
  },

  /**
   * Solicita evaluación de práctica presencial
   */
  async solicitarPractica(moduloId: number): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(buildApiUrl(`/api/cursos/modulos/${moduloId}/solicitar-practica`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        return { success: true };
      }
      return { success: false, error: 'No se pudo enviar la solicitud' };
    } catch (error) {
      console.error(error);
      return { success: false, error: 'Error de conexión' };
    }
  },
};

/**
 * Servicio de Usuario
 */
export const userService = {
  async getUsers(): Promise<ApiResponse<User[]>> {
    try {
      const response = await fetchWithTimeout(
        buildApiUrl(API_CONFIG.ENDPOINTS.USERS.LIST),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        return { success: true, data: data as User[] };
      }

      let message = `Error del servidor (${response.status}).`;
      try {
        const err = await response.json();
        message = (err?.mensaje as string) || message;
      } catch {
        // ignore
      }

      return { success: false, error: message };
    } catch {
      return {
        success: false,
        error: 'No hay conexión con el servidor. Verifica que el backend esté encendido.',
      };
    }
  },

  async updateUser(userId: string, updates: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const response = await fetchWithTimeout(
        buildApiUrl(API_CONFIG.ENDPOINTS.USERS.UPDATE(userId)),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          },
          body: JSON.stringify(updates),
        }
      );

      if (response.ok) {
        const body = await response.json();
        const usuario = (body?.usuario ?? body) as User;
        return { success: true, data: usuario };
      }

      let message = `Error del servidor (${response.status}).`;
      try {
        const err = await response.json();
        message = (err?.mensaje as string) || message;
      } catch {
        // ignore
      }

      return { success: false, error: message };
    } catch {
      return {
        success: false,
        error: 'No hay conexión con el servidor. Verifica que el backend esté encendido.',
      };
    }
  },

  /**
   * Obtiene perfil de usuario
   * Si falla, intenta obtener datos del localStorage o usa mock
   */
  async getProfile(): Promise<ApiResponse<User>> {
    try {
      console.log('👤 Obteniendo perfil de usuario...');
      
      const response = await fetchWithTimeout(
        buildApiUrl(API_CONFIG.ENDPOINTS.USER.PROFILE),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Perfil obtenido del servidor');
        return {
          success: true,
          data: data as User,
        };
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.warn('⚠️ No se pudo obtener perfil, usando datos almacenados');
      
      // Intenta obtener del localStorage
      try {
        const savedUser = localStorage.getItem('usuario');
        if (savedUser) {
          const user = JSON.parse(savedUser);
          return {
            success: true,
            data: user,
            message: 'Datos del usuario almacenados localmente',
          };
        }
      } catch (parseError) {
        console.error('Error leyendo usuario del localStorage:', parseError);
      }

      return {
        success: false,
        error: 'No se pudo obtener el perfil desde el servidor ni desde el almacenamiento local.',
      };
    }
  },

  /**
   * Actualiza perfil de usuario
   * Si falla, al menos guarda localmente
   */
  async updateProfile(updates: Partial<User>): Promise<ApiResponse<User>> {
    try {
      console.log('✏️ Actualizando perfil...');
      
      const response = await fetchWithTimeout(
        buildApiUrl(API_CONFIG.ENDPOINTS.USER.UPDATE),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          },
          body: JSON.stringify(updates),
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Perfil actualizado en servidor');
        localStorage.setItem('usuario', JSON.stringify(data));
        return {
          success: true,
          data: data as User,
        };
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.warn(
        '⚠️ No se pudo actualizar en servidor, guardando localmente:',
        error instanceof Error ? error.message : 'Error desconocido'
      );
      
      // Al menos guarda localmente
      try {
        const currentUser = JSON.parse(localStorage.getItem('usuario') || '{}');
        const updatedUser = { ...currentUser, ...updates };
        localStorage.setItem('usuario', JSON.stringify(updatedUser));
        
        return {
          success: true,
          data: updatedUser,
          message: 'Guardado localmente (servidor no disponible)',
        };
      } catch (parseError) {
        return {
          success: false,
          error: 'No se pudo guardar los cambios',
        };
      }
    }
  },
};

export default {
  auth: authService,
  courses: courseService,
  user: userService,
};
