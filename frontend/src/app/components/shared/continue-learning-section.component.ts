/**
 * CONTINUE LEARNING SECTION
 * =========================
 * Shared "Continue Learning" card and recommendations modal.
 * Used on the dashboard and on completed course views.
 */

import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ApiService } from '../../services/api.service';
import { StudentService } from '../../services/student.service';
import { loadContinueLesson, loadCourse, loadCourses, selectContinueInfo } from '../../store';
import type { RecommendedCourse } from '../../models';

@Component({
  selector: 'app-continue-learning-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="continue-section" *ngIf="continueInfo$ | async as continueInfo">
      <div *ngIf="continueInfo.isPending" class="continue-loading">
        Loading your progress...
      </div>

      <div
        *ngIf="!continueInfo.isPending"
        class="continue-card"
        [class.start]="continueInfo.hasNotStarted"
        [class.completed]="continueInfo.isCompleted"
      >
        <div class="continue-content">
          <span class="continue-label">Continue Learning</span>

          <ng-container *ngIf="continueInfo.lesson && continueInfo.course">
            <h2 class="continue-lesson-title">{{ continueInfo.lesson.title }}</h2>
            <p class="continue-course-name">{{ continueInfo.course.title }}</p>
            <p *ngIf="continueInfo.isReady" class="continue-progress">
              {{ continueInfo.lesson.progress?.percent || 0 }}% complete
            </p>
            <p *ngIf="continueInfo.hasNotStarted" class="continue-progress">
              Not started yet
            </p>
          </ng-container>

          <ng-container *ngIf="continueInfo.isCompleted">
            <h2 class="continue-lesson-title" *ngIf="allPlatformCoursesComplete">
              You've completed all your courses!
            </h2>
            <p class="continue-course-name" *ngIf="allPlatformCoursesComplete">
              More courses are coming soon — stay tuned.
            </p>
            <h2 class="continue-lesson-title" *ngIf="!allPlatformCoursesComplete">
              Great work — keep learning!
            </h2>
            <p class="continue-course-name" *ngIf="!allPlatformCoursesComplete">
              Continue a course in progress, or enroll in something new.
            </p>
          </ng-container>

          <ng-container *ngIf="!continueInfo.lesson && !continueInfo.isCompleted">
            <h2 class="continue-lesson-title">Ready to begin?</h2>
            <p class="continue-course-name">Pick a course below to start learning.</p>
          </ng-container>
        </div>

        <button class="continue-button" (click)="onContinueClick(continueInfo)">
          Continue →
        </button>
      </div>
    </section>

    <div
      *ngIf="showRecommendationsModal"
      class="modal-overlay"
      (click)="closeRecommendationsModal()"
    >
      <div class="modal" (click)="$event.stopPropagation()">
        <button type="button" class="modal-close" (click)="closeRecommendationsModal()">×</button>
        <h2 class="modal-title">Continue Learning</h2>
        <p class="modal-subtitle" *ngIf="modalCourses.length > 0">
          {{ hasEnrollmentCourses && hasInProgressCourses
            ? 'Continue a course in progress or enroll in something new'
            : hasInProgressCourses
              ? 'Pick a course to keep learning'
              : 'Enroll in a new course to get started' }}
        </p>

        <div *ngIf="modalCourses.length > 0" class="recommended-grid">
          <button
            type="button"
            *ngFor="let course of modalCourses"
            class="recommended-card"
            [class.enrollment]="!course.isEnrolled"
            (click)="onCourseClick(course)"
          >
            <span class="course-type-badge" [class.enrolled]="course.isEnrolled">
              {{ course.isEnrolled ? 'In progress' : 'New course' }}
            </span>
            <h4 class="recommended-course-title">{{ course.title }}</h4>
            <p class="recommended-course-description">{{ course.description }}</p>
            <div *ngIf="course.isEnrolled" class="course-progress-row">
              <div class="course-progress-bar">
                <div
                  class="course-progress-fill"
                  [style.width.%]="course.progress.percent"
                ></div>
              </div>
              <span class="course-progress-label">
                {{ course.progress.percent }}% · {{ course.progress.completedCount }}/{{ course.progress.totalCount }} lessons
              </span>
            </div>
            <span *ngIf="!course.isEnrolled" class="enroll-hint">
              {{ course.progress.totalCount }} lessons · Tap to enroll
            </span>
          </button>
        </div>

        <div *ngIf="allPlatformCoursesComplete" class="modal-all-complete">
          <span class="modal-celebration-icon">🎉</span>
          <h3>Congratulations!</h3>
          <p>You've completed every course on the platform.</p>
          <p class="modal-coming-soon">More courses are coming soon. Stay tuned!</p>
        </div>

        <p *ngIf="enrollError" class="modal-error">{{ enrollError }}</p>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .continue-section {
      margin-bottom: 0;
    }

    .continue-loading {
      padding: 24px;
      text-align: center;
      color: #5f6368;
    }

    .continue-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(135deg, #4285f4 0%, #34a853 100%);
      border-radius: 16px;
      padding: 24px 32px;
      color: white;
      box-shadow: 0 4px 12px rgba(66, 133, 244, 0.3);
    }

    .continue-card.start {
      background: linear-gradient(135deg, #fbbc04 0%, #ea4335 100%);
    }

    .continue-card.completed {
      background: linear-gradient(135deg, #34a853 0%, #137333 100%);
    }

    .continue-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      opacity: 0.9;
    }

    .continue-lesson-title {
      font-size: 24px;
      font-weight: 600;
      margin: 8px 0;
    }

    .continue-course-name {
      opacity: 0.9;
      margin: 0;
    }

    .continue-progress {
      margin-top: 8px;
      font-size: 14px;
      opacity: 0.8;
    }

    .continue-button {
      background: rgba(255, 255, 255, 0.2);
      border: 2px solid white;
      color: white;
      padding: 12px 32px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      flex-shrink: 0;
    }

    .continue-button:hover {
      background: white;
      color: #4285f4;
    }

    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 24px;
    }

    .modal {
      background: white;
      border-radius: 16px;
      padding: 32px;
      max-width: 720px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      position: relative;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    }

    .modal-close {
      position: absolute;
      top: 16px;
      right: 16px;
      background: none;
      border: none;
      font-size: 28px;
      line-height: 1;
      color: #5f6368;
      cursor: pointer;
      padding: 4px 8px;
    }

    .modal-close:hover {
      color: #202124;
    }

    .modal-title {
      font-size: 22px;
      font-weight: 600;
      color: #202124;
      margin: 0 0 8px 0;
    }

    .modal-subtitle {
      color: #5f6368;
      margin: 0 0 24px 0;
    }

    .modal-all-complete {
      text-align: center;
      padding: 16px 8px 8px;
    }

    .modal-celebration-icon {
      font-size: 48px;
      display: block;
      margin-bottom: 12px;
    }

    .modal-all-complete h3 {
      font-size: 22px;
      font-weight: 600;
      color: #137333;
      margin: 0 0 8px 0;
    }

    .modal-all-complete p {
      color: #3c4043;
      margin: 0;
      line-height: 1.5;
    }

    .modal-coming-soon {
      margin-top: 12px !important;
      color: #5f6368 !important;
      font-size: 14px !important;
    }

    .modal-error {
      margin-top: 16px;
      padding: 12px;
      background: #fce8e6;
      color: #c5221f;
      border-radius: 8px;
      font-size: 14px;
    }

    .recommended-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }

    .recommended-card {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      padding: 20px;
      text-align: left;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
    }

    .recommended-card:hover {
      border-color: #4285f4;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .recommended-card.enrollment {
      border-color: #e8f0fe;
      background: #fafbff;
    }

    .recommended-card.enrollment:hover {
      border-color: #4285f4;
    }

    .course-type-badge {
      display: inline-block;
      padding: 4px 8px;
      background: #e8f5e9;
      color: #34a853;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
    }

    .course-type-badge.enrolled {
      background: #fef3e2;
      color: #b45309;
    }

    .enroll-hint {
      font-size: 12px;
      font-weight: 500;
      color: #4285f4;
    }

    .recommended-course-title {
      font-size: 16px;
      font-weight: 600;
      color: #202124;
      margin: 0 0 8px 0;
    }

    .recommended-course-description {
      font-size: 13px;
      color: #5f6368;
      margin: 0 0 12px 0;
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .course-progress-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .course-progress-bar {
      height: 6px;
      background: #e8eaed;
      border-radius: 3px;
      overflow: hidden;
    }

    .course-progress-fill {
      height: 100%;
      background: #4285f4;
      border-radius: 3px;
      transition: width 0.3s ease;
    }

    .course-progress-label {
      font-size: 12px;
      font-weight: 500;
      color: #4285f4;
    }
  `]
})
export class ContinueLearningSectionComponent implements OnInit, OnDestroy {
  private store = inject(Store);
  private router = inject(Router);
  private apiService = inject(ApiService);
  private studentService = inject(StudentService);
  private destroy$ = new Subject<void>();

  continueInfo$ = this.store.select(selectContinueInfo);

  modalCourses: RecommendedCourse[] = [];
  allPlatformCoursesComplete = false;
  showRecommendationsModal = false;
  enrollError: string | null = null;

  get hasEnrollmentCourses(): boolean {
    return this.modalCourses.some(course => !course.isEnrolled);
  }

  get hasInProgressCourses(): boolean {
    return this.modalCourses.some(course => course.isEnrolled);
  }

  ngOnInit(): void {
    this.studentService.studentId$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadContinueData());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadContinueData(): void {
    this.showRecommendationsModal = false;
    this.enrollError = null;
    this.store.dispatch(loadContinueLesson());
    this.loadModalCourses();
  }

  onContinueClick(continueInfo: {
    isReady: boolean;
    isCompleted: boolean;
    hasNotStarted: boolean;
    lesson: { id: string } | null;
    course: { id: string } | null;
  }): void {
    if (continueInfo.isCompleted || continueInfo.hasNotStarted) {
      this.loadModalCourses();
      this.showRecommendationsModal = true;
      return;
    }

    if (continueInfo.isReady && continueInfo.lesson && continueInfo.course) {
      this.router.navigate(['/course', continueInfo.course.id, 'lesson', continueInfo.lesson.id]);
    }
  }

  closeRecommendationsModal(): void {
    this.showRecommendationsModal = false;
    this.enrollError = null;
  }

  onCourseClick(course: RecommendedCourse): void {
    this.enrollError = null;

    if (course.isEnrolled) {
      this.navigateToCourse(course.id);
      return;
    }

    this.apiService.enrollInCourse(course.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.store.dispatch(loadCourses());
        this.store.dispatch(loadContinueLesson());
        this.loadModalCourses();
        this.navigateToCourse(course.id);
      },
      error: () => {
        this.enrollError = 'Could not enroll in this course. Please try again.';
      }
    });
  }

  private navigateToCourse(courseId: string): void {
    this.showRecommendationsModal = false;
    this.store.dispatch(loadCourse({ courseId }));
    this.router.navigate(['/course', courseId], { onSameUrlNavigation: 'reload' });
  }

  private loadModalCourses(): void {
    this.apiService.getRecommendedCourses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (courses) => {
          this.modalCourses = courses;
          this.allPlatformCoursesComplete = courses.length === 0;
        },
        error: () => {
          this.modalCourses = [];
          this.allPlatformCoursesComplete = true;
        }
      });
  }
}
