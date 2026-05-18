/** Lecturer profile */
export interface Lecturer {
  id: string;
  userId: string;
  staffId: string;
  name: string;
  email: string;
  facultyId: string;
  department: string;
  contractType: 'FULL_TIME' | 'PART_TIME' | 'ADJUNCT';
  maxTeachingLoad: number;    // Max credit hours per semester
  currentLoad: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Lecturer availability for timetabling */
export interface LecturerAvailability {
  id: string;
  lecturerId: string;
  semesterId: string;
  availableDays: number[];
  preferredStartTime: string;
  preferredEndTime: string;
  maxConsecutiveHours: number;
}

/** Leave record */
export interface LeaveRecord {
  id: string;
  lecturerId: string;
  startDate: string;
  endDate: string;
  leaveType: 'ANNUAL' | 'MEDICAL' | 'EMERGENCY' | 'SABBATICAL';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  affectedSlots: string[];    // Timetable slot IDs
  replacementLecturerId?: string;
}

/** Class cancellation */
export interface Cancellation {
  id: string;
  timetableSlotId: string;
  lecturerId: string;
  reason: string;
  cancelledAt: string;
  replacementSlots: ReplacementSlotOption[];
  selectedReplacementId?: string;
}

/** AI-ranked replacement slot option */
export interface ReplacementSlotOption {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  venueId: string;
  venueName: string;
  disruptionScore: number;   // Lower = better for students
  addsNewCampusDay: number;  // How many students get an extra day
  causesBackToBack: number;  // How many students get back-to-back
}
