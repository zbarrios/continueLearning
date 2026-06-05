/**
 * NgRx EFFECTS
 * ============
 * Effects handle "side effects" — operations that interact with the outside world,
 * like API calls, local storage, logging, etc.
 * 
 * This is similar to Redux Thunk or Redux Saga in React.
 * The key difference: NgRx uses RxJS Observables instead of Promises/async-await.
 * 
 * Flow:
 * 1. Component dispatches an action (e.g., loadCourses)
 * 2. Effect listens for that action
 * 3. Effect calls the API
 * 4. Effect dispatches a success or failure action with the result
 * 5. Reducer updates the state
 * 
 * Think of it like this:
 * - Actions are the "what" (what happened)
 * - Effects are the "how" (how to respond to what happened)
 * - Reducers are the "result" (what the new state should be)
 */

import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, mergeMap, catchError, switchMap } from 'rxjs/operators';
import { ApiService } from '../services/api.service';
import * as AppActions from './app.actions';

@Injectable()
export class AppEffects {
  // Inject the NgRx Actions stream and our API service
  private actions$ = inject(Actions);
  private api = inject(ApiService);

  /**
   * Effect: Load Courses
   * 
   * When [Dashboard] Load Courses action is dispatched:
   * 1. Call the API to get courses
   * 2. On success, dispatch Load Courses Success
   * 3. On error, dispatch Load Courses Failure
   * 
   * RxJS operators explained:
   * - ofType() — filters actions, like "only respond to loadCourses"
   * - switchMap() — when action comes in, cancel previous API call and make new one
   * - map() — transform the API response into an action
   * - catchError() — handle errors and return a failure action
   */
  loadCourses$ = createEffect(() => 
    this.actions$.pipe(
      ofType(AppActions.loadCourses),  // Listen for this action
      switchMap(() => 
        this.api.getCourses().pipe(    // Call the API
          map(courses => AppActions.loadCoursesSuccess({ courses })),
          catchError(error => of(AppActions.loadCoursesFailure({ 
            error: error.message || 'Failed to load courses' 
          })))
        )
      )
    )
  );

  /**
   * Effect: Load Single Course
   */
  loadCourse$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AppActions.loadCourse),
      switchMap(({ courseId }) =>
        this.api.getCourse(courseId).pipe(
          map(response => AppActions.loadCourseSuccess({
            course: response.course,
            lessons: response.lessons
          })),
          catchError(error => of(AppActions.loadCourseFailure({
            error: error.message || 'Failed to load course'
          })))
        )
      )
    )
  );

  /**
   * Effect: Record Progress
   * 
   * This is THE MOST IMPORTANT effect for the "Continue Learning" feature.
   * When user makes progress on a lesson:
   * 1. Send progress to the server
   * 2. Server applies MAX-WINS logic (progress never goes backwards)
   * 3. Return the actual stored progress (might be higher than what we sent!)
   */
  recordProgress$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AppActions.recordProgress),
      mergeMap(({ lessonId, percent, positionSeconds }) =>
        this.api.recordProgress({ lessonId, percent, positionSeconds }).pipe(
          map(response => AppActions.recordProgressSuccess({
            lessonId,
            lessonProgress: response.lessonProgress,
            courseProgress: response.courseProgress
          })),
          catchError(error => of(AppActions.recordProgressFailure({
            error: error.message || 'Failed to record progress'
          })))
        )
      )
    )
  );

  /**
   * Effect: After progress is recorded, refresh the "Continue Learning" lesson
   * 
   * This ensures the "Continue" button always shows the correct next lesson
   */
  refreshContinueAfterProgress$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AppActions.recordProgressSuccess),
      map(() => AppActions.loadContinueLesson())
    )
  );

  /**
   * Effect: Load Continue Lesson
   */
  loadContinueLesson$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AppActions.loadContinueLesson),
      switchMap(() =>
        this.api.getContinueLesson().pipe(
          map(response => AppActions.loadContinueLessonSuccess({
            status: response.status,
            lesson: response.lesson,
            course: response.course
          })),
          catchError(error => of(AppActions.loadContinueLessonFailure({
            error: error.message || 'Failed to load continue lesson'
          })))
        )
      )
    )
  );
}
