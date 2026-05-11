import React, { useEffect, useMemo, useState } from 'react';
import * as xlsx from 'xlsx';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Checkbox } from '../components/ui/checkbox';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ChevronLeft, LogOut, PencilLine, Users } from 'lucide-react';
import { userService } from '../services/apiService';
import type { User } from '../types';
import { BACKEND_URL, buildApiUrl } from '../config/api.config';
import { formatRutForDisplay, normalizeRutForSearch, normalizeRutForStorage } from '../utils/rut';

const LOGO_SRC = `${BACKEND_URL}/static/alumco-logo.png`;
const STATUS_ORDER: Array<'pendiente' | 'activo' | 'vencido'> = ['pendiente', 'activo', 'vencido'];
const OFFICIAL_SEDE_OPTIONS = [
  'Hualpen (Region del Biobio)',
  'Coyhaique (Region de Aysen)',
];
const CARGO_OPTIONS = [
  'Pendiente de asignacion',
  'Direccion y Administracion',
  'Enfermeria',
  'Cuidados Directos (TENS/Gerocultor)',
  'Kinesiologia y Rehabilitacion',
  'Terapia Ocupacional',
  'Psicologia',
  'Trabajo Social',
  'Nutricion y Alimentacion',
  'Recreacion y Actividades',
  'Aseo e Higiene',
  'Lavanderia y Roperia',
  'Mantencion y Servicios Generales',
  'Cocina',
];
const ROLE_OPTIONS = [
  { value: 'admin', label: 'administrador' },
  { value: 'profesor', label: 'profesor' },
  { value: 'usuario', label: 'usuario' },
];

type UserStatus = 'pendiente' | 'activo' | 'vencido';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; users: User[] };

function normalizeUser(user: User): User {
  const status = String(user.estado || '').toLowerCase();
  const normalizedEstado: UserStatus =
    status === 'pendiente' || status === 'vencido' ? (status as UserStatus) : 'activo';

  const normalizedRoles = Array.isArray(user.rol)
    ? user.rol.map((r) => String(r || '').trim()).filter(Boolean)
    : [];

  return {
    ...user,
    estado: normalizedEstado,
    rol: normalizedRoles.length > 0 ? Array.from(new Set(normalizedRoles)) : ['usuario'],
    fechaExpiracion: user.fechaExpiracion ?? null,
    fechaRegistro: user.fechaRegistro || null,
  };
}

function formatDate(iso?: string | null): string {
  if (!iso) return 'Permanente';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Fecha inválida';
  return date.toLocaleDateString('es-CL');
}

