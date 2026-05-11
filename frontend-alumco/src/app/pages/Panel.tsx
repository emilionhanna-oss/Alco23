import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { BookOpen, GraduationCap, LogOut, User, AlertCircle, FileCheck, Download, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import CourseCard from '../components/CourseCard';
import { courseService, userService } from '../services/apiService';
import { BACKEND_URL } from '../config/api.config';
import type { Course } from '../types';

const LOGO_SRC = `${BACKEND_URL}/static/alumco-logo.png`;

export default function Panel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [serverStatus, setServerStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [logoOk, setLogoOk] = useState(true);
  const [hasProfileSignature, setHasProfileSignature] = useState(false);
  
  // Referencias para scroll
  const availableRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Cargar estado de la firma
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

  // Cargar cursos al montar el componente
  useEffect(() => {
    const loadCourses = async () => {
      setIsLoadingCourses(true);
      try {
        const response = await courseService.getCourses();
        
        if (response.success && response.data) {
          setCourses(response.data);
          setServerStatus('connected');
        } else {
          setCourses([]);
          setServerStatus('disconnected');
        }
      } catch (error) {
        console.error('Error en loadCourses:', error);
        setCourses([]);
        setServerStatus('disconnected');
      } finally {
        setIsLoadingCourses(false);
      }
    };

    loadCourses();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleOpenCourse = (courseId: string) => {
    if (!courseId) return;
    navigate(`/curso/${courseId}`, { state: { from: location.pathname } });
  };

  const handleDownloadCertificate = async (course: Course) => {
    if (!course.id) return;

    if (!hasProfileSignature) {
      toast.error('Falta tu firma', {
        description: 'Debes configurar tu firma en el perfil antes de obtener el certificado.',
        action: {
          label: 'Configurar Firma',
          onClick: () => navigate('/perfil')
        }
      });
      return;
    }

    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.COURSES.DETAIL(course.id)) + '/certificado', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        throw new Error('Error al descargar el certificado');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Certificado_${course.title || 'Curso'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('¡Certificado listo!', {
        description: `Se ha descargado el certificado de ${course.title}`
      });
    } catch (err) {
      console.error(err);
      toast.error('Error al generar certificado');
    }
  };

  const availableCourses = courses.filter(c => (c.progress || 0) < 100);
  const completedCourses = courses.filter(c => (c.progress || 0) >= 100);

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
                Portal de Capacitación ELEAM
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-[#1a2840] to-[#2d4263] rounded-lg p-6 sm:p-8 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <User className="w-8 h-8" />
              <h2 className="text-2xl sm:text-3xl">
                {(() => {
                  const displayName = user?.nombreCompleto || user?.name || 'Usuario';
                  const genero = (user as any)?.genero as string | undefined;
                  const saludo =
                    genero === 'femenino'
                      ? '¡Bienvenida'
                      : genero === 'masculino'
                        ? '¡Bienvenido'
                        : '¡Te damos la bienvenida';
                  return `${saludo}, ${displayName}!`;
                })()}
              </h2>
            </div>
            <p className="text-lg text-blue-100">
              Continúa con tu capacitación y desarrollo profesional
            </p>
          </div>
        </div>

        {/* Signature Alert Banner */}
        {!isLoadingCourses && !hasProfileSignature && (
          <div className="mb-6 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg p-4 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 border border-amber-400 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-3 text-white">
              <div className="p-2 bg-white/20 rounded-full">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm">Falta tu firma digital</p>
                <p className="text-xs text-amber-50">No podrás generar certificados de los cursos completados hasta que la configures.</p>
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

        {/* Server Status Banner */}
        {serverStatus === 'disconnected' && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-900">
                Error de conexión con el servidor
              </p>
              <p className="text-xs text-red-700 mt-1">
                No se han podido sincronizar tus avances. Por favor, recarga la página.
              </p>
            </div>
          </div>
        )}

        {/* Overview Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card 
            className="hover:shadow-lg transition-shadow cursor-pointer border-blue-100"
            onClick={() => scrollToSection(availableRef)}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Cursos Disponibles</CardTitle>
                  <CardDescription>{availableCourses.length} cursos</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                {availableCourses.length > 0 
                  ? `Tienes ${availableCourses.length} cursos pendientes por terminar.` 
                  : '¡Felicidades! Has completado todos tus cursos.'}
              </p>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-lg transition-shadow cursor-pointer border-green-100"
            onClick={() => scrollToSection(completedRef)}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <GraduationCap className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <CardTitle>Mis Logros</CardTitle>
                  <CardDescription>{completedCourses.length} certificados</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Has obtenido {completedCourses.length} certificaciones de capacitación profesional.
              </p>
            </CardContent>
          </Card>

          {(() => {
            const roles = (user as any)?.rol;
            const isProfesor = Array.isArray(roles) && roles.includes('profesor');
            return isProfesor ? (
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
                    <div className="p-3 bg-green-100 rounded-lg">
                      <GraduationCap className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <CardTitle>Gestión de Capacitaciones</CardTitle>
                      <CardDescription>Panel del profesor</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Accede a tus cursos, gestiona estudiantes y autoriza prácticas presenciales.
                  </p>
                </CardContent>
              </Card>
            ) : null;
          })()}

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/perfil')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') navigate('/perfil');
            }}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <User className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle>Mi Perfil</CardTitle>
                  <CardDescription>Datos y certificados</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Gestiona tu información personal, firma y descarga tus certificados.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Available Courses Section */}
        <div className="mb-12 scroll-mt-24" ref={availableRef}>
          <h3 className="text-2xl font-bold text-[#1a2840] mb-6 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            Cursos Disponibles
          </h3>
          
          {isLoadingCourses ? (
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
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {availableCourses.length === 0 ? (
                <Card className="sm:col-span-2 lg:col-span-3 border-dashed border-2 bg-gray-50/50">
                  <CardHeader className="text-center py-10">
                    <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-8 h-8 text-gray-400" />
                    </div>
                    <CardTitle className="text-gray-600">¡Todo al día!</CardTitle>
                    <CardDescription>
                      No tienes cursos pendientes por ahora. Revisa la sección de cursos completados para descargar tus certificados.
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : (
                availableCourses.map((course) => (
                  <CourseCard key={course.id} course={course} onOpen={handleOpenCourse} />
                ))
              )}
            </div>
          )}
        </div>

        {/* Completed Courses Section */}
        {!isLoadingCourses && completedCourses.length > 0 && (
          <div className="mb-12 scroll-mt-24" ref={completedRef}>
            <h3 className="text-2xl font-bold text-[#1a2840] mb-6 flex items-center gap-2">
              <FileCheck className="w-6 h-6 text-green-600" />
              Cursos Completados
            </h3>
            
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {completedCourses.map((course) => (
                <Card key={course.id} className="group relative overflow-hidden border-2 border-green-100 hover:border-green-300 transition-all hover:shadow-md bg-white">
                  {/* Badge de "Completado" en la esquina */}
                  <div className="absolute top-0 right-0 p-1.5 bg-green-500 text-white rounded-bl-xl shadow-sm z-10">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>

                  <CardContent className="p-5">
                    <div className="flex flex-col h-full space-y-4">
                      {/* Icono y Título */}
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600 flex-shrink-0 group-hover:scale-110 transition-transform">
                          <GraduationCap className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-gray-900 line-clamp-2 leading-tight mb-1">
                            {course.title}
                          </h4>
                          <p className="text-[10px] text-green-600 font-black uppercase tracking-wider">Certificado Disponible</p>
                        </div>
                      </div>

                      {/* Botones Compactos */}
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleOpenCourse(course.id!)}
                          className="h-9 text-[11px] font-bold hover:bg-gray-100"
                        >
                          Repasar
                        </Button>
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => handleDownloadCertificate(course)}
                          className="h-9 text-[11px] font-black bg-green-600 hover:bg-green-700 shadow-sm"
                        >
                          <Download className="w-3.5 h-3.5 mr-1.5" />
                          Diploma
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
