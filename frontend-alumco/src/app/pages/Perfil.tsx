import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { courseService, userService } from '../services/apiService';
import type { Course, User } from '../types';
import { ArrowLeft, Award, Download, Image as ImageIcon, PenLine, User as UserIcon } from 'lucide-react';
import { BACKEND_URL, buildApiUrl } from '../config/api.config';
import { formatRutForDisplay, normalizeRutForStorage } from '../utils/rut';

const LOGO_SRC = `${BACKEND_URL}/static/alumco-logo.png`;

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export default function Perfil() {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();

  const roles = (authUser as any)?.rol;
  const isAdminUser = Array.isArray(roles) && roles.includes('admin');
  const backTo = isAdminUser ? '/admin' : '/panel';

  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<User | null>(null);
  const [saveStatus, setSaveStatus] = useState<{ type: 'idle' | 'ok' | 'error'; message?: string }>({
    type: 'idle',
  });

  const [nombreCompleto, setNombreCompleto] = useState('');
  const [rut, setRut] = useState('');
  const [cargo, setCargo] = useState('');

  const [firmaTexto, setFirmaTexto] = useState('');
  const [firmaImagenDataUrl, setFirmaImagenDataUrl] = useState<string | undefined>(undefined);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [certCourses, setCertCourses] = useState<Course[]>([]);
  const [isLoadingCerts, setIsLoadingCerts] = useState(true);

  const displayName = useMemo(() => {
    return (
      profile?.nombreCompleto ||
      profile?.nombre ||
      profile?.name ||
      profile?.email ||
      authUser?.nombreCompleto ||
      authUser?.name ||
      authUser?.email ||
      'Usuario'
    );
  }, [authUser, profile]);

  const roleLabel = useMemo(() => {
    const roles = Array.isArray(profile?.rol)
      ? profile?.rol
      : Array.isArray(authUser?.rol)
        ? authUser?.rol
        : [];

    return roles.length > 0 ? roles.join(', ') : 'usuario';
  }, [authUser?.rol, profile?.rol]);

  const firmaImagenSafe = useMemo(() => {
    if (!firmaImagenDataUrl) return undefined;
    return /^data:image\/(png|jpeg|jpg);base64,/i.test(firmaImagenDataUrl) ? firmaImagenDataUrl : undefined;
  }, [firmaImagenDataUrl]);

  const hasSignatureConfigured = useMemo(() => {
    const text = String(firmaTexto || profile?.firmaTexto || '').trim();
    const image =
      firmaImagenSafe ||
      (/^data:image\/(png|jpeg|jpg);base64,/i.test(String(profile?.firmaImagenDataUrl || ''))
        ? String(profile?.firmaImagenDataUrl)
        : '');

    return Boolean(text) || Boolean(image);
  }, [firmaImagenSafe, firmaTexto, profile?.firmaImagenDataUrl, profile?.firmaTexto]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setIsLoading(true);
      setSaveStatus({ type: 'idle' });

      try {
        const resp = await userService.getProfile();
        if (!mounted) return;

        if (resp.success && resp.data) {
          setProfile(resp.data);
          setNombreCompleto(resp.data.nombreCompleto || resp.data.nombre || resp.data.name || '');
          setRut(formatRutForDisplay(resp.data.rut));
          setCargo(resp.data.cargo || '');
          setFirmaTexto(resp.data.firmaTexto || '');
          setFirmaImagenDataUrl(resp.data.firmaImagenDataUrl);
        } else {
          setSaveStatus({ type: 'error', message: resp.error || 'No se pudo cargar el perfil.' });
        }
      } catch {
        if (!mounted) return;
        setSaveStatus({ type: 'error', message: 'No se pudo cargar el perfil.' });
      } finally {
        if (!mounted) return;
        setIsLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadCerts = async () => {
      setIsLoadingCerts(true);
      try {
        const resp = await courseService.getCourses();
        if (!mounted) return;

        const data = resp.success && resp.data ? resp.data : [];
        setCertCourses(data.filter((c) => Number(c.progress || 0) >= 100));
      } finally {
        if (!mounted) return;
        setIsLoadingCerts(false);
      }
    };

    loadCerts();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSavePersonalInfo = async () => {
    setSaveStatus({ type: 'idle' });

    const normalizedRut = normalizeRutForStorage(rut);
    if (!normalizedRut) {
      setSaveStatus({ type: 'error', message: 'Ingresa un RUT válido.' });
      return;
    }

    const updates: Partial<User> = {
      nombreCompleto: nombreCompleto.trim() || undefined,
      rut: normalizedRut,
    };

    if (isAdminUser) {
      updates.cargo = cargo.trim() || undefined;
    }

    const resp = await userService.updateProfile(updates);
    if (resp.success && resp.data) {
      setProfile(resp.data);
      setSaveStatus({ type: 'ok', message: 'Perfil actualizado.' });
      return;
    }

    setSaveStatus({ type: 'error', message: resp.error || 'No se pudo actualizar el perfil.' });
  };

  const handlePickSignatureImage = () => {
    fileInputRef.current?.click();
  };

  const handleSignatureFileSelected: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    setSaveStatus({ type: 'idle' });
    const file = e.target.files?.[0];
    if (!file) return;

    if (!/^image\/(png|jpeg)$/.test(file.type)) {
      setSaveStatus({ type: 'error', message: 'Formato no soportado. Usa PNG o JPG.' });
      e.target.value = '';
      return;
    }

    // Mantener db.json liviano.
    if (file.size > 250 * 1024) {
      setSaveStatus({ type: 'error', message: 'La imagen es muy pesada. Usa una firma más liviana (máx. 250KB).' });
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : undefined;
      setFirmaImagenDataUrl(result);
      // Si eligen imagen, limpiamos el texto localmente.
      setFirmaTexto('');
    };
    reader.onerror = () => {
      setSaveStatus({ type: 'error', message: 'No se pudo leer la imagen.' });
    };

    reader.readAsDataURL(file);
  };

  const handleSaveSignature = async () => {
    setSaveStatus({ type: 'idle' });

    const hasImage = !!firmaImagenSafe;
    const text = firmaTexto.trim();

    const updates: Partial<User> = {};

    if (hasImage) {
      updates.firmaImagenDataUrl = firmaImagenSafe;
      updates.firmaTexto = '';
    } else {
      updates.firmaTexto = text;
      updates.firmaImagenDataUrl = '';
    }

    const resp = await userService.updateProfile(updates);
    if (resp.success && resp.data) {
      setProfile(resp.data);
      setFirmaTexto(resp.data.firmaTexto || '');
      setFirmaImagenDataUrl(resp.data.firmaImagenDataUrl);
      setSaveStatus({ type: 'ok', message: 'Firma guardada.' });
      return;
    }

    setSaveStatus({ type: 'error', message: resp.error || 'No se pudo guardar la firma.' });
  };

  const handleClearSignature = async () => {
    setSaveStatus({ type: 'idle' });

    const resp = await userService.updateProfile({ firmaTexto: '', firmaImagenDataUrl: '' });
    if (resp.success && resp.data) {
      setProfile(resp.data);
      setFirmaTexto('');
      setFirmaImagenDataUrl(undefined);
      setSaveStatus({ type: 'ok', message: 'Firma eliminada.' });
      return;
    }

    setSaveStatus({ type: 'error', message: resp.error || 'No se pudo eliminar la firma.' });
  };

  const downloadCertificate = (course: Course) => {
    if (!hasSignatureConfigured) {
      setSaveStatus({
        type: 'error',
        message: 'Configura tu firma en el Perfil para descargar tu certificado',
      });
      return;
    }

    const token = localStorage.getItem('token') || '';
    fetch(buildApiUrl(`/api/cursos/${course.id}/certificado`), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
      if (!res.ok) throw new Error('Error al descargar el certificado');
      return res.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Certificado_${course.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    })
    .catch(err => alert(err.message));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img src={LOGO_SRC} alt="Logo de Alumco" className="h-10 w-auto" />
              <div className="min-w-0">
                <div className="text-sm text-gray-600 leading-tight">Mi Perfil</div>
                <div className="text-base font-semibold text-[#1a2840] truncate">{displayName}</div>
              </div>
            </div>

            <Button variant="outline" onClick={() => navigate(backTo)} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Volver</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {saveStatus.type === 'error' ? (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="py-4 text-sm text-amber-900">{saveStatus.message}</CardContent>
          </Card>
        ) : saveStatus.type === 'ok' ? (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="py-4 text-sm text-emerald-900">{saveStatus.message}</CardContent>
          </Card>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <UserIcon className="w-6 h-6 text-purple-700" />
                </div>
                <div>
                  <CardTitle>Información personal</CardTitle>
                  <CardDescription>Actualiza tus datos básicos</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    value={nombreCompleto}
                    onChange={(e) => setNombreCompleto(e.target.value)}
                    placeholder="Tu nombre"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="email">Correo</Label>
                  <Input
                    id="email"
                    value={profile?.email || authUser?.email || ''}
                    disabled
                    placeholder="correo@ejemplo.com"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="rut">RUT / ID</Label>
                  <Input
                    id="rut"
                    value={rut}
                    onChange={(e) => setRut(formatRutForDisplay(e.target.value))}
                    placeholder="Ej: 12.345.678-9"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="rol">Rol</Label>
                  <Input id="rol" value={roleLabel} disabled />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="cargo">Cargo</Label>
                  <Input
                    id="cargo"
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    placeholder="Ej: Cuidador/a"
                    disabled={isLoading || !isAdminUser}
                  />
                  {!isAdminUser ? <div className="text-xs text-gray-500">Solo el administrador puede modificar el cargo.</div> : null}
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSavePersonalInfo} disabled={isLoading}>
                  Guardar cambios
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <PenLine className="w-6 h-6 text-blue-700" />
                </div>
                <div>
                  <CardTitle>Firma</CardTitle>
                  <CardDescription>Para tus certificados</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-white p-4">
                <div className="text-xs font-medium text-gray-700 mb-2">Vista previa</div>
                <div className="min-h-[84px] flex items-center justify-center">
                  {firmaImagenSafe ? (
                    <img
                      src={firmaImagenSafe}
                      alt="Firma"
                      className="max-h-[80px] max-w-[280px] object-contain"
                    />
                  ) : firmaTexto.trim() ? (
                    <div className="font-serif italic text-2xl text-gray-900">{firmaTexto.trim()}</div>
                  ) : (
                    <div className="text-sm text-gray-500">Aún no has agregado tu firma.</div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" /> Subir imagen (PNG/JPG)
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={handleSignatureFileSelected}
                />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={handlePickSignatureImage} disabled={isLoading}>
                    Elegir archivo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setFirmaImagenDataUrl(undefined);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    disabled={isLoading || !firmaImagenDataUrl}
                  >
                    Quitar imagen
                  </Button>
                </div>
                <div className="text-xs text-gray-500">Recomendado: imagen pequeña (máx. 250KB).</div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-900">O escribe tu nombre</div>
                <Input
                  value={firmaTexto}
                  onChange={(e) => {
                    setFirmaTexto(e.target.value);
                    if (e.target.value.trim()) setFirmaImagenDataUrl(undefined);
                  }}
                  placeholder="Ej: Juan Pérez"
                  disabled={isLoading}
                />
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleClearSignature} disabled={isLoading}>
                  Eliminar firma
                </Button>
                <Button type="button" onClick={handleSaveSignature} disabled={isLoading}>
                  Guardar firma
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 rounded-lg">
                <Award className="w-6 h-6 text-emerald-700" />
              </div>
              <div>
                <CardTitle>Mis Certificados</CardTitle>
                <CardDescription>Disponibles cuando tu progreso llega al 100%</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingCerts ? (
              <div className="text-sm text-gray-600">Cargando certificados…</div>
            ) : certCourses.length === 0 ? (
              <div className="text-sm text-gray-600">Aún no tienes certificados disponibles.</div>
            ) : (
              <>
                {!hasSignatureConfigured ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
                    Configura tu firma en el Perfil para descargar tu certificado
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {certCourses.map((course) => (
                    <Card key={course.id} className="border-dashed">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base line-clamp-2">{course.title}</CardTitle>
                        <CardDescription>Progreso: 100%</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <Button
                          className="w-full"
                          onClick={() => downloadCertificate(course)}
                          disabled={isLoading || !hasSignatureConfigured}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Descargar
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
