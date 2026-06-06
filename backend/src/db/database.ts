// sql.js: in-memory SQLite persisted to tutorstream.db on every write.
import initSqlJs, { Database as SqlJsDatabase, SqlValue } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', '..', 'tutorstream.db');

let db: SqlJsDatabase | null = null;

export async function initializeDatabase(): Promise<SqlJsDatabase> {
  if (db) return db;

  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
    console.log('Loaded existing database from', dbPath);
  } else {
    db = new SQL.Database();
    console.log('Created new database');
  }

  db.run('PRAGMA foreign_keys = ON');
  return db;
}

export function getDb(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

export function saveDatabase(): void {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

export function initializeSchema(): void {
  const database = getDb();

  database.run(`
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT
    )
  `);

  database.run(`
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
    CREATE TABLE IF NOT EXISTS enrollments (
      student_id TEXT NOT NULL REFERENCES students(id),
      course_id TEXT NOT NULL REFERENCES courses(id),
      enrolled_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (student_id, course_id)
    )
  `);

  database.run(`
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

  database.run('CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id)');
  database.run('CREATE INDEX IF NOT EXISTS idx_progress_student ON progress(student_id)');
  database.run('CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id)');

  saveDatabase();
  console.log('Database schema initialized');
}

export function seedDatabase(): void {
  const database = getDb();

  const result = database.exec('SELECT COUNT(*) as count FROM students');
  const count = result.length > 0 ? result[0].values[0][0] as number : 0;

  if (count > 0) {
    console.log('Database already seeded, skipping...');
    return;
  }

  database.run('INSERT INTO students (id, name, email) VALUES (?, ?, ?)',
    ['student-1', 'Alice Chen', 'alice@example.com']);
  database.run('INSERT INTO students (id, name, email) VALUES (?, ?, ?)',
    ['student-2', 'Bob Martinez', 'bob@example.com']);
  database.run('INSERT INTO students (id, name, email) VALUES (?, ?, ?)',
    ['student-3', 'Carol Okonkwo', 'carol@example.com']);

  database.run('INSERT INTO courses (id, title, description) VALUES (?, ?, ?)',
    ['course-1', 'JavaScript Fundamentals', 'Learn JavaScript from scratch - variables, functions, and async programming']);

  database.run('INSERT INTO courses (id, title, description) VALUES (?, ?, ?)',
    ['course-2', 'Advanced TypeScript', 'Master TypeScript generics, decorators, and advanced patterns']);

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

  database.run('INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)', ['student-1', 'course-1']);
  database.run('INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)', ['student-1', 'course-2']);
  database.run('INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)', ['student-2', 'course-1']);
  database.run('INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)', ['student-2', 'course-2']);
  database.run('INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)', ['student-3', 'course-2']);

  // Alice: 3/5 lessons done, lesson 4 at 45% → 60% course progress
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

  saveDatabase();
  console.log('Database seeded with 3 demo students');

  seedRecommendedCourses();
}

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
    ['lesson-3-1', 'course-3', 'Components & JSX', 'video', 720, 1],
    ['lesson-3-2', 'course-3', 'Hooks in Practice', 'video', 900, 2],
    ['lesson-3-3', 'course-3', 'State Patterns', 'text', null, 3],
    ['lesson-4-1', 'course-4', 'Express Basics', 'video', 840, 1],
    ['lesson-4-2', 'course-4', 'Middleware & Routing', 'text', null, 2],
    ['lesson-4-3', 'course-4', 'Connecting to MongoDB', 'video', 960, 3],
    ['lesson-5-1', 'course-5', 'Flexbox Fundamentals', 'video', 600, 1],
    ['lesson-5-2', 'course-5', 'CSS Grid Layout', 'video', 780, 2],
    ['lesson-5-3', 'course-5', 'Responsive Design', 'text', null, 3],
    ['lesson-6-1', 'course-6', 'Variables & Data Types', 'video', 660, 1],
    ['lesson-6-2', 'course-6', 'Control Flow', 'text', null, 2],
    ['lesson-6-3', 'course-6', 'Functions & Modules', 'video', 900, 3],
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

export function queryAll<T>(sql: string, params: SqlValue[] = []): T[] {
  const database = getDb();
  const stmt = database.prepare(sql);
  stmt.bind(params);

  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export function queryOne<T>(sql: string, params: SqlValue[] = []): T | undefined {
  return queryAll<T>(sql, params)[0];
}

export function execute(sql: string, params: SqlValue[] = []): void {
  getDb().run(sql, params);
  saveDatabase();
}

export function exists(sql: string, params: SqlValue[] = []): boolean {
  return queryOne<Record<string, unknown>>(sql, params) !== undefined;
}
