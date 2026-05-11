import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { BookOpen, ChevronLeft, LogOut } from 'lucide-react';
import CourseCard from '../components/CourseCard';
import { courseService } from '../services/apiService';
import type { Course } from '../types';
import { BACKEND_URL } from '../config/api.config';

const LOGO_SRC = `${BACKEND_URL}/static/alumco-logo.png`;

export default function AdminMiAprendizaje() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [logoOk, setLogoOk] = useState(true);

  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoadingCourses(true);
      try {
        const response = await courseService.getCourses();
        setCourses(response.success && response.data ? response.data : []);
      } finally {
        setIsLoadingCourses(false);
      }
    };

    load();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleOpenCourse = (courseId: string) => {
    if (!courseId) return;
    navigate(`/curso/${courseId}`, { state: { from: location.pathname } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
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
                Admin · Mi Aprendizaje
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => navigate('/admin')}
                variant="outline"
                className="flex items-center gap-2"
              >
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
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#1a2840]">Mi Aprendizaje</h2>
              <p className="text-sm text-gray-600">Cursos asignados a tu cuenta</p>
            </div>
          </div>
        </div>

        {isLoadingCourses ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-40 bg-gray-200" />
                <CardHeader>
                  <div className="h-4 bg-gray-200 mb-2" />
                  <div className="h-3 bg-gray-100" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No tienes cursos asignados</CardTitle>
              <CardDescription>
                Cuando te asignen cursos, aparecerán aquí automáticamente.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} onOpen={handleOpenCourse} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
