/**
 * TYPE DEFINITIONS
 * ================
 * These are like Java DTOs (Data Transfer Objects) or entity classes.
 * They define the shape of our data but don't have any behavior.
 * 
 * In TypeScript, 'interface' is compile-time only - it doesn't exist at runtime.
 * Think of it as a contract for what properties an object must have.
 */

// ============================================
// DATABASE ENTITIES (like @Entity in JPA)
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

/**
 * Course shown in the continue-learning modal.
 * Unenrolled courses are listed after incomplete enrolled courses.
 */
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
  courseId: string;       // Foreign key to Course
  title: string;
  type: 'video' | 'text'; // TypeScript "union type" - can only be one of these values
  durationSeconds: number | null; // null for text lessons (like Optional<Integer> in Java)
  position: number;       // Order within the course (1, 2, 3...)
  contentUrl: string | null;
}

export interface Enrollment {
  studentId: string;
  courseId: string;
  enrolledAt: string; // ISO date string
}

export interface Progress {
  studentId: string;
  lessonId: string;
  percent: number;           // 0-100
  completed: boolean;        // true if percent >= 95
  lastPositionSeconds: number | null; // Where to resume video
  updatedAt: string;         // ISO date string
}

// ============================================
// API RESPONSE TYPES (like Response DTOs in Spring)
// ============================================

/**
 * Course with calculated progress info
 * This is what we return to the frontend - enriched with computed data
 */
export interface CourseWithProgress extends Course {
  progress: {
    completedCount: number;  // How many lessons completed
    totalCount: number;      // Total lessons in course
    percent: number;         // completedCount / totalCount * 100
  };
  lastAccessedLesson?: LessonWithProgress; // Most recent lesson touched
}

/**
 * Lesson with its progress data for a specific student
 */
export interface LessonWithProgress extends Lesson {
  progress?: {
    percent: number;
    completed: boolean;
    lastPositionSeconds: number | null;
  };
} 

/**
 * Response when recording progress
 */
export interface RecordProgressResponse {
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

/**
 * Response for "Continue Learning" endpoint
 */
export interface ContinueLearningResponse {
  status: 'ready' | 'completed' | 'not_started';
  lesson: LessonWithProgress | null;
  course: Course | null;
}

// ============================================
// API REQUEST TYPES (like @RequestBody DTOs in Spring)
// ============================================

export interface RecordProgressRequest {
  lessonId: string;
  percent: number;
  positionSeconds?: number; // Optional - only for video lessons
}
