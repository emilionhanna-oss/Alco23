// src/app/hooks/useQuizResponder.ts
import { useState, useEffect, useCallback } from 'react';

export interface QuizModulo {
  modulo_id: string;
  titulo: string;
  intento_id: string;
  intento_numero: number;
  preguntas: QuizPregunta[];
  tiempo_limite_minutos?: number;
  calificacion_minima?: number;
}

export interface QuizPregunta {
  id: string | number;
  tipo: 'seleccion_multiple' | 'respuesta_escrita';
  pregunta: string;
  opciones?: QuizOpcion[];
}

export interface QuizOpcion {
  id: string;
  texto: string;
}

export interface RespuestaUsuario {
  pregunta_id: string | number;
  respuesta_usuario: string;
}

export interface DetalleCalificacion {
  pregunta_id: string;
  pregunta: string;
  tipo: 'seleccion_multiple' | 'respuesta_escrita';
  respuesta_usuario: string | null;
  respuesta_correcta: string | null;
  es_correcta: boolean | null;
  opciones: QuizOpcion[];
  respuestaModelo?: string;
}

export interface ResultadoQuiz {
  intento_numero: number;
  puntuacion: number;
  estado: 'completado' | 'reprobado';
  aprobado: boolean;
  detalles_preguntas: DetalleCalificacion[];
  fecha_desbloq_temporal?: string | null;
  mensaje: string;
}

export interface Intento {
  intento_numero: number;
  puntuacion: number | null;
  estado: 'en_progreso' | 'completado' | 'reprobado' | 'bloqueado';
  completado_en: string | null;
  fecha_desbloq_temporal?: string | null;
}

type Etapa = 'cargando' | 'respondiendo' | 'enviando' | 'resultado' | 'bloqueado' | 'error';

export const useQuizResponder = (modulo_id: string) => {
  const [etapa, setEtapa] = useState<Etapa>('cargando');
  const [quiz, setQuiz] = useState<QuizModulo | null>(null);
  const [resultado, setResultado] = useState<ResultadoQuiz | null>(null);
  const [bloqueado_hasta, setBloqueadoHasta] = useState<Date | null>(null);
  const [intentos, setIntentos] = useState<Intento[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Obtener token del localStorage
  const getToken = useCallback(() => {
    return localStorage.getItem('token') || '';
  }, []);

  // Cargar quiz
  useEffect(() => {
    const cargarQuiz = async () => {
      setEtapa('cargando');
      setError(null);

      try {
        const token = getToken();
        const response = await fetch(`/api/quiz/modulos/${modulo_id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const data = await response.json();
          
          // Verificar si está bloqueado
          if (response.status === 403 && data.bloqueado_hasta) {
            setBloqueadoHasta(new Date(data.bloqueado_hasta));
            setEtapa('bloqueado');
            setError(data.mensaje || 'Quiz bloqueado temporalmente');
          } else {
            setError(data.error || `Error al cargar el quiz (${response.status})`);
            setEtapa('error');
          }
          return;
        }

        const quizData = await response.json();
        setQuiz(quizData);

        // Cargar historial de intentos
        const intentosResponse = await fetch(`/api/quiz/modulos/${modulo_id}/intentos`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (intentosResponse.ok) {
          const intentosData = await intentosResponse.json();
          setIntentos(intentosData.intentos || []);
        }

        setEtapa('respondiendo');
      } catch (err) {
        const mensaje = err instanceof Error ? err.message : 'Error desconocido';
        setError(mensaje);
        setEtapa('error');
      }
    };

    if (modulo_id) {
      cargarQuiz();
    }
  }, [modulo_id, getToken]);

  // Enviar respuestas
  const enviarRespuestas = useCallback(
    async (respuestas: RespuestaUsuario[], tiempo_utilizado_segundos?: number) => {
      if (!quiz) return;

      setEtapa('enviando');
      setError(null);

      try {
        const token = getToken();
        const response = await fetch(`/api/quiz/modulos/${modulo_id}/respuestas`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            intento_id: quiz.intento_id,
            respuestas,
            tiempo_utilizado_segundos,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Error al enviar respuestas');
        }

        const resultadoData: ResultadoQuiz = await response.json();
        setResultado(resultadoData);

        // Si está bloqueado, actualizar estado
        if (resultadoData.fecha_desbloq_temporal) {
          setBloqueadoHasta(new Date(resultadoData.fecha_desbloq_temporal));
        }

        setEtapa('resultado');
      } catch (err) {
        const mensaje = err instanceof Error ? err.message : 'Error al enviar respuestas';
        setError(mensaje);
        setEtapa('error');
      }
    },
    [quiz, modulo_id, getToken]
  );

  // Reintentar quiz
  const reintentar = useCallback(() => {
    setQuiz(null);
    setResultado(null);
    setError(null);
    setEtapa('cargando');

    // Recargar quiz
    const cargarQuiz = async () => {
      try {
        const token = getToken();
        const response = await fetch(`/api/quiz/modulos/${modulo_id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Error al cargar el quiz');
        }

        const quizData = await response.json();
        setQuiz(quizData);
        setEtapa('respondiendo');
      } catch (err) {
        const mensaje = err instanceof Error ? err.message : 'Error desconocido';
        setError(mensaje);
        setEtapa('error');
      }
    };

    cargarQuiz();
  }, [modulo_id, getToken]);

  return {
    etapa,
    quiz,
    resultado,
    bloqueado_hasta,
    intentos,
    error,
    enviarRespuestas,
    reintentar,
  };
};
