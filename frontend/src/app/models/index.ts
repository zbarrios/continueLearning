/**
 * TYPE DEFINITIONS
 * ================
 * These match the backend API response types.
 * In TypeScript, interfaces define the "shape" of data.
 * 
 * Similar to creating DTOs or POJOs in Java:
 * public class Course { String id; String title; ... }
 */

// ============================================
// CORE ENTITIES
// ============================================

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

// ============================================
// API RESPONSE TYPES
// ============================================

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

/**
 * Course with calculated progress info (from GET /courses)
 */
export interface CourseWithProgress extends Course {
  progress: CourseProgress;
  lastAccessedLesson?: LessonWithProgress;
}

/**
 * Lesson with progress for a specific student
 */
export interface LessonWithProgress extends Lesson {
  progress?: LessonProgress;
}

/**
 * Response from POST /progress
 */
export interface RecordProgressResponse {
  lessonProgress: LessonProgress;
  courseProgress: CourseProgress;
}

/**
 * Response from GET /continue
 */
export interface ContinueLearningResponse {
  status: 'ready' | 'completed' | 'not_started';
  lesson: LessonWithProgress | null;
  course: Course | null;
}

/**
 * Request body for POST /progress
 */
export interface RecordProgressRequest {
  lessonId: string;
  percent: number;
  positionSeconds?: number;
}

/**
 * Course detail response (course + all lessons)
 */
export interface CourseDetail {
  course: CourseWithProgress;
  lessons: LessonWithProgress[];
}
