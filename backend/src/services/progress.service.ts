import { queryOne, execute } from '../db/database.js';
import { isStudentEnrolledForLesson, getCourseIdForLesson } from './course.service.js';
import type {
  RecordProgressResponse,
  ContinueLearningResponse
} from '../types/index.js';

const COMPLETION_THRESHOLD = 95;

// Subsecond precision so sequential saves in the same second remain ordered.
const PROGRESS_TIMESTAMP = "strftime('%Y-%m-%d %H:%M:%f', 'now')";

export function recordProgress(
  studentId: string,
  lessonId: string,
  percent: number,
  positionSeconds?: number
): RecordProgressResponse {
  if (percent < 0 || percent > 100) {
    throw new Error('Invalid percent: must be between 0 and 100');
  }

  if (!lessonId || typeof lessonId !== 'string') {
    throw new Error('Invalid lessonId');
  }

  if (!isStudentEnrolledForLesson(studentId, lessonId)) {
    throw new Error('Student not enrolled in this course');
  }

  const completed = percent >= COMPLETION_THRESHOLD ? 1 : 0;

  // Max-wins upsert: progress never decreases; atomic, no read-modify-write race.
  execute(`
    INSERT INTO progress (student_id, lesson_id, percent, completed, last_position_seconds, updated_at)
    VALUES (?, ?, ?, ?, ?, ${PROGRESS_TIMESTAMP})
    ON CONFLICT (student_id, lesson_id) DO UPDATE SET
      percent = MAX(progress.percent, excluded.percent),
      completed = MAX(progress.completed, excluded.completed),
      last_position_seconds = CASE
        WHEN excluded.percent > progress.percent THEN excluded.last_position_seconds
        ELSE progress.last_position_seconds
      END,
      updated_at = ${PROGRESS_TIMESTAMP}
  `, [studentId, lessonId, percent, completed, positionSeconds ?? null]);

  const courseId = getCourseIdForLesson(lessonId);
  if (!courseId) {
    throw new Error('Lesson not found');
  }

  const courseProgress = calculateCourseProgress(studentId, courseId);

  const storedProgress = queryOne<{ percent: number; completed: number; last_position_seconds: number | null }>(`
    SELECT percent, completed, last_position_seconds FROM progress
    WHERE student_id = ? AND lesson_id = ?
  `, [studentId, lessonId]);

  return {
    courseId,
    lessonProgress: {
      percent: storedProgress?.percent ?? percent,
      completed: (storedProgress?.completed ?? completed) === 1,
      lastPositionSeconds: storedProgress?.last_position_seconds ?? null
    },
    courseProgress
  };
}

function calculateCourseProgress(studentId: string, courseId: string): {
  completedCount: number;
  totalCount: number;
  percent: number;
} {
  const totalResult = queryOne<{ count: number }>(`
    SELECT COUNT(*) as count FROM lessons WHERE course_id = ?
  `, [courseId]);

  const completedResult = queryOne<{ count: number }>(`
    SELECT COUNT(*) as count
    FROM progress p
    INNER JOIN lessons l ON l.id = p.lesson_id
    WHERE p.student_id = ? AND l.course_id = ? AND p.completed = 1
  `, [studentId, courseId]);

  const totalCount = totalResult?.count ?? 0;
  const completedCount = completedResult?.count ?? 0;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return { completedCount, totalCount, percent };
}

export function getContinueLesson(studentId: string): ContinueLearningResponse {
  const inProgressLesson = queryOne<{
    id: string;
    course_id: string;
    title: string;
    type: string;
    duration_seconds: number | null;
    position: number;
    content_url: string | null;
    percent: number;
    completed: number;
    last_position_seconds: number | null;
    c_id: string;
    c_title: string;
    c_description: string;
  }>(`
    SELECT
      l.id, l.course_id, l.title, l.type, l.duration_seconds, l.position, l.content_url,
      p.percent, p.completed, p.last_position_seconds,
      c.id as c_id, c.title as c_title, c.description as c_description
    FROM progress p
    INNER JOIN lessons l ON l.id = p.lesson_id
    INNER JOIN courses c ON c.id = l.course_id
    INNER JOIN enrollments e ON e.course_id = c.id AND e.student_id = p.student_id
    WHERE p.student_id = ? AND p.completed = 0
    ORDER BY p.updated_at DESC, l.position DESC
    LIMIT 1
  `, [studentId]);

  if (inProgressLesson) {
    return {
      status: 'ready',
      lesson: {
        id: inProgressLesson.id,
        courseId: inProgressLesson.course_id,
        title: inProgressLesson.title,
        type: inProgressLesson.type as 'video' | 'text',
        durationSeconds: inProgressLesson.duration_seconds,
        position: inProgressLesson.position,
        contentUrl: inProgressLesson.content_url,
        progress: {
          percent: inProgressLesson.percent,
          completed: false,
          lastPositionSeconds: inProgressLesson.last_position_seconds
        }
      },
      course: {
        id: inProgressLesson.c_id,
        title: inProgressLesson.c_title,
        description: inProgressLesson.c_description
      }
    };
  }

  const nextUnstartedLesson = queryOne<{
    id: string;
    course_id: string;
    title: string;
    type: string;
    duration_seconds: number | null;
    position: number;
    content_url: string | null;
    c_id: string;
    c_title: string;
    c_description: string;
  }>(`
    SELECT
      l.id, l.course_id, l.title, l.type, l.duration_seconds, l.position, l.content_url,
      c.id as c_id, c.title as c_title, c.description as c_description
    FROM lessons l
    INNER JOIN courses c ON c.id = l.course_id
    INNER JOIN enrollments e ON e.course_id = c.id
    LEFT JOIN progress p ON p.lesson_id = l.id AND p.student_id = e.student_id
    WHERE e.student_id = ? AND p.lesson_id IS NULL
    ORDER BY e.enrolled_at ASC, l.position ASC
    LIMIT 1
  `, [studentId]);

  if (nextUnstartedLesson) {
    const anyProgress = queryOne<{ exists: number }>(`
      SELECT 1 as exists FROM progress WHERE student_id = ? LIMIT 1
    `, [studentId]);

    return {
      status: anyProgress ? 'ready' : 'not_started',
      lesson: {
        id: nextUnstartedLesson.id,
        courseId: nextUnstartedLesson.course_id,
        title: nextUnstartedLesson.title,
        type: nextUnstartedLesson.type as 'video' | 'text',
        durationSeconds: nextUnstartedLesson.duration_seconds,
        position: nextUnstartedLesson.position,
        contentUrl: nextUnstartedLesson.content_url,
        progress: undefined
      },
      course: {
        id: nextUnstartedLesson.c_id,
        title: nextUnstartedLesson.c_title,
        description: nextUnstartedLesson.c_description
      }
    };
  }

  return {
    status: 'completed',
    lesson: null,
    course: null
  };
}
