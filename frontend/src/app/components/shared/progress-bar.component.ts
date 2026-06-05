/**
 * PROGRESS BAR COMPONENT
 * ======================
 * A reusable progress bar that shows "45% (5 of 10 lessons)"
 * 
 * Angular components have three parts:
 * 1. @Component decorator — metadata (like annotations in Java)
 * 2. Class — the logic (like a Java class)
 * 3. Template — the HTML (inline or separate file)
 * 
 * Comparison to React:
 * React: function ProgressBar({ percent, completed, total }) { ... }
 * Angular: @Component({...}) export class ProgressBarComponent { @Input() percent = 0; }
 * 
 * @Input() is like React props — data passed from parent to child
 */

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-progress-bar',  // How you use it: <app-progress-bar>
  standalone: true,              // Angular 22 standalone component (no NgModule needed)
  imports: [CommonModule],       // What this component uses
  template: `
    <!-- The progress bar container -->
    <div class="progress-container">
      <!-- The filled portion -->
      <div 
        class="progress-fill" 
        [style.width.%]="percent"
        [class.completed]="percent === 100"
      ></div>
    </div>
    
    <!-- The text label -->
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
  // @Input() means this value comes from the parent component
  // Like props in React: <ProgressBar percent={45} />
  @Input() percent: number = 0;
  @Input() completedCount: number = 0;
  @Input() totalCount: number = 0;
  @Input() showLessonCount: boolean = true;
}
