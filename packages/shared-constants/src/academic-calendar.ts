// ============================================
// Academic Calendar (Section 6.1 of Blueprint)
// ============================================

/** University standard semester schedule */
export const ACADEMIC_CALENDAR = {
  /** Semester 1: November → April (Long) */
  SEMESTER_1: {
    name: 'Semester 1',
    startMonth: 11,    // November
    endMonth: 4,       // April
    type: 'LONG' as const,
    primaryIntake: 'OCTOBER' as const,
  },

  /** Semester 2: April → July (Long) */
  SEMESTER_2: {
    name: 'Semester 2',
    startMonth: 4,     // April
    endMonth: 7,       // July
    type: 'LONG' as const,
    primaryIntake: 'APRIL' as const,
  },

  /** Semester 3: July → November (Short) */
  SEMESTER_3: {
    name: 'Semester 3',
    startMonth: 7,     // July
    endMonth: 11,      // November
    type: 'SHORT' as const,
    primaryIntake: 'JULY' as const,
  },
} as const;

/** All semester definitions in order */
export const SEMESTERS_IN_ORDER = [
  ACADEMIC_CALENDAR.SEMESTER_1,
  ACADEMIC_CALENDAR.SEMESTER_2,
  ACADEMIC_CALENDAR.SEMESTER_3,
] as const;

/** Number of standard semesters per year */
export const SEMESTERS_PER_YEAR = 3;

/** Timetable time slots */
export const TIME_SLOTS = {
  EARLIEST_START: '08:00',
  LATEST_END: '22:00',
  SLOT_DURATION_MINUTES: 60,
  BREAK_DURATION_MINUTES: 10,
} as const;

/** Days of the week (0-indexed, Mon-Fri) */
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;

/** Number of University faculties */
export const NUM_FACULTIES = 6;

/** Approximate number of programmes */
export const NUM_PROGRAMMES = 50;

/** Standard intakes per year */
export const INTAKES_PER_YEAR = 3;

/** Non-standard calendar programmes */
export const NON_STANDARD_PROGRAMMES = ['MBBS', 'PHARMACY'] as const;
