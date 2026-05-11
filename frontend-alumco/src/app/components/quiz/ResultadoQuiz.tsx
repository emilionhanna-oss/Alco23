// src/app/components/quiz/ResultadoQuiz.tsx
import React from 'react';
import { Button } from '../ui/button';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { PreguntaSeleccionMultiple } from './PreguntaSeleccionMultiple';
import { PreguntaRespuestaEscrita } from './PreguntaRespuestaEscrita';
import { ResultadoQuiz as ResultadoQuizType } from '../../hooks/useQuizResponder';

interface ResultadoQuizProps {
  resultado: ResultadoQuizType;
  onVolver: () => void;
  onReintentar?: () => void;
  puedoReintentar: boolean;
  intento_numero: number;
}

export const ResultadoQuiz: React.FC<ResultadoQuizProps> = ({
  resultado,
  onVolver,
  onReintentar,
  puedoReintentar,
  intento_numero,
}) => {
  const { puntuacion, aprobado, detalles_preguntas } = resultado;

  return (
    <div className="space-y-6">
      {/* Header con resultado */}
      <div className={`p-6 rounded-lg ${aprobado ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <div className="flex items-center gap-4">
          {aprobado ? (
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          ) : (
            <XCircle className="w-12 h-12 text-red-600" />
          )}

          <div className="flex-1">
            <h3 className={`text-xl font-bold ${aprobado ? 'text-green-900' : 'text-red-900'}`}>
              {aprobado ? '¡Felicidades!' : 'No aprobaste'}
            </h3>
            <p className={`text-sm ${aprobado ? 'text-green-800' : 'text-red-800'}`}>
              {resultado.mensaje}
            </p>
          </div>

          <div className="text-right">
            <div className={`text-4xl font-bold ${aprobado ? 'text-green-600' : 'text-red-600'}`}>
              {puntuacion}%
            </div>
            <p className="text-sm text-gray-600">Puntuación</p>
          </div>
        </div>

        {/* Información de intentos */}
        <div className="mt-4 pt-4 border-t border-gray-300">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Intento {intento_numero} de 2</span>
            {!aprobado && intento_numero === 1 && ' - Te queda un intento más'}
            {!aprobado && intento_numero === 2 && ' - Alcanzaste el máximo de intentos. Bloqueado por 14 días.'}
          </p>
        </div>
      </div>

      {/* Detalles de preguntas - SOLO MOSTRAR SI REPROBÓ */}
      {!aprobado && (
        <div>
          <h4 className="text-lg font-bold text-gray-900 mb-4">Revisión de respuestas:</h4>
          <div className="space-y-4">
            {detalles_preguntas.map((detalle, idx) => {
              const num_pregunta = idx + 1;

              if (detalle.tipo === 'seleccion_multiple') {
                return (
                  <div key={idx} className="border-l-4 border-blue-500 pl-4">
                    <h5 className="font-semibold text-gray-900 mb-2">
                      Pregunta {num_pregunta} (Selección múltiple)
                    </h5>
                    <PreguntaSeleccionMultiple
                      pregunta_id={detalle.pregunta_id}
                      pregunta={detalle.pregunta}
                      opciones={detalle.opciones || []}
                      respuesta_usuario={detalle.respuesta_usuario}
                      mostrarResultado={true}
                      detalleResultado={detalle}
                    />
                  </div>
                );
              } else {
                return (
                  <div key={idx} className="border-l-4 border-purple-500 pl-4">
                    <h5 className="font-semibold text-gray-900 mb-2">
                      Pregunta {num_pregunta} (Respuesta escrita)
                    </h5>
                    <PreguntaRespuestaEscrita
                      pregunta_id={detalle.pregunta_id}
                      pregunta={detalle.pregunta}
                      respuesta_usuario={detalle.respuesta_usuario}
                      mostrarResultado={true}
                      detalleResultado={detalle}
                    />
                  </div>
                );
              }
            })}
          </div>
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex gap-3 pt-4 border-t">
        <Button onClick={onVolver} variant="outline" className="flex-1">
          Volver al curso
        </Button>
        {puedoReintentar && onReintentar && (
          <Button onClick={onReintentar} className="flex-1 bg-blue-600 hover:bg-blue-700">
            Reintentar Quiz
          </Button>
        )}
      </div>
    </div>
  );
};
