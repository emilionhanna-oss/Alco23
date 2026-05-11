import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ChevronLeft, ChartBar, LogOut } from 'lucide-react';
import { courseService, userService } from '../services/apiService';
import { toast } from 'sonner';
import type { Course, User } from '../types';
import { BACKEND_URL, buildApiUrl } from '../config/api.config';

const LOGO_SRC = `${BACKEND_URL}/static/alumco-logo.png`;

type MetricsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; users: User[]; courses: Course[] };

function safePercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export default function AdminDashboardMetrics() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [logoOk, setLogoOk] = useState(true);
  const [state, setState] = useState<MetricsState>({ status: 'loading' });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setState({ status: 'loading' });

      try {
        const [usersResp, coursesResp] = await Promise.all([
          userService.getUsers(),
          courseService.getCourses({ all: true }),
        ]);

        if (!mounted) return;

        if (!usersResp.success) {
          throw new Error(usersResp.error || 'No se pudieron cargar usuarios.');
        }

        if (!coursesResp.success) {
          throw new Error(coursesResp.error || 'No se pudieron cargar cursos.');
        }

        setState({
          status: 'ready',
          users: usersResp.data || [],
          courses: coursesResp.data || [],
        });
      } catch (error) {
        if (!mounted) return;
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'No se pudieron cargar las métricas.',
        });
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const metrics = useMemo(() => {
    if (state.status !== 'ready') {
      return {
        progressBySede: [] as Array<{ sede: string; promedio: number; usuarios: number }>,
        distributionByCargo: [] as Array<{ cargo: string; count: number; ratio: number }>,
        totalInscripciones: 0,
        completadas: 0,
      };
    }

    const users = state.users || [];
    const courses = state.courses || [];

    const progressBySedeMap = new Map<string, { sum: number; count: number }>();

    for (const user of users) {
      const userId = String(user.id || '');
      if (!userId) continue;

      const status = String(user.estado || '').toLowerCase();
      if (status === 'pendiente') continue;

      const sede = String(user.sede || 'Sin sede').trim() || 'Sin sede';
      const enrolled = courses.filter((course) =>
        Array.isArray(course.alumnosInscritos)
          ? course.alumnosInscritos.map(String).includes(userId)
          : false
      );

      const promedioUsuario = enrolled.length > 0
        ? enrolled.reduce((acc, course) => acc + Number(course.progress || 0), 0) / enrolled.length
        : 0;

      const current = progressBySedeMap.get(sede) || { sum: 0, count: 0 };
      progressBySedeMap.set(sede, {
        sum: current.sum + promedioUsuario,
        count: current.count + 1,
      });
    }

    const progressBySede = Array.from(progressBySedeMap.entries())
      .map(([sede, data]) => ({
        sede,
        promedio: safePercent(data.count > 0 ? data.sum / data.count : 0),
        usuarios: data.count,
      }))
      .sort((a, b) => b.promedio - a.promedio);

    const cargoCountMap = new Map<string, number>();
    for (const user of users) {
      const cargo = String(user.cargo || 'Sin cargo').trim() || 'Sin cargo';
      cargoCountMap.set(cargo, (cargoCountMap.get(cargo) || 0) + 1);
    }

    const totalUsers = users.length || 1;
    const distributionByCargo = Array.from(cargoCountMap.entries())
      .map(([cargo, count]) => ({
        cargo,
        count,
        ratio: safePercent((count / totalUsers) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    const totalInscripciones = courses.reduce(
      (acc, course) => acc + (Array.isArray(course.alumnosInscritos) ? course.alumnosInscritos.length : 0),
      0
    );

    const completadas = courses.filter(
      (course) => Number(course.progress || 0) >= 100
    ).length;

    return {
      progressBySede,
      distributionByCargo,
      totalInscripciones,
      completadas,
    };
  }, [state]);

  const completionRatio = (state.status === 'ready' && (state.courses || []).length > 0)
    ? safePercent((metrics.completadas / (state.courses || []).length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {logoOk ? (
                <img
                  src={LOGO_SRC}
                  alt="Logo de Alumco"
                  className="h-10 w-auto"
                  onError={() => setLogoOk(false)}
                />
              ) : (
                <div className="text-xl sm:text-2xl font-semibold text-[#1a2840] leading-tight">ALUMCO</div>
              )}
              <div className="text-sm text-gray-600 leading-tight">Admin · Dashboard de Métricas</div>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={() => navigate('/admin')} variant="outline" className="flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Volver</span>
              </Button>
              <Button onClick={() => {
                const token = localStorage.getItem('token') || '';
                const promise = fetch(buildApiUrl('/api/reportes/dashboard/exportar'), {
                  headers: { 'Authorization': `Bearer ${token}` }
                })
                .then(async res => {
                  if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.error || 'Error al generar el reporte');
                  }
                  return res.blob();
                })
                .then(blob => {
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `reporte_dashboard_alumco.xlsx`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  window.URL.revokeObjectURL(url);
                });

                toast.promise(promise, {
                  loading: 'Generando reporte Excel...',
                  success: 'Reporte descargado con éxito',
                  error: (err) => err.message || 'Error al exportar reporte'
                });
              }}>
                Exportar Reporte
              </Button>
              <Button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                variant="outline"
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <ChartBar className="w-6 h-6 text-blue-700" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#1a2840]">Dashboard de Métricas</h2>
            <p className="text-sm text-gray-600">Seguimiento global de desempeño y cobertura de capacitación</p>
          </div>
        </div>

        {state.status === 'loading' ? (
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-5 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-100 rounded w-2/3" />
            </CardHeader>
            <CardContent>
              <div className="h-24 bg-gray-100 rounded" />
            </CardContent>
          </Card>
        ) : state.status === 'error' ? (
          <Card>
            <CardHeader>
              <CardTitle>No se pudieron cargar las métricas</CardTitle>
              <CardDescription>{state.message}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => window.location.reload()}>Reintentar</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Inscripciones totales</CardDescription>
                  <CardTitle>{metrics.totalInscripciones}</CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Cursos 100% completados</CardDescription>
                  <CardTitle>{metrics.completadas}</CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Cursos completados / total cursos</CardDescription>
                  <CardTitle>{completionRatio}%</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Progreso Promedio por Sede</CardTitle>
                <CardDescription>Promedio sobre usuarios no pendientes por cada sede</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {metrics.progressBySede.length === 0 ? (
                  <div className="text-sm text-gray-600">No hay datos suficientes para calcular progreso por sede.</div>
                ) : (
                  metrics.progressBySede.map((item) => (
                    <div key={item.sede} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="font-medium text-gray-800">{item.sede}</div>
                        <div className="text-gray-700">{item.promedio}% · {item.usuarios} usuario(s)</div>
                      </div>
                      <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div className="h-2 rounded-full bg-[#1a2840]" style={{ width: `${item.promedio}%` }} />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribución de Usuarios por Cargo</CardTitle>
                <CardDescription>Participación de cada cargo en la base de usuarios</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {metrics.distributionByCargo.length === 0 ? (
                  <div className="text-sm text-gray-600">No hay usuarios para calcular distribución de cargos.</div>
                ) : (
                  metrics.distributionByCargo.map((item) => (
                    <div key={item.cargo} className="rounded-md border p-3 bg-white">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="text-sm font-medium text-gray-800">{item.cargo}</div>
                        <Badge className="bg-slate-100 text-slate-700 border-slate-200">
                          {item.count} usuario(s)
                        </Badge>
                      </div>
                      <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div className="h-2 rounded-full bg-[#f97316]" style={{ width: `${item.ratio}%` }} />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
