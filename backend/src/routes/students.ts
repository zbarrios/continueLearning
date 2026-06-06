// Demo only — lists students for the in-app switcher (no auth in this submission).
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { queryAll } from '../db/database.js';
import type { Student } from '../types/index.js';

export async function studentRoutes(fastify: FastifyInstance): Promise<void> {
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
