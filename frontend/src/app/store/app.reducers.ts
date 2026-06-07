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

export const coursesReducer = createReducer(
  initialCoursesState,

  on(Actions.loadCourses, (state): CoursesState => ({
    ...state,
    loading: true,
    error: null
  })),

  on(Actions.loadCoursesSuccess, (state, { courses }): CoursesState => ({
    ...state,
    courses,
    loading: false
  })),

  on(Actions.loadCoursesFailure, (state, { error }): CoursesState => ({
    ...state,
    loading: false,
    error
  })),

  on(Actions.recordProgressSuccess, (state, { courseId, lessonId, lessonProgress, courseProgress }): CoursesState => ({
    ...state,
    courses: state.courses.map(course => {
      if (course.id !== courseId) {
        return course;
      }

      const existingLast = course.lastAccessedLesson;
      const updatedLastAccessed = existingLast?.id === lessonId
        ? {
            ...existingLast,
            progress: {
              ...existingLast.progress,
              ...lessonProgress,
              lastPositionSeconds:
                lessonProgress.lastPositionSeconds ?? existingLast.progress?.lastPositionSeconds ?? null
            }
          }
        : existingLast;

      return {
        ...course,
        progress: courseProgress,
        lastAccessedLesson: updatedLastAccessed
      };
    })
  }))
);

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

  on(Actions.recordProgressSuccess, (state, { lessonId, lessonProgress, courseProgress }): CurrentCourseState => {
    if (!state.course) return state;

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

    const savedLesson = updatedLessons.find(lesson => lesson.id === lessonId);

    return {
      ...state,
      course: {
        ...state.course,
        progress: courseProgress,
        lastAccessedLesson: savedLesson
          ? {
              ...savedLesson,
              progress: savedLesson.progress!
            }
          : state.course.lastAccessedLesson
      },
      lessons: updatedLessons
    };
  })
);

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

  on(Actions.recordProgressSuccess, (state): ContinueState => ({
    ...state,
    status: 'loading'
  }))
);
