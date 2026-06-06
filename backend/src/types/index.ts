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
  progress: {
    completedCount: number;
    totalCount: number;
    percent: number;
  };
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

export interface Enrollment {
  studentId: string;
  courseId: string;
  enrolledAt: string;
}

export interface Progress {
  studentId: string;
  lessonId: string;
  percent: number;
  completed: boolean;
  lastPositionSeconds: number | null;
  updatedAt: string;
}

export interface CourseWithProgress extends Course {
  progress: {
    completedCount: number;
    totalCount: number;
    percent: number;
  };
  lastAccessedLesson?: LessonWithProgress;
}

export interface LessonWithProgress extends Lesson {
  progress?: {
    percent: number;
    completed: boolean;
    lastPositionSeconds: number | null;
  };
}

export interface RecordProgressResponse {
  courseId: string;
  lessonProgress: {
    percent: number;
    completed: boolean;
    lastPositionSeconds: number | null;
  };
  courseProgress: {
    completedCount: number;
    totalCount: number;
    percent: number;
  };
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
