// ============================================
// Role Permissions (Section 4 of Blueprint)
// ============================================

/** Permission actions */
export type Permission =
  | 'programme:read' | 'programme:write' | 'programme:admin'
  | 'student:read' | 'student:write' | 'student:own'
  | 'course:read' | 'course:write'
  | 'timetable:read' | 'timetable:generate' | 'timetable:approve'
  | 'venue:read' | 'venue:write'
  | 'exam:read' | 'exam:release'
  | 'enrolment:read' | 'enrolment:write' | 'enrolment:own'
  | 'hr:read' | 'hr:write'
  | 'finance:read' | 'finance:write' | 'finance:own'
  | 'notification:read' | 'notification:send'
  | 'appeal:read' | 'appeal:submit' | 'appeal:review' | 'appeal:approve'
  | 'mqa:read' | 'mqa:write'
  | 'admin:all';

/** Role-to-permission mapping */
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  STUDENT: [
    'programme:read', 'student:own', 'course:read',
    'timetable:read', 'venue:read', 'exam:read',
    'enrolment:own', 'finance:own',
    'notification:read', 'appeal:submit',
  ],
  LECTURER: [
    'programme:read', 'student:read', 'course:read',
    'timetable:read', 'venue:read', 'exam:read',
    'notification:read',
  ],
  PROGRAMME_COORDINATOR: [
    'programme:read', 'student:read', 'student:write', 'course:read',
    'timetable:read', 'venue:read', 'exam:read',
    'enrolment:read', 'notification:read', 'notification:send',
    'appeal:read', 'appeal:review',
  ],
  HEAD_OF_PROGRAMME: [
    'programme:read', 'programme:write',
    'student:read', 'student:write',
    'course:read', 'course:write',
    'timetable:read', 'timetable:generate', 'timetable:approve',
    'venue:read', 'exam:read',
    'enrolment:read', 'enrolment:write',
    'notification:read', 'notification:send',
    'appeal:read', 'appeal:review', 'appeal:approve',
  ],
  EXAM_DIVISION: [
    'programme:read', 'student:read', 'course:read',
    'exam:read', 'exam:release',
    'notification:send',
  ],
  HR: [
    'hr:read', 'hr:write',
    'notification:send',
  ],
  FINANCE: [
    'finance:read', 'finance:write',
    'student:read',
    'notification:send',
  ],
  REGISTRY: [
    'programme:read', 'programme:write',
    'student:read',
    'mqa:read', 'mqa:write',
    'notification:send',
  ],
  ADMIN: [
    'admin:all',
  ],
} as const;
