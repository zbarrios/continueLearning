import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StudentService } from './student.service';
import type {
  RecommendedCourse,
  CourseWithProgress,
  CourseDetail,
  ContinueLearningResponse,
  RecordProgressRequest,
  RecordProgressResponse
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private studentService = inject(StudentService);

  private baseUrl = 'http://localhost:3000/api';

  private get studentId(): string {
    return this.studentService.getStudentId();
  }

  getCourses(): Observable<CourseWithProgress[]> {
    return this.http.get<CourseWithProgress[]>(
      `${this.baseUrl}/students/${this.studentId}/courses`
    );
  }

  getCourse(courseId: string): Observable<CourseDetail> {
    return this.http.get<CourseDetail>(
      `${this.baseUrl}/students/${this.studentId}/courses/${courseId}`
    );
  }

  recordProgress(request: RecordProgressRequest): Observable<RecordProgressResponse> {
    return this.http.post<RecordProgressResponse>(
      `${this.baseUrl}/students/${this.studentId}/progress`,
      request
    );
  }

  getContinueLesson(): Observable<ContinueLearningResponse> {
    return this.http.get<ContinueLearningResponse>(
      `${this.baseUrl}/students/${this.studentId}/continue`
    );
  }

  getRecommendedCourses(): Observable<RecommendedCourse[]> {
    return this.http.get<RecommendedCourse[]>(
      `${this.baseUrl}/courses/recommended?studentId=${this.studentId}`
    );
  }

  enrollInCourse(courseId: string): Observable<{ success: boolean; courseId: string }> {
    return this.http.post<{ success: boolean; courseId: string }>(
      `${this.baseUrl}/students/${this.studentId}/enrollments`,
      { courseId }
    );
  }
}
