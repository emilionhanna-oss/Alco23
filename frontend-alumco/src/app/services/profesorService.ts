// src/services/profesorService.ts
import { API_CONFIG, buildApiUrl } from '../config/api.config';

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

interface MiCurso {
  id: string;
  titulo: string;
  descripcion: string;
  imagen: string;
  progreso: number;
  instructorId: string;
  alumnosInscritos: string[];
}

interface Estudiante {
  id: string;
  nombreCompleto: string;
  nombre: string;
  email: string;
  inscritoEn: string;
  modulosCompletados: number;
  totalModulos: number;
  progreso: number;
}

interface PracticaPendiente {
  id: string;
  usuarioId: string;
  moduloId: string;
  estado: string;
  notas: string | null;
  evaluadoEn: string | null;
  estudiante: {
    nombreCompleto: string;
    email: string;
  };
  moduloTitulo: string;
}

export const profesorService = {
  async getMisCursos() {
    try {
      const response = await fetchWithTimeout(
        buildApiUrl('/api/profesor/mis-cursos'),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        return { success: true, data: data as MiCurso[] };
      }

      return { success: false, error: 'No se pudieron obtener los cursos' };
    } catch (error) {
      console.error('Error al obtener cursos del profesor:', error);
      return { success: false, error: 'Error de conexión' };
    }
  },

  async getEstudiantes(cursoId: string) {
    try {
      const response = await fetchWithTimeout(
        buildApiUrl(`/api/profesor/mis-cursos/${cursoId}/estudiantes`),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        return { success: true, data: data as Estudiante[] };
      }

      return { success: false, error: 'No se pudieron obtener los estudiantes' };
    } catch (error) {
      console.error('Error al obtener estudiantes:', error);
      return { success: false, error: 'Error de conexión' };
    }
  },

  async getPracticasPendientes(cursoId: string) {
    try {
      const response = await fetchWithTimeout(
        buildApiUrl(`/api/profesor/mis-cursos/${cursoId}/practicas-pendientes`),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        return { success: true, data: data as PracticaPendiente[] };
      }

      return { success: false, error: 'No se pudieron obtener las prácticas' };
    } catch (error) {
      console.error('Error al obtener prácticas:', error);
      return { success: false, error: 'Error de conexión' };
    }
  },

  async autorizarPractica(practicaId: string, estado: string, notas?: string) {
    try {
      const response = await fetchWithTimeout(
        buildApiUrl(`/api/profesor/practicas/${practicaId}/autorizar`),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
          },
          body: JSON.stringify({ estado, notas: notas || null }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        return { success: true, data };
      }

      return { success: false, error: 'No se pudo autorizar la práctica' };
    } catch (error) {
      console.error('Error al autorizar práctica:', error);
      return { success: false, error: 'Error de conexión' };
    }
  },
};
