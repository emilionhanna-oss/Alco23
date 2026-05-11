// src/app/components/quiz/BloqueoBloqueOTemporal.tsx
import React, { useState, useEffect } from 'react';
import { AlertCircle, Clock } from 'lucide-react';
import { Button } from '../ui/button';

interface BloqueoBloqueOTemporalProps {
  bloqueado_hasta: Date;
  onVolver: () => void;
}

export const BloqueoBloqueOTemporal: React.FC<BloqueoBloqueOTemporalProps> = ({
  bloqueado_hasta,
  onVolver,
}) => {
  const [tiempoRestante, setTiempoRestante] = useState<string>('');

  useEffect(() => {
    const actualizarTiempo = () => {
      const ahora = new Date();
      const diferencia = bloqueado_hasta.getTime() - ahora.getTime();

      if (diferencia <= 0) {
        setTiempoRestante('Desbloqueado');
        return;
      }

      const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
      const horas = Math.floor((diferencia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));

      if (dias > 0) {
        setTiempoRestante(`${dias} día${dias > 1 ? 's' : ''}, ${horas} hora${horas > 1 ? 's' : ''}`);
      } else if (horas > 0) {
        setTiempoRestante(`${horas} hora${horas > 1 ? 's' : ''}, ${minutos} minuto${minutos > 1 ? 's' : ''}`);
      } else {
        setTiempoRestante(`${minutos} minuto${minutos > 1 ? 's' : ''}`);
      }
    };

    actualizarTiempo();
    const interval = setInterval(actualizarTiempo, 60000); // Actualizar cada minuto

    return () => clearInterval(interval);
  }, [bloqueado_hasta]);

  return (
    <div className="space-y-6">
      {/* Alerta de bloqueo */}
      <div className="p-6 rounded-lg bg-red-50 border border-red-200">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-12 h-12 text-red-600 flex-shrink-0 mt-1" />

          <div className="flex-1">
            <h3 className="text-xl font-bold text-red-900 mb-2">Quiz Bloqueado</h3>
            <p className="text-red-800 mb-4">
              Has agotado tus 2 intentos sin alcanzar la calificación mínima. Estás bloqueado temporalmente.
            </p>

            <div className="bg-red-100 p-4 rounded-lg border border-red-300">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-red-600" />
                <span className="font-semibold text-red-900">Tiempo restante de bloqueo:</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{tiempoRestante}</p>
              <p className="text-sm text-red-700 mt-2">
                Desbloqueado: <strong>{bloqueado_hasta.toLocaleDateString('es-CL')} a las {bloqueado_hasta.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</strong>
              </p>
            </div>

            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                💡 <strong>Consejo:</strong> Utiliza este tiempo para revisar el material del curso y prepararte mejor para el siguiente intento.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Botón de volver */}
      <div className="flex justify-center pt-4">
        <Button onClick={onVolver} variant="outline" className="w-full sm:w-auto">
          Volver al curso
        </Button>
      </div>
    </div>
  );
};
