export interface Student {
  id: string;
  name: string;
  email: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
}

export interface RecommendedCourse extends Course {
  isEnrolled: boolean;
  progress: CourseProgress;
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  type: 'video' | 'text';
  durationSeconds: number | null;
  position: number;
  contentUrl: string | null;
}

export interface CourseProgress {
  completedCount: number;
  totalCount: number;
  percent: number;
}

export interface LessonProgress {
  percent: number;
  completed: boolean;
  lastPositionSeconds: number | null;
}

export interface CourseWithProgress extends Course {
  progress: CourseProgress;
  lastAccessedLesson?: LessonWithProgress;
}

export interface LessonWithProgress extends Lesson {
  progress?: LessonProgress;
}

export interface RecordProgressResponse {
  courseId: string;
  lessonProgress: LessonProgress;
  courseProgress: CourseProgress;
}

export interface ContinueLearningResponse {
  status: 'ready' | 'completed' | 'not_started';
  lesson: LessonWithProgress | null;
  course: Course | null;
}

export interface RecordProgressRequest {
  lessonId: string;
  percent: number;
  positionSeconds?: number;
}

export interface CourseDetail {
  course: CourseWithProgress;
  lessons: LessonWithProgress[];
}
