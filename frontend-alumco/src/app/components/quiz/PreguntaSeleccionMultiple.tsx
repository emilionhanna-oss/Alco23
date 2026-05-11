// src/app/components/quiz/PreguntaSeleccionMultiple.tsx
import React from 'react';
import { Button } from '../ui/button';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { DetalleCalificacion } from '../../hooks/useQuizResponder';

interface PreguntaSeleccionMultipleProps {
  pregunta_id: string | number;
  pregunta: string;
  opciones: Array<{ id: string; texto: string }>;
  respuesta_usuario?: string | null;
  onRespuestaChange: (pregunta_id: string | number, respuesta: string) => void;
  mostrarResultado?: boolean;
  detalleResultado?: DetalleCalificacion | null;
}

export const PreguntaSeleccionMultiple: React.FC<PreguntaSeleccionMultipleProps> = ({
  pregunta_id,
  pregunta,
  opciones,
  respuesta_usuario,
  onRespuestaChange,
  mostrarResultado = false,
  detalleResultado = null,
}) => {
  const esCorrecta = detalleResultado?.es_correcta;
  const respuestaCorrecta = detalleResultado?.respuesta_correcta;

  return (
    <div className="mb-6 p-4 border rounded-lg bg-gray-50">
      <h4 className="font-semibold text-gray-900 mb-4">{pregunta}</h4>

      <RadioGroup value={respuesta_usuario || ''} onValueChange={(val) => onRespuestaChange(pregunta_id, val)}>
        <div className="space-y-3">
          {opciones.map((opcion) => {
            const isSelected = respuesta_usuario === opcion.id;
            const isCorrectaOpcion = opcion.id === respuestaCorrecta;

            let bgColor = 'bg-white';
            let borderColor = 'border-gray-300';
            let textColor = 'text-gray-700';

            if (mostrarResultado) {
              if (isSelected) {
                if (esCorrecta) {
                  bgColor = 'bg-green-50';
                  borderColor = 'border-green-500';
                  textColor = 'text-green-900';
                } else {
                  bgColor = 'bg-red-50';
                  borderColor = 'border-red-500';
                  textColor = 'text-red-900';
                }
              }
            }

            return (
              <div
                key={opcion.id}
                className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer ${bgColor} ${borderColor} border-2 transition`}
                onClick={() => !mostrarResultado && onRespuestaChange(pregunta_id, opcion.id)}
              >
                <RadioGroupItem value={opcion.id} id={`opt-${pregunta_id}-${opcion.id}`} disabled={mostrarResultado} />
                <Label htmlFor={`opt-${pregunta_id}-${opcion.id}`} className={`flex-1 cursor-pointer ${textColor}`}>
                  {opcion.texto}
                </Label>

                {mostrarResultado && isSelected && (
                  <span className={esCorrecta ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                    {esCorrecta ? "✓ Tu respuesta es correcta" : "✗ Tu respuesta es incorrecta"}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </RadioGroup>

      {mostrarResultado && !esCorrecta && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 rounded text-red-700 text-sm">
          <p className="font-semibold">Respuesta incorrecta</p>
        </div>
      )}
    </div>
  );
};
