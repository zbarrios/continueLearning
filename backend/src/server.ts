/**
 * MAIN SERVER FILE
 * ================
 * This is like your main Application class in Spring Boot:
 * 
 * @SpringBootApplication
 * public class TutorStreamApplication {
 *     public static void main(String[] args) {
 *         SpringApplication.run(TutorStreamApplication.class, args);
 *     }
 * }
 * 
 * In Fastify, we:
 * 1. Create the Fastify instance (like ApplicationContext)
 * 2. Register plugins (like @EnableWebMvc, etc.)
 * 3. Register routes (like @ComponentScan finding @RestControllers)
 * 4. Start listening (like embedded Tomcat starting)
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { initializeDatabase, initializeSchema, seedDatabase, seedRecommendedCourses } from './db/database.js';
import { studentRoutes } from './routes/students.js';
import { courseRoutes } from './routes/courses.js';
import { progressRoutes } from './routes/progress.js';

// Create Fastify instance with logging enabled
// This is like creating the ApplicationContext
const fastify = Fastify({
  logger: {
    level: 'info',
    // Pretty print logs in development (like Spring's colored console output)
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  }
});

/**
 * Initialize the application
 */
async function start(): Promise<void> {
  try {
    // ========== REGISTER PLUGINS ==========
    // Plugins are like Spring @Configuration classes that add functionality
    
    // Enable CORS (Cross-Origin Resource Sharing)
    // This allows the Angular frontend (running on localhost:4200) 
    // to call our API (running on localhost:3000)
    // In Spring, this is like @CrossOrigin or WebMvcConfigurer.addCorsMappings()
    await fastify.register(cors, {
      origin: ['http://localhost:4200'], // Angular dev server
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true
    });

    // ========== INITIALIZE DATABASE ==========
    // Like Flyway or Hibernate auto-ddl running at startup
    await initializeDatabase();
    initializeSchema();
    seedDatabase();
    seedRecommendedCourses();

    // ========== REGISTER ROUTES ==========
    // Like @ComponentScan finding all @RestController classes
    await fastify.register(studentRoutes);
    await fastify.register(courseRoutes);
    await fastify.register(progressRoutes);

    // ========== HEALTH CHECK ENDPOINT ==========
    // Every good API has a health check (like Spring Actuator's /health)
    fastify.get('/api/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // ========== START THE SERVER ==========
    // Like embedded Tomcat starting on port 8080
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = '0.0.0.0'; // Listen on all interfaces

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

// Handle graceful shutdown (like @PreDestroy in Spring)
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

// Start the server
start();
