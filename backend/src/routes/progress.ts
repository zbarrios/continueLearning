import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { recordProgress, getContinueLesson } from '../services/progress.service.js';
import type { RecordProgressRequest } from '../types/index.js';

interface StudentParams {
  studentId: string;
}

export async function progressRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Params: StudentParams; Body: RecordProgressRequest }>(
    '/api/students/:studentId/progress',
    async (
      request: FastifyRequest<{ Params: StudentParams; Body: RecordProgressRequest }>,
      reply: FastifyReply
    ) => {
      const { studentId } = request.params;
      const { lessonId, percent, positionSeconds } = request.body;

      if (!lessonId) {
        return reply.code(400).send({ error: 'lessonId is required' });
      }

      if (typeof percent !== 'number') {
        return reply.code(400).send({ error: 'percent is required and must be a number' });
      }

      try {
        const result = recordProgress(studentId, lessonId, percent, positionSeconds);
        return reply.send(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        if (errorMessage.includes('not enrolled')) {
          return reply.code(403).send({ error: errorMessage });
        }

        if (errorMessage.includes('Invalid')) {
          return reply.code(400).send({ error: errorMessage });
        }

        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to record progress' });
      }
    }
  );

  fastify.get<{ Params: StudentParams }>(
    '/api/students/:studentId/continue',
    async (request: FastifyRequest<{ Params: StudentParams }>, reply: FastifyReply) => {
      const { studentId } = request.params;

      try {
        const result = getContinueLesson(studentId);
        return reply.send(result);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to get continue lesson' });
      }
    }
  );
}
