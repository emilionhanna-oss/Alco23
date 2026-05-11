import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Toaster } from '../components/ui/sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { courseService } from '../services/apiService';
import type { CourseDetail, CursoModulo } from '../types';
import {
  PRACTICA_PRESENCIAL_MESSAGE,
  type ModuloTipo,
  type LecturaContenido,
  type QuizTipoPregunta,
  type QuizPregunta,
  type ModuloContenido,
  type EditModulo,
} from '../types/moduleTypes';
import { isPlainObject, coerceContenidoForTipo } from '../utils/moduleUtils';

export default function AdminEditorCurso() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  const courseId = useMemo(() => (id ? String(id) : ''), [id]);
  const isNewCourse = courseId === 'nuevo';
  const roles = Array.isArray((user as any)?.rol) ? (user as any).rol : [];
  const isAdminUser = roles.includes('admin');

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editModules, setEditModules] = useState<EditModulo[]>([]);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const editorScrollRef = useRef<HTMLDivElement>(null);

  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleType, setNewModuleType] = useState<ModuloTipo>('lectura');
  const [newModuleContent, setNewModuleContent] = useState('');
  const [newModuleFileName, setNewModuleFileName] = useState('');
  const [newModuleQuiz, setNewModuleQuiz] = useState<QuizPregunta[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isRedirectingAfterSave, setIsRedirectingAfterSave] = useState(false);
  const [isUploadingMaterial, setIsUploadingMaterial] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [baselineSnapshot, setBaselineSnapshot] = useState('');


  const currentSnapshot = useMemo(
    () =>
      JSON.stringify({
        editTitle,
        editDescription,
        editImage,
        editModules,
      }),
    [editTitle, editDescription, editImage, editModules]
  );

  const hasUnsavedChanges = baselineSnapshot !== '' && baselineSnapshot !== currentSnapshot;


  const redirectTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const roleLabel = isAdminUser ? 'Admin' : 'Profesor';
    const baseTitle = editTitle?.trim() ? editTitle.trim() : isNewCourse ? 'Nuevo curso' : 'Editar curso';
    document.title = `${roleLabel} · ${baseTitle} | Alumco`;
  }, [editTitle, isAdminUser, isNewCourse]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!courseId) {
        setLoadError('Falta el ID del curso.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      if (isNewCourse) {
        if (!isMounted) return;
        setEditTitle('');
        setEditDescription('');
        setEditImage('');
        setEditModules([]);
        setSelectedIndex(0);
        setBaselineSnapshot(
          JSON.stringify({
            editTitle: '',
            editDescription: '',
            editImage: '',
            editModules: [],
          })
        );
        setNewModuleTitle('');
        setNewModuleType('lectura');
        setNewModuleContent('');
        setNewModuleFileName('');
        setNewModuleQuiz([]);
        setIsLoading(false);
        return;
      }

      try {
        const response = await courseService.getCourseDetail(courseId);
        if (!response.success || !response.data) {
          throw new Error(response.error || 'No se pudo cargar el curso');
        }

        const detail = response.data as CourseDetail;
        const modulos = (detail.modulos || []) as CursoModulo[];

        if (!isMounted) return;

        const loadedTitle = detail.title || '';
        const loadedDescription = detail.description || '';
        const loadedImage = detail.image || '';
        setEditTitle(loadedTitle);
        setEditDescription(loadedDescription);
        setEditImage(loadedImage);

        const mapped: EditModulo[] = modulos.map((m) => {
          const tipo = (m.tipo || 'lectura') as ModuloTipo;

          if (tipo === 'practica_presencial') {
            return {
              tituloModulo: m.tituloModulo || 'Módulo sin título',
              tipo,
              contenido: PRACTICA_PRESENCIAL_MESSAGE,
              materialDescargable: m.materialDescargable,
            };
          }

          if (tipo === 'lectura') {
            const raw = (m as any).contenido;

            if (typeof raw === 'string') {
              return {
                tituloModulo: m.tituloModulo || 'Módulo sin título',
                tipo,
                contenido: { instrucciones: raw } satisfies LecturaContenido,
              };
            }

            if (isPlainObject(raw)) {
              return {
                tituloModulo: m.tituloModulo || 'Módulo sin título',
                tipo,
                contenido: {
                  archivoNombre: typeof raw.archivoNombre === 'string' ? raw.archivoNombre : undefined,
                  instrucciones: typeof raw.instrucciones === 'string' ? raw.instrucciones : undefined,
                } satisfies LecturaContenido,
              };
            }

            return {
              tituloModulo: m.tituloModulo || 'Módulo sin título',
              tipo,
              contenido: { instrucciones: '' } satisfies LecturaContenido,
              materialDescargable: m.materialDescargable,
            };
          }

          if (tipo === 'quiz') {
            const raw = (m as any).contenido;

            if (Array.isArray(raw)) {
              return {
                tituloModulo: m.tituloModulo || 'Módulo sin título',
                tipo,
                contenido: raw as QuizPregunta[],
                materialDescargable: m.materialDescargable,
              };
            }

            if (typeof raw === 'string') {
              try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                  return {
                    tituloModulo: m.tituloModulo || 'Módulo sin título',
                    tipo,
                    contenido: parsed as QuizPregunta[],
                  };
                }
              } catch {
                // ignore
              }
            }

            return {
              tituloModulo: m.tituloModulo || 'Módulo sin título',
              tipo,
              contenido: [] as QuizPregunta[],
            };
          }

          // video
          return {
            tituloModulo: m.tituloModulo || 'Módulo sin título',
            tipo,
            contenido: typeof (m as any).contenido === 'string' ? (m as any).contenido : '',
          };
        });

        setEditModules(mapped);
        setSelectedIndex(0);

        setBaselineSnapshot(
          JSON.stringify({
            editTitle: loadedTitle,
            editDescription: loadedDescription,
            editImage: loadedImage,
            editModules: mapped,
          })
        );

        setNewModuleTitle('');
        setNewModuleType('lectura');
        setNewModuleContent('');
        setNewModuleFileName('');
        setNewModuleQuiz([]);
      } catch (e) {
        if (!isMounted) return;
        setLoadError(e instanceof Error ? e.message : 'No se pudo cargar el curso');
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [courseId, isNewCourse]);


  const updateModule = (index: number, patch: Partial<EditModulo>) => {
    setEditModules((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  };

  const removeModule = (index: number) => {
    const name = editModules[index]?.tituloModulo || `#${index + 1}`;
    const ok = window.confirm(
      `¿Estás seguro que deseas eliminar el módulo ${name}?\n\nSe perderán todos los datos de este módulo si guardas el curso.`
    );
    if (!ok) return;

    setEditModules((prev) => prev.filter((_, i) => i !== index));
    setSelectedIndex((prev) => {
      if (index < prev) return prev - 1;
      if (index === prev) return Math.max(0, prev - 1);
      return prev;
    });
  };

  const moveModule = (from: number, to: number) => {
    setEditModules((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy;
    });

    setSelectedIndex((prev) => {
      if (prev === from) return to;
      if (from < prev && to >= prev) return prev - 1;
      if (from > prev && to <= prev) return prev + 1;
      return prev;
    });
  };

  const addModule = () => {
    const tituloModulo = newModuleTitle.trim();
    if (!tituloModulo) return;

    const tipo = newModuleType;

    const contenido: ModuloContenido = (() => {
      if (tipo === 'practica_presencial') return PRACTICA_PRESENCIAL_MESSAGE;
      if (tipo === 'video') return '';
      if (tipo === 'lectura') {
        return {
          instrucciones: 'Escribe aquí las instrucciones de lectura...',
        } satisfies LecturaContenido;
      }
      return []; // Quiz vacío
    })();

    setEditModules((prev) => {
      const next = [...prev, { tituloModulo, tipo, contenido }];
      setSelectedIndex(next.length - 1); // Seleccionar el nuevo módulo automáticamente
      
      // Animación: Scroll al inicio del editor
      setTimeout(() => {
        editorScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);

      return next;
    });

    setNewModuleTitle('');
    setNewModuleType('lectura');
  };

  const selectedModule = editModules[selectedIndex];


  const handleSave = async () => {
    if (!courseId || isRedirectingAfterSave) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const modulosPayload = editModules.map((m) => ({
        tituloModulo: m.tituloModulo,
        tipo: m.tipo,
        contenido: m.tipo === 'practica_presencial' ? PRACTICA_PRESENCIAL_MESSAGE : m.contenido,
        materialDescargable: m.materialDescargable,
      }));

      if (isNewCourse) {
        const createResponse = await courseService.createCourse({
          titulo: editTitle,
          descripcion: editDescription,
          imagen: editImage,
        });

        if (!createResponse.success || !createResponse.data?.id) {
          setSaveError(createResponse.error || 'No se pudo crear el curso');
          return;
        }

        if (modulosPayload.length > 0) {
          const updateResponse = await courseService.updateCourse(String(createResponse.data.id), {
            titulo: editTitle,
            descripcion: editDescription,
            imagen: editImage,
            modulos: modulosPayload,
          });

          if (!updateResponse.success) {
            setSaveError(updateResponse.error || 'No se pudo guardar');
            return;
          }
        }
      } else {
        const response = await courseService.updateCourse(courseId, {
          titulo: editTitle,
          descripcion: editDescription,
          imagen: editImage,
          modulos: editModules.map((m) => ({
            tituloModulo: m.tituloModulo,
            tipo: m.tipo,
            contenido: m.contenido,
            materialDescargable: m.materialDescargable,
          })),
        });

        if (!response.success) {
          setSaveError(response.error || 'No se pudo guardar');
          return;
        }
      }

      setBaselineSnapshot(currentSnapshot);

      const courseName = editTitle?.trim() ? editTitle.trim() : 'Sin título';
      const actionLabel = isNewCourse ? 'creado' : 'guardado';
      toast.success(`¡Curso ${courseName} ${actionLabel} correctamente!`);

      setIsRedirectingAfterSave(true);

      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current);
      }

      redirectTimerRef.current = window.setTimeout(() => {
        navigate(isAdminUser ? '/admin/gestion-capacitaciones' : '/profesor');
      }, 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!courseId || isDeleting || isRedirectingAfterSave) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await courseService.deleteCourse(courseId);
      if (!response.success) {
        setDeleteError(response.error || 'No se pudo eliminar el curso');
        return;
      }

      const courseName = editTitle?.trim() ? editTitle.trim() : 'Sin título';
      toast.success(`Curso ${courseName} eliminado correctamente.`);

      setIsRedirectingAfterSave(true);

      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current);
      }

      redirectTimerRef.current = window.setTimeout(() => {
        navigate('/admin/gestion-capacitaciones');
      }, 2000);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBackToCourses = () => {
    if (isSaving || isDeleting || isRedirectingAfterSave) return;

    if (hasUnsavedChanges) {
      const ok = window.confirm(
        'Tienes cambios sin guardar. ¿Estás seguro que deseas salir?\n\nSi sales ahora, perderás los cambios.'
      );
      if (!ok) return;
    }

    navigate(isAdminUser ? '/admin/gestion-capacitaciones' : '/profesor');
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSaving || isDeleting || isRedirectingAfterSave) return;
      if (!hasUnsavedChanges) return;

      e.preventDefault();
      // Chrome requiere asignar returnValue para mostrar el diálogo
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, isDeleting, isRedirectingAfterSave, isSaving]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      <Toaster richColors />
      <header className="sticky top-0 z-20 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm text-gray-600">
                {isAdminUser ? 'Admin' : 'Profesor'} · Editor de Curso
              </div>
              <h1 className="text-xl font-bold text-[#1a2840] truncate">
                {editTitle?.trim()
                  ? editTitle
                  : isNewCourse
                    ? 'Nuevo curso'
                    : 'Editar curso'}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleBackToCourses}
                disabled={isSaving || isDeleting || isRedirectingAfterSave}
              >
                {isNewCourse ? 'Cancelar' : 'Volver a cursos'}
              </Button>

              {isAdminUser && !isNewCourse ? (
                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      disabled={isSaving || isDeleting || isRedirectingAfterSave || isLoading || !!loadError}
                    >
                      Eliminar curso
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Eliminar curso</AlertDialogTitle>
                      <AlertDialogDescription>
                        ¿Estás seguro que deseas eliminar este curso? Se perderán todos los datos.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isDeleting || isRedirectingAfterSave}>Cancelar</AlertDialogCancel>
                      <AlertDialogAction asChild>
                        <Button
                          variant="destructive"
                          onClick={() => {
                            setIsDeleteDialogOpen(false);
                            void handleDeleteCourse();
                          }}
                          disabled={isDeleting || isRedirectingAfterSave}
                        >
                          {isDeleting ? 'Eliminando…' : 'Sí, eliminar'}
                        </Button>
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}

              <Button
                onClick={handleSave}
                disabled={isSaving || isDeleting || isRedirectingAfterSave || isLoading || !!loadError}
              >
                {isSaving
                  ? isNewCourse
                    ? 'Creando…'
                    : 'Guardando…'
                  : isRedirectingAfterSave
                    ? 'Redirigiendo…'
                    : isNewCourse
                      ? 'Crear curso'
                      : 'Guardar'}
              </Button>
            </div>
          </div>

          {saveError ? (
            <div className="mt-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md p-3">
              {saveError}
            </div>
          ) : null}

          {deleteError ? (
            <div className="mt-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md p-3">
              {deleteError}
            </div>
          ) : null}
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto h-full">
          <div className="h-full flex">
            <aside className="w-[320px] shrink-0 border-r bg-white overflow-y-auto">
              <div className="p-4 space-y-4">
                <div>
                  <div className="text-sm font-semibold text-gray-900">Curso</div>
                  <div className="text-xs text-gray-600">Datos generales</div>
                </div>

                {isLoading ? (
                  <div className="text-sm text-gray-600">Cargando…</div>
                ) : loadError ? (
                  <div className="text-sm text-rose-700">{loadError}</div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs font-medium text-gray-700 mb-1">Título</div>
                      <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                    </div>

                    <div>
                      <div className="text-xs font-medium text-gray-700 mb-1">Descripción</div>
                      <Textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="min-h-[90px]"
                      />
                    </div>

                    <div>
                      <div className="text-xs font-medium text-gray-700 mb-1">Imagen (URL o ruta)</div>
                      <Input value={editImage} onChange={(e) => setEditImage(e.target.value)} />
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Módulos</div>
                      <div className="text-xs text-gray-600">Navega y reordena</div>
                    </div>
                    <div className="text-xs text-gray-600">{editModules.length}</div>
                  </div>

                  {editModules.length === 0 ? (
                    <div className="mt-3 text-sm text-gray-600 rounded-md border p-3">
                      Este curso aún no tiene módulos.
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {editModules.map((m, idx) => {
                        const isSelected = idx === selectedIndex;
                        return (
                          <div
                            key={`${m.tituloModulo}-${idx}`}
                            className={`rounded-md border p-2 ${
                              isSelected ? 'bg-purple-50 border-purple-200' : 'bg-white'
                            }`}
                          >
                            <button
                              type="button"
                              className="w-full text-left"
                              onClick={() => setSelectedIndex(idx)}
                              disabled={isSaving}
                            >
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {idx + 1}. {m.tituloModulo || 'Módulo'}
                              </div>
                              <div className="text-xs text-gray-600">{m.tipo}</div>
                            </button>

                            <div className="mt-2 flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => moveModule(idx, idx - 1)}
                                disabled={isSaving || idx === 0}
                              >
                                Subir
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => moveModule(idx, idx + 1)}
                                disabled={isSaving || idx === editModules.length - 1}
                              >
                                Bajar
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeModule(idx)}
                                disabled={isSaving}
                              >
                                Eliminar
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t space-y-3">
                  <div className="text-sm font-semibold text-gray-900">Añadir módulo</div>

                  <div>
                    <div className="text-xs font-medium text-gray-700 mb-1">Título</div>
                    <Input value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)} />
                  </div>

                  <div>
                    <div className="text-xs font-medium text-gray-700 mb-1">Tipo</div>
                    <Select
                      value={newModuleType}
                      onValueChange={(v) => {
                        const nextTipo = v as ModuloTipo;
                        setNewModuleType(nextTipo);
                        setNewModuleContent('');
                        setNewModuleFileName('');
                        setNewModuleQuiz([]);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="video">Video (Link)</SelectItem>
                        <SelectItem value="lectura">Documento (Lectura)</SelectItem>
                        <SelectItem value="quiz">Quiz</SelectItem>
                        <SelectItem value="practica_presencial">Práctica Presencial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="pt-2">
                    <p className="text-[10px] text-gray-500 italic">
                      * Una vez añadido, podrás editar todo su contenido en el panel de la derecha.
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={addModule} disabled={isSaving || !newModuleTitle.trim()}>
                      Añadir
                    </Button>
                  </div>
                </div>
              </div>
            </aside>

            <section ref={editorScrollRef} className="flex-1 overflow-y-auto scroll-smooth">
              <div className="p-6">
                {isLoading ? (
                  <Card className="animate-pulse">
                    <CardHeader>
                      <div className="h-5 bg-gray-200 rounded w-1/2" />
                      <div className="h-4 bg-gray-100 rounded w-full" />
                    </CardHeader>
                    <CardContent>
                      <div className="h-32 bg-gray-200 rounded" />
                    </CardContent>
                  </Card>
                ) : loadError ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Editor</CardTitle>
                      <CardDescription>No se pudo cargar el curso</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-gray-700">{loadError}</p>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={handleBackToCourses}>
                          Volver
                        </Button>
                        <Button onClick={() => window.location.reload()}>Reintentar</Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : !selectedModule ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Módulos</CardTitle>
                      <CardDescription>Agrega un módulo para comenzar.</CardDescription>
                    </CardHeader>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Editando módulo</div>
                      <div className="text-xs text-gray-600">#{selectedIndex + 1}</div>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">{selectedModule.tituloModulo}</CardTitle>
                        <CardDescription>
                          Tipo: <span className="font-medium">{selectedModule.tipo}</span>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="text-xs font-medium text-gray-700 mb-1">Título del módulo</div>
                          <Input
                            value={selectedModule.tituloModulo}
                            onChange={(e) => updateModule(selectedIndex, { tituloModulo: e.target.value })}
                            disabled={isSaving}
                          />
                        </div>

                        <div className="grid sm:grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs font-medium text-gray-700 mb-1">Tipo</div>
                            <Select
                              value={selectedModule.tipo}
                              onValueChange={(v) => {
                                const nextTipo = v as ModuloTipo;
                                updateModule(selectedIndex, {
                                  tipo: nextTipo,
                                  contenido: coerceContenidoForTipo(nextTipo, selectedModule.contenido),
                                });
                              }}
                              disabled={isSaving}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona tipo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="video">Video (Link)</SelectItem>
                                <SelectItem value="lectura">Documento (Lectura)</SelectItem>
                                <SelectItem value="quiz">Quiz</SelectItem>
                                <SelectItem value="practica_presencial">Práctica Presencial</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-medium text-gray-700 mb-1">Contenido</div>

                          {selectedModule.tipo === 'video' ? (
                            <Input
                              value={typeof selectedModule.contenido === 'string' ? selectedModule.contenido : ''}
                              onChange={(e) => updateModule(selectedIndex, { contenido: e.target.value })}
                              placeholder="Pega aquí el link/embed del video"
                              disabled={isSaving}
                            />
                          ) : selectedModule.tipo === 'practica_presencial' ? (
                            <Textarea value={PRACTICA_PRESENCIAL_MESSAGE} disabled className="min-h-[90px]" />
                          ) : selectedModule.tipo === 'lectura' ? (
                            <div className="space-y-4">
                              <div className="text-xs text-gray-600">
                                Sube un archivo (PDF, Excel, PPT, Imagen) para que los alumnos lo descarguen.
                              </div>

                              {/* Estado de carga */}
                              {isUploadingMaterial && (
                                <div className="flex items-center gap-2 text-sm text-blue-600 animate-pulse font-bold bg-blue-50 p-3 rounded-lg border border-blue-200">
                                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                  SUBIENDO ARCHIVO... Por favor espera.
                                </div>
                              )}

                              {/* Archivo ya subido o vinculado */}
                              {(() => {
                                const current: LecturaContenido = isPlainObject(selectedModule.contenido)
                                  ? (selectedModule.contenido as LecturaContenido)
                                  : typeof selectedModule.contenido === 'string'
                                    ? { instrucciones: selectedModule.contenido }
                                    : { instrucciones: '' };

                                return (selectedModule.materialDescargable || current.archivoNombre) ? (
                                  <div className="flex items-center p-4 rounded-xl border-2 border-green-200 bg-green-50 text-green-900 shadow-md transition-all">
                                    <div className="p-2.5 bg-green-200 rounded-xl mr-4 shadow-sm">
                                      <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-black truncate uppercase tracking-tight">
                                        {current.archivoNombre || 'Archivo vinculado'}
                                      </p>
                                      <p className="text-[11px] font-medium text-green-700">✅ Archivo listo en la nube</p>
                                    </div>
                                    <Button 
                                      variant="destructive" 
                                      size="sm" 
                                      className="h-8 shadow-sm ml-2"
                                      onClick={() => {
                                         updateModule(selectedIndex, {
                                           materialDescargable: undefined,
                                           contenido: { ...current, archivoNombre: undefined }
                                         });
                                      }}
                                    >
                                      Quitar
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="relative">
                                    <Input
                                      type="file"
                                      disabled={isSaving || isUploadingMaterial}
                                      className="cursor-pointer file:bg-blue-50 file:text-blue-700 file:border-0 file:rounded-md file:px-4 file:py-1 file:mr-4 file:font-bold hover:file:bg-blue-100 transition-all"
                                      onChange={async (e) => {
                                        const file = (e.target as HTMLInputElement).files?.[0];
                                        if (!file) return;

                                        setIsUploadingMaterial(true);
                                        try {
                                          const res = await courseService.uploadModuleMaterial(file);
                                          if (res.success && res.data) {
                                            const cur: LecturaContenido = isPlainObject(selectedModule.contenido)
                                              ? (selectedModule.contenido as LecturaContenido)
                                              : typeof selectedModule.contenido === 'string'
                                                ? { instrucciones: selectedModule.contenido }
                                                : { instrucciones: '' };

                                            updateModule(selectedIndex, {
                                              materialDescargable: res.data.url,
                                              contenido: {
                                                ...cur,
                                                archivoNombre: file.name,
                                              } satisfies LecturaContenido,
                                            });
                                            toast.success('¡Archivo subido con éxito!');
                                          } else {
                                            toast.error(res.error || 'Error al subir');
                                          }
                                        } catch (err) {
                                          console.error(err);
                                          toast.error('Error crítico al subir');
                                        } finally {
                                          setIsUploadingMaterial(false);
                                          e.target.value = '';
                                        }
                                      }}
                                    />
                                  </div>
                                );
                              })()}

                              <div>
                                <div className="text-xs font-medium text-gray-700 mb-1">Instrucciones para el alumno</div>
                                <Textarea
                                  value={(() => {
                                    const current: LecturaContenido = isPlainObject(selectedModule.contenido)
                                      ? (selectedModule.contenido as LecturaContenido)
                                      : typeof selectedModule.contenido === 'string'
                                        ? { instrucciones: selectedModule.contenido }
                                        : { instrucciones: '' };
                                    return current.instrucciones || '';
                                  })()}
                                  onChange={(e) => {
                                    const current: LecturaContenido = isPlainObject(selectedModule.contenido)
                                      ? (selectedModule.contenido as LecturaContenido)
                                      : typeof selectedModule.contenido === 'string'
                                        ? { instrucciones: selectedModule.contenido }
                                        : { instrucciones: '' };

                                    updateModule(selectedIndex, {
                                      contenido: {
                                        ...current,
                                        instrucciones: e.target.value,
                                      } satisfies LecturaContenido,
                                    });
                                  }}
                                  className="min-h-[120px] shadow-sm"
                                  placeholder="Escribe aquí las instrucciones de lectura..."
                                  disabled={isSaving}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {(() => {
                                const questions: QuizPregunta[] = Array.isArray(selectedModule.contenido)
                                  ? (selectedModule.contenido as QuizPregunta[])
                                  : [];

                                return (
                                  <div className="space-y-3">
                                    {questions.length === 0 ? (
                                      <div className="text-sm text-gray-600 rounded-md border p-3">
                                        Aún no hay preguntas.
                                      </div>
                                    ) : (
                                      <div className="space-y-3">
                                        {questions.map((q, qIndex) => (
                                          <div key={qIndex} className="rounded-md border p-3 space-y-3 bg-white">
                                            <div className="flex items-center justify-between gap-2">
                                              <div className="text-sm font-semibold text-gray-900">
                                                Pregunta {qIndex + 1}
                                              </div>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                  const next = questions.filter((_, i) => i !== qIndex);
                                                  updateModule(selectedIndex, { contenido: next });
                                                }}
                                                disabled={isSaving}
                                              >
                                                Quitar
                                              </Button>
                                            </div>

                                            <div className="grid sm:grid-cols-2 gap-3">
                                              <div>
                                                <div className="text-xs font-medium text-gray-700 mb-1">Tipo</div>
                                                <Select
                                                  value={q.tipo}
                                                  onValueChange={(v) => {
                                                    const nextTipo = v as QuizTipoPregunta;
                                                    const next = questions.map((qq, i) => {
                                                      if (i !== qIndex) return qq;
                                                      const base: QuizPregunta = { ...qq, tipo: nextTipo };

                                                      if (nextTipo === 'seleccion_multiple') {
                                                        return {
                                                          ...base,
                                                          opciones:
                                                            Array.isArray(base.opciones) && base.opciones.length > 0
                                                              ? base.opciones
                                                              : [
                                                                  { texto: 'Opción 1', correcta: true },
                                                                  { texto: 'Opción 2', correcta: false },
                                                                ],
                                                        };
                                                      }

                                                      return { ...base, opciones: undefined };
                                                    });
                                                    updateModule(selectedIndex, { contenido: next });
                                                  }}
                                                  disabled={isSaving}
                                                >
                                                  <SelectTrigger>
                                                    <SelectValue placeholder="Selecciona" />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="seleccion_multiple">Selección múltiple</SelectItem>
                                                    <SelectItem value="respuesta_escrita">Respuesta escrita</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                              </div>
                                            </div>

                                            <div>
                                              <div className="text-xs font-medium text-gray-700 mb-1">Enunciado</div>
                                              <Textarea
                                                value={q.pregunta || ''}
                                                onChange={(e) => {
                                                  const next = questions.map((qq, i) =>
                                                    i === qIndex ? { ...qq, pregunta: e.target.value } : qq
                                                  );
                                                  updateModule(selectedIndex, { contenido: next });
                                                }}
                                                className="min-h-[70px]"
                                                disabled={isSaving}
                                              />
                                            </div>

                                            {q.tipo === 'seleccion_multiple' ? (
                                              <div className="space-y-2">
                                                <div className="text-xs font-medium text-gray-700">Opciones</div>
                                                {(q.opciones || []).map((opt, optIndex) => (
                                                  <div key={optIndex} className="flex items-center gap-2">
                                                    <Checkbox
                                                      checked={!!opt.correcta}
                                                      onCheckedChange={() => {
                                                        const next = questions.map((qq, i) => {
                                                          if (i !== qIndex) return qq;
                                                          const opciones = (qq.opciones || []).map((oo, oi) => ({
                                                            ...oo,
                                                            correcta: oi === optIndex,
                                                          }));
                                                          return { ...qq, opciones };
                                                        });
                                                        updateModule(selectedIndex, { contenido: next });
                                                      }}
                                                      disabled={isSaving}
                                                    />
                                                    <Input
                                                      value={opt.texto || ''}
                                                      onChange={(e) => {
                                                        const next = questions.map((qq, i) => {
                                                          if (i !== qIndex) return qq;
                                                          const opciones = (qq.opciones || []).map((oo, oi) =>
                                                            oi === optIndex ? { ...oo, texto: e.target.value } : oo
                                                          );
                                                          return { ...qq, opciones };
                                                        });
                                                        updateModule(selectedIndex, { contenido: next });
                                                      }}
                                                      placeholder={`Opción ${optIndex + 1}`}
                                                      disabled={isSaving}
                                                    />
                                                    <Button
                                                      variant="outline"
                                                      size="sm"
                                                      onClick={() => {
                                                        const next = questions.map((qq, i) => {
                                                          if (i !== qIndex) return qq;
                                                          const before = qq.opciones || [];
                                                          const opciones = before.filter((_, oi) => oi !== optIndex);
                                                          if (opciones.length > 0 && !opciones.some((o) => o.correcta)) {
                                                            opciones[0] = { ...opciones[0], correcta: true };
                                                          }
                                                          return { ...qq, opciones };
                                                        });
                                                        updateModule(selectedIndex, { contenido: next });
                                                      }}
                                                      disabled={isSaving}
                                                    >
                                                      −
                                                    </Button>
                                                  </div>
                                                ))}

                                                <div>
                                                  <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                      const next = questions.map((qq, i) => {
                                                        if (i !== qIndex) return qq;
                                                        const opciones = [...(qq.opciones || [])];
                                                        opciones.push({
                                                          texto: `Opción ${opciones.length + 1}`,
                                                          correcta: opciones.length === 0,
                                                        });
                                                        return { ...qq, opciones };
                                                      });
                                                      updateModule(selectedIndex, { contenido: next });
                                                    }}
                                                    disabled={isSaving}
                                                  >
                                                    Añadir opción
                                                  </Button>
                                                </div>

                                                <div className="text-xs text-gray-600">
                                                  Marca con el check la opción correcta (solo una).
                                                </div>
                                              </div>
                                            ) : (
                                              <div>
                                                <div className="text-xs font-medium text-gray-700 mb-1">Respuesta modelo (opcional)</div>
                                                <Textarea
                                                  value={q.respuestaModelo || ''}
                                                  onChange={(e) => {
                                                    const next = questions.map((qq, i) =>
                                                      i === qIndex ? { ...qq, respuestaModelo: e.target.value } : qq
                                                    );
                                                    updateModule(selectedIndex, { contenido: next });
                                                  }}
                                                  className="min-h-[70px]"
                                                  disabled={isSaving}
                                                />
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    <div>
                                      <Button
                                        type="button"
                                        onClick={() => {
                                          const next = [...questions];
                                          next.push({
                                            tipo: 'seleccion_multiple',
                                            pregunta: '',
                                            opciones: [
                                              { texto: 'Opción 1', correcta: true },
                                              { texto: 'Opción 2', correcta: false },
                                            ],
                                          });
                                          updateModule(selectedIndex, { contenido: next });
                                        }}
                                        disabled={isSaving}
                                      >
                                        Añadir pregunta
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
