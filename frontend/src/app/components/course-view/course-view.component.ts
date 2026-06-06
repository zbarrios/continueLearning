import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ProgressBarComponent } from '../shared/progress-bar.component';
import { ContinueLearningSectionComponent } from '../shared/continue-learning-section.component';
import { ApiService } from '../../services/api.service';
import {
  loadCourse,
  clearCurrentCourse,
  selectCurrentCourse,
  selectCurrentCourseLessons,
  selectCurrentCourseLoading
} from '../../store';
import type { CourseWithProgress, LessonWithProgress } from '../../models';

@Component({
  selector: 'app-course-view',
  standalone: true,
  imports: [CommonModule, ProgressBarComponent, ContinueLearningSectionComponent],
  template: `
    <div class="course-view">
      <button class="back-button" (click)="goBack()">
        ← Back to Dashboard
      </button>

      <div *ngIf="loading$ | async" class="loading">
        Loading course...
      </div>

      <div *ngIf="course$ | async as course" class="course-content">
        <header class="course-header">
          <h1>{{ course.title }}</h1>
          <p class="course-description">{{ course.description }}</p>
          
          <div class="progress-section">
            <app-progress-bar
              [percent]="course.progress.percent"
              [completedCount]="course.progress.completedCount"
              [totalCount]="course.progress.totalCount"
            ></app-progress-bar>
          </div>
        </header>

        <section class="lessons-section">
          <h2>Lessons</h2>
          
          <div class="lessons-list">
            <div 
              *ngFor="let lesson of lessons$ | async; let i = index" 
              class="lesson-card"
              [class.completed]="lesson.progress?.completed"
              [class.in-progress]="lesson.progress && !lesson.progress.completed && lesson.progress.percent > 0"
              (click)="onLessonClick(course.id, lesson.id)"
            >
              <div class="lesson-number">{{ i + 1 }}</div>
              
              <div class="lesson-info">
                <h3 class="lesson-title">{{ lesson.title }}</h3>
                <div class="lesson-meta">
                  <span class="lesson-type">{{ lesson.type === 'video' ? '📹 Video' : '📄 Text' }}</span>
                  <span *ngIf="lesson.durationSeconds" class="lesson-duration">
                    {{ formatDuration(lesson.durationSeconds) }}
                  </span>
                </div>
              </div>

              <div class="lesson-status">
                <span *ngIf="lesson.progress?.completed" class="status-badge completed">
                  ✓ Completed
                </span>

                <span 
                  *ngIf="lesson.progress && !lesson.progress.completed && lesson.progress.percent > 0" 
                  class="status-badge in-progress"
                >
                  {{ lesson.progress.percent }}%
                </span>

                <span 
                  *ngIf="!lesson.progress || lesson.progress.percent === 0" 
                  class="status-badge not-started"
                >
                  Start →
                </span>
              </div>
            </div>
          </div>
        </section>

        <section *ngIf="isCourseComplete(course)" class="course-completed-section">
          <div class="congratulations-card">
            <span class="congratulations-icon">🎉</span>
            <h2>Congratulations!</h2>
            <p>You've completed all {{ course.progress.totalCount }} lessons in this course.</p>
            <p class="congratulations-detail">Great work on finishing {{ course.title }}.</p>
            <p *ngIf="allPlatformCoursesComplete" class="congratulations-coming-soon">
              More courses are coming soon — stay tuned!
            </p>
            <p *ngIf="!allPlatformCoursesComplete" class="congratulations-next">
              Explore new courses below to keep learning.
            </p>
          </div>

          <app-continue-learning-section></app-continue-learning-section>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .course-view {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
    }

    .back-button {
      background: none;
      border: none;
      color: #4285f4;
      font-size: 14px;
      cursor: pointer;
      padding: 8px 0;
      margin-bottom: 16px;
    }

    .back-button:hover {
      text-decoration: underline;
    }

    .loading {
      padding: 48px;
      text-align: center;
      color: #5f6368;
    }

    /* Course header */
    .course-header {
      margin-bottom: 32px;
    }

    .course-header h1 {
      font-size: 32px;
      font-weight: 600;
      color: #202124;
      margin: 0 0 8px 0;
    }

    .course-description {
      color: #5f6368;
      font-size: 16px;
      line-height: 1.5;
      margin: 0 0 24px 0;
    }

    .progress-section {
      background: #f8f9fa;
      padding: 16px;
      border-radius: 8px;
    }

    /* Lessons section */
    .lessons-section h2 {
      font-size: 20px;
      font-weight: 600;
      color: #202124;
      margin-bottom: 16px;
    }

    .lessons-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .lesson-card {
      display: flex;
      align-items: center;
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .lesson-card:hover {
      border-color: #4285f4;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .lesson-card.completed {
      background: #f0fdf4;
      border-color: #34a853;
    }

    .lesson-card.in-progress {
      background: #fef3e2;
      border-color: #fbbc04;
    }

    .lesson-number {
      width: 32px;
      height: 32px;
      background: #e8eaed;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      color: #5f6368;
      margin-right: 16px;
      flex-shrink: 0;
    }

    .lesson-card.completed .lesson-number {
      background: #34a853;
      color: white;
    }

    .lesson-card.in-progress .lesson-number {
      background: #fbbc04;
      color: white;
    }

    .lesson-info {
      flex: 1;
    }

    .lesson-title {
      font-size: 16px;
      font-weight: 500;
      color: #202124;
      margin: 0 0 4px 0;
    }

    .lesson-meta {
      display: flex;
      gap: 12px;
      font-size: 13px;
      color: #5f6368;
    }

    .lesson-status {
      margin-left: 16px;
    }

    .status-badge {
      padding: 6px 12px;
      border-radius: 16px;
      font-size: 13px;
      font-weight: 500;
    }

    .status-badge.completed {
      background: #e6f4ea;
      color: #137333;
    }

    .status-badge.in-progress {
      background: #fef3e2;
      color: #b45309;
    }

    .status-badge.not-started {
      background: #e8f0fe;
      color: #4285f4;
    }

    /* Course completed section */
    .course-completed-section {
      margin-top: 40px;
      padding-top: 32px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .congratulations-card {
      text-align: center;
      background: linear-gradient(135deg, #f0fdf4 0%, #e8f5e9 100%);
      border: 1px solid #34a853;
      border-radius: 16px;
      padding: 32px 24px;
    }

    .congratulations-icon {
      font-size: 48px;
      display: block;
      margin-bottom: 12px;
    }

    .congratulations-card h2 {
      font-size: 28px;
      font-weight: 600;
      color: #137333;
      margin: 0 0 8px 0;
    }

    .congratulations-card p {
      font-size: 16px;
      color: #3c4043;
      margin: 0;
      line-height: 1.5;
    }

    .congratulations-detail {
      margin-top: 8px !important;
      color: #5f6368 !important;
      font-size: 14px !important;
    }

    .congratulations-coming-soon {
      margin-top: 16px !important;
      padding-top: 16px;
      border-top: 1px solid rgba(52, 168, 83, 0.25);
      color: #137333 !important;
      font-size: 14px !important;
      font-weight: 500;
    }

    .congratulations-next {
      margin-top: 16px !important;
      color: #4285f4 !important;
      font-size: 14px !important;
      font-weight: 500;
    }
  `]
})
export class CourseViewComponent implements OnInit, OnDestroy {
  private store = inject(Store);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private apiService = inject(ApiService);
  private destroy$ = new Subject<void>();

