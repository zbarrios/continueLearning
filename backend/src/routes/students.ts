/**
 * STUDENTS ROUTES
 * ===============
 * Demo endpoint to list all students for the student switcher.
 * 
 * NOTE: This is a demo feature only. In a real app, you would NOT
 * expose a list of all students. Authentication would determine
 * which student the user is.
 */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { queryAll } from '../db/database.js';
import type { Student } from '../types/index.js';

export async function studentRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/students
   * 
   * Returns all students sorted by name (for demo student switcher).
   * 
   * Response: Array of Student
   * [
   *   { id: "student-1", name: "Alice Chen", email: "alice@example.com" },
   *   { id: "student-2", name: "Bob Martinez", email: "bob@example.com" },
   *   ...
   * ]
   */
  fastify.get(
    '/api/students',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const students = queryAll<Student>(`
          SELECT id, name, email 
          FROM students 
          ORDER BY name ASC
        `);
        
        return reply.send(students);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to fetch students' });
      }
    }
  );
}
