import { CourseType } from '../enums';

/** Course definition */
export interface Course {
  id: string;
  code: string;
  name: string;
  creditHours: number;
  courseType: CourseType;
  description?: string;
  programmeId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Prerequisite link */
export interface Prerequisite {
  id: string;
  courseId: string;
  prerequisiteCourseId: string;
  isMandatory: boolean;    // true = hard prereq, false = recommended
}

/** Course equivalency across programmes */
export interface CourseEquivalency {
  id: string;
  courseAId: string;
  courseBId: string;
  courseACode: string;
  courseBCode: string;
  /** Both courses share the same syllabus/delivery */
  isDeliveryMerge: boolean;
  approvedBy?: string;
  createdAt: string;
}

/** HoP course offering for a specific semester */
export interface CourseOffering {
  id: string;
  courseId: string;
  semesterId: string;
  lecturerId: string;
  maxCapacity: number;
  currentEnrolment: number;
  isConfirmed: boolean;
  createdAt: string;
}
