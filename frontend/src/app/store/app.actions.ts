/**
 * NgRx ACTIONS
 * ============
 * Actions are events that describe something that happened in the application.
 * They're like event objects in Redux.
 * 
 * React + Redux equivalent:
 * export const loadCourses = () => ({ type: 'LOAD_COURSES' })
 * export const loadCoursesSuccess = (courses) => ({ type: 'LOAD_COURSES_SUCCESS', payload: courses })
 * 
 * Pattern: 
 * - "[Source] Action Name" — [Dashboard] means this action came from the Dashboard component
 * - [API] means this action was triggered by an API response
 */

import { createAction, props } from '@ngrx/store';
import type { 
  CourseWithProgress, 
  LessonWithProgress, 
  CourseProgress,
  LessonProgress
} from '../models';

// ============================================
// COURSES ACTIONS (Dashboard)
// ============================================

/**
 * Load all enrolled courses
 * Dispatched when dashboard component initializes
 */
export const loadCourses = createAction(
  '[Dashboard] Load Courses'
);

/**
 * Courses loaded successfully from API
 */
export const loadCoursesSuccess = createAction(
  '[API] Load Courses Success',
  props<{ courses: CourseWithProgress[] }>()  // payload type
);

/**
 * Failed to load courses
 */
export const loadCoursesFailure = createAction(
  '[API] Load Courses Failure',
  props<{ error: string }>()
);

// ============================================
// SINGLE COURSE ACTIONS (Course View)
// ============================================

/**
 * Load a specific course with all its lessons
 */
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

/**
 * Clear current course when leaving the view
 */
export const clearCurrentCourse = createAction(
  '[Course View] Clear Current Course'
);

// ============================================
// PROGRESS ACTIONS (Lesson View)
// ============================================

/**
 * Record progress on a lesson
 * This is the most important action for the "Continue Learning" feature
 */
export const recordProgress = createAction(
  '[Lesson View] Record Progress',
  props<{ 
    lessonId: string; 
    percent: number; 
    positionSeconds?: number 
  }>()
);

export const recordProgressSuccess = createAction(
  '[API] Record Progress Success',
  props<{ 
    lessonId: string;
    lessonProgress: LessonProgress;
    courseProgress: CourseProgress;
  }>()
);

export const recordProgressFailure = createAction(
  '[API] Record Progress Failure',
  props<{ error: string }>()
);

// ============================================
// CONTINUE LEARNING ACTIONS
// ============================================

/**
 * Load the next lesson to continue
 */
export const loadContinueLesson = createAction(
  '[Dashboard] Load Continue Lesson'
);

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
