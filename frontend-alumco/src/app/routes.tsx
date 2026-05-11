import { Navigate, type RouteObject } from 'react-router';
import Login from './pages/Login';
import Panel from './pages/Panel';
import AdminDashboard from './pages/AdminDashboard';
import AdminMiAprendizaje from './pages/AdminMiAprendizaje';
import AdminGestionCapacitaciones from './pages/AdminGestionCapacitaciones';
import AdminEditorCurso from './pages/AdminEditorCurso';
import AdminUsuarios from './pages/AdminUsuarios';
import AdminSedes from './pages/AdminSedes';
import AdminDashboardMetrics from './pages/AdminDashboardMetrics';
import ProfessorDashboard from './pages/ProfessorDashboard';
import ProfessorCourseDetail from './pages/ProfessorCourseDetail';
import CursoDetalle from './pages/CursoDetalle.tsx';
import Perfil from './pages/Perfil';
import VerificarCertificado from './pages/VerificarCertificado';
import Root from './Root';

export const routes: RouteObject[] = [
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: Login },
      { path: 'login', Component: Login },
      { path: 'panel', Component: Panel },
      { path: 'admin', Component: AdminDashboard },
      { path: 'admin/mi-aprendizaje', Component: AdminMiAprendizaje },
      { path: 'admin/gestion-capacitaciones', Component: AdminGestionCapacitaciones },
      { path: 'admin/dashboard-metrics', Component: AdminDashboardMetrics },
      { path: 'admin/editar-curso/:id', Component: AdminEditorCurso },
      { path: 'admin/usuarios', Component: AdminUsuarios },
      { path: 'admin/sedes', Component: AdminSedes },
      { path: 'profesor', Component: ProfessorDashboard },
      { path: 'profesor/curso/:id', Component: ProfessorCourseDetail },
      { path: 'perfil', Component: Perfil },
      { path: 'curso/:id', Component: CursoDetalle },
      { path: 'verificar-certificado/:hash', Component: VerificarCertificado },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];
