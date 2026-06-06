import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  getEnrolledCoursesWithProgress,
  getCourseWithLessons,
  getRecommendedCourses,
  enrollStudentInCourse
} from '../services/course.service.js';

interface StudentParams {
  studentId: string;
}

interface CourseParams extends StudentParams {
  courseId: string;
}

interface RecommendedQuery {
  studentId: string;
}

interface EnrollBody {
  courseId: string;
}

export async function courseRoutes(fastify: FastifyInstance): Promise<void> {
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

  fastify.get<{ Params: StudentParams }>(
    '/api/students/:studentId/courses',
    async (request: FastifyRequest<{ Params: StudentParams }>, reply: FastifyReply) => {
      const { studentId } = request.params;

      try {
        const courses = getEnrolledCoursesWithProgress(studentId);
        return reply.send(courses);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to fetch courses' });
      }
    }
  );

  fastify.get<{ Params: CourseParams }>(
    '/api/students/:studentId/courses/:courseId',
    async (request: FastifyRequest<{ Params: CourseParams }>, reply: FastifyReply) => {
      const { studentId, courseId } = request.params;

      try {
        const result = getCourseWithLessons(studentId, courseId);

        if (!result) {
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