function formatDateInput(iso?: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function toIsoFromDateInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(`${trimmed}T23:59:59`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function StatusBadge({ status }: { status: UserStatus }) {
  if (status === 'activo') {
    return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Activo</Badge>;
  }

  if (status === 'pendiente') {
    return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Pendiente</Badge>;
  }

  return <Badge className="bg-slate-200 text-slate-700 border-slate-300">Vencido</Badge>;
}

function getRoleLabel(role: string): string {
  const normalized = String(role || '').trim().toLowerCase();
  if (normalized === 'admin') return 'administrador';
  if (normalized === 'profesor') return 'profesor';
  if (normalized === 'usuario') return 'usuario';
  return normalized || 'usuario';
}

export default function AdminUsuarios() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [logoOk, setLogoOk] = useState(true);

  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [activeTab, setActiveTab] = useState<UserStatus>('pendiente');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSede, setSelectedSede] = useState('all');
  const [selectedCargo, setSelectedCargo] = useState('all');

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingNombre, setEditingNombre] = useState('');
  const [editingEmail, setEditingEmail] = useState('');
  const [editingRut, setEditingRut] = useState('');
  const [editingSede, setEditingSede] = useState('');
  const [editingCargo, setEditingCargo] = useState('');
  const [editingEstado, setEditingEstado] = useState<UserStatus>('activo');
  const [editingRoles, setEditingRoles] = useState<string[]>(['usuario']);
  const [editingFechaExpiracion, setEditingFechaExpiracion] = useState('');
  const [savingUser, setSavingUser] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const downloadTemplate = () => {
    const ws = xlsx.utils.json_to_sheet([
      { 
        'Nombre Completo': 'Juan Pérez', 
        'Email': 'juan@ejemplo.com', 
        'RUT': '12.345.678-9', 
        'Genero': 'Masculino', 
        'Cargo': 'Cuidados Directos' 
      }
    ]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "PlantillaUsuarios");
    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "plantilla_usuarios_alumco.xlsx";
    a.click();
    window.URL.revokeObjectURL(url);
    setIsHelpOpen(false);
  };

  const [isImporting, setIsImporting] = useState(false);

  const triggerFileUpload = () => {
    setIsHelpOpen(false);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx, .xls';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      setIsImporting(true);
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('token') || '';

      fetch(buildApiUrl('/api/reportes/usuarios/importar'), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      })
      .then(res => res.json())
      .then(data => {
        setIsImporting(false);
        
        const insertados = data.insertados ?? 0;
        const duplicados = data.duplicados ?? 0;
        const invalidos: string[] = data.invalidos ?? [];
        const errores: string[] = data.errores ?? [];

        // Mensaje de resumen
        if (insertados > 0) {
          toast.success(`¡Éxito! Se crearon ${insertados} usuarios nuevos.`, {
            description: `Se procesaron correctamente los datos del archivo.`,
            duration: 5000,
          });
        }

        // Alertas de advertencia/error
        if (duplicados > 0 || invalidos.length > 0 || errores.length > 0) {
          const warnDetails = [];
          if (duplicados > 0) warnDetails.push(`${duplicados} ya existían`);
          if (invalidos.length > 0) warnDetails.push(`${invalidos.length} con datos inválidos`);
          if (errores.length > 0) warnDetails.push(`${errores.length} fallaron por error de red`);
          
          toast.warning("Importación parcial", {
            description: warnDetails.join(' · '),
            duration: 8000,
          });
        }

        if (insertados === 0 && duplicados === 0 && invalidos.length === 0 && errores.length === 0) {
          toast.info("El archivo parece estar vacío o no tiene el formato correcto.");
        }

        // Recargar lista de usuarios inmediatamente
        setState({ status: 'loading' });
        userService.getUsers().then(res => {
          if (res.success && res.data) {
            setState({ status: 'ready', users: res.data.map(normalizeUser) });
          } else {
            setState({ status: 'error', message: 'Error al refrescar la lista.' });
          }
        });
      })
      .catch(() => {
        setIsImporting(false);
        toast.error('Error crítico al conectar con el servidor para la importación');
      });
    };
    input.click();
  };

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setState({ status: 'loading' });

      try {
        const response = await userService.getUsers();
        if (!response.success) {
          throw new Error(response.error || 'No se pudieron cargar los usuarios.');
        }

        if (!isMounted) return;

        const users = (response.data || []).map(normalizeUser);
        setState({ status: 'ready', users });
      } catch (error) {
        if (!isMounted) return;
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'No se pudieron cargar los usuarios.',
        });
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const allUsers = useMemo(() => {
    if (state.status !== 'ready') return [];
    return state.users || [];
  }, [state]);

  const counters = useMemo(() => {
    const values: Record<UserStatus, number> = {
      pendiente: 0,
      activo: 0,
      vencido: 0,
    };

    for (const user of allUsers) {
      const status = (user.estado || 'activo') as UserStatus;
      values[status] += 1;
    }

    return values;
  }, [allUsers]);

  const availableSedes = useMemo(() => OFFICIAL_SEDE_OPTIONS, []);

  const availableCargos = useMemo(() => CARGO_OPTIONS, []);

  const filteredUsers = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    const normalizedSearchRut = normalizeRutForSearch(searchQuery);

    return allUsers
      .filter((u) => (u.estado || 'activo') === activeTab)
      .filter((u) => {
        if (!search) return true;
        const nombre = (u.nombreCompleto || u.nombre || u.name || '').toLowerCase();
        const rut = normalizeRutForSearch(String(u.rut || ''));
        return nombre.includes(search) || rut.includes(normalizedSearchRut);
      })
      .filter((u) => (selectedSede === 'all' ? true : String(u.sede || '') === selectedSede))
      .filter((u) => (selectedCargo === 'all' ? true : String(u.cargo || '') === selectedCargo))
      .sort((a, b) => {
        const nameA = String(a.nombreCompleto || a.nombre || a.name || '').toLowerCase();
        const nameB = String(b.nombreCompleto || b.nombre || b.name || '').toLowerCase();
        return nameA.localeCompare(nameB, 'es');
      });
  }, [activeTab, allUsers, searchQuery, selectedSede, selectedCargo]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedSede('all');
    setSelectedCargo('all');
  };

  const openEditDialog = (user: User) => {
    const normalized = normalizeUser(user);

    setEditingUserId(normalized.id || null);
    setEditingNombre(normalized.nombreCompleto || normalized.nombre || normalized.name || '');
    setEditingEmail(normalized.email || '');
    setEditingRut(formatRutForDisplay(normalized.rut));
    setEditingSede(
      normalized.sede && OFFICIAL_SEDE_OPTIONS.includes(normalized.sede)
        ? normalized.sede
        : OFFICIAL_SEDE_OPTIONS[0]
    );
    setEditingCargo(
      normalized.cargo && CARGO_OPTIONS.includes(normalized.cargo)
        ? normalized.cargo
        : 'Pendiente de asignacion'
    );
    setEditingEstado((normalized.estado || 'activo') as UserStatus);
    const cleanedRoles = (normalized.rol || []).filter((role) =>
      ROLE_OPTIONS.some((opt) => opt.value === String(role))
    );
    setEditingRoles(cleanedRoles.length > 0 ? (cleanedRoles as string[]) : ['usuario']);
    setEditingFechaExpiracion(formatDateInput(normalized.fechaExpiracion));
    setEditError(null);
    setIsEditOpen(true);
  };

  const closeEditDialog = () => {
    if (savingUser) return;
    setIsEditOpen(false);
    setEditingUserId(null);
    setEditError(null);
  };

  const toggleRole = (role: string) => {
    setEditingRoles((prev) => {
      if (prev.includes(role)) {
        const next = prev.filter((r) => r !== role);
        return next.length > 0 ? next : ['usuario'];
      }
      return Array.from(new Set([...prev, role]));
    });
  };

  const handleSaveUser = async () => {
    if (!editingUserId || savingUser) return;

    setSavingUser(true);
    setEditError(null);

    try {
      const payload: Partial<User> = {
        rut: normalizeRutForStorage(editingRut) || undefined,
        sede: editingSede || undefined,
        cargo: editingCargo || undefined,
        estado: editingEstado,
        rol: editingRoles.filter((role) => ROLE_OPTIONS.some((opt) => opt.value === role)),
        fechaExpiracion: toIsoFromDateInput(editingFechaExpiracion),
      };

      const response = await userService.updateUser(editingUserId, payload);

      if (!response.success || !response.data) {
        setEditError(response.error || 'No se pudo actualizar el usuario.');
        return;
      }

      const updated = normalizeUser(response.data);

      setState((prev) => {
        if (prev.status !== 'ready') return prev;
        return {
          ...prev,
          users: prev.users.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)),
        };
      });

      setIsEditOpen(false);
      setEditingUserId(null);
    } finally {
      setSavingUser(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm border-b">
        {isImporting && (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-cyan-200 border-t-cyan-600 rounded-full animate-spin"></div>
              <div className="mt-4 text-lg font-bold text-cyan-900 animate-pulse text-center">
                PROCESANDO EXCEL...
              </div>
              <p className="text-sm text-gray-600 mt-1 text-center">Esto puede tardar unos segundos dependiendo del tamaño</p>
            </div>
          </div>
        )}
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
                <div className="text-xl sm:text-2xl font-semibold text-[#1a2840] leading-tight">ALUMCO</div>
              )}
              <div className="text-sm text-gray-600 leading-tight">Admin · Centro de Usuarios</div>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={() => navigate('/admin')} variant="outline" className="flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Volver</span>
              </Button>
              <Button onClick={handleLogout} variant="outline" className="flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-100 rounded-lg">
              <Users className="w-6 h-6 text-cyan-700" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#1a2840]">Centro de Usuarios</h2>
              <p className="text-sm text-gray-600">Aprobación, control de acceso y administración organizacional</p>
            </div>
          </div>

          {state.status === 'ready' ? (
            <div className="flex items-center gap-2 flex-wrap">
              {STATUS_ORDER.map((status) => (
                <div key={status} className="rounded-md border px-3 py-1 bg-white text-sm text-gray-700">
                  <span className="mr-2 capitalize">{status}</span>
                  <span className="font-semibold">{counters[status]}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {state.status === 'loading' ? (
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 w-1/3" />
              <div className="h-3 bg-gray-100 w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="h-24 bg-gray-100 rounded" />
            </CardContent>
          </Card>
        ) : state.status === 'error' ? (
          <Card>
            <CardHeader>
              <CardTitle>No se pudo cargar</CardTitle>
              <CardDescription>{state.message}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => window.location.reload()}>Reintentar</Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="space-y-4">
              <div>
                <CardTitle>Gestión de Usuarios Avanzada</CardTitle>
                <CardDescription>
                  Filtra por estado, nombre/RUT, sede y cargo. Editar un usuario pendiente lo activa automáticamente.
                </CardDescription>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => {
                  const token = localStorage.getItem('token') || '';
                  fetch(buildApiUrl('/api/reportes/usuarios/exportar'), {
                    headers: { 'Authorization': `Bearer ${token}` }
                  })
                  .then(res => res.blob())
                  .then(blob => {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `usuarios_alumco.xlsx`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  });
                }}>
                  Exportar Excel
                </Button>

                 <Button variant="outline" onClick={() => setIsHelpOpen(true)}>
                   Importar Excel
                 </Button>
              </div>

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as UserStatus)}>
                <TabsList className="w-full md:w-fit bg-slate-100">
                  <TabsTrigger value="pendiente">Pendientes ({counters.pendiente})</TabsTrigger>
                  <TabsTrigger value="activo">Activos ({counters.activo})</TabsTrigger>
                  <TabsTrigger value="vencido">Vencidos ({counters.vencido})</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="grid gap-3 md:grid-cols-4">
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="filtro-search">Nombre o RUT</Label>
                  <Input
                    id="filtro-search"
                    placeholder="Busca por nombre o RUT"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label>Sede</Label>
                  <Select value={selectedSede} onValueChange={setSelectedSede}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas las sedes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las sedes</SelectItem>
                      {availableSedes.map((sede) => (
                        <SelectItem key={sede} value={sede}>
                          {sede}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Cargo</Label>
                  <Select value={selectedCargo} onValueChange={setSelectedCargo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los cargos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los cargos</SelectItem>
                      {availableCargos.map((cargo) => (
                        <SelectItem key={cargo} value={cargo}>
                          {cargo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Button variant="outline" onClick={resetFilters}>Limpiar filtros</Button>
              </div>
            </CardHeader>

            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>RUT</TableHead>
                    <TableHead>Sede</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Registro</TableHead>
                    <TableHead>Expiración</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-gray-600">
                        No hay usuarios para el filtro seleccionado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => {
                      const status = (user.estado || 'activo') as UserStatus;
                      const name = user.nombreCompleto || user.nombre || user.name || '—';

                      return (
                        <TableRow key={user.id || `${user.email}-${name}`}>
                          <TableCell className="font-medium text-gray-900">
                            <div className="flex flex-col">
                              <span>{name}</span>
                              <span className="text-xs text-gray-500">{user.email || 'sin correo'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-700">{formatRutForDisplay(user.rut) || '—'}</TableCell>
                          <TableCell className="text-gray-700">{user.sede || '—'}</TableCell>
                          <TableCell className="text-gray-700">{user.cargo || '—'}</TableCell>
                          <TableCell className="text-gray-700">{(user.rol || []).map(getRoleLabel).join(', ')}</TableCell>
                          <TableCell>
                            <StatusBadge status={status} />
                          </TableCell>
                          <TableCell className="text-gray-700">{formatDate(user.fechaRegistro)}</TableCell>
                          <TableCell className="text-gray-700">{formatDate(user.fechaExpiracion)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => openEditDialog(user)}
                            >
                              <PencilLine className="w-4 h-4" />
                              Editar
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>

      <Dialog open={isEditOpen} onOpenChange={(open) => (!savingUser ? setIsEditOpen(open) : null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
            <DialogDescription>
              Al guardar un usuario pendiente, su estado se aprobará automáticamente como activo.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label>Nombre</Label>
              <Input value={editingNombre} disabled />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <Label>Correo</Label>
              <Input value={editingEmail} disabled />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-rut">RUT</Label>
              <Input
                id="edit-rut"
                value={editingRut}
                onChange={(e) => setEditingRut(formatRutForDisplay(e.target.value))}
                placeholder="Ej: 12.345.678-9"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-sede">Sede</Label>
              <Select value={editingSede} onValueChange={setEditingSede}>
                <SelectTrigger id="edit-sede">
                  <SelectValue placeholder="Selecciona sede" />
                </SelectTrigger>
                <SelectContent>
                  {OFFICIAL_SEDE_OPTIONS.map((sede) => (
                    <SelectItem key={sede} value={sede}>
                      {sede}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-cargo">Cargo</Label>
              <Select value={editingCargo} onValueChange={setEditingCargo}>
                <SelectTrigger id="edit-cargo">
                  <SelectValue placeholder="Selecciona cargo" />
                </SelectTrigger>
                <SelectContent>
                  {CARGO_OPTIONS.map((cargo) => (
                    <SelectItem key={cargo} value={cargo}>
                      {cargo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Estado</Label>
              <Select value={editingEstado} onValueChange={(value) => setEditingEstado(value as UserStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-expiracion">Fecha de Expiración (Opcional)</Label>
              <Input
                id="edit-expiracion"
                type="date"
                value={editingFechaExpiracion}
                onChange={(e) => setEditingFechaExpiracion(e.target.value)}
              />
              <p className="text-xs text-gray-500">Déjalo vacío para acceso permanente.</p>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Roles</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {ROLE_OPTIONS.map((role) => (
                  <label key={role.value} className="flex items-center gap-2 text-sm text-gray-700">
                    <Checkbox
                      checked={editingRoles.includes(role.value)}
                      onCheckedChange={() => toggleRole(role.value)}
                    />
                    <span>{role.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {editError ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {editError}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog} disabled={savingUser}>
              Cancelar
            </Button>
            <Button onClick={handleSaveUser} disabled={savingUser || !editingUserId}>
              {savingUser ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Ayuda Formato Usuarios */}
      <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Asistente de Importación de Usuarios</DialogTitle>
            <DialogDescription>
              Para cargar nuevos usuarios masivamente, asegúrate de que tu Excel tenga las columnas correctas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg border p-4 bg-slate-50">
              <h4 className="text-sm font-semibold mb-2">Columnas Requeridas:</h4>
              <ul className="text-xs text-gray-600 grid grid-cols-2 gap-x-2 gap-y-1 list-disc list-inside">
                <li>Nombre Completo</li>
                <li>Email</li>
                <li>RUT</li>
                <li>Genero</li>
                <li>Cargo</li>
              </ul>
              <p className="mt-3 text-[10px] text-gray-500 italic">
                * La contraseña inicial de cada usuario será su RUT (sin puntos ni guion).
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="flex flex-col h-auto py-4 gap-2" onClick={downloadTemplate}>
                <PencilLine className="w-6 h-6 text-blue-600" />
                <span className="text-xs font-bold">Descargar Plantilla</span>
              </Button>
              <Button className="flex flex-col h-auto py-4 gap-2" onClick={triggerFileUpload}>
                <Users className="w-6 h-6 text-white" />
                <span className="text-xs font-bold">Ya tengo mi archivo</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
