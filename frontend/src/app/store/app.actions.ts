import { createAction, props } from '@ngrx/store';
import type {
  CourseWithProgress,
  LessonWithProgress,
  CourseProgress,
  LessonProgress
} from '../models';

export const loadCourses = createAction('[Dashboard] Load Courses');

export const loadCoursesSuccess = createAction(
  '[API] Load Courses Success',
  props<{ courses: CourseWithProgress[] }>()
);

export const loadCoursesFailure = createAction(
  '[API] Load Courses Failure',
  props<{ error: string }>()
);

export const loadCourse = createAction(
  '[Course View] Load Course',
  props<{ courseId: string }>()
);

export const loadCourseSuccess = createAction(
  '[API] Load Course Success',
  props<{ course: CourseWithProgress; lessons: LessonWithProgress[] }>()
);

export const loadCourseFailure = createAction(
  '[API] Load Course Failure',
  props<{ error: string }>()
);

export const clearCurrentCourse = createAction('[Course View] Clear Current Course');

export const recordProgress = createAction(
  '[Lesson View] Record Progress',
  props<{
    lessonId: string;
    percent: number;
    positionSeconds?: number;
  }>()
);

export const recordProgressSuccess = createAction(
  '[API] Record Progress Success',
  props<{
    courseId: string;
    lessonId: string;
    lessonProgress: LessonProgress;
    courseProgress: CourseProgress;
  }>()
);

export const recordProgressFailure = createAction(
  '[API] Record Progress Failure',
  props<{ error: string }>()
);

export const loadContinueLesson = createAction('[Dashboard] Load Continue Lesson');

export const loadContinueLessonSuccess = createAction(
  '[API] Continue Lesson Success',
  props<{
    status: 'ready' | 'completed' | 'not_started';
    lesson: LessonWithProgress | null;
    course: { id: string; title: string; description: string } | null;
  }>()
);

export const loadContinueLessonFailure = createAction(
  '[API] Continue Lesson Failure',
  props<{ error: string }>()
);