  course$: Observable<CourseWithProgress | null> = this.store.select(selectCurrentCourse);
  lessons$: Observable<LessonWithProgress[]> = this.store.select(selectCurrentCourseLessons);
  loading$: Observable<boolean> = this.store.select(selectCurrentCourseLoading);

  allPlatformCoursesComplete = false;

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const courseId = params.get('courseId');
      if (courseId) {
        this.store.dispatch(loadCourse({ courseId }));
      }
    });

    this.course$.pipe(takeUntil(this.destroy$)).subscribe(course => {
      if (course && this.isCourseComplete(course)) {
        this.loadPlatformCourseAvailability();
      } else {
        this.allPlatformCoursesComplete = false;
      }
    });
  }

  private loadPlatformCourseAvailability(): void {
    this.apiService.getRecommendedCourses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (courses) => {
          this.allPlatformCoursesComplete = courses.length === 0;
        },
        error: () => {
          this.allPlatformCoursesComplete = true;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.store.dispatch(clearCurrentCourse());
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  onLessonClick(courseId: string, lessonId: string): void {
    this.router.navigate(['/course', courseId, 'lesson', lessonId]);
  }

  isCourseComplete(course: CourseWithProgress): boolean {
    return course.progress.totalCount > 0 && course.progress.percent === 100;
  }

  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min`;
  }
}
