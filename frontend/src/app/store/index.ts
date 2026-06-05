/**
 * STORE INDEX
 * ===========
 * Re-exports everything from the store for easier imports.
 * 
 * Instead of:
 *   import { loadCourses } from '../store/app.actions';
 *   import { selectCourses } from '../store/app.selectors';
 * 
 * You can do:
 *   import { loadCourses, selectCourses } from '../store';
 */

export * from './app.state';
export * from './app.actions';
export * from './app.reducers';
export * from './app.selectors';
export * from './app.effects';
