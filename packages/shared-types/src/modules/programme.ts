import { CalendarType } from '../enums';

/** Faculty */
export interface Faculty {
  id: string;
  name: string;
  code: string;
  deanId?: string;
  createdAt: string;
  updatedAt: string;
}

/** Programme (degree / diploma) */
export interface Programme {
  id: string;
  facultyId: string;
  name: string;
  code: string;            // e.g., "BCS", "BIT", "MBBS"
  calendarType: CalendarType;
  totalCredits: number;
  maxDurationSemesters: number;
  mqaRefNumber?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Versioned MQA-approved programme structure */
export interface ProgrammeVersion {
  id: string;
  programmeId: string;
  version: string;         // e.g., "2025-v1"
  effectiveFrom: string;   // ISO date
  effectiveTo?: string;
  isActive: boolean;
  semesterPlans: MqaSemesterPlan[];
  createdAt: string;
}

/** One semester in the MQA plan */
export interface MqaSemesterPlan {
  id: string;
  programmeVersionId: string;
  semesterNumber: number;  // 1, 2, 3, ... up to programme duration
  courses: MqaPlanCourse[];
  totalCredits: number;
}

/** A course in an MQA semester plan */
export interface MqaPlanCourse {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  creditHours: number;
  isElective: boolean;
}
