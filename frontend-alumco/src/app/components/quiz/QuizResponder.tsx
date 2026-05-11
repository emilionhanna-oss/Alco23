// src/app/components/quiz/QuizResponder.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Loader, AlertCircle, Clock, CheckCircle2, ClipboardList } from 'lucide-react';
import { Button } from '../ui/button';
import { PreguntaSeleccionMultiple } from './PreguntaSeleccionMultiple';
import { PreguntaRespuestaEscrita } from './PreguntaRespuestaEscrita';
import { ResultadoQuiz } from './ResultadoQuiz';
import { BloqueoBloqueOTemporal } from './BloqueoBloqueOTemporal';
import {
  useQuizResponder,
  RespuestaUsuario,
  QuizPregunta,
  DetalleCalificacion,
} from '../../hooks/useQuizResponder';

interface QuizResponderProps {
  modulo_id: string;
  onVolver: () => void;
}

export const QuizResponder: React.FC<QuizResponderProps> = ({ modulo_id, onVolver }) => {
  const { etapa, quiz, resultado, bloqueado_hasta, intentos, error, enviarRespuestas, reintentar } =
    useQuizResponder(modulo_id);

  const [respuestas, setRespuestas] = useState<Record<string | number, string>>({});
  const [tiempoInicio, setTiempoInicio] = useState<number>(0);
  const [tiempoRestante, setTiempoRestante] = useState<number | null>(null);
  const [todasRespondidas, setTodasRespondidas] = useState(false);
  const [haComenzado, setHaComenzado] = useState(false);

  // Iniciar timer cuando se carga el quiz
  useEffect(() => {
    if (etapa === 'respondiendo' && quiz?.tiempo_limite_minutos) {
      const ahora = Date.now();
      setTiempoInicio(ahora);
      const tiempoLimiteMs = quiz.tiempo_limite_minutos * 60 * 1000;
      setTiempoRestante(tiempoLimiteMs);
    }
  }, [etapa, quiz]);

  // Actualizar timer cada segundo
  useEffect(() => {
    if (etapa !== 'respondiendo' || !quiz?.tiempo_limite_minutos) return;

    const interval = setInterval(() => {
      const ahora = Date.now();
      const elapsed = ahora - tiempoInicio;
      const tiempoLimiteMs = quiz.tiempo_limite_minutos! * 60 * 1000;
      const restante = Math.max(0, tiempoLimiteMs - elapsed);

      setTiempoRestante(restante);

      // Auto-enviar si se acaba el tiempo
      if (restante === 0) {
        handleEnviar();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [etapa, quiz, tiempoInicio]);

  // Validar que todas las preguntas estén respondidas
  useEffect(() => {
    if (!quiz) return;

    const todosRespondidos = quiz.preguntas.every((p, idx) => {
      const pregunta_id = String(p.id ?? idx);
      return respuestas[pregunta_id] && String(respuestas[pregunta_id]).trim().length > 0;
    });

    setTodasRespondidas(todosRespondidos);
  }, [respuestas, quiz]);

  const handleRespuestaChange = (pregunta_id: string | number, respuesta: string) => {
    setRespuestas((prev) => ({
      ...prev,
      [String(pregunta_id)]: respuesta,
    }));
  };

  const handleEnviar = useCallback(() => {
    if (!quiz) return;

    const respuestasArray: RespuestaUsuario[] = quiz.preguntas.map((p, idx) => ({
      pregunta_id: String(p.id ?? idx),
      respuesta_usuario: respuestas[String(p.id ?? idx)] || '',
    }));

    const tiempoUtilizado = Math.round((Date.now() - tiempoInicio) / 1000);

    enviarRespuestas(respuestasArray, tiempoUtilizado);
  }, [quiz, respuestas, tiempoInicio, enviarRespuestas]);

  // Calcular tiempo restante formateado
  const formatearTiempo = (ms: number) => {
    const totalSegundos = Math.ceil(ms / 1000);
    const minutos = Math.floor(totalSegundos / 60);
    const segundos = totalSegundos % 60;
    return `${minutos}:${segundos.toString().padStart(2, '0')}`;
  };

  // ==================== ETAPAS ====================

  // CARGANDO
  if (etapa === 'cargando') {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-gray-600 font-medium">Cargando quiz...</p>
      </div>
    );
  }

  // BLOQUEADO
  if (etapa === 'bloqueado' && bloqueado_hasta) {
    return <BloqueoBloqueOTemporal bloqueado_hasta={bloqueado_hasta} onVolver={onVolver} />;
  }

  // ERROR
  if (etapa === 'error' || !quiz) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-bold text-red-900 mb-2">Error al cargar el quiz</h3>
            <p className="text-red-800 mb-4">{error || 'Ocurrió un error desconocido'}</p>
            <Button onClick={onVolver} variant="outline">
              Volver al curso
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // PANTALLA DE INICIO (Antes de responder)
  if (etapa === 'respondiendo' && !haComenzado) {
    return (
      <div className="p-8 text-center space-y-6 bg-gradient-to-br from-blue-50 to-white rounded-2xl border-2 border-blue-100 shadow-sm">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto text-blue-600">
          <ClipboardList className="w-10 h-10" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-gray-900">{quiz.titulo}</h3>
          <p className="text-gray-600 max-w-md mx-auto">
            Esta actividad evaluará tus conocimientos sobre el módulo. 
            Asegúrate de haber revisado todo el material antes de comenzar.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4 text-sm font-medium py-4 border-y border-blue-100">
          <div className="px-4 py-2 bg-white rounded-lg border shadow-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-blue-500" />
            <span>Intento {quiz.intento_numero} de 2</span>
          </div>
          {quiz.tiempo_limite_minutos && (
            <div className="px-4 py-2 bg-white rounded-lg border shadow-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>{quiz.tiempo_limite_minutos} minutos</span>
            </div>
          )}
          <div className="px-4 py-2 bg-white rounded-lg border shadow-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span>Mínimo {quiz.calificacion_minima || 60}%</span>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <Button onClick={onVolver} variant="ghost" className="flex-1 text-gray-500">
            Aún no estoy listo
          </Button>
          <Button 
            onClick={() => setHaComenzado(true)} 
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 shadow-lg"
          >
            Iniciar Examen
          </Button>
        </div>
      </div>
    );
  }

  // RESPONDIENDO
  if (etapa === 'respondiendo' && haComenzado) {
    return (
      <div className="space-y-6">
        {/* Header con timer */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-blue-900">{quiz.titulo}</h3>
              <p className="text-sm text-blue-800">Intento {quiz.intento_numero} de 2</p>
            </div>

            {quiz.tiempo_limite_minutos && tiempoRestante !== null && (
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold ${
                  tiempoRestante <= 5 * 60 * 1000
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                <Clock className="w-5 h-5" />
                {formatearTiempo(tiempoRestante)}
              </div>
            )}
          </div>
        </div>

        {/* Preguntas */}
        <div>
          <h4 className="text-lg font-bold text-gray-900 mb-4">Responde todas las preguntas:</h4>
          <div className="space-y-4">
            {quiz.preguntas.map((pregunta, idx) => {
              const pregunta_id = String(pregunta.id ?? idx);
              const respuesta = respuestas[pregunta_id];

              if (pregunta.tipo === 'seleccion_multiple') {
                return (
                  <div key={idx}>
                    <div className="text-sm font-medium text-gray-600 mb-2">
                      Pregunta {idx + 1} de {quiz.preguntas.length}
                    </div>
                    <PreguntaSeleccionMultiple
                      pregunta_id={pregunta_id}
                      pregunta={pregunta.pregunta}
                      opciones={pregunta.opciones || []}
                      respuesta_usuario={respuesta}
                      onRespuestaChange={handleRespuestaChange}
                      mostrarResultado={false}
                    />
                  </div>
                );
              } else if (pregunta.tipo === 'respuesta_escrita') {
                return (
                  <div key={idx}>
                    <div className="text-sm font-medium text-gray-600 mb-2">
                      Pregunta {idx + 1} de {quiz.preguntas.length}
                    </div>
                    <PreguntaRespuestaEscrita
                      pregunta_id={pregunta_id}
                      pregunta={pregunta.pregunta}
                      respuesta_usuario={respuesta}
                      onRespuestaChange={handleRespuestaChange}
                      mostrarResultado={false}
                    />
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>

        {/* Validación de respuestas */}
        {!todasRespondidas && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              ⚠️ Debes responder todas las preguntas antes de enviar.
            </p>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex gap-3 pt-4 border-t">
          <Button onClick={onVolver} variant="outline" className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={handleEnviar}
            disabled={!todasRespondidas || etapa === 'enviando'}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {etapa === 'enviando' ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar Respuestas'
            )}
          </Button>
        </div>
      </div>
    );
  }

  // RESULTADO
  if (etapa === 'resultado' && resultado) {
    const puedoReintentar = resultado.intento_numero === 1 && !resultado.aprobado;

    return (
      <ResultadoQuiz
        resultado={resultado}
        onVolver={onVolver}
        onReintentar={puedoReintentar ? reintentar : undefined}
        puedoReintentar={puedoReintentar}
        intento_numero={resultado.intento_numero}
      />
    );
  }

  return null;
};
