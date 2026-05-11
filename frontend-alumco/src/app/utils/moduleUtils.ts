/**
 * Utilidades compartidas para módulos de curso.
 * Usadas por AdminGestionCapacitaciones y AdminEditorCurso.
 */

import type { ModuloTipo, ModuloContenido, LecturaContenido } from '../types/moduleTypes';
import { PRACTICA_PRESENCIAL_MESSAGE } from '../types/moduleTypes';

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    !!value &&
    typeof value === 'object' &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
  );
}

export function coerceContenidoForTipo(nextTipo: ModuloTipo, prev: ModuloContenido): ModuloContenido {
  if (nextTipo === 'practica_presencial') return PRACTICA_PRESENCIAL_MESSAGE;

  if (nextTipo === 'quiz') {
    if (Array.isArray(prev)) return prev;
    // si venía de string/obj, iniciamos quiz vacío
    return [];
  }

  if (nextTipo === 'lectura') {
    if (isPlainObject(prev)) {
      return {
        archivoNombre: typeof prev.archivoNombre === 'string' ? prev.archivoNombre : undefined,
        instrucciones: typeof prev.instrucciones === 'string' ? prev.instrucciones : undefined,
      } satisfies LecturaContenido;
    }
    if (typeof prev === 'string') return { instrucciones: prev };
    if (Array.isArray(prev)) return { instrucciones: '' };
    return { instrucciones: '' };
  }

  // video
  if (typeof prev === 'string') return prev;
  if (isPlainObject(prev) && typeof prev.instrucciones === 'string') return prev.instrucciones;
  return '';
}

/**
 * Transforma un link de YouTube normal en un link de "Embed" compatible con iframes.
 * También usa el dominio youtube-nocookie para mejor compatibilidad.
 */
export function transformYoutubeUrl(url: string): string {
  if (!url) return url;
  const trimmed = url.trim();
  
  // 1. Si ya es un embed, solo asegurar que use youtube-nocookie
  if (trimmed.includes('youtube.com/embed/') || trimmed.includes('youtube-nocookie.com/embed/')) {
    const idMatch = trimmed.match(/\/embed\/([^?#&]+)/);
    if (idMatch) return `https://www.youtube-nocookie.com/embed/${idMatch[1]}`;
    return trimmed;
  }

  // 2. Regex robusta para capturar el ID de 11 caracteres
  // Soporta: watch?v=ID, v=ID, youtu.be/ID, youtube.com/v/ID, youtube.com/vi/ID, etc.
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = trimmed.match(regExp);

  if (match && match[1]) {
    return `https://www.youtube-nocookie.com/embed/${match[1]}`;
  }

  return trimmed;
}
