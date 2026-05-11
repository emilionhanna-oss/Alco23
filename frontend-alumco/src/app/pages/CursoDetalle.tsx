import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { buildApiUrl, API_CONFIG } from '../config/api.config';
import { userService, courseService } from '../services/apiService';
import { QuizResponder } from '../components/quiz';
import type { CursoBackend, CursoModulo } from '../types';
import { 
  FileText, Download, CheckCircle2, ChevronLeft, Lock, ArrowRight, 
  PlayCircle, BookOpen, ClipboardList, Clock, UserCheck, AlertTriangle, Send,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { transformYoutubeUrl } from '../utils/moduleUtils';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; curso: CursoBackend };

const PRACTICA_PRESENCIAL_MESSAGE =
  'Se le ha notificado a tu instructor que has finalizado la parte teórica. Por favor, espera a ser contactado para coordinar tu evaluación práctica presencial';

type ModuloTipo = 'video' | 'lectura' | 'quiz' | 'practica_presencial';

type LecturaContenido = {
  archivoNombre?: string;
  instrucciones?: string;
};

type QuizTipoPregunta = 'seleccion_multiple' | 'respuesta_escrita';

type QuizOpcion = {
  texto: string;
  correcta: boolean;
};

type QuizPregunta = {
  tipo: QuizTipoPregunta;
  pregunta: string;
  opciones?: QuizOpcion[];
  respuestaModelo?: string;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    !!value &&
    typeof value === 'object' &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
  );
}

function normalizeModulo(
  modulo: CursoModulo
): Required<Pick<CursoModulo, 'tituloModulo' | 'tipo' | 'contenido'>> & CursoModulo {
  const tipo = (modulo.tipo || 'lectura') as ModuloTipo;
  const raw = modulo.contenido;

  const contenido =
    tipo === 'practica_presencial'
      ? PRACTICA_PRESENCIAL_MESSAGE
      : raw ?? (tipo === 'quiz' ? [] : '');

  return {
    ...modulo,
    tituloModulo: modulo.tituloModulo || 'Módulo sin título',
    tipo,
    contenido,
  };
}

