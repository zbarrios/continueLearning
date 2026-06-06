import type {
  CourseWithProgress,
  LessonWithProgress
} from '../models';

export interface CoursesState {
  courses: CourseWithProgress[];
  loading: boolean;
  error: string | null;
}

export interface CurrentCourseState {
  course: CourseWithProgress | null;
  lessons: LessonWithProgress[];
  loading: boolean;
  error: string | null;
}

export interface ContinueState {
  status: 'idle' | 'loading' | 'ready' | 'completed' | 'not_started';
  lesson: LessonWithProgress | null;
  course: { id: string; title: string; description: string } | null;
  error: string | null;
}

export interface AppState {
  courses: CoursesState;
  currentCourse: CurrentCourseState;
  continue: ContinueState;
}

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
