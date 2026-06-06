import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'course/:courseId',
    loadComponent: () =>
      import('./components/course-view/course-view.component').then(m => m.CourseViewComponent)
  },
  {
    path: 'course/:courseId/lesson/:lessonId',
    loadComponent: () =>
      import('./components/lesson-view/lesson-view.component').then(m => m.LessonViewComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
