import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ProgressBarComponent } from '../shared/progress-bar.component';
import { ContinueLearningSectionComponent } from '../shared/continue-learning-section.component';
import { StudentService } from '../../services/student.service';
import { 
  loadCourses, 
  selectCourses, 
  selectCoursesLoading
} from '../../store';
import type { CourseWithProgress, Student } from '../../models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ProgressBarComponent, ContinueLearningSectionComponent],
  template: `
    <div class="dashboard">
      <header class="dashboard-header">
        <div class="header-top">
          <div class="header-title">
            <h1>TutorStream</h1>
            <p class="subtitle">Continue your learning journey</p>
          </div>
          
          <div class="student-switcher">
            <label for="student-select">Viewing as:</label>
            <select 
              id="student-select"
              [ngModel]="selectedStudentId"
              (ngModelChange)="onStudentChange($event)"
              class="student-select"
            >
              <option *ngFor="let student of students" [value]="student.id">
                {{ student.name }}
              </option>
            </select>
          </div>
        </div>
      </header>

      <div class="dashboard-continue-wrap">
        <app-continue-learning-section></app-continue-learning-section>
      </div>

      <section class="courses-section">
        <h2>Your Courses</h2>
        
        <div *ngIf="loading$ | async" class="loading">
          Loading courses...
        </div>

        <div *ngIf="!(loading$ | async) && (courses$ | async)?.length === 0" class="empty-state">
          No courses enrolled for this student.
        </div>

        <div class="courses-grid" *ngIf="!(loading$ | async) && (courses$ | async)?.length">
          <div 
            *ngFor="let course of courses$ | async" 
            class="course-card"
            (click)="onCourseClick(course.id)"
          >
            <h3 class="course-title">{{ course.title }}</h3>
            <p class="course-description">{{ course.description }}</p>
            
            <app-progress-bar
              [percent]="course.progress.percent"
              [completedCount]="course.progress.completedCount"
              [totalCount]="course.progress.totalCount"
            ></app-progress-bar>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .dashboard {
      max-width: 900px;
      margin: 0 auto;
      padding: 24px;
    }

    .dashboard-header {
      margin-bottom: 32px;
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
    }

    .header-title h1 {
      font-size: 32px;
      font-weight: 600;
      color: #202124;
      margin: 0;
    }

    .subtitle {
      color: #5f6368;
      margin-top: 8px;
    }

    /* Student Switcher */
    .student-switcher {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }

    .student-switcher label {
      font-size: 12px;
      color: #5f6368;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .student-select {
      padding: 8px 32px 8px 12px;
      font-size: 14px;
      font-weight: 500;
      color: #202124;
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%235f6368' d='M6 8L2 4h8z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 10px center;
      min-width: 160px;
    }

    .student-select:hover {
      border-color: #4285f4;
    }

    .student-select:focus {
      outline: none;
      border-color: #4285f4;
      box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.2);
    }

    /* Courses Section */
    .dashboard-continue-wrap {
      margin-bottom: 40px;
    }

    .courses-section h2 {
      font-size: 20px;
      font-weight: 600;
      color: #202124;
      margin-bottom: 16px;
    }

    .loading,
    .empty-state {
      padding: 24px;
      text-align: center;
      color: #5f6368;
    }

    .courses-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }

    .course-card {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      padding: 20px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .course-card:hover {
      border-color: #4285f4;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .course-title {
      font-size: 18px;
      font-weight: 600;
      color: #202124;
      margin: 0 0 8px 0;
    }

    .course-description {
      font-size: 14px;
      color: #5f6368;
      margin: 0 0 16px 0;
      line-height: 1.5;
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  private store = inject(Store);
  private router = inject(Router);
  private studentService = inject(StudentService);
  private destroy$ = new Subject<void>();

  // Store observables
  courses$: Observable<CourseWithProgress[]> = this.store.select(selectCourses);
  loading$: Observable<boolean> = this.store.select(selectCoursesLoading);

  // Student data
  students: Student[] = [];
  selectedStudentId: string = '';

  ngOnInit(): void {
    // Load students list
    this.studentService.initialize()
      .pipe(takeUntil(this.destroy$))
      .subscribe(students => {
        this.students = students;
        this.selectedStudentId = this.studentService.getStudentId();
        this.loadStudentData();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadStudentData(): void {
    this.store.dispatch(loadCourses());
  }

  onStudentChange(studentId: string): void {
    this.selectedStudentId = studentId;
    this.studentService.setStudentId(studentId);
    this.loadStudentData();
  }

  onCourseClick(courseId: string): void {
    this.router.navigate(['/course', courseId]);
  }
}
