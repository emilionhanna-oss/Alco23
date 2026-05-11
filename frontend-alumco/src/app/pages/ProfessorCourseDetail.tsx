import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Users, AlertCircle, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { profesorService } from '../services/profesorService';
import { toast } from 'sonner';

interface Estudiante {
  id: string;
  nombreCompleto: string;
  nombre: string;
  email: string;
  progreso: number;
  modulosCompletados: number;
  totalModulos: number;
}

interface PracticaPendiente {
  id: string;
  usuarioId: string;
  moduloId: string;
  estado: string;
  notas: string | null;
  estudiante: {
    nombreCompleto: string;
  };
  moduloTitulo: string;
}

export default function ProfessorCourseDetail() {
  const { id: cursoId } = useParams();
  const navigate = useNavigate();

  const [tab, setTab] = useState<'estudiantes' | 'practicas'>('estudiantes');
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [practicas, setPracticas] = useState<PracticaPendiente[]>([]);
  const [loadingEst, setLoadingEst] = useState(true);
  const [loadingPrac, setLoadingPrac] = useState(true);
  const [autorizandoId, setAutorizandoId] = useState<string | null>(null);

  const loadEstudiantes = async (silent = false) => {
    if (!cursoId) return;
    if (!silent) setLoadingEst(true);
    const res = await profesorService.getEstudiantes(cursoId);
    if (res.success && res.data) {
      setEstudiantes(res.data);
    }
    setLoadingEst(false);
  };

  const loadPracticas = async (silent = false) => {
    if (!cursoId) return;
    if (!silent) setLoadingPrac(true);
    const res = await profesorService.getPracticasPendientes(cursoId);
    if (res.success && res.data) {
      setPracticas(res.data);
    }
    setLoadingPrac(false);
  };

  useEffect(() => {
    loadEstudiantes();
    loadPracticas();
  }, [cursoId]);

  const handleAutorizar = async (practicaId: string, estado: string) => {
    setAutorizandoId(practicaId);
    try {
      const res = await profesorService.autorizarPractica(practicaId, estado);
      if (res.success) {
        toast.success(estado === 'aprobado' ? 'Práctica aprobada con éxito' : 'Práctica rechazada');
        // Eliminar de la lista visual inmediata
        setPracticas((prev) => prev.filter((p) => p.id !== practicaId));
        // Refrescar lista de estudiantes para ver progreso actualizado
        loadEstudiantes(true);
      } else {
        toast.error('No se pudo procesar la solicitud');
      }
    } catch (err) {
      toast.error('Error de conexión');
    } finally {
      setAutorizandoId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Button
          onClick={() => navigate('/profesor')}
          variant="ghost"
          className="mb-6 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Panel
        </Button>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b">
          <button
            onClick={() => setTab('estudiantes')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              tab === 'estudiantes'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Estudiantes
            </div>
          </button>
          <button
            onClick={() => setTab('practicas')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              tab === 'practicas'
                ? 'border-amber-600 text-amber-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Prácticas Pendientes
              {practicas.length > 0 && (
                <Badge variant="secondary">{practicas.length}</Badge>
              )}
            </div>
          </button>
        </div>

        {/* Estudiantes Tab */}
        {tab === 'estudiantes' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Estudiantes Inscritos</h2>
            {loadingEst ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="pt-6 h-20"></CardContent>
                  </Card>
                ))}
              </div>
            ) : estudiantes.length > 0 ? (
              <div className="space-y-3">
                {estudiantes.map((est) => (
                  <Card key={est.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{est.nombreCompleto}</p>
                          <p className="text-sm text-gray-600">{est.email}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {est.modulosCompletados} / {est.totalModulos} módulos
                          </div>
                          <div className="w-32 h-2 bg-gray-200 rounded-full mt-2">
                            <div
                              className="h-full bg-green-600 rounded-full"
                              style={{ width: `${est.progreso}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{est.progreso}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-gray-50">
                <CardContent className="pt-6">
                  <p className="text-center text-gray-600">No hay estudiantes inscritos</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Prácticas Tab */}
        {tab === 'practicas' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Prácticas Presenciales Pendientes</h2>
            {loadingPrac ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="pt-6 h-24"></CardContent>
                  </Card>
                ))}
              </div>
            ) : practicas.length > 0 ? (
              <div className="space-y-3">
                {practicas.map((practica) => (
                  <Card key={practica.id} className="border-amber-200">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {practica.estudiante.nombreCompleto}
                          </p>
                          <p className="text-sm text-gray-600">
                            Módulo: {practica.moduloTitulo}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span className="text-amber-600">Pendiente de autorización</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleAutorizar(practica.id, 'aprobado')}
                            disabled={autorizandoId !== null}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 font-bold"
                          >
                            {autorizandoId === practica.id ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4 mr-1" />
                            )}
                            Aprobar
                          </Button>
                          <Button
                            onClick={() => handleAutorizar(practica.id, 'rechazado')}
                            disabled={autorizandoId === practica.id}
                            size="sm"
                            variant="outline"
                          >
                            Rechazar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="w-5 h-5" />
                    <p>¡Excelente! No hay prácticas pendientes de autorizar</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
