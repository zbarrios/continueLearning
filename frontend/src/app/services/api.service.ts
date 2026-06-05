/**
 * API SERVICE
 * ===========
 * This is like a Repository in Spring — it handles all HTTP calls to the backend.
 * 
 * In React, you'd use fetch() or Axios. In Angular, we use HttpClient.
 * 
 * Key Angular concepts:
 * - @Injectable() — marks this class for dependency injection (like @Service in Spring)
 * - HttpClient — Angular's built-in HTTP client (like RestTemplate/WebClient in Spring)
 * - Observable — lazy data stream (you subscribe to get values — similar to Java's CompletableFuture)
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StudentService } from './student.service';
import type {
  Course,
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

  /**
   * Get the current student ID from StudentService
   * This allows switching students without restarting the app
   */
  private get studentId(): string {
    return this.studentService.getStudentId();
  }

  /**
   * Get all enrolled courses with progress
   */
  getCourses(): Observable<CourseWithProgress[]> {
    return this.http.get<CourseWithProgress[]>(
      `${this.baseUrl}/students/${this.studentId}/courses`
    );
  }

  /**
   * Get a single course with all lessons
   */
  getCourse(courseId: string): Observable<CourseDetail> {
    return this.http.get<CourseDetail>(
      `${this.baseUrl}/students/${this.studentId}/courses/${courseId}`
    );
  }

  /**
   * Record progress on a lesson
   * 
   * This sends progress to the server, which applies MAX-WINS logic
   * (progress never goes backwards)
   */
  recordProgress(request: RecordProgressRequest): Observable<RecordProgressResponse> {
    return this.http.post<RecordProgressResponse>(
      `${this.baseUrl}/students/${this.studentId}/progress`,
      request
    );
  }

  /**
   * Get the next lesson to continue
   * 
   * This is the core of "Continue Learning" — returns where to pick up
   */
  getContinueLesson(): Observable<ContinueLearningResponse> {
    return this.http.get<ContinueLearningResponse>(
      `${this.baseUrl}/students/${this.studentId}/continue`
    );
  }

  /**
   * Get courses for the continue-learning modal (enrollment + in-progress)
   */
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
