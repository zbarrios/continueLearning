/**
 * PROGRESS ROUTES
 * ===============
 * Handles progress tracking and "Continue Learning" functionality.
 * 
 * These are the CORE endpoints of the TutorStream product.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { recordProgress, getContinueLesson } from '../services/progress.service.js';
import type { RecordProgressRequest } from '../types/index.js';

interface StudentParams {
  studentId: string;
}

export async function progressRoutes(fastify: FastifyInstance): Promise<void> {
  
  /**
   * POST /api/students/:studentId/progress
   * 
   * Record progress on a lesson. This is the endpoint that the original
   * code review snippet was trying to implement.
   * 
   * KEY IMPROVEMENTS over the original code:
   * 1. Input validation
   * 2. Authorization check (is student enrolled?)
   * 3. Progress never goes backwards (max-wins)
   * 4. No race conditions (atomic upsert)
   * 5. Course progress calculated on-read (not stored)
   * 
   * Request body:
   * {
   *   lessonId: "lesson-1-1",
   *   percent: 45,
   *   positionSeconds: 270  // optional, for video resume
   * }
   * 
   * Response:
   * {
   *   lessonProgress: { percent: 45, completed: false },
   *   courseProgress: { completedCount: 2, totalCount: 5, percent: 40 }
   * }
   */
  fastify.post<{ Params: StudentParams; Body: RecordProgressRequest }>(
    '/api/students/:studentId/progress',
    async (
      request: FastifyRequest<{ Params: StudentParams; Body: RecordProgressRequest }>, 
      reply: FastifyReply
    ) => {
      const { studentId } = request.params;
      const { lessonId, percent, positionSeconds } = request.body;

      // Basic request body validation
      if (!lessonId) {
        return reply.code(400).send({ error: 'lessonId is required' });
      }

      if (typeof percent !== 'number') {
        return reply.code(400).send({ error: 'percent is required and must be a number' });
      }

      try {
        const result = recordProgress(studentId, lessonId, percent, positionSeconds);
        
        // Return 200 OK with the result
        // Note: the returned percent might be higher than what was sent
        // if the server already had a higher value (max-wins!)
        return reply.send(result);
        
      } catch (error) {
        // Handle specific error types
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (errorMessage.includes('not enrolled')) {
          // 403 Forbidden - like Spring's @PreAuthorize failing
          return reply.code(403).send({ error: errorMessage });
        }
        
        if (errorMessage.includes('Invalid')) {
          // 400 Bad Request - validation failure
          return reply.code(400).send({ error: errorMessage });
        }
        
        // 500 Internal Server Error for unexpected errors
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to record progress' });
      }
    }
  );

  /**
   * GET /api/students/:studentId/continue
   * 
   * The "Continue Learning" endpoint - returns the next lesson to resume.
   * This is the KEY endpoint for the product promise: "pick up where you left off"
   * 
   * Response (when in progress):
   * {
   *   status: "ready",
   *   lesson: { id, title, type, progress: { percent, lastPositionSeconds } },
   *   course: { id, title }
   * }
   * 
   * Response (when completed everything):
   * {
   *   status: "completed",
   *   lesson: null,
   *   course: null
   * }
   * 
   * Response (when not started):
   * {
   *   status: "not_started",
   *   lesson: { id, title, ... },  // First lesson of first course
   *   course: { id, title }
   * }
   */
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
