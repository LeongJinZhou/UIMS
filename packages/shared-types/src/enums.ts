// ============================================
// System-wide Enumerations
// ============================================

/** User roles for RBAC */
export enum UserRole {
  STUDENT = 'STUDENT',
  LECTURER = 'LECTURER',
  PROGRAMME_COORDINATOR = 'PROGRAMME_COORDINATOR',
  HEAD_OF_PROGRAMME = 'HEAD_OF_PROGRAMME',
  EXAM_DIVISION = 'EXAM_DIVISION',
  HR = 'HR',
  FINANCE = 'FINANCE',
  REGISTRY = 'REGISTRY',
  ADMIN = 'ADMIN',
}

/** Semester types in the University academic calendar */
export enum SemesterType {
  LONG = 'LONG',       // Nov→Apr or Apr→Jul — max 20 credits
  SHORT = 'SHORT',     // Jul→Nov — max 10 credits
}

/** Student academic plan status */
export enum PlanStatus {
  ON_TRACK = 'ON_TRACK',
  DELAYED = 'DELAYED',
  EXTENSION_REQUIRED = 'EXTENSION_REQUIRED',
}

/** Academic calendar — standard intake periods */
export enum IntakePeriod {
  APRIL = 'APRIL',
  JULY = 'JULY',
  OCTOBER = 'OCTOBER',
}

/** Course type classification */
export enum CourseType {
  THEORY = 'THEORY',
  PRACTICAL = 'PRACTICAL',
  LAB = 'LAB',
  CLINICAL = 'CLINICAL',    // For MBBS/Pharmacy
  INDUSTRIAL_TRAINING = 'INDUSTRIAL_TRAINING',
}

/** Programme calendar type */
export enum CalendarType {
  STANDARD = 'STANDARD',           // Nov/Apr/Jul cycle
  NON_STANDARD = 'NON_STANDARD',   // MBBS, Pharmacy — faculty-governed
}

/** Appeal types */
export enum AppealType {
  CREDIT_OVERLOAD = 'CREDIT_OVERLOAD',
  PREREQUISITE_WAIVER = 'PREREQUISITE_WAIVER',
  SUBJECT_DROP = 'SUBJECT_DROP',
  EXTENSION_SEMESTER = 'EXTENSION_SEMESTER',
}

/** Appeal status */
export enum AppealStatus {
  PENDING = 'PENDING',
  AI_REVIEWED = 'AI_REVIEWED',
  PC_REVIEWED = 'PC_REVIEWED',
  HOP_APPROVED = 'HOP_APPROVED',
  HOP_REJECTED = 'HOP_REJECTED',
}

/** Timetable slot status */
export enum SlotStatus {
  SCHEDULED = 'SCHEDULED',
  CANCELLED = 'CANCELLED',
  REPLACED = 'REPLACED',
}

/** Notification channel */
export enum NotificationChannel {
  PUSH = 'PUSH',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  IN_APP = 'IN_APP',
}

/** Exam result grade */
export enum GradeStatus {
  PASS = 'PASS',
  FAIL = 'FAIL',
  INCOMPLETE = 'INCOMPLETE',
  WITHDRAWN = 'WITHDRAWN',
}

/** Approval workflow state */
export enum ApprovalState {
  DRAFT = 'DRAFT',
  PENDING_PC = 'PENDING_PC',
  PENDING_HOP = 'PENDING_HOP',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PUBLISHED = 'PUBLISHED',
}
