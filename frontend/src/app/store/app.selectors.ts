/**
 * NgRx SELECTORS
 * ==============
 * Selectors are functions that extract specific pieces of state.
 * They're memoized (cached) for performance.
 * 
 * React + Redux equivalent:
 * const selectCourses = state => state.courses.courses;
 * // With reselect library:
 * const selectCompletedCourses = createSelector(
 *   selectCourses,
 *   courses => courses.filter(c => c.progress.percent === 100)
 * );
 * 
 * In components, you'd use:
 * const courses = useSelector(selectCourses);  // React
 * this.store.select(selectCourses)             // Angular
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import type { CoursesState, CurrentCourseState, ContinueState } from './app.state';

// ============================================
// FEATURE SELECTORS
// ============================================

// These select the top-level slices of state
export const selectCoursesState = createFeatureSelector<CoursesState>('courses');
export const selectCurrentCourseState = createFeatureSelector<CurrentCourseState>('currentCourse');
export const selectContinueState = createFeatureSelector<ContinueState>('continue');

// ============================================
// COURSES SELECTORS
// ============================================

// Select all courses
export const selectCourses = createSelector(
  selectCoursesState,
  state => state.courses
);

// Select loading state
export const selectCoursesLoading = createSelector(
  selectCoursesState,
  state => state.loading
);

// Select error state
export const selectCoursesError = createSelector(
  selectCoursesState,
  state => state.error
);

// Derived selector: courses sorted by progress (highest first)
export const selectCoursesSortedByProgress = createSelector(
  selectCourses,
  courses => [...courses].sort((a, b) => b.progress.percent - a.progress.percent)
);

// Derived selector: courses that are in progress (started but not complete)
export const selectInProgressCourses = createSelector(
  selectCourses,
  courses => courses.filter(c => c.progress.percent > 0 && c.progress.percent < 100)
);

// Derived selector: completed courses
export const selectCompletedCourses = createSelector(
  selectCourses,
  courses => courses.filter(c => c.progress.percent === 100)
);

// ============================================
// CURRENT COURSE SELECTORS
// ============================================

export const selectCurrentCourse = createSelector(
  selectCurrentCourseState,
  state => state.course
);

export const selectCurrentCourseLessons = createSelector(
  selectCurrentCourseState,
  state => state.lessons
);

export const selectCurrentCourseLoading = createSelector(
  selectCurrentCourseState,
  state => state.loading
);

export const selectCurrentCourseError = createSelector(
  selectCurrentCourseState,
  state => state.error
);

// Derived: group lessons by completion status
export const selectLessonsByStatus = createSelector(
  selectCurrentCourseLessons,
  lessons => ({
    completed: lessons.filter(l => l.progress?.completed),
    inProgress: lessons.filter(l => l.progress && !l.progress.completed && l.progress.percent > 0),
    notStarted: lessons.filter(l => !l.progress || l.progress.percent === 0)
  })
);

// ============================================
// CONTINUE LEARNING SELECTORS
// ============================================

export const selectContinueStatus = createSelector(
  selectContinueState,
  state => state.status
);

export const selectContinueLesson = createSelector(
  selectContinueState,
  state => state.lesson
);

export const selectContinueCourse = createSelector(
  selectContinueState,
  state => state.course
);

export const selectContinueError = createSelector(
  selectContinueState,
  state => state.error
);

// Combined selector: all info needed for the "Continue Learning" button
export const selectContinueInfo = createSelector(
  selectContinueState,
  state => ({
    status: state.status,
    lesson: state.lesson,
    course: state.course,
    error: state.error,
    isLoading: state.status === 'loading',
    isPending: state.status === 'idle' || state.status === 'loading',
    isReady: state.status === 'ready',
    isCompleted: state.status === 'completed',
    hasNotStarted: state.status === 'not_started'
  })
);
