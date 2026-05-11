import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import {
  BookOpen,
  Plus,
  LogOut,
  Settings,
  Users,
  UserCog,
  BarChart3,
  GraduationCap,
  AlertCircle
} from 'lucide-react';
import { BACKEND_URL } from '../config/api.config';
import { profesorService } from '../services/profesorService';
import { userService } from '../services/apiService';

const LOGO_SRC = `${BACKEND_URL}/static/alumco-logo.png`;

interface MiCurso {
  id: string;
  titulo: string;
  descripcion: string;
  imagen?: string;
  alumnosInscritos: string[];
}

export default function ProfessorDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [logoOk, setLogoOk] = useState(true);
  const [cursos, setCursos] = useState<MiCurso[]>([]);
  const [loadingCursos, setLoadingCursos] = useState(true);
  const [practicasPendientes, setPracticasPendientes] = useState(0);
  const [totalEstudiantes, setTotalEstudiantes] = useState(0);
  const [hasProfileSignature, setHasProfileSignature] = useState(true);

  useEffect(() => {
    const checkSignature = async () => {
      try {
        const response = await userService.getProfile();
        if (response.success && response.data) {
          const firmaTexto = String(response.data.firmaTexto || '').trim();
          const firmaImagen = String(response.data.firmaImagenDataUrl || '').trim();
          const hasImage = /^data:image\/(png|jpeg|jpg);base64,/i.test(firmaImagen);
          setHasProfileSignature(Boolean(firmaTexto) || hasImage);
        }
      } catch (err) {
        console.error('Error checking signature:', err);
      }
    };
    checkSignature();
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const cursosRes = await profesorService.getMisCursos();
        if (!mounted) return;

        if (cursosRes.success && cursosRes.data) {
          setCursos(cursosRes.data);

          // Contar estudiantes y prácticas
          let totalAlumnos = 0;
          let totalPracticas = 0;

          for (const curso of cursosRes.data) {
            totalAlumnos += curso.alumnosInscritos.length;

            const practicasRes = await profesorService.getPracticasPendientes(curso.id);
            if (practicasRes.success && practicasRes.data) {
              totalPracticas += practicasRes.data.length;
            }
          }

          if (mounted) {
            setTotalEstudiantes(totalAlumnos);
            setPracticasPendientes(totalPracticas);
          }
        }
      } catch {
        if (mounted) {
          setCursos([]);
        }
      } finally {
        if (mounted) {
          setLoadingCursos(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              {logoOk ? (
                <img
                  src={LOGO_SRC}
                  alt="Logo de Alumco"
                  className="h-10 w-auto"
                  onError={() => setLogoOk(false)}
                />
              ) : (
                <div className="text-xl sm:text-2xl font-semibold text-[#1a2840] leading-tight">
                  ALUMCO
                </div>
              )}
              <div className="text-sm text-gray-600 leading-tight">
                Profesor · Portal de Capacitación ELEAM
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => navigate('/panel')} variant="outline" className="flex items-center gap-2">
                <span className="hidden sm:inline">← Volver al Panel</span>
                <span className="sm:hidden">Panel</span>
              </Button>
              <Button onClick={handleLogout} variant="outline" className="flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-[#2d7a3a] to-[#1a5f2a] rounded-lg p-6 sm:p-8 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <UserCog className="w-8 h-8" />
              <h2 className="text-2xl sm:text-3xl">Panel del Profesor</h2>
            </div>
            <p className="text-lg text-green-100">
              {(() => {
                const displayName = user?.nombreCompleto || user?.name;
                const genero = (user as any)?.genero as string | undefined;
                const saludo =
                  genero === 'femenino'
                    ? 'Bienvenida'
                    : genero === 'masculino'
                      ? 'Bienvenido'
                      : 'Te damos la bienvenida';
                return `${saludo}${displayName ? `, ${displayName}` : ''}. Gestiona tus cursos, estudiantes y prácticas.`;
              })()}
            </p>
          </div>
        </div>

        {/* Signature Alert Banner */}
        {!hasProfileSignature && (
          <div className="mb-6 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg p-4 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 border border-amber-400 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-3 text-white">
              <div className="p-2 bg-white/20 rounded-full">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm">Falta tu firma digital</p>
                <p className="text-xs text-amber-50">Tus alumnos no podrán generar sus certificados hasta que configures tu firma en el perfil.</p>
              </div>
            </div>
            <Button 
              size="sm" 
              variant="secondary" 
              onClick={() => navigate('/perfil')}
              className="w-full sm:w-auto font-bold shadow-sm whitespace-nowrap bg-white text-orange-600 hover:bg-amber-50"
            >
              Configurar Firma Ahora
            </Button>
          </div>
        )}

        {/* Professor Cards Grid (6 cards) */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card 1: Mis Cursos */}
          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/panel')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') navigate('/panel');
            }}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Mis Cursos</CardTitle>
                  <CardDescription>Visión general</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                {cursos.length > 0
                  ? `Tienes ${cursos.length} curso${cursos.length !== 1 ? 's' : ''} activos. Gestiona contenido y estudiantes.`
                  : 'Sin cursos aún. Solicita al administrador que asigne capacitaciones.'}
              </p>
            </CardContent>
          </Card>

          {/* Card 3: Gestión de Capacitaciones */}
          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/admin/gestion-capacitaciones')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') navigate('/admin/gestion-capacitaciones');
            }}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <GraduationCap className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <CardTitle>Gestión de Capacitaciones</CardTitle>
                  <CardDescription>Crear y editar cursos</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Crea nuevos cursos, edita contenido, agrega módulos y gestiona prácticas presenciales.
              </p>
            </CardContent>
          </Card>

          {/* Card 4: Estadísticas Generales */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-cyan-100 rounded-lg">
                  <Users className="w-6 h-6 text-cyan-700" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <span>Estadísticas</span>
                    {totalEstudiantes > 0 ? (
                      <Badge className="bg-blue-600 text-white border-blue-700">{totalEstudiantes}</Badge>
                    ) : null}
                  </CardTitle>
                  <CardDescription>Estudiantes totales</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><span className="font-semibold">{cursos.length}</span> cursos creados</p>
                <p><span className="font-semibold">{totalEstudiantes}</span> estudiantes inscritos</p>
                <p className={`${practicasPendientes > 0 ? 'text-amber-600 font-semibold' : 'text-green-600'}`}>
                  <span className="font-semibold">{practicasPendientes}</span> prácticas pendientes
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Gestión de Estudiantes y Prácticas */}
          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/profesor')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') navigate('/profesor');
            }}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle>Gestión de Alumnos</CardTitle>
                  <CardDescription>Seguimiento y prácticas</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Monitorea progreso de estudiantes, autoriza prácticas presenciales y gestiona evaluaciones.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Mis Cursos Section */}
        <div className="mt-12">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-green-600" />
                Mis Cursos
              </h3>
              <p className="text-sm text-gray-600 mt-1">Cursos que imparte</p>
            </div>
            <Button
              onClick={() => navigate('/admin/gestion-capacitaciones')}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Crear Curso</span>
            </Button>
          </div>

          {loadingCursos ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <div className="h-40 bg-gray-200"></div>
                  <CardHeader>
                    <div className="h-4 bg-gray-200 mb-2"></div>
                    <div className="h-3 bg-gray-100"></div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : cursos.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {cursos.map((curso) => (
                <Card
                  key={curso.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/profesor/curso/${curso.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ')
                      navigate(`/profesor/curso/${curso.id}`);
                  }}
                >
                  {curso.imagen && (
                    <div className="h-40 bg-gradient-to-br from-green-100 to-green-50 overflow-hidden">
                      <img
                        src={curso.imagen}
                        alt={curso.titulo}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="line-clamp-2">{curso.titulo}</CardTitle>
                    <CardDescription className="line-clamp-2">{curso.descripcion}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>{curso.alumnosInscritos.length} estudiantes</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-gray-50">
              <CardContent className="pt-6">
                <p className="text-center text-gray-600">
                  No has creado ningún curso aún.
                  <br />
                  <Button
                    variant="link"
                    onClick={() => navigate('/profesor/gestion-capacitaciones')}
                    className="text-green-600 mt-2"
                  >
                    Crear tu primer curso
                  </Button>
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
