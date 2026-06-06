/** Lesson view: simulated video player, text content, progress → NgRx → API. */
import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { debounceTime, filter, take, takeUntil } from 'rxjs/operators';

import {
  loadCourse,
  recordProgress,
  selectCurrentCourse,
  selectCurrentCourseLessons
} from '../../store';
import type { CourseWithProgress, LessonWithProgress } from '../../models';

@Component({
  selector: 'app-lesson-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="lesson-view">
      <!-- Navigation -->
      <div class="lesson-nav">
        <button class="nav-button" (click)="goToCourse()">
          ← Back to {{ courseName() }}
        </button>
      </div>

      <!-- Lesson content -->
      <div class="lesson-container" *ngIf="currentLesson() as lesson">
        <!-- Header -->
        <header class="lesson-header">
          <span class="lesson-position">Lesson {{ lesson.position }}</span>
          <h1>{{ lesson.title }}</h1>
        </header>

        <!-- Video lesson — simulated playback -->
        <div *ngIf="lesson.type === 'video'" class="video-section">
          <div class="video-meta">
            <span class="video-type-badge">📹 Video</span>
            <span *ngIf="isVideoCompleted()" class="video-completed-badge">✓ Completed</span>
            <span *ngIf="!isVideoCompleted() && savedVideoPercent() > 0" class="video-in-progress-badge">
              In progress
            </span>
            <span
              class="saved-progress"
              [class.complete]="isVideoCompleted()"
            >{{ savedVideoPercent() }}%</span>
          </div>

          <div class="video-container">
            <div class="sim-player">
              <div
                class="sim-screen"
                [class.playing]="isPlaying()"
                [class.completed]="isVideoCompleted() && !isPlaying()"
              >
                <span class="sim-icon">{{ isPlaying() ? '⏸' : '▶' }}</span>
                <span class="sim-title">{{ lesson.title }}</span>
                <span class="sim-subtitle">
                  {{ isVideoCompleted()
                    ? 'Completed — press play to watch again'
                    : 'Press play to watch' }}
                </span>
              </div>

              <div class="sim-controls">
                <button
                  type="button"
                  class="sim-play-btn"
                  (click)="togglePlayback(lesson.durationSeconds || 0)"
                  [attr.aria-label]="isPlaying() ? 'Pause' : 'Play'"
                >
                  {{ isPlaying() ? '⏸' : '▶' }}
                </button>

                <div class="scrubber-wrap">
                  <input
                    type="range"
                    class="sim-scrubber"
                    min="0"
                    [max]="lesson.durationSeconds || 0"
                    [ngModel]="localPositionSeconds()"
                    (mousedown)="onScrubStart()"
                    (touchstart)="onScrubStart()"
                    (ngModelChange)="onScrubChange($event, lesson.durationSeconds || 0)"
                    (change)="onScrubEnd($event, lesson.durationSeconds || 0)"
                  />
                  <div
                    class="scrubber-saved-marker"
                    *ngIf="lesson.durationSeconds"
                    [style.left.%]="savedPositionPercent(lesson.durationSeconds)"
                    [title]="'Furthest point watched: ' + formatDuration(savedVideoPosition())"
                  ></div>
                </div>

                <span class="sim-time">
                  {{ formatDuration(localPositionSeconds()) }} / {{ formatDuration(lesson.durationSeconds || 0) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Text lesson -->
        <div *ngIf="lesson.type === 'text'" class="text-section">
          <div class="text-content">
            <h2>{{ lesson.title }}</h2>
            
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
              ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
              aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit
              in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
            </p>
            
            <p>
              Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium
              doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore
              veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim
              ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia
              consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.
            </p>
            
            <h3>Key Concepts</h3>
            <ul>
              <li>Understanding the fundamental principles and their applications in real-world scenarios</li>
              <li>Implementing best practices for optimal performance and maintainability</li>
              <li>Recognizing common patterns and knowing when to apply them effectively</li>
              <li>Debugging techniques and troubleshooting strategies for complex issues</li>
            </ul>
            
            <p>
              Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit
              laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum
              iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae
              consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?
            </p>
            
            <p>
              At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis
              praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias
              excepturi sint occaecati cupiditate non provident, similique sunt in culpa
              qui officia deserunt mollitia animi, id est laborum et dolorum fuga.
            </p>
            
            <h3>Summary</h3>
            <p>
              Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus
              saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae.
              Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis
              voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat.
            </p>
          </div>
        </div>

        <!-- Navigation between lessons -->
        <div class="lesson-navigation">
          <button
            class="nav-lesson-button prev"
            [disabled]="!prevLesson()"
            (click)="goToPrevLesson()"
          >
            <span class="nav-direction">← Previous</span>
            <span class="nav-lesson-title" *ngIf="prevLesson() as prev">{{ prev.title }}</span>
          </button>
          <button
            class="nav-lesson-button next"
            [class.complete-course]="isLastLesson()"
            [disabled]="!nextLesson() && !isLastLesson()"
            (click)="onNextAction()"
          >
            <ng-container *ngIf="nextLesson() as next; else completeCourse">
              <span class="nav-direction">Next →</span>
              <span class="nav-lesson-title">{{ next.title }}</span>
            </ng-container>
            <ng-template #completeCourse>
              <span class="nav-direction">Complete Course</span>
              <span class="nav-lesson-title">Back to {{ courseName() }}</span>
            </ng-template>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .lesson-view {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
    }

    .lesson-nav {
      margin-bottom: 24px;
    }

    .nav-button {
      background: none;
      border: none;
      color: #4285f4;
      font-size: 14px;
      cursor: pointer;
      padding: 8px 0;
    }

    .nav-button:hover {
      text-decoration: underline;
    }

    /* Lesson header */
    .lesson-header {
      margin-bottom: 24px;
    }

    .lesson-position {
      color: #5f6368;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .lesson-header h1 {
      font-size: 28px;
      font-weight: 600;
      color: #202124;
      margin: 8px 0 0;
    }

    /* Video section */
    .video-section {
      margin-bottom: 8px;
    }

    .video-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }

    .video-type-badge,
    .video-completed-badge,
    .video-in-progress-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 13px;
      font-weight: 500;
    }

    .video-type-badge {
      background: #e8f0fe;
      color: #4285f4;
    }

    .video-completed-badge {
      background: #e6f4ea;
      color: #137333;
    }

    .video-in-progress-badge {
      background: #fef7e0;
      color: #e37400;
    }

    .saved-progress {
      margin-left: auto;
      font-size: 14px;
      font-weight: 600;
      color: #5f6368;
      font-variant-numeric: tabular-nums;
    }

    .saved-progress.complete {
      color: #137333;
    }

    .video-container {
      background: #000;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 16px;
    }

    .sim-player {
      background: #111;
    }

    .sim-screen {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 320px;
      gap: 8px;
      color: #9aa0a6;
      transition: background 0.3s;
    }

    .sim-screen.playing {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    }

    .sim-screen.completed {
      background: linear-gradient(135deg, #1b2e1f 0%, #16213e 100%);
    }

    .sim-screen.completed .sim-icon {
      color: #34a853;
    }

    .sim-icon {
      font-size: 40px;
      color: #5f6368;
    }

    .sim-screen.playing .sim-icon {
      color: #4285f4;
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    .sim-title {
      font-size: 20px;
      font-weight: 500;
      color: #e8eaed;
    }

    .sim-subtitle {
      font-size: 13px;
      color: #80868b;
    }

    .sim-controls {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: #1e1e1e;
      border-top: 1px solid #333;
    }

    .sim-play-btn {
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 50%;
      background: #4285f4;
      color: white;
      font-size: 14px;
      cursor: pointer;
      flex-shrink: 0;
      transition: background 0.2s, transform 0.15s;
    }

    .sim-play-btn:hover {
      background: #3367d6;
      transform: scale(1.05);
    }

    .scrubber-wrap {
      position: relative;
      flex: 1;
      display: flex;
      align-items: center;
    }

    .scrubber-saved-marker {
      position: absolute;
      top: 50%;
      width: 3px;
      height: 14px;
      background: #34a853;
      border-radius: 2px;
      transform: translate(-50%, -50%);
      pointer-events: none;
      opacity: 0.85;
    }

    .sim-scrubber {
      width: 100%;
      height: 4px;
      cursor: pointer;
      accent-color: #4285f4;
    }

    .sim-time {
      font-size: 12px;
      color: #bdc1c6;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }

    /* Text section */
    .text-content {
      background: #fafafa;
      padding: 32px;
      border-radius: 12px;
      line-height: 1.8;
      margin-bottom: 24px;
    }

    .text-content h2 {
      font-size: 24px;
      font-weight: 600;
      color: #202124;
      margin: 0 0 24px 0;
    }

    .text-content h3 {
      font-size: 18px;
      font-weight: 600;
      color: #202124;
      margin-top: 32px;
      margin-bottom: 16px;
    }

    .text-content p {
      margin-bottom: 16px;
      color: #3c4043;
    }

    .text-content ul {
      padding-left: 24px;
      margin-bottom: 16px;
    }

    .text-content li {
      margin-bottom: 8px;
      color: #3c4043;
    }

    /* Lesson navigation */
    .lesson-navigation {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin-top: 40px;
      padding-top: 24px;
      border-top: 1px solid #e0e0e0;
    }

    .nav-lesson-button {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      min-width: 0;
      flex: 1;
      max-width: calc(50% - 8px);
      padding: 14px 18px;
      background: white;
      border: 1px solid #dadce0;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
      text-align: left;
    }

    .nav-lesson-button.next {
      align-items: flex-end;
      text-align: right;
      margin-left: auto;
    }

    .nav-direction {
      font-size: 13px;
      font-weight: 600;
      color: #4285f4;
      letter-spacing: 0.2px;
    }

    .nav-lesson-title {
      font-size: 14px;
      color: #5f6368;
      line-height: 1.4;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 100%;
    }

    .nav-lesson-button:not(:disabled):hover {
      border-color: #4285f4;
      box-shadow: 0 2px 8px rgba(66, 133, 244, 0.15);
      transform: translateY(-1px);
    }

    .nav-lesson-button.next:not(:disabled) {
      background: #4285f4;
      border-color: #4285f4;
    }

    .nav-lesson-button.next:not(:disabled) .nav-direction,
    .nav-lesson-button.next:not(:disabled) .nav-lesson-title {
      color: white;
    }

    .nav-lesson-button.next:not(:disabled):hover {
      background: #3367d6;
      border-color: #3367d6;
      box-shadow: 0 4px 12px rgba(66, 133, 244, 0.3);
    }

    .nav-lesson-button.complete-course:not(:disabled) {
      background: #34a853;
      border-color: #34a853;
    }

    .nav-lesson-button.complete-course:not(:disabled):hover {
      background: #2d9248;
      border-color: #2d9248;
      box-shadow: 0 4px 12px rgba(52, 168, 83, 0.3);
    }

    .nav-lesson-button:disabled {
      opacity: 0.35;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }
  `]
})
export class LessonViewComponent implements OnInit, OnDestroy {
  private store = inject(Store);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  private saveProgress$ = new Subject<{ percent: number; positionSeconds: number }>();
  private playbackTimer: ReturnType<typeof setInterval> | null = null;

  localPercent = signal<number>(0);
  localPositionSeconds = signal<number>(0);
  isPlaying = signal<boolean>(false);

  // Observables from store
  course$: Observable<CourseWithProgress | null> = this.store.select(selectCurrentCourse);
  lessons$: Observable<LessonWithProgress[]> = this.store.select(selectCurrentCourseLessons);

  private courseId: string = '';
  lessonId = signal<string>('');
  lessons = signal<LessonWithProgress[]>([]);
  course = signal<CourseWithProgress | null>(null);

  currentLesson = computed(() =>
    this.lessons().find(l => l.id === this.lessonId())
  );

  prevLesson = computed(() => {
    const current = this.currentLesson();
    if (!current) return null;
    return this.lessons()
      .filter(l => l.position < current.position)
      .sort((a, b) => b.position - a.position)[0] ?? null;
  });

  nextLesson = computed(() => {
    const current = this.currentLesson();
    if (!current) return null;
    return this.lessons()
      .filter(l => l.position > current.position)
      .sort((a, b) => a.position - b.position)[0] ?? null;
  });

  isLastLesson = computed(() => !!this.currentLesson() && !this.nextLesson());

  savedVideoPercent = computed(() => this.currentLesson()?.progress?.percent ?? 0);

  savedVideoPosition = computed(() => this.currentLesson()?.progress?.lastPositionSeconds ?? 0);

  isVideoCompleted = computed(() => !!this.currentLesson()?.progress?.completed);

  courseName = computed(() => this.course()?.title ?? 'Course');

  ngOnInit(): void {
    this.courseId = this.route.snapshot.paramMap.get('courseId') || '';
    this.lessonId.set(this.route.snapshot.paramMap.get('lessonId') || '');

    this.store.dispatch(loadCourse({ courseId: this.courseId }));

    this.lessons$.pipe(takeUntil(this.destroy$)).subscribe(lessons => {
      this.lessons.set(lessons);
    });

    this.lessons$.pipe(
      filter(lessons => lessons.length > 0),
      take(1),
      takeUntil(this.destroy$)
    ).subscribe(() => this.initializeLocalProgress());

    this.course$.pipe(takeUntil(this.destroy$)).subscribe(course => {
      this.course.set(course);
    });

    // Debounced save during simulated playback
    this.saveProgress$.pipe(
      debounceTime(5000),
      takeUntil(this.destroy$)
    ).subscribe(({ percent, positionSeconds }) => {
      this.store.dispatch(recordProgress({
        lessonId: this.lessonId(),
        percent,
        positionSeconds
      }));
    });
  }

  ngOnDestroy(): void {
    this.stopPlayback();
    this.persistProgress();
    this.destroy$.next();
    this.destroy$.complete();
  }

  togglePlayback(durationSeconds: number): void {
    if (this.isPlaying()) {
      this.stopPlayback();
      this.persistProgress();
    } else {
      this.startPlayback(durationSeconds);
    }
  }

  private startPlayback(durationSeconds: number): void {
    if (durationSeconds <= 0) return;

    this.isPlaying.set(true);
    this.playbackTimer = setInterval(() => {
      const next = this.localPositionSeconds() + 1;
      if (next >= durationSeconds) {
        this.setProgress(durationSeconds, durationSeconds);
        this.stopPlayback();
        this.persistProgress(100, durationSeconds);
        this.markComplete();
        return;
      }
      this.setProgress(next, durationSeconds);
      this.saveProgress$.next({ percent: this.localPercent(), positionSeconds: next });
    }, 1000);
  }

  private stopPlayback(): void {
    if (this.playbackTimer) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }
    this.isPlaying.set(false);
  }

  onScrubStart(): void {
    this.stopPlayback();
  }

  onScrubChange(positionSeconds: number, durationSeconds: number): void {
    this.setProgress(positionSeconds, durationSeconds);
    this.saveProgress$.next({ percent: this.localPercent(), positionSeconds });
  }

  onScrubEnd(event: Event, durationSeconds: number): void {
    const positionSeconds = parseInt((event.target as HTMLInputElement).value, 10);
    this.setProgress(positionSeconds, durationSeconds);
    this.persistProgress(this.localPercent(), positionSeconds);
    if (positionSeconds >= durationSeconds) {
      this.markComplete();
    }
  }

  private setProgress(positionSeconds: number, durationSeconds: number): void {
    const percent = Math.min(100, Math.floor((positionSeconds / durationSeconds) * 100));
    this.localPositionSeconds.set(positionSeconds);
    this.localPercent.set(percent);
  }

  private persistProgress(percent = this.localPercent(), positionSeconds = this.localPositionSeconds()): void {
    const lesson = this.currentLesson();
    if (!lesson || lesson.type !== 'video') return;

    const savedPercent = lesson.progress?.percent ?? 0;
    if (percent < savedPercent) return;

    this.store.dispatch(recordProgress({
      lessonId: this.lessonId(),
      percent,
      positionSeconds
    }));
  }

  markComplete(): void {
    this.store.dispatch(recordProgress({
      lessonId: this.lessonId(),
      percent: 100
    }));
  }

  private initializeLocalProgress(): void {
    const current = this.currentLesson();
    if (current?.progress?.completed) {
      this.localPercent.set(0);
      this.localPositionSeconds.set(0);
    } else if (current?.progress) {
      this.localPercent.set(current.progress.percent);
      this.localPositionSeconds.set(current.progress.lastPositionSeconds ?? 0);
    } else {
      this.localPercent.set(0);
      this.localPositionSeconds.set(0);
    }

    // Touch text lessons on view so Continue tracks updated_at (see DECISIONS.md)
    if (current?.type === 'text' && !current.progress?.completed) {
      this.store.dispatch(recordProgress({
        lessonId: current.id,
        percent: current.progress?.percent ?? 0
      }));
    }
  }

  savedPositionPercent(durationSeconds: number): number {
    if (!durationSeconds) return 0;
    return Math.min(100, (this.savedVideoPosition() / durationSeconds) * 100);
  }

  goToCourse(): void {
    this.stopPlayback();
    this.persistProgress();
    this.router.navigate(['/course', this.courseId]);
  }

  goToNextLesson(): void {
    const next = this.nextLesson();
    if (!next) return;

    this.stopPlayback();
    this.persistProgress();
    this.router.navigate(['/course', this.courseId, 'lesson', next.id]);
    this.lessonId.set(next.id);
    this.initializeLocalProgress();
  }

  onNextAction(): void {
    this.completeCurrentTextLessonIfNeeded();

    if (this.isLastLesson()) {
      this.goToCourse();
    } else {
      this.goToNextLesson();
    }
  }

  private completeCurrentTextLessonIfNeeded(): void {
    const lesson = this.currentLesson();
    if (lesson?.type === 'text' && !lesson.progress?.completed) {
      this.markComplete();
    }
  }

  goToPrevLesson(): void {
    const prev = this.prevLesson();
    if (!prev) return;

    this.stopPlayback();
    this.persistProgress();
    this.router.navigate(['/course', this.courseId, 'lesson', prev.id]);
    this.lessonId.set(prev.id);
    this.initializeLocalProgress();
  }

  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}
