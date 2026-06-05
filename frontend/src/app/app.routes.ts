/**
 * APP ROUTES
 * ==========
 * This defines the URL structure of the application.
 * Similar to React Router's Routes configuration.
 * 
 * React Router equivalent:
 * <Routes>
 *   <Route path="/" element={<Dashboard />} />
 *   <Route path="/course/:courseId" element={<CourseView />} />
 *   <Route path="/course/:courseId/lesson/:lessonId" element={<LessonView />} />
 * </Routes>
 */

import { Routes } from '@angular/router';

export const routes: Routes = [
  // Home/Dashboard
  {
    path: '',
    loadComponent: () => 
      import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  
  // Course detail view
  {
    path: 'course/:courseId',
    loadComponent: () => 
      import('./components/course-view/course-view.component').then(m => m.CourseViewComponent)
  },
  
  // Lesson view
  {
    path: 'course/:courseId/lesson/:lessonId',
    loadComponent: () => 
      import('./components/lesson-view/lesson-view.component').then(m => m.LessonViewComponent)
  },
  
  // Redirect unknown routes to home
  {
    path: '**',
    redirectTo: ''
  }
];
