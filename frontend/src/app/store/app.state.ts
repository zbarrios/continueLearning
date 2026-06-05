/**
 * APP STATE
 * =========
 * This defines the shape of our entire application state.
 * 
 * Think of state as a single JavaScript object that holds ALL your app's data.
 * Instead of having state scattered across components, it's centralized here.
 * 
 * React + Redux equivalent:
 * const initialState = {
 *   courses: { ids: [], entities: {}, loading: false },
 *   currentCourse: null,
 *   ...
 * }
 */

import type { 
  CourseWithProgress, 
  LessonWithProgress, 
  ContinueLearningResponse 
} from '../models';

/**
 * State for the courses list (dashboard)
 */
export interface CoursesState {
  courses: CourseWithProgress[];
  loading: boolean;
  error: string | null;
}

/**
 * State for viewing a single course
 */
export interface CurrentCourseState {
  course: CourseWithProgress | null;
  lessons: LessonWithProgress[];
  loading: boolean;
  error: string | null;
}

/**
 * State for the "Continue Learning" feature
 */
export interface ContinueState {
  status: 'idle' | 'loading' | 'ready' | 'completed' | 'not_started';
  lesson: LessonWithProgress | null;
  course: { id: string; title: string; description: string } | null;
  error: string | null;
}

/**
 * The complete app state
 * This is the root state that contains all feature states
 */
export interface AppState {
  courses: CoursesState;
  currentCourse: CurrentCourseState;
  continue: ContinueState;
}

/**
 * Initial state values
 * These are the default values when the app starts
 */
export const initialCoursesState: CoursesState = {
  courses: [],
  loading: false,
  error: null
};

export const initialCurrentCourseState: CurrentCourseState = {
  course: null,
  lessons: [],
  loading: false,
  error: null
};

export const initialContinueState: ContinueState = {
  status: 'idle',
  lesson: null,
  course: null,
  error: null
};
