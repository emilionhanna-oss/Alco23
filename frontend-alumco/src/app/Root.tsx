import { Outlet, useLocation, useNavigate } from 'react-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isLoading) return;

    const path = location.pathname;
    const isPanel = path === '/panel' || path.startsWith('/panel/');
    const isAdmin = path === '/admin' || path.startsWith('/admin/');
    const isProfesor = path === '/profesor' || path.startsWith('/profesor/');
    const isPerfil = path === '/perfil' || path.startsWith('/perfil/');

    const roles = (user as any)?.rol;
    const isAdminUser = Array.isArray(roles) && roles.includes('admin');
    const isProfesorUser = Array.isArray(roles) && roles.includes('profesor');
    const allowProfesorInAdmin =
      isProfesorUser &&
      (path.startsWith('/admin/gestion-capacitaciones') ||
        path.startsWith('/admin/editar-curso'));

    // Si NO autenticado y accedes a ruta protegida → login
    if (!isAuthenticated && (isPanel || isAdmin || isProfesor || isPerfil)) {
      navigate('/', { replace: true });
      return;
    }

    // Si admin cae en /panel → /admin
    if (isAuthenticated && isPanel && isAdminUser) {
      navigate('/admin', { replace: true });
      return;
    }

    // Si NO admin y cae en /admin → /panel
    if (isAuthenticated && isAdmin && !isAdminUser && !allowProfesorInAdmin) {
      navigate('/panel', { replace: true });
      return;
    }

    // Si NO profesor y cae en /profesor → /panel
    if (isAuthenticated && isProfesor && !isProfesorUser && !isAdminUser) {
      navigate('/panel', { replace: true });
    }
  }, [isAuthenticated, isLoading, location.pathname, navigate, user]);

  return <>{children}</>;
}

function RootContent() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a2840] via-[#2d4263] to-[#1a2840]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-white/70 border-t-transparent animate-spin" />
          <div className="text-white/90 text-sm">Cargando…</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <ProtectedRoute>
        <Outlet />
      </ProtectedRoute>
    </>
  );
}

export default function Root() {
  // Limpia clases residuales que pudo haber dejado `next-themes` (no usamos tema global en esta app).
  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light');
  }, []);

  return (
    <AuthProvider>
      <RootContent />
    </AuthProvider>
  );
}
