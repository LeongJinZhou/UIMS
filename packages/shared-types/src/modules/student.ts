import { PlanStatus, IntakePeriod, GradeStatus } from '../enums';

/** Student academic profile */
export interface Student {
  id: string;
  userId: string;
  studentId: string;       // University student ID (e.g., "University2025001")
  programmeId: string;
  programmeVersionId: string;
  intakePeriod: IntakePeriod;
  intakeYear: number;
  currentSemester: number;
  totalCreditsEarned: number;
  cumulativeGpa: number;
  planStatus: PlanStatus;
  projectedGraduation: string;  // e.g., "2028-S2"
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Student's academic plan (revised plan including retakes) */
export interface AcademicPlan {
  id: string;
  studentId: string;
  semesters: SemesterPlan[];
  planStatus: PlanStatus;
  originalGraduation: string;
  projectedGraduation: string;
  hasExtension: boolean;
  lastRevisedAt: string;
}

/** One semester in a student's plan */
export interface SemesterPlan {
  id: string;
  academicPlanId: string;
  semesterNumber: number;
  calendarSemester: string;  // e.g., "2026-S1" (Nov 2025 → Apr 2026)
  courses: PlannedCourse[];
  totalCredits: number;
  isExtension: boolean;
}

/** A course in a student's semester plan */
export interface PlannedCourse {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  creditHours: number;
  isRetake: boolean;
  isDeferred: boolean;
  grade?: GradeStatus;
}
