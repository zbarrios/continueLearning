/**
 * DATABASE MODULE (using sql.js)
 * ==============================
 * This is like a @Repository in Spring. It handles all direct database operations.
 * 
 * We're using sql.js - a pure JavaScript SQLite compiled from C to WebAssembly.
 * Unlike better-sqlite3, it doesn't require native compilation (Python/C++).
 * 
 * Key differences from JDBC:
 * - In Java: connection.prepareStatement(sql).setString(1, value)
 * - In sql.js: db.run(sql, [value])
 * 
 * The '?' placeholders work the same as in JDBC prepared statements.
 */

import initSqlJs, { Database as SqlJsDatabase, SqlValue } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory (ESM equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file path
const dbPath = path.join(__dirname, '..', '..', 'tutorstream.db');

// Global database instance (singleton pattern)
let db: SqlJsDatabase | null = null;

/**
 * Initialize the SQL.js library and database
 * Must be called before any other database operations
 */
export async function initializeDatabase(): Promise<SqlJsDatabase> {
  if (db) return db;

  // Initialize SQL.js (loads the WebAssembly SQLite engine)
  const SQL = await initSqlJs();

  // Try to load existing database, or create new one
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
    console.log('Loaded existing database from', dbPath);
  } else {
    db = new SQL.Database();
    console.log('Created new database');
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  return db;
}

/**
 * Get the database instance (throws if not initialized)
 */
export function getDb(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Save the database to file (sql.js works in-memory, needs explicit save)
 */
export function saveDatabase(): void {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

/**
 * Initialize the database schema
 * This is like Flyway or Liquibase migrations in Spring
 */
export function initializeSchema(): void {
  const database = getDb();

  database.run(`
    -- Students table
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL
    )
  `);

  database.run(`
    -- Courses table
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT
    )
  `);

  database.run(`
    -- Lessons table (ordered within a course)
    CREATE TABLE IF NOT EXISTS lessons (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL REFERENCES courses(id),
      title TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('video', 'text')),
      duration_seconds INTEGER,
      position INTEGER NOT NULL,
      content_url TEXT
    )
  `);

  database.run(`
    -- Enrollments (many-to-many between students and courses)
    CREATE TABLE IF NOT EXISTS enrollments (
      student_id TEXT NOT NULL REFERENCES students(id),
      course_id TEXT NOT NULL REFERENCES courses(id),
      enrolled_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (student_id, course_id)
    )
  `);

  database.run(`
    -- Progress tracking (per student per lesson)
    CREATE TABLE IF NOT EXISTS progress (
      student_id TEXT NOT NULL REFERENCES students(id),
      lesson_id TEXT NOT NULL REFERENCES lessons(id),
      percent INTEGER DEFAULT 0 CHECK(percent >= 0 AND percent <= 100),
      completed INTEGER DEFAULT 0,
      last_position_seconds INTEGER,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (student_id, lesson_id)
    )
  `);

  // Create indexes
  database.run('CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id)');
  database.run('CREATE INDEX IF NOT EXISTS idx_progress_student ON progress(student_id)');
  database.run('CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id)');

  saveDatabase();
  console.log('Database schema initialized');
}

/**
 * Seed the database with test data
 * 
 * Creates 3 demo students with different progress states:
 * - Alice Chen: Mid-way through JS Fundamentals (lessons 1-3 done, lesson 4 at 45%)
 * - Bob Martinez: Completed JS Fundamentals, not started TypeScript
 * - Carol Okonkwo: Enrolled only in TypeScript, 0% progress
 */
export function seedDatabase(): void {
  const database = getDb();

  // Check if data already exists
  const result = database.exec('SELECT COUNT(*) as count FROM students');
  const count = result.length > 0 ? result[0].values[0][0] as number : 0;

  if (count > 0) {
    console.log('Database already seeded, skipping...');
    return;
  }

  // ============================================
  // INSERT STUDENTS
  // ============================================
  database.run('INSERT INTO students (id, name, email) VALUES (?, ?, ?)',
    ['student-1', 'Alice Chen', 'alice@example.com']);
  database.run('INSERT INTO students (id, name, email) VALUES (?, ?, ?)',
    ['student-2', 'Bob Martinez', 'bob@example.com']);
  database.run('INSERT INTO students (id, name, email) VALUES (?, ?, ?)',
    ['student-3', 'Carol Okonkwo', 'carol@example.com']);

  // ============================================
  // INSERT COURSES
  // ============================================
  database.run('INSERT INTO courses (id, title, description) VALUES (?, ?, ?)',
    ['course-1', 'JavaScript Fundamentals', 'Learn JavaScript from scratch - variables, functions, and async programming']);
  
  database.run('INSERT INTO courses (id, title, description) VALUES (?, ?, ?)',
    ['course-2', 'Advanced TypeScript', 'Master TypeScript generics, decorators, and advanced patterns']);

  // ============================================
  // INSERT LESSONS
  // ============================================
  const course1Lessons = [
    ['lesson-1-1', 'course-1', 'Variables & Types', 'video', 600, 1],
    ['lesson-1-2', 'course-1', 'Functions', 'video', 900, 2],
    ['lesson-1-3', 'course-1', 'Objects & Arrays', 'text', null, 3],
    ['lesson-1-4', 'course-1', 'Async/Await', 'video', 1200, 4],
    ['lesson-1-5', 'course-1', 'Final Quiz', 'text', null, 5],
  ];

  for (const lesson of course1Lessons) {
    database.run(
      'INSERT INTO lessons (id, course_id, title, type, duration_seconds, position) VALUES (?, ?, ?, ?, ?, ?)',
      lesson
    );
  }

  const course2Lessons = [
    ['lesson-2-1', 'course-2', 'Generics Deep Dive', 'video', 1500, 1],
    ['lesson-2-2', 'course-2', 'Decorators', 'video', 1100, 2],
    ['lesson-2-3', 'course-2', 'Type Challenges', 'text', null, 3],
  ];

  for (const lesson of course2Lessons) {
    database.run(
      'INSERT INTO lessons (id, course_id, title, type, duration_seconds, position) VALUES (?, ?, ?, ?, ?, ?)',
      lesson
    );
  }

  // ============================================
  // ENROLLMENTS
  // ============================================
  // Alice: enrolled in both courses
  database.run('INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)', ['student-1', 'course-1']);
  database.run('INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)', ['student-1', 'course-2']);
  
  // Bob: enrolled in both courses
  database.run('INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)', ['student-2', 'course-1']);
  database.run('INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)', ['student-2', 'course-2']);
  
  // Carol: enrolled only in course-2 (Advanced TypeScript)
  database.run('INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)', ['student-3', 'course-2']);

  // ============================================
  // PROGRESS DATA
  // ============================================
  
  // --- Alice Chen (student-1) ---
  // Mid-way through JS Fundamentals: lessons 1-3 completed, lesson 4 at 45%
  database.run(
    'INSERT INTO progress (student_id, lesson_id, percent, completed, last_position_seconds, updated_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))',
    ['student-1', 'lesson-1-1', 100, 1, 600]
  );
  database.run(
    'INSERT INTO progress (student_id, lesson_id, percent, completed, last_position_seconds, updated_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))',
    ['student-1', 'lesson-1-2', 100, 1, 900]
  );
  database.run(
    'INSERT INTO progress (student_id, lesson_id, percent, completed, last_position_seconds, updated_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))',
    ['student-1', 'lesson-1-3', 100, 1, null]
  );
  database.run(
    'INSERT INTO progress (student_id, lesson_id, percent, completed, last_position_seconds, updated_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))',
    ['student-1', 'lesson-1-4', 45, 0, 540]
  );
  // Alice has NOT started course-2 yet

  // --- Bob Martinez (student-2) ---
  // Completed ALL of JS Fundamentals (100% on all 5 lessons)
  database.run(
    'INSERT INTO progress (student_id, lesson_id, percent, completed, last_position_seconds, updated_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))',
    ['student-2', 'lesson-1-1', 100, 1, 600]
  );
  database.run(
    'INSERT INTO progress (student_id, lesson_id, percent, completed, last_position_seconds, updated_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))',
    ['student-2', 'lesson-1-2', 100, 1, 900]
  );
  database.run(
    'INSERT INTO progress (student_id, lesson_id, percent, completed, last_position_seconds, updated_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))',
    ['student-2', 'lesson-1-3', 100, 1, null]
  );
  database.run(
    'INSERT INTO progress (student_id, lesson_id, percent, completed, last_position_seconds, updated_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))',
    ['student-2', 'lesson-1-4', 100, 1, 1200]
  );
  database.run(
    'INSERT INTO progress (student_id, lesson_id, percent, completed, last_position_seconds, updated_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))',
    ['student-2', 'lesson-1-5', 100, 1, null]
  );
  // Bob has NOT started course-2 yet (continue → lesson-2-1)

  // --- Carol Okonkwo (student-3) ---
  // Enrolled only in course-2, 0% progress (no progress records)
  // Continue will show "not_started" → first lesson of course-2 (lesson-2-1)

  saveDatabase();
  console.log('Database seeded with 3 demo students');

  seedRecommendedCourses();
}

/**
 * Seed 5 additional courses (not enrolled by default) for recommendations.
 * Safe to run on every startup — skips if course-3 already exists.
 */
export function seedRecommendedCourses(): void {
  const database = getDb();

  const existing = queryOne<{ id: string }>(
    'SELECT id FROM courses WHERE id = ?',
    ['course-3']
  );
  if (existing) {
    return;
  }

  const recommendedCourses = [
    ['course-3', 'React Essentials', 'Build modern UIs with components, hooks, and state management'],
    ['course-4', 'Node.js Backend Development', 'Create REST APIs, work with databases, and deploy server apps'],
    ['course-5', 'CSS & Layout Mastery', 'Flexbox, Grid, responsive design, and modern CSS patterns'],
    ['course-6', 'Python for Beginners', 'Learn Python syntax, data structures, and scripting fundamentals'],
    ['course-7', 'Database Design', 'Model data with SQL, normalization, indexes, and query optimization'],
  ];

  for (const course of recommendedCourses) {
    database.run(
      'INSERT INTO courses (id, title, description) VALUES (?, ?, ?)',
      course
    );
  }

  const recommendedLessons = [
    // course-3: video, video, text
    ['lesson-3-1', 'course-3', 'Components & JSX', 'video', 720, 1],
    ['lesson-3-2', 'course-3', 'Hooks in Practice', 'video', 900, 2],
    ['lesson-3-3', 'course-3', 'State Patterns', 'text', null, 3],
    // course-4: video, text, video
    ['lesson-4-1', 'course-4', 'Express Basics', 'video', 840, 1],
    ['lesson-4-2', 'course-4', 'Middleware & Routing', 'text', null, 2],
    ['lesson-4-3', 'course-4', 'Connecting to MongoDB', 'video', 960, 3],
    // course-5: video, video, text
    ['lesson-5-1', 'course-5', 'Flexbox Fundamentals', 'video', 600, 1],
    ['lesson-5-2', 'course-5', 'CSS Grid Layout', 'video', 780, 2],
    ['lesson-5-3', 'course-5', 'Responsive Design', 'text', null, 3],
    // course-6: video, text, video
    ['lesson-6-1', 'course-6', 'Variables & Data Types', 'video', 660, 1],
    ['lesson-6-2', 'course-6', 'Control Flow', 'text', null, 2],
    ['lesson-6-3', 'course-6', 'Functions & Modules', 'video', 900, 3],
    // course-7: video, video, text
    ['lesson-7-1', 'course-7', 'Relational Modeling', 'video', 1020, 1],
    ['lesson-7-2', 'course-7', 'Writing Efficient Queries', 'video', 1140, 2],
    ['lesson-7-3', 'course-7', 'Schema Design Review', 'text', null, 3],
  ];

  for (const lesson of recommendedLessons) {
    database.run(
      'INSERT INTO lessons (id, course_id, title, type, duration_seconds, position) VALUES (?, ?, ?, ?, ?, ?)',
      lesson
    );
  }

  saveDatabase();
  console.log('Seeded 5 recommended courses (course-3 through course-7)');
}

// ============================================
// HELPER FUNCTIONS FOR QUERYING
// ============================================

/**
 * Execute a SELECT query and return all rows as objects
 * Similar to jdbcTemplate.query() in Spring
 */
export function queryAll<T>(sql: string, params: SqlValue[] = []): T[] {
  const database = getDb();
  const stmt = database.prepare(sql);
  stmt.bind(params);

  const results: T[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as T;
    results.push(row);
  }
  stmt.free();
  return results;
}

/**
 * Execute a SELECT query and return the first row (or undefined)
 * Similar to jdbcTemplate.queryForObject() in Spring
 */
export function queryOne<T>(sql: string, params: SqlValue[] = []): T | undefined {
  const results = queryAll<T>(sql, params);
  return results[0];
}

/**
 * Execute an INSERT/UPDATE/DELETE statement
 * Similar to jdbcTemplate.update() in Spring
 */
export function execute(sql: string, params: SqlValue[] = []): void {
  const database = getDb();
  database.run(sql, params);
  saveDatabase();
}

/**
 * Check if a row exists
 */
export function exists(sql: string, params: SqlValue[] = []): boolean {
  // Simply check if the query returns any result
  const result = queryOne<Record<string, unknown>>(sql, params);
  return result !== undefined;
}
