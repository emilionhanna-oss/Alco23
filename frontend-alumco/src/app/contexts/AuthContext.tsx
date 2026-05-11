import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; user?: User; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_VERSION_KEY = 'auth_version';
const AUTH_STORAGE_VERSION = '3';

function isExpiredDate(fechaExpiracion?: string | null): boolean {
  if (!fechaExpiracion) return false;
  const parsed = new Date(fechaExpiracion);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() <= Date.now();
}

function getAccessDeniedMessage(user: Partial<User> | null | undefined): string | null {
  if (!user) return null;

  const estado = String((user as any)?.estado || '').toLowerCase();
  if (estado === 'pendiente') {
    return 'Tu acceso está pendiente de aprobación por un administrador.';
  }

  if (estado === 'vencido' || isExpiredDate((user as any)?.fechaExpiracion)) {
    return 'Tu acceso se encuentra vencido. Contacta al administrador.';
  }

  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restaurar usuario del localStorage al cargar
  useEffect(() => {
    const version = localStorage.getItem(AUTH_VERSION_KEY);

    // Si cambió el esquema de auth (por actualizaciones), forzamos volver a login
    if (version !== AUTH_STORAGE_VERSION) {
      localStorage.removeItem('usuario');
      localStorage.removeItem('token');
      localStorage.setItem(AUTH_VERSION_KEY, AUTH_STORAGE_VERSION);
      setIsLoading(false);
      return;
    }

    const storedUser = localStorage.getItem('usuario');
    const token = localStorage.getItem('token');

    if (storedUser && token) {
      try {
        const parsedUser = JSON.parse(storedUser);
        const rawRoles =
          (parsedUser as any)?.rol ?? (parsedUser as any)?.role ?? (parsedUser as any)?.roles;
        const normalizedRoles: User['rol'] = Array.isArray(rawRoles)
          ? rawRoles
          : rawRoles
            ? [rawRoles]
            : undefined;

        const normalizedUser: User = {
          ...(parsedUser as User),
          rol: normalizedRoles,
        };

        const denied = getAccessDeniedMessage(normalizedUser);
        if (denied) {
          localStorage.removeItem('usuario');
          localStorage.removeItem('token');
          setUser(null);
          setIsLoading(false);
          return;
        }

        setUser(normalizedUser);
      } catch (error) {
        console.error('Error restaurando usuario:', error);
        localStorage.removeItem('usuario');
        localStorage.removeItem('token');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: User; error?: string }> => {
    try {
      // Importamos el servicio aquí para evitar circular dependencies
      const { authService } = await import('../services/apiService');

      const response = await authService.login(email, password);

      if (response.success && response.data?.usuario && response.data?.token) {
        const apiUser = response.data.usuario as any;
        const rawRoles = apiUser?.rol ?? apiUser?.role ?? apiUser?.roles;
        const normalizedRoles: User['rol'] = Array.isArray(rawRoles)
          ? rawRoles
          : rawRoles
            ? [rawRoles]
            : undefined;

        const normalizedUser: User = {
          id: apiUser?.id ? String(apiUser.id) : undefined,
          email: apiUser?.email ?? email,
          name: apiUser?.name ?? apiUser?.nombreCompleto ?? apiUser?.nombre ?? email,
          rol: normalizedRoles,
          nombre: apiUser?.nombre,
          nombreCompleto: apiUser?.nombreCompleto ?? apiUser?.name ?? apiUser?.nombre,
          genero: apiUser?.genero,
          avatar: apiUser?.avatar,
          rut: apiUser?.rut,
          sede: apiUser?.sede,
          cargo: apiUser?.cargo,
          estado: apiUser?.estado,
          fechaRegistro: apiUser?.fechaRegistro,
          fechaExpiracion: apiUser?.fechaExpiracion ?? null,
        };

        const denied = getAccessDeniedMessage(normalizedUser);
        if (denied) {
          localStorage.removeItem('token');
          localStorage.removeItem('usuario');
          setUser(null);
          return {
            success: false,
            error: denied,
          };
        }

        // Guardamos el token y usuario
        localStorage.setItem(AUTH_VERSION_KEY, AUTH_STORAGE_VERSION);
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('usuario', JSON.stringify(normalizedUser));
        setUser(normalizedUser);

        return { success: true, user: normalizedUser };
      } else {
        return {
          success: false,
          error: response.error || 'Error al iniciar sesión',
        };
      }
    } catch (error) {
      console.error('Error en login:', error);
      return {
        success: false,
        error: 'Error inesperado al iniciar sesión',
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}
