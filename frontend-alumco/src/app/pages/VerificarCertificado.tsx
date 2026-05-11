import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { buildApiUrl } from '../config/api.config';

export default function VerificarCertificado() {
  const { hash } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<'loading' | 'valid' | 'invalid' | 'error'>('loading');
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!hash) {
      setState('error');
      return;
    }

    const verify = async () => {
      try {
        const response = await fetch(buildApiUrl(`/api/cursos/verificar-certificado/${hash}`));
        if (!response.ok) {
          setState('invalid');
          return;
        }
        const json = await response.json();
        if (json.valido) {
          setData(json.datos);
          setState('valid');
        } else {
          setState('invalid');
        }
      } catch (err) {
        setState('error');
      }
    };

    verify();
  }, [hash]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-t-4 border-t-blue-600">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold text-gray-900">Alumco ONG</CardTitle>
          <CardDescription>Verificación de Certificado</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center pt-4">
          {state === 'loading' && (
            <div className="flex flex-col items-center space-y-4 py-8">
              <Loader className="w-12 h-12 text-blue-600 animate-spin" />
              <p className="text-gray-600">Verificando autenticidad...</p>
            </div>
          )}

          {state === 'valid' && data && (
            <div className="flex flex-col items-center text-center space-y-6 w-full">
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="w-16 h-16 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Certificado Válido</h3>
                <p className="text-sm text-gray-500">Este certificado es auténtico y fue emitido por Alumco.</p>
              </div>

              <div className="w-full bg-gray-50 border rounded-lg p-4 space-y-3 text-left">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Otorgado a</p>
                  <p className="text-base font-semibold text-gray-900">{data.nombre_completo}</p>
                  <p className="text-sm text-gray-600">RUT: {data.rut}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Curso Aprobado</p>
                  <p className="text-base font-semibold text-blue-700">{data.curso_titulo}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Fecha de Emisión</p>
                  <p className="text-sm text-gray-900">{new Date(data.emitido_en).toLocaleDateString('es-CL')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">ID de Verificación</p>
                  <p className="text-xs font-mono text-gray-600 break-all">{data.hash}</p>
                </div>
              </div>
            </div>
          )}

          {state === 'invalid' && (
            <div className="flex flex-col items-center text-center space-y-6 w-full">
              <div className="bg-red-100 p-3 rounded-full">
                <XCircle className="w-16 h-16 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Certificado Inválido</h3>
                <p className="text-sm text-gray-600">
                  No hemos podido encontrar un certificado que coincida con este código de verificación en nuestros registros.
                </p>
              </div>
            </div>
          )}

          {state === 'error' && (
            <div className="flex flex-col items-center text-center space-y-6 w-full">
              <div className="bg-amber-100 p-3 rounded-full">
                <XCircle className="w-16 h-16 text-amber-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Error de conexión</h3>
                <p className="text-sm text-gray-600">No pudimos contactar con el servidor. Por favor, intenta nuevamente más tarde.</p>
              </div>
            </div>
          )}

          <div className="mt-8 w-full">
            <Button variant="outline" className="w-full" onClick={() => navigate('/')}>
              Ir a la página principal
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
