import { createFeatureSelector, createSelector } from '@ngrx/store';
import type { CoursesState, CurrentCourseState, ContinueState } from './app.state';

export const selectCoursesState = createFeatureSelector<CoursesState>('courses');
export const selectCurrentCourseState = createFeatureSelector<CurrentCourseState>('currentCourse');
export const selectContinueState = createFeatureSelector<ContinueState>('continue');

export const selectCourses = createSelector(
  selectCoursesState,
  state => state.courses
);

export const selectCoursesLoading = createSelector(
  selectCoursesState,
  state => state.loading
);

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
