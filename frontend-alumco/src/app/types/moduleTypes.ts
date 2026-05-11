/**
 * Tipos compartidos para módulos de curso y quiz.
 * Usados por AdminGestionCapacitaciones y AdminEditorCurso.
 */

export const PRACTICA_PRESENCIAL_MESSAGE =
  'Se le ha notificado a tu instructor que has finalizado la parte teórica. Por favor, espera a ser contactado para coordinar tu evaluación práctica presencial';

export type ModuloTipo = 'video' | 'lectura' | 'quiz' | 'practica_presencial';

export type LecturaContenido = {
  archivoNombre?: string;
  instrucciones?: string;
};

export type QuizTipoPregunta = 'seleccion_multiple' | 'respuesta_escrita';

export type QuizOpcion = {
  texto: string;
  correcta: boolean;
};

export type QuizPregunta = {
  tipo: QuizTipoPregunta;
  pregunta: string;
  opciones?: QuizOpcion[];
  respuestaModelo?: string;
};

export type ModuloContenido = string | LecturaContenido | QuizPregunta[];

export type EditModulo = {
  tituloModulo: string;
  tipo: ModuloTipo;
  contenido: ModuloContenido;
  materialDescargable?: string | null;
};
