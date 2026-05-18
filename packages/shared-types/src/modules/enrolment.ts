/** Enrolment record for a student in a semester */
export interface Enrolment {
  id: string;
  studentId: string;
  semesterId: string;
  courseOfferingId: string;
  sectionId: string;
  enrolledAt: string;
  isDropped: boolean;
  droppedAt?: string;
}

/** Subject drop request */
export interface DropRequest {
  id: string;
  enrolmentId: string;
  studentId: string;
  courseCode: string;
  reason: string;
  aiImpactPreview: DropImpactPreview;
  studentAcknowledged: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

/** AI-generated drop impact analysis */
export interface DropImpactPreview {
  affectedPrerequisites: {
    courseCode: string;
    courseName: string;
    blockedUntilSemester: string;
  }[];
  revisedGraduation: string;
  creditsBelowMinimum: boolean;
  retakeConflicts: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}
