import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="progress-container">
      <div
        class="progress-fill"
        [style.width.%]="percent"
        [class.completed]="percent === 100"
      ></div>
    </div>
    <div class="progress-text">
      {{ percent }}%
      <span class="lesson-count" *ngIf="showLessonCount">
        ({{ completedCount }} of {{ totalCount }} lessons)
      </span>
    </div>
  `,
  styles: [`
    .progress-container {
      width: 100%;
      height: 8px;
      background-color: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 4px;
    }

    .progress-fill {
      height: 100%;
      background-color: #4285f4;
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .progress-fill.completed {
      background-color: #34a853;
    }

    .progress-text {
      font-size: 14px;
      color: #5f6368;
    }

    .lesson-count {
      color: #80868b;
    }
  `]
})
export class ProgressBarComponent {
  @Input() percent: number = 0;
  @Input() completedCount: number = 0;
  @Input() totalCount: number = 0;
  @Input() showLessonCount: boolean = true;
}