export default function CursoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [hasProfileSignature, setHasProfileSignature] = useState(false);
  const [viendoQuizModuloId, setViendoQuizModuloId] = useState<string | null>(null);
  const [isMarkingReady, setIsMarkingReady] = useState<number | null>(null);
  const [isDownloadingCert, setIsDownloadingCert] = useState(false);

  const backTo = useMemo(() => {
    const raw = (location.state as any)?.from;
    if (typeof raw !== 'string') return '/panel';

    // Whitelist de rutas internas para evitar navegación inesperada
    const allowed = new Set([
      '/panel',
      '/admin',
      '/admin/mi-aprendizaje',
      '/admin/gestion-capacitaciones',
      '/admin/usuarios',
    ]);

    if (allowed.has(raw)) return raw;

    // Permitir subrutas admin si más adelante se agregan
    if (raw.startsWith('/admin/')) return raw;

    return '/panel';
  }, [location.state]);

  const cursoId = useMemo(() => (id ? String(id) : ''), [id]);

  const loadCurso = useCallback(async (showLoading = true) => {
    if (!cursoId) {
      setState({ status: 'error', message: 'Falta el ID del curso.' });
      return;
    }

    if (showLoading) setState({ status: 'loading' });

    try {
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.COURSES.DETAIL(cursoId)), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Curso no encontrado. Verifica el ID en la URL.');
        }
        throw new Error(`Error del servidor (${response.status}).`);
      }

      const data = (await response.json()) as CursoBackend;
      setState({ status: 'ready', curso: data });
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : 'No se pudo cargar el curso.',
      });
    }
  }, [cursoId]);

  useEffect(() => {
    loadCurso();
  }, [loadCurso]);

  useEffect(() => {
    let isMounted = true;

    const loadSignature = async () => {
      try {
        const response = await userService.getProfile();
        if (!isMounted || !response.success || !response.data) return;

        const firmaTexto = String(response.data.firmaTexto || '').trim();
        const firmaImagen = String(response.data.firmaImagenDataUrl || '').trim();
        const hasImage = /^data:image\/(png|jpeg|jpg);base64,/i.test(firmaImagen);

        setHasProfileSignature(Boolean(firmaTexto) || hasImage);
      } catch {
        if (!isMounted) return;
        setHasProfileSignature(false);
      }
    };

    loadSignature();

    return () => {
      isMounted = false;
    };
  }, []);

  if (state.status === 'loading') {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-7 bg-gray-200 rounded w-2/3" />
            <div className="h-4 bg-gray-100 rounded w-full" />
          </CardHeader>
          <CardContent>
            <div className="h-4 bg-gray-100 rounded w-1/2 mb-3" />
            <div className="h-32 bg-gray-200 rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Curso</CardTitle>
            <CardDescription>No se pudo cargar el detalle</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-700">{state.message}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(backTo)}>
                Volver
              </Button>
              <Button onClick={() => window.location.reload()}>Reintentar</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { curso } = state;
  const modulos = (curso.modulos || []).map(normalizeModulo);
  
  // Force re-render on reload
  const forceRenderKey = Math.random();
  const heroImageUrl = curso.imagen
    ? String(curso.imagen).startsWith('http')
      ? curso.imagen
      : buildApiUrl(String(curso.imagen))
    : undefined;
  const completedFromFlags = modulos.filter((m) => m.completado === true).length;
  const hasAnyCompletionFlag = modulos.some((m) => typeof m.completado === 'boolean');
  const completedCount = hasAnyCompletionFlag
    ? completedFromFlags
    : Math.max(
        0,
        Math.min(
          modulos.length,
          Math.floor(Math.max(0, Math.min(100, Number(curso.progreso ?? 0))) / 100 * modulos.length)
        )
      );
  const computedProgress = modulos.length > 0 ? Math.round((completedCount / modulos.length) * 100) : 0;
  const progressValue = hasAnyCompletionFlag
    ? computedProgress
    : Math.max(0, Math.min(100, Number(curso.progreso ?? 0)));

  const handleMarcarListo = async (moduloId: number) => {
    setIsMarkingReady(moduloId);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(buildApiUrl(`/api/cursos/${curso.id}/modulos/${moduloId}/completar`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('¡Módulo completado!');
        loadCurso(false);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Error al marcar el módulo');
      }
    } catch (err) {
      toast.error('Error de conexión');
    } finally {
      setIsMarkingReady(null);
    }
  };

  const handleDownloadCertificado = async () => {
    setIsDownloadingCert(true);
    try {
      const token = localStorage.getItem('token') || '';
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.COURSES.DETAIL(cursoId)) + '/certificado', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'No se pudo descargar el certificado');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Certificado_${curso.titulo}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Certificado descargado con éxito');
    } catch (err: any) {
      toast.error(err.message || 'Error al descargar');
    } finally {
      setIsDownloadingCert(false);
    }
  };

  const handleSolicitarPractica = async (moduloId: number) => {
    try {
      const res = await courseService.solicitarPractica(moduloId);
      if (res.success) {
        toast.success('Solicitud enviada al instructor');
        // Actualización fluida sin recarga
        loadCurso(false);
      } else {
        toast.error(res.error || 'No se pudo enviar la solicitud');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al conectar con el servidor');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <Card className="overflow-hidden mb-4">
        {heroImageUrl ? (
          <div
            className="h-44 sm:h-56 bg-gray-200"
            style={{
              backgroundImage: `url(\"${heroImageUrl}\")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        ) : (
          <div className="h-44 sm:h-56 bg-gradient-to-br from-gray-200 to-gray-100" />
        )}
      </Card>

      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border rounded-lg p-4 mb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-[#1a2840] truncate">{curso.titulo}</h1>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{curso.descripcion}</p>
          </div>
          <Button variant="outline" onClick={() => navigate(backTo)}>Volver</Button>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-gray-700">Progreso</span>
            <span className="text-xs font-bold text-blue-600">
              {progressValue}%{modulos.length > 0 ? ` • ${completedCount} de ${modulos.length} módulos` : ''}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressValue}%` }}
            />
          </div>
        </div>
      </div>

      {progressValue >= 100 && modulos.length > 0 ? (
        hasProfileSignature ? (
          <Card className="border-emerald-200 bg-emerald-50 mb-6">
            <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-emerald-900">¡Felicidades! Completaste este curso.</div>
                <div className="text-sm text-emerald-900/90">
                  Ya puedes descargar tu certificado de participación.
                </div>
              </div>
              <Button 
                onClick={handleDownloadCertificado}
                disabled={isDownloadingCert}
              >
                {isDownloadingCert ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Descargar Certificado
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-amber-200 bg-amber-50 mb-6">
            <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-sm font-semibold text-amber-900">
                Configura tu firma en el Perfil para descargar tu certificado
              </div>
              <Button variant="outline" onClick={() => navigate('/perfil')}>
                Ir a Perfil
              </Button>
            </CardContent>
          </Card>
        )
      ) : null}

      {modulos.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Módulos</CardTitle>
            <CardDescription>Este curso aún no tiene módulos publicados.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-4">
          {modulos.map((modulo, index) => {
            const isCompleted = index < completedCount;
            const isCurrent = index === completedCount && completedCount < modulos.length;



            // Camino marcado hasta el módulo actual (incluye el actual)
            const isPathToThisMarked = index <= completedCount;
            const isPathAfterThisMarked = index < completedCount;

            return (
              <div key={`${modulo.tituloModulo}-${index}`} className="relative pl-10">
                {/* Rail (top segment) */}
                {index > 0 ? (
                  <div
                    className={`absolute left-3 top-0 h-6 w-px ${
                      isPathToThisMarked ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                ) : null}

                {/* Rail (bottom segment) */}
                {index < modulos.length - 1 ? (
                  <div
                    className={`absolute left-3 top-6 bottom-0 w-px ${
                      isPathAfterThisMarked ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                ) : null}

                {/* Dot */}
                <div
                  className={`absolute left-3 top-6 -translate-x-1/2 -translate-y-1/2 h-3 w-3 rounded-full border ${
                    isCompleted
                      ? 'bg-blue-600 border-blue-600'
                      : isCurrent
                        ? 'bg-white border-blue-600 ring-2 ring-blue-200'
                        : 'bg-white border-gray-300'
                  }`}
                  aria-label={isCompleted ? 'Módulo completado' : isCurrent ? 'Módulo en progreso' : 'Módulo pendiente'}
                />

                <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">{modulo.tituloModulo}</CardTitle>
                      <CardDescription>
                        Tipo: <span className="font-medium">{modulo.tipo}</span>
                        {isCompleted ? (
                          <span className="ml-2 text-xs font-medium text-blue-700">• Visto</span>
                        ) : (
                          <span className="ml-2 text-xs font-medium text-gray-500">• Pendiente</span>
                        )}
                        {modulo.tipo === 'practica_presencial' && !isCompleted ? (
                          <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                            Pendiente de Práctica
                          </span>
                        ) : null}
                      </CardDescription>
                    </div>
                      {modulo.materialDescargable ? (
                        <a
                          href={(() => {
                            const link = modulo.materialDescargable || '';
                            if (link.startsWith('http')) return link;
                            if (link.startsWith('/')) return buildApiUrl(link);
                            return buildApiUrl('/' + link);
                          })()}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download className="w-4 h-4" />
                          Descargar material
                        </a>
                      ) : null}
                  </div>
                </CardHeader>

                <CardContent>
                  {modulo.tipo === 'video' ? (
                    (() => {
                      let src = typeof modulo.contenido === 'string' ? modulo.contenido.trim() : '';

                      if (!src) {
                        return (
                          <div className="rounded-lg border bg-gray-50 p-4">
                            <p className="text-sm font-medium text-gray-900">Video</p>
                            <p className="text-sm text-gray-700 mt-2">No hay link de video configurado.</p>
                          </div>
                        );
                      }

                      // Transformar defensivamente si es YouTube
                      if ((src.includes('youtube.com') || src.includes('youtu.be')) && !src.includes('embed/')) {
                        src = transformYoutubeUrl(src);
                      }

                      const isLocalVideo = src.includes('/static/uploads/') || src.endsWith('.mp4');

                      return (
                        <div className="w-full max-w-4xl mx-auto aspect-video rounded-xl overflow-hidden bg-black shadow-2xl border border-gray-800">
                          {isLocalVideo ? (
                            <video 
                              src={src.startsWith('http') ? src : buildApiUrl(src)} 
                              controls 
                              className="w-full h-full"
                              controlsList="nodownload"
                            >
                              Tu navegador no soporta el elemento de video.
                            </video>
                          ) : (
                            <iframe
                              title={modulo.tituloModulo}
                              src={src}
                              className="w-full h-full border-0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          )}
                        </div>
                      );
                    })()
                  ) : modulo.tipo === 'lectura' ? (
                    (() => {
                      const raw = modulo.contenido;
                      const lectura: LecturaContenido = isPlainObject(raw)
                        ? {
                            archivoNombre: typeof raw.archivoNombre === 'string' ? raw.archivoNombre : undefined,
                            instrucciones: typeof raw.instrucciones === 'string' ? raw.instrucciones : undefined,
                          }
                        : typeof raw === 'string'
                          ? { instrucciones: raw }
                          : { instrucciones: '' };

                      return (
                        <div className="space-y-4">
                          <div className="prose max-w-none">
                            <p className="whitespace-pre-line text-gray-800 leading-relaxed">
                              {lectura.instrucciones || 'Sin instrucciones de lectura.'}
                            </p>
                          </div>

                          {/* Material Descargable / Visor de PDF */}
                          {modulo.materialDescargable && (
                            <div className="mt-4 space-y-4">
                              {modulo.materialDescargable.toLowerCase().endsWith('.pdf') ? (
                                <div className="rounded-xl overflow-hidden border border-gray-200 shadow-lg bg-gray-100 transition-all hover:shadow-xl">
                                  <div className="bg-gray-800 p-2.5 flex justify-between items-center">
                                    <span className="text-xs text-white font-medium ml-2 flex items-center">
                                      <FileText className="w-4 h-4 mr-2 text-red-400" /> 
                                      Documento de Lectura (PDF)
                                    </span>
                                    <div className="flex gap-3">
                                      <a 
                                        href={buildApiUrl(modulo.materialDescargable)} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-300 hover:text-blue-200 underline"
                                      >
                                        Pantalla Completa
                                      </a>
                                      <a 
                                        href={buildApiUrl(modulo.materialDescargable)} 
                                        download
                                        className="text-xs text-green-300 hover:text-green-200 underline"
                                      >
                                        Descargar
                                      </a>
                                    </div>
                                  </div>
                                  <iframe 
                                    src={buildApiUrl(modulo.materialDescargable)} 
                                    className="w-full h-[600px] border-none"
                                    title="Visor de Material"
                                  />
                                </div>
                              ) : (modulo.materialDescargable.toLowerCase().endsWith('.mp4') || modulo.materialDescargable.toLowerCase().endsWith('.webm')) ? (
                                <div className="w-full max-w-4xl mx-auto aspect-video rounded-xl overflow-hidden bg-black shadow-lg">
                                  <video 
                                    src={buildApiUrl(modulo.materialDescargable)} 
                                    controls 
                                    className="w-full h-full"
                                  />
                                </div>
                              ) : (
                                <div className="flex items-center p-4 rounded-xl border-2 border-blue-100 bg-blue-50/50 hover:bg-blue-50 transition-colors">
                                  <div className="p-3 bg-blue-100 rounded-xl mr-4 text-blue-600 shadow-sm">
                                    <Download className="w-6 h-6" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-bold text-blue-900">
                                      {lectura.archivoNombre || 'Material de apoyo'}
                                    </p>
                                    <p className="text-xs text-blue-700">Recurso descargable (TXT, Excel, PPT, ZIP, etc.)</p>
                                  </div>
                                  <Button 
                                    variant="default" 
                                    size="sm" 
                                    className="bg-blue-600 hover:bg-blue-700 shadow-md"
                                    asChild
                                  >
                                    <a href={buildApiUrl(modulo.materialDescargable)} target="_blank" rel="noopener noreferrer">
                                      <Download className="w-4 h-4 mr-2" />
                                      Descargar
                                    </a>
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ) : modulo.tipo === 'practica_presencial' ? (
                    <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/30 p-0 shadow-sm transition-all hover:shadow-md">
                      {/* Cabecera del Ticket */}
                      <div className="flex items-center justify-between bg-amber-500 px-6 py-3 text-white">
                        <div className="flex items-center gap-2">
                          <ClipboardList className="w-5 h-5" />
                          <span className="text-sm font-black uppercase tracking-wider">Módulo de Práctica Presencial</span>
                        </div>
                        <div className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase backdrop-blur-sm">
                          Fase Final
                        </div>
                      </div>

                      <div className="p-6">
                        <div className="grid gap-6 md:grid-cols-[1fr_200px]">
                          {/* Información */}
                          <div className="space-y-4">
                            <h3 className="text-xl font-bold text-amber-900">Evaluación de Competencias</h3>
                            <p className="text-sm leading-relaxed text-amber-800/80">
                              Este módulo requiere tu presencia física en las instalaciones de Alumco. 
                              El instructor evaluará tus habilidades prácticas desarrolladas durante este curso.
                            </p>

                            <div className="rounded-xl bg-white/60 p-4 border border-amber-100 shadow-inner">
                              <p className="text-xs font-bold text-amber-700 uppercase mb-2 flex items-center gap-2">
                                <AlertTriangle className="w-3 h-3" /> Instrucciones del Instructor
                              </p>
                              <p className="text-sm italic text-amber-900">
                                {modulo.contenido && typeof modulo.contenido === 'string' 
                                  ? modulo.contenido 
                                  : PRACTICA_PRESENCIAL_MESSAGE}
                              </p>
                            </div>
                          </div>

                          {/* Estado / Acción */}
                          <div className="flex flex-col items-center justify-center rounded-xl bg-white p-4 shadow-sm border border-amber-100">
                            {modulo.practicaEstado === 'aprobado' ? (
                              <div className="text-center space-y-2">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                                  <UserCheck className="w-6 h-6" />
                                </div>
                                <p className="text-sm font-bold text-green-700 uppercase">Aprobado</p>
                                <p className="text-[10px] text-gray-500 font-medium">¡Felicidades! Has completado esta fase.</p>
                              </div>
                            ) : modulo.practicaEstado === 'pendiente' ? (
                              <div className="text-center space-y-3">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 animate-pulse">
                                  <Clock className="w-6 h-6" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-blue-700 uppercase">Solicitado</p>
                                  <p className="text-[10px] text-gray-500 font-medium mt-1">Esperando respuesta del instructor...</p>
                                </div>
                                <div className="h-1 w-full bg-blue-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-500 w-1/2 animate-[shimmer_2s_infinite]" />
                                </div>
                              </div>
                            ) : (
                              <div className="text-center space-y-4">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                                  <Send className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[10px] font-bold text-gray-400 uppercase">Acción Requerida</p>
                                  <p className="text-xs font-medium text-amber-800">¿Estás listo?</p>
                                </div>
                                <Button 
                                  size="sm" 
                                  className="w-full bg-amber-600 hover:bg-amber-700 font-bold shadow-lg shadow-amber-200"
                                  onClick={() => modulo.id && handleSolicitarPractica(modulo.id)}
                                >
                                  Solicitar Práctica
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Decoración del Ticket (círculos laterales) */}
                      <div className="absolute top-1/2 -left-3 h-6 w-6 -translate-y-1/2 rounded-full bg-white border-r-2 border-dashed border-amber-200" />
                      <div className="absolute top-1/2 -right-3 h-6 w-6 -translate-y-1/2 rounded-full bg-white border-l-2 border-dashed border-amber-200" />
                    </div>
                  ) : (
                    (() => {
                      // Si es quiz - mostrar directamente si no está completado
                      const esCompletado = isCompleted;
                      const estaBloqueado = false; // TODO: obtener del estado real en FASE 3

                      // DEBUG
                      console.log('Quiz rendering:', {
                        index,
                        completedCount,
                        isCompleted,
                        esCompletado,
                        estaBloqueado,
                        'modulo.id': modulo.id,
                        'tipo modulo.id': typeof modulo.id,
                        showQuizResponder: !esCompletado && !estaBloqueado && modulo.id
                      });

                      // Si el quiz no está completado, mostrar el QuizResponder directamente (interactivo)
                      if (!esCompletado && !estaBloqueado && modulo.id) {
                        return (
                          <QuizResponder
                            modulo_id={modulo.id}
                            onVolver={() => setViendoQuizModuloId(null)}
                          />
                        );
                      }

                      // Vista previa estática (solo si está completado o bloqueado)
                      const raw = modulo.contenido;
                      const preguntas = Array.isArray(raw) ? (raw as QuizPregunta[]) : [];

                      return (
                        <div className="space-y-4">
                          {/* Descripción del quiz */}
                          <div className="rounded-lg border bg-blue-50 p-4">
                            <p className="text-sm font-medium text-blue-900">Actividad tipo Quiz - Completado</p>
                            <p className="text-xs text-blue-800 mt-1">
                              {preguntas.length} pregunta{preguntas.length === 1 ? '' : 's'} • Calificación automática
                            </p>
                          </div>

                          {/* Vista previa (solo si está completado) */}
                          {preguntas.length > 0 && (
                            <div className="rounded-lg border bg-gray-50 p-4 max-h-48 overflow-y-auto">
                              <p className="text-xs font-medium text-gray-700 mb-3">Vista previa de preguntas:</p>
                              <div className="space-y-2">
                                {preguntas.slice(0, 3).map((p, i) => (
                                  <div key={i} className="text-sm text-gray-700">
                                    <span className="font-medium">P{i + 1}:</span> {p.pregunta || 'Sin enunciado'}
                                  </div>
                                ))}
                                {preguntas.length > 3 && (
                                  <div className="text-xs text-gray-600 italic">
                                    +{preguntas.length - 3} pregunta(s) más...
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {estaBloqueado && (
                            <div className="rounded-lg border border-red-300 bg-red-50 p-3">
                              <p className="text-sm font-semibold text-red-900">🔒 Bloqueado temporalmente</p>
                            </div>
                          )}

                          {esCompletado && (
                            <Button
                              onClick={() => setViendoQuizModuloId(modulo.id)}
                              variant="outline"
                              className="w-full"
                            >
                              Ver Resultado
                            </Button>
                          )}
                        </div>
                      );
                    })()
                  )}

                  {/* Botón Marcar Listo para contenido manual */}
                  {(modulo.tipo === 'video' || modulo.tipo === 'lectura') && !isCompleted && (
                    <div className="mt-6 flex justify-end">
                      <Button 
                        onClick={() => handleMarcarListo(modulo.id!)}
                        disabled={isMarkingReady === modulo.id}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isMarkingReady === modulo.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Guardando...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Marcar como listo
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
