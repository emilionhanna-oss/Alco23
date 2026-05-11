import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import type { Course } from '../types';

export default function CourseCard({
  course,
  onOpen,
}: {
  course: Course;
  onOpen: (courseId: string) => void;
}) {
  return (
    <Card
      key={course.id}
      className="hover:shadow-lg transition-shadow overflow-hidden cursor-pointer min-h-[360px]"
      onClick={() => onOpen(String(course.id))}
    >
      <div
        className="h-40 bg-gradient-to-br from-blue-400 to-blue-600"
        style={
          course.image
            ? {
                backgroundImage: `url("${course.image}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      />

      <CardHeader className="pb-0">
        <CardTitle className="text-lg line-clamp-2 min-h-[3rem]">
          {course.title || 'Sin título'}
        </CardTitle>
        <CardDescription className="line-clamp-2 min-h-[2.5rem]">
          {course.description || 'Sin descripción'}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1 overflow-hidden space-y-2 text-sm">
          {course.instructor && (
            <p className="text-gray-600 line-clamp-1">
              <strong>Instructor:</strong> {course.instructor}
            </p>
          )}
          {course.duration && (
            <p className="text-gray-600 line-clamp-1">
              <strong>Duración:</strong> {course.duration}
            </p>
          )}
          {course.level && (
            <p className="text-gray-600 line-clamp-1">
              <strong>Nivel:</strong> {course.level}
            </p>
          )}
          {course.enrolledStudents !== undefined && (
            <p className="text-gray-600 line-clamp-1">
              <strong>Estudiantes:</strong> {course.enrolledStudents}
            </p>
          )}
        </div>

        <div className="pt-4">
          {(() => {
            const progressValue = Math.max(0, Math.min(100, Number(course.progress ?? 0)));

            return (
              <>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium text-gray-700">Progreso</span>
                  <span className="text-xs font-bold text-blue-600">{progressValue}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressValue}%` }}
                  />
                </div>
              </>
            );
          })()}
        </div>
      </CardContent>
    </Card>
  );
}
