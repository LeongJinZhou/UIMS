import { ApprovalState, SlotStatus } from '../enums';

/** Generated timetable */
export interface Timetable {
  id: string;
  semesterId: string;
  generatedAt: string;
  approvalState: ApprovalState;
  approvedBy?: string;
  approvedAt?: string;
  solverScore: number;     // Soft constraint optimization score
  slots: TimetableSlot[];
}

/** Single timetable slot */
export interface TimetableSlot {
  id: string;
  timetableId: string;
  courseOfferingId: string;
  venueId: string;
  dayOfWeek: number;       // 0=Mon, 1=Tue, ..., 4=Fri
  startTime: string;       // "08:00"
  endTime: string;         // "10:00"
  status: SlotStatus;
  sectionId: string;
  isMergedClass: boolean;
}

/** Section (class group for a course offering) */
export interface Section {
  id: string;
  courseOfferingId: string;
  sectionCode: string;     // e.g., "A", "B"
  mergedOfferingIds?: string[];   // For cross-programme merged classes
  combinedHeadcount: number;
}

/** Solver request payload (sent to Python service) */
export interface SolverRequest {
  semesterId: string;
  offerings: SolverOffering[];
  venues: SolverVenue[];
  lecturerAvailability: SolverLecturerSlot[];
  studentEnrolments: SolverStudentEnrolment[];
  mergedClasses: SolverMerge[];
}

export interface SolverOffering {
  id: string;
  courseCode: string;
  creditHours: number;
  requiredSlots: number;
  lecturerId: string;
  requiredEquipment: string[];
  sectionId: string;
  headcount: number;
}

export interface SolverVenue {
  id: string;
  capacity: number;
  equipment: string[];
  blockedSlots: { day: number; start: string; end: string }[];
}

export interface SolverLecturerSlot {
  lecturerId: string;
  availableDays: number[];
  availableStart: string;
  availableEnd: string;
  maxConsecutive: number;
}

export interface SolverStudentEnrolment {
  studentId: string;
  offeringIds: string[];
  preferredEarly: boolean;
}

export interface SolverMerge {
  primaryOfferingId: string;
  mergedOfferingIds: string[];
  combinedHeadcount: number;
}

/** Solver response */
export interface SolverResponse {
  success: boolean;
  score: number;
  slots: TimetableSlot[];
  warnings: string[];
  unscheduled: string[];   // Offering IDs that couldn't be scheduled
}
