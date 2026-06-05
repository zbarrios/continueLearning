/**
 * STUDENT SERVICE
 * ===============
 * Manages the currently selected student for the demo student switcher.
 * 
 * This is a demo feature only — in a real app, authentication would
 * determine the current user, not a localStorage key.
 * 
 * Features:
 * - Persists selected student ID in localStorage
 * - Provides Observable for components to react to changes
 * - Fetches list of available students from API
 */

import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Student } from '../models';

const STORAGE_KEY = 'tutorstream-student-id';
const DEFAULT_STUDENT_ID = 'student-1';

@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/api';

  // BehaviorSubject holds current value and emits to new subscribers
  // Like a combination of useState + context in React
  private studentIdSubject = new BehaviorSubject<string>(this.loadFromStorage());

  // Observable that components can subscribe to
  studentId$ = this.studentIdSubject.asObservable();

  // Signal for the currently selected student (for template binding)
  private studentsSignal = signal<Student[]>([]);
  students = this.studentsSignal.asReadonly();

  // Computed signal for current student object
  currentStudent = computed(() => {
    const students = this.studentsSignal();
    const currentId = this.studentIdSubject.value;
    return students.find(s => s.id === currentId) || null;
  });

  /**
   * Load student ID from localStorage, with fallback to default
   */
  private loadFromStorage(): string {
    if (typeof window === 'undefined') return DEFAULT_STUDENT_ID;
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_STUDENT_ID;
  }

  /**
   * Save student ID to localStorage
   */
  private saveToStorage(studentId: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, studentId);
  }

  /**
   * Get current student ID (synchronous)
   */
  getStudentId(): string {
    return this.studentIdSubject.value;
  }

  /**
   * Set current student ID
   * Saves to localStorage and emits to subscribers
   */
  setStudentId(studentId: string): void {
    this.saveToStorage(studentId);
    this.studentIdSubject.next(studentId);
  }

  /**
   * Fetch all students from API
   */
  getStudents(): Observable<Student[]> {
    return this.http.get<Student[]>(`${this.baseUrl}/students`).pipe(
      tap(students => this.studentsSignal.set(students))
    );
  }

  /**
   * Load students and ensure current student ID is valid
   */
  initialize(): Observable<Student[]> {
    return this.getStudents().pipe(
      tap(students => {
        const currentId = this.getStudentId();
        const isValid = students.some(s => s.id === currentId);
        if (!isValid && students.length > 0) {
          this.setStudentId(students[0].id);
        }
      })
    );
  }
}
