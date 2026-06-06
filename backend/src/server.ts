import Fastify from 'fastify';
import cors from '@fastify/cors';
import { initializeDatabase, initializeSchema, seedDatabase } from './db/database.js';
import { studentRoutes } from './routes/students.js';
import { courseRoutes } from './routes/courses.js';
import { progressRoutes } from './routes/progress.js';

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  }
});

async function start(): Promise<void> {
  try {
    await fastify.register(cors, {
      origin: ['http://localhost:4200'],
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true
    });

    await initializeDatabase();
    initializeSchema();
    seedDatabase();

    await fastify.register(studentRoutes);
    await fastify.register(courseRoutes);
    await fastify.register(progressRoutes);

    fastify.get('/api/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    const port = parseInt(process.env.PORT || '3000', 10);
    const host = '0.0.0.0';

    await fastify.listen({ port, host });

    console.log(`
╔════════════════════════════════════════════════════════╗
║  TutorStream API Server                                ║
║  Running on: http://localhost:${port}                     ║
║                                                        ║
║  Endpoints:                                            ║
║  - GET  /api/health                                    ║
║  - GET  /api/students              (list all students) ║
║  - GET  /api/students/:id/courses                      ║
║  - GET  /api/students/:id/courses/:courseId            ║
║  - POST /api/students/:id/progress                     ║
║  - GET  /api/courses/recommended                       ║
║  - POST /api/students/:id/enrollments                  ║
║  - GET  /api/students/:id/continue                     ║
║                                                        ║
║  Demo students: Alice, Bob, Carol                      ║
╚════════════════════════════════════════════════════════╝
    `);

  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await fastify.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await fastify.close();
  process.exit(0);
});

start();
