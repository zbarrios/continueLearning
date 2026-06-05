/**
 * NgRx REDUCERS
 * =============
 * Reducers are pure functions that take the current state and an action,
 * and return a NEW state (never mutate the existing state!).
 * 
 * This is identical to Redux reducers in React:
 * function reducer(state = initialState, action) {
 *   switch(action.type) {
 *     case 'LOAD_COURSES_SUCCESS':
 *       return { ...state, courses: action.payload }
 *   }
 * }
 * 
 * Key rules:
 * 1. NEVER mutate state directly (no state.courses.push())
 * 2. ALWAYS return a new object (use spread operator: {...state, property: newValue})
 * 3. Must be synchronous and pure (no side effects, no API calls)
 */

import { createReducer, on } from '@ngrx/store';
import * as Actions from './app.actions';
import { 
  initialCoursesState, 
  initialCurrentCourseState, 
  initialContinueState,
  CoursesState,
  CurrentCourseState,
  ContinueState
} from './app.state';

// ============================================
// COURSES REDUCER
// ============================================

export const coursesReducer = createReducer(
  initialCoursesState,  // The default state

  // When loadCourses is dispatched, set loading to true
  on(Actions.loadCourses, (state): CoursesState => ({
    ...state,           // Keep all existing properties
    loading: true,      // But change loading to true
    error: null         // Clear any previous errors
  })),

  // When courses are loaded successfully
  on(Actions.loadCoursesSuccess, (state, { courses }): CoursesState => ({
    ...state,
    courses,            // Replace courses with the new data
    loading: false      // Done loading
  })),

  // When loading fails
  on(Actions.loadCoursesFailure, (state, { error }): CoursesState => ({
    ...state,
    loading: false,
    error               // Store the error message
  })),

  // When progress is recorded, update the course progress in the list
  on(Actions.recordProgressSuccess, (state, { lessonId, courseProgress }): CoursesState => {
    // Find which course this lesson belongs to and update its progress
    const updatedCourses = state.courses.map(course => {
      // Check if this course contains the lesson we just updated
      const lessonBelongsToCourse = course.lastAccessedLesson?.id === lessonId ||
        course.progress.totalCount > 0; // Simple check, could be more precise
      
      if (lessonBelongsToCourse) {
        return {
          ...course,
          progress: courseProgress
        };
      }
      return course;
    });

    return {
      ...state,
      courses: updatedCourses
    };
  })
);

// ============================================
// CURRENT COURSE REDUCER
// ============================================

export const currentCourseReducer = createReducer(
  initialCurrentCourseState,

  on(Actions.loadCourse, (state): CurrentCourseState => ({
    ...state,
    loading: true,
    error: null
  })),

  on(Actions.loadCourseSuccess, (state, { course, lessons }): CurrentCourseState => ({
    ...state,
    course,
    lessons,
    loading: false
  })),

  on(Actions.loadCourseFailure, (state, { error }): CurrentCourseState => ({
    ...state,
    loading: false,
    error
  })),

  on(Actions.clearCurrentCourse, (): CurrentCourseState => initialCurrentCourseState),

  // Update lesson progress when recorded
  on(Actions.recordProgressSuccess, (state, { lessonId, lessonProgress, courseProgress }): CurrentCourseState => {
    if (!state.course) return state;

    // Update the specific lesson's progress
    const updatedLessons = state.lessons.map(lesson => {
      if (lesson.id === lessonId) {
        return {
          ...lesson,
          progress: {
            ...lesson.progress,
            ...lessonProgress,
            lastPositionSeconds:
              lessonProgress.lastPositionSeconds ?? lesson.progress?.lastPositionSeconds ?? null
          }
        };
      }
      return lesson;
    });

    // Update the course's overall progress
    const updatedCourse = {
      ...state.course,
      progress: courseProgress
    };

    return {
      ...state,
      course: updatedCourse,
      lessons: updatedLessons
    };
  })
);

// ============================================
// CONTINUE LEARNING REDUCER
// ============================================

export const continueReducer = createReducer(
  initialContinueState,

  on(Actions.loadContinueLesson, (state): ContinueState => ({
    ...state,
    status: 'loading',
    error: null
  })),

  on(Actions.loadContinueLessonSuccess, (state, { status, lesson, course }): ContinueState => ({
    ...state,
    status,
    lesson,
    course,
    error: null
  })),

  on(Actions.loadContinueLessonFailure, (state, { error }): ContinueState => ({
    ...state,
    status: 'not_started',
    error
  })),

  // When progress is recorded, refresh the continue lesson
  // (The effect will re-fetch the continue lesson)
  on(Actions.recordProgressSuccess, (state): ContinueState => ({
    ...state,
    status: 'loading' // Will be refreshed by effects
  }))
);
