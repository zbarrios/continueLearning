/**
 * COURSE ROUTES
 * =============
 * This is like a @RestController in Spring.
 * 
 * In Spring:
 *   @GetMapping("/api/students/{studentId}/courses")
 *   public List<Course> getCourses(@PathVariable String studentId) {...}
 * 
 * In Fastify:
 *   fastify.get('/api/students/:studentId/courses', async (request, reply) => {...})
 * 
 * Key differences:
 * - @PathVariable → request.params
 * - @RequestBody → request.body
 * - @RequestParam → request.query
 * - ResponseEntity → reply.code(200).send(data)
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { 
  getEnrolledCoursesWithProgress, 
  getCourseWithLessons,
  getRecommendedCourses,
  enrollStudentInCourse
} from '../services/course.service.js';

// Define parameter types (like method parameter annotations in Spring)
interface StudentParams {
  studentId: string;
}

interface CourseParams extends StudentParams {
  courseId: string;
}

// Query string type for recommended endpoint
interface RecommendedQuery {
  studentId: string;
}

interface EnrollBody {
  courseId: string;
}

/**
 * Register all course-related routes
 * 
 * In Fastify, we group routes by registering them as a plugin.
 * This is similar to having separate @RestController classes in Spring.
 */
export async function courseRoutes(fastify: FastifyInstance): Promise<void> {

  /**
   * GET /api/courses/recommended?studentId=xxx
   * 
   * Returns up to 3 courses: incomplete enrolled first, then unenrolled.
   * Empty when every platform course is enrolled and completed.
   */
  fastify.get<{ Querystring: RecommendedQuery }>(
    '/api/courses/recommended',
    async (request: FastifyRequest<{ Querystring: RecommendedQuery }>, reply: FastifyReply) => {
      const { studentId } = request.query;

      if (!studentId) {
        return reply.code(400).send({ error: 'studentId query parameter is required' });
      }

      try {
        const courses = getRecommendedCourses(studentId);
        return reply.send(courses);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to fetch recommended courses' });
      }
    }
  );

  /**
   * POST /api/students/:studentId/enrollments
   *
   * Enroll a student in a course (e.g. from recommendations modal).
   */
  fastify.post<{ Params: StudentParams; Body: EnrollBody }>(
    '/api/students/:studentId/enrollments',
    async (request, reply) => {
      const { studentId } = request.params;
      const { courseId } = request.body;

      if (!courseId) {
        return reply.code(400).send({ error: 'courseId is required' });
      }

      try {
        enrollStudentInCourse(studentId, courseId);
        return reply.code(201).send({ success: true, courseId });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to enroll';
        if (message === 'Course not found') {
          return reply.code(404).send({ error: message });
        }
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to enroll in course' });
      }
    }
  );

  /**
   * GET /api/students/:studentId/courses
   * 
   * List all courses the student is enrolled in, with progress info.
   * 
   * Response: Array of CourseWithProgress
   * [
   *   {
   *     id: "course-1",
   *     title: "JavaScript Fundamentals",
   *     progress: { completedCount: 3, totalCount: 5, percent: 60 }
   *   }
   * ]
   */
  fastify.get<{ Params: StudentParams }>(
    '/api/students/:studentId/courses',
    async (request: FastifyRequest<{ Params: StudentParams }>, reply: FastifyReply) => {
      const { studentId } = request.params;

      // In a real app, you'd verify the authenticated user matches studentId
      // For this demo, we trust the studentId parameter

      try {
        const courses = getEnrolledCoursesWithProgress(studentId);
        
        // reply.send() is like returning ResponseEntity.ok(body) in Spring
        return reply.send(courses);
      } catch (error) {
        // Fastify automatically handles errors, but we can customize
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to fetch courses' });
      }
    }
  );

  /**
   * GET /api/students/:studentId/courses/:courseId
   * 
   * Get a single course with all its lessons and the student's progress on each.
   * 
   * Response:
   * {
   *   course: { id, title, progress: {...} },
   *   lessons: [
   *     { id, title, type, position, progress: { percent, completed } },
   *     ...
   *   ]
   * }
   */
  fastify.get<{ Params: CourseParams }>(
    '/api/students/:studentId/courses/:courseId',
    async (request: FastifyRequest<{ Params: CourseParams }>, reply: FastifyReply) => {
      const { studentId, courseId } = request.params;

      try {
        const result = getCourseWithLessons(studentId, courseId);
        
        if (!result) {
          // Like throwing ResponseStatusException(HttpStatus.NOT_FOUND) in Spring
          return reply.code(404).send({ error: 'Course not found or not enrolled' });
        }

        return reply.send(result);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to fetch course' });
      }
    }
  );
}
