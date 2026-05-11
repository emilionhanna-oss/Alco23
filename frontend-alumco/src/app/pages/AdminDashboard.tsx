import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import {
  BookOpen,
  ChartBar,
  GraduationCap,
  LogOut,
  Settings,
  ShieldAlert,
  Users,
  UserCog,
  Building2,
  FileArchive,
  Download,
  AlertCircle
} from 'lucide-react';
import { BACKEND_URL, buildApiUrl } from '../config/api.config';
import { userService } from '../services/apiService';
import { toast } from 'sonner';
import { Checkbox } from '../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { ScrollArea } from '../components/ui/scroll-area';

const LOGO_SRC = `${BACKEND_URL}/static/alumco-logo.png`;

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [logoOk, setLogoOk] = useState(true);
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const [isBulkDownloadOpen, setIsBulkDownloadOpen] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [hasProfileSignature, setHasProfileSignature] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadSignature = async () => {
      try {
        const response = await userService.getProfile();
        if (mounted && response.success && response.data) {
          const firmaTexto = String(response.data.firmaTexto || '').trim();
          const firmaImagen = String(response.data.firmaImagenDataUrl || '').trim();
          const hasImage = /^data:image\/(png|jpeg|jpg);base64,/i.test(firmaImagen);
          setHasProfileSignature(Boolean(firmaTexto) || hasImage);
        }
      } catch (err) {
        console.error('Error checking signature:', err);
      }
    };

    const loadPendingUsers = async () => {
      try {
        const response = await userService.getUsers();
        if (!mounted || !response.success || !response.data) return;

        const pending = response.data.filter(
          (u) => String(u.estado || '').toLowerCase() === 'pendiente'
        ).length;

        setPendingUsersCount(pending);
      } catch {
        if (!mounted) return;
        setPendingUsersCount(0);
      }
    };

    const loadCourses = async () => {
      try {
        const response = await fetch(buildApiUrl('/api/cursos?all=true'), {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (mounted && Array.isArray(data)) setCourses(data);
      } catch (err) {
        console.error('Error cargando cursos:', err);
      }
    };

    loadPendingUsers();
    loadCourses();
    loadSignature();

    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleBulkDownload = async () => {
    if (selectedCourseIds.length === 0) {
      toast.error('Selecciona al menos un curso');
      return;
    }

    setIsDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl('/api/cursos/certificados/descarga-masiva'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cursoIds: selectedCourseIds.map(Number) })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al generar la descarga');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificados_alumco_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Descarga iniciada con éxito');
      setIsBulkDownloadOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Error en la descarga');
    } finally {
      setIsDownloading(false);
    }
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
                Administración · Portal de Capacitación ELEAM
              </div>
            </div>

            <Button onClick={handleLogout} variant="outline" className="flex items-center gap-2">
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
              <UserCog className="w-8 h-8" />
              <h2 className="text-2xl sm:text-3xl">Panel de Administración</h2>
            </div>
            <p className="text-lg text-blue-100">
              {(() => {
                const displayName = user?.nombreCompleto || user?.name;
                const genero = (user as any)?.genero as string | undefined;
                const saludo =
                  genero === 'femenino'
                    ? 'Bienvenida'
                    : genero === 'masculino'
                      ? 'Bienvenido'
                      : 'Te damos la bienvenida';
                return `${saludo}${displayName ? `, ${displayName}` : ''}. Gestiona la plataforma y el seguimiento de capacitación.`;
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

        {/* Admin Cards (3x2 en escritorio) */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-100 rounded-lg">
                  <ShieldAlert className="w-6 h-6 text-amber-700" />
                </div>
                <div>
                  <CardTitle>Alertas de Sistema</CardTitle>
                  <CardDescription>Estado de ONG y ELEAM</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Notificaciones sobre conectividad, incidencias operativas y avisos relevantes para la gestión.
              </p>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/admin/mi-aprendizaje')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') navigate('/admin/mi-aprendizaje');
            }}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Mi Aprendizaje</CardTitle>
                  <CardDescription>Cursos obligatorios</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Cursos internos que el Administrador debe completar como parte del equipo Alumco.
              </p>
            </CardContent>
          </Card>

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
                  <CardTitle>Gestión de Capacitación</CardTitle>
                  <CardDescription>Yo Profesor</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Administra, crea y organiza cursos para colaboradores y personal ELEAM.</p>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/admin/dashboard-metrics')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') navigate('/admin/dashboard-metrics');
            }}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <ChartBar className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle>Panel de Control</CardTitle>
                  <CardDescription>Métricas y reportes</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Acceso a una vista detallada con indicadores, avances y reportes por curso y por ELEAM.
              </p>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/admin/usuarios')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') navigate('/admin/usuarios');
            }}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-cyan-100 rounded-lg">
                  <Users className="w-6 h-6 text-cyan-700" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <span>Centro de Usuarios</span>
                    {pendingUsersCount > 0 ? (
                      <Badge className="bg-red-600 text-white border-red-700">{pendingUsersCount}</Badge>
                    ) : null}
                  </CardTitle>
                  <CardDescription>Colaboradores y progreso</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Listado de usuarios, asignación de cursos y seguimiento del progreso individual y grupal.
              </p>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/admin/sedes')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') navigate('/admin/sedes');
            }}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-teal-100 rounded-lg">
                  <Building2 className="w-6 h-6 text-teal-700" />
                </div>
                <div>
                  <CardTitle>Gestión de Sedes</CardTitle>
                  <CardDescription>Ubicaciones ELEAM</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Añade y modifica sedes. Necesario para categorizar a los usuarios y filtrar reportes.
              </p>
            </CardContent>
          </Card>

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
                <div className="p-3 bg-slate-100 rounded-lg">
                  <Settings className="w-6 h-6 text-slate-700" />
                </div>
                <div>
                  <CardTitle>Mi Perfil</CardTitle>
                  <CardDescription>Datos y certificados</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Administra tu información, firma y descarga tus certificados.</p>
            </CardContent>
          </Card>
          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer border-blue-200 bg-blue-50/30"
            role="button"
            tabIndex={0}
            onClick={() => setIsBulkDownloadOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setIsBulkDownloadOpen(true);
            }}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600 rounded-lg">
                  <FileArchive className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle>Descarga Masiva</CardTitle>
                  <CardDescription>Certificados en ZIP</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Descarga todos los certificados de uno o varios cursos para auditorías.</p>
            </CardContent>
          </Card>
        </div>

        {/* Diálogo Descarga Masiva */}
        <Dialog open={isBulkDownloadOpen} onOpenChange={setIsBulkDownloadOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Descarga Masiva de Certificados</DialogTitle>
              <DialogDescription>
                Selecciona los cursos de los cuales deseas descargar todas las certificaciones emitidas.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <Label className="text-xs font-semibold text-gray-500 uppercase mb-3 block">
                Cursos Disponibles ({courses.length})
              </Label>
              <ScrollArea className="h-64 border rounded-md p-2">
                <div className="space-y-2">
                  {courses.map((course) => (
                    <div key={course.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-md transition-colors border-b last:border-0 border-gray-100">
                      <Checkbox 
                        id={`course-${course.id}`}
                        checked={selectedCourseIds.includes(String(course.id))}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedCourseIds(prev => [...prev, String(course.id)]);
                          } else {
                            setSelectedCourseIds(prev => prev.filter(id => id !== String(course.id)));
                          }
                        }}
                      />
                      <label 
                        htmlFor={`course-${course.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                      >
                        {course.titulo}
                      </label>
                    </div>
                  ))}
                  {courses.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-8">No hay cursos disponibles.</p>
                  )}
                </div>
              </ScrollArea>
            </div>

            <DialogFooter className="flex sm:justify-between items-center gap-4">
              <div className="text-xs text-gray-500 italic">
                {selectedCourseIds.length} curso(s) seleccionado(s)
              </div>
              <Button 
                onClick={handleBulkDownload} 
                disabled={isDownloading || selectedCourseIds.length === 0}
                className="bg-blue-600 hover:bg-blue-700 min-w-[140px]"
              >
                {isDownloading ? (
                  <>
                    <Settings className="w-4 h-4 animate-spin mr-2" />
                    Generando ZIP...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Descargar ZIP
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
