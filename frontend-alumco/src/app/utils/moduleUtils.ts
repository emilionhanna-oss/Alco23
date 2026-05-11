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
