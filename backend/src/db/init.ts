import { initializeDatabase, initializeSchema, seedDatabase } from './database.js';

async function init() {
  console.log('Initializing TutorStream database...\n');

  await initializeDatabase();
  initializeSchema();
  seedDatabase();

  console.log('\nDatabase ready!');
  process.exit(0);
}

init().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
