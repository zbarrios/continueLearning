// Demo student identity (localStorage); production would use auth.
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

  private studentIdSubject = new BehaviorSubject<string>(this.loadFromStorage());
  studentId$ = this.studentIdSubject.asObservable();

  private studentsSignal = signal<Student[]>([]);
  students = this.studentsSignal.asReadonly();

  currentStudent = computed(() => {
    const students = this.studentsSignal();
    const currentId = this.studentIdSubject.value;
    return students.find(s => s.id === currentId) || null;
  });

  private loadFromStorage(): string {
    if (typeof window === 'undefined') return DEFAULT_STUDENT_ID;
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_STUDENT_ID;
  }

  private saveToStorage(studentId: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, studentId);
  }

  getStudentId(): string {
    return this.studentIdSubject.value;
  }

  setStudentId(studentId: string): void {
    this.saveToStorage(studentId);
    this.studentIdSubject.next(studentId);
  }

  getStudents(): Observable<Student[]> {
    return this.http.get<Student[]>(`${this.baseUrl}/students`).pipe(
      tap(students => this.studentsSignal.set(students))
    );
  }

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
