import { queryAll, queryOne, exists, execute } from '../db/database.js';
import type {
  Course,
  RecommendedCourse,
  CourseWithProgress,
  LessonWithProgress
} from '../types/index.js';

export function getEnrolledCoursesWithProgress(studentId: string): CourseWithProgress[] {
  const courses = queryAll<Course>(`
    SELECT c.id, c.title, c.description
    FROM courses c
    INNER JOIN enrollments e ON e.course_id = c.id
    WHERE e.student_id = ?
    ORDER BY e.enrolled_at DESC
  `, [studentId]);

  return courses.map(course => enrichCourseWithProgress(course, studentId));
}

export function getCourseWithLessons(
  studentId: string,
  courseId: string
): { course: CourseWithProgress; lessons: LessonWithProgress[] } | null {
  const course = queryOne<Course>(`
    SELECT id, title, description FROM courses WHERE id = ?
  `, [courseId]);

  if (!course) {
    return null;
  }

  const enrolled = exists(`
    SELECT 1 FROM enrollments WHERE student_id = ? AND course_id = ?
  `, [studentId, courseId]);

  if (!enrolled) {
    return null;
  }

  const lessons = queryAll<{
    id: string;
    course_id: string;
    title: string;
    type: string;
    duration_seconds: number | null;
    position: number;
    content_url: string | null;
  }>(`
    SELECT id, course_id, title, type, duration_seconds, position, content_url
    FROM lessons
    WHERE course_id = ?
    ORDER BY position ASC
  `, [courseId]);

  const lessonsWithProgress: LessonWithProgress[] = lessons.map(lesson => {
    const progress = queryOne<{
      percent: number;
      completed: number;
      last_position_seconds: number | null;
    }>(`
      SELECT percent, completed, last_position_seconds
      FROM progress
      WHERE student_id = ? AND lesson_id = ?
    `, [studentId, lesson.id]);

    return {
      id: lesson.id,
      courseId: lesson.course_id,
      title: lesson.title,
      type: lesson.type as 'video' | 'text',
      durationSeconds: lesson.duration_seconds,
      position: lesson.position,
      contentUrl: lesson.content_url,
      progress: progress ? {
        percent: progress.percent,
        completed: progress.completed === 1,
        lastPositionSeconds: progress.last_position_seconds
      } : undefined
    };
  });

  return {
    course: enrichCourseWithProgress(course, studentId),
    lessons: lessonsWithProgress
  };
}

function enrichCourseWithProgress(course: Course, studentId: string): CourseWithProgress {
  const totalResult = queryOne<{ count: number }>(`
    SELECT COUNT(*) as count FROM lessons WHERE course_id = ?
  `, [course.id]);

  const completedResult = queryOne<{ count: number }>(`
    SELECT COUNT(*) as count
    FROM progress p
    INNER JOIN lessons l ON l.id = p.lesson_id
    WHERE p.student_id = ?
      AND l.course_id = ?
      AND p.completed = 1
  `, [studentId, course.id]);

  const totalCount = totalResult?.count ?? 0;
  const completedCount = completedResult?.count ?? 0;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const lastAccessed = queryOne<{
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
  }>(`
    SELECT
      l.id, l.course_id, l.title, l.type, l.duration_seconds, l.position, l.content_url,
      p.percent, p.completed, p.last_position_seconds
    FROM progress p
    INNER JOIN lessons l ON l.id = p.lesson_id
    WHERE p.student_id = ? AND l.course_id = ?
    ORDER BY p.updated_at DESC
    LIMIT 1
  `, [studentId, course.id]);

  return {
    ...course,
    progress: {
      completedCount,
      totalCount,
      percent
    },
    lastAccessedLesson: lastAccessed ? {
      id: lastAccessed.id,
      courseId: lastAccessed.course_id,
      title: lastAccessed.title,
      type: lastAccessed.type as 'video' | 'text',
      durationSeconds: lastAccessed.duration_seconds,
      position: lastAccessed.position,
      contentUrl: lastAccessed.content_url,
      progress: {
        percent: lastAccessed.percent,
        completed: lastAccessed.completed === 1,
        lastPositionSeconds: lastAccessed.last_position_seconds
      }
    } : undefined
  };
}

export function isStudentEnrolledForLesson(studentId: string, lessonId: string): boolean {
  return exists(`
    SELECT 1
    FROM enrollments e
    INNER JOIN lessons l ON l.course_id = e.course_id
    WHERE e.student_id = ? AND l.id = ?
  `, [studentId, lessonId]);
}

export function getCourseIdForLesson(lessonId: string): string | null {
  const result = queryOne<{ course_id: string }>(`
    SELECT course_id FROM lessons WHERE id = ?
  `, [lessonId]);
  return result?.course_id ?? null;
}

export function getRecommendedCourses(studentId: string): RecommendedCourse[] {
  const enrolled = getEnrolledCoursesWithProgress(studentId);

  const notEnrolled = queryAll<Course>(`
    SELECT c.id, c.title, c.description
    FROM courses c
    WHERE c.id NOT IN (
      SELECT course_id FROM enrollments WHERE student_id = ?
    )
    ORDER BY c.title ASC
  `, [studentId]);

  const newCourses: RecommendedCourse[] = notEnrolled.map(course => {
    const totalResult = queryOne<{ count: number }>(`
      SELECT COUNT(*) as count FROM lessons WHERE course_id = ?
    `, [course.id]);
    const totalCount = totalResult?.count ?? 0;

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      isEnrolled: false,
      progress: { completedCount: 0, totalCount, percent: 0 }
    };
  });

  const incompleteEnrolled: RecommendedCourse[] = enrolled
    .filter(course => course.progress.percent < 100)
    .sort((a, b) => b.progress.percent - a.progress.percent)
    .map(course => ({
      id: course.id,
      title: course.title,
      description: course.description,
      isEnrolled: true,
      progress: course.progress
    }));

  if (incompleteEnrolled.length === 0) {
    return newCourses.slice(0, 3);
  }

  if (newCourses.length === 0) {
    return incompleteEnrolled.slice(0, 3);
  }

  const result: RecommendedCourse[] = [];
  result.push(...incompleteEnrolled.slice(0, 2));
  const remainingSlots = 3 - result.length;
  result.push(...newCourses.slice(0, Math.max(1, remainingSlots)));

  return result.slice(0, 3);
}

export function enrollStudentInCourse(studentId: string, courseId: string): void {
  const course = queryOne<{ id: string }>('SELECT id FROM courses WHERE id = ?', [courseId]);
  if (!course) {
    throw new Error('Course not found');
  }

  const alreadyEnrolled = exists(
    'SELECT 1 FROM enrollments WHERE student_id = ? AND course_id = ?',
    [studentId, courseId]
  );
  if (alreadyEnrolled) {
    return;
  }

  execute(
    'INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)',
    [studentId, courseId]
  );
}
