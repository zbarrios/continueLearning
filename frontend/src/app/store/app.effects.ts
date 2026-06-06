import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, mergeMap, catchError, switchMap } from 'rxjs/operators';
import { ApiService } from '../services/api.service';
import * as AppActions from './app.actions';

@Injectable()
export class AppEffects {
  private actions$ = inject(Actions);
  private api = inject(ApiService);

  loadCourses$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AppActions.loadCourses),
      switchMap(() =>
        this.api.getCourses().pipe(
          map(courses => AppActions.loadCoursesSuccess({ courses })),
          catchError(error => of(AppActions.loadCoursesFailure({
            error: error.message || 'Failed to load courses'
          })))
        )
      )
    )
  );

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

  // mergeMap: never cancel in-flight progress saves if user clicks again quickly
  recordProgress$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AppActions.recordProgress),
      mergeMap(({ lessonId, percent, positionSeconds }) =>
        this.api.recordProgress({ lessonId, percent, positionSeconds }).pipe(
          map(response => AppActions.recordProgressSuccess({
            courseId: response.courseId,
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

  refreshContinueAfterProgress$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AppActions.recordProgressSuccess),
      map(() => AppActions.loadContinueLesson())
    )
  );

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
