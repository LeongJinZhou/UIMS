// @ts-nocheck
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ExamService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Handle course offering changes from integration service
   */
  async handleCourseOfferingChange(
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    courseOffering: any,
  ): Promise<void> {
    // In a production system, we would:
    // - For CREATE: Check if this affects exam scheduling
    // - For UPDATE: Check if changes affect exam validity (course type changes, etc.)
    // - For DELETE: Remove from exam schedules and flag affected exams for rescheduling

    // For now, we'll log the change
    console.log(`Exam service received ${operation} event for course offering ${courseOffering.id}`);
  }

  /**
   * Handle semester changes from integration service
   */
  async handleSemesterChange(
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    semester: any,
  ): Promise<void> {
    // In a production system, we would:
    // - For CREATE: Prepare to schedule exams for this semester
    // - For UPDATE: Check if changes affect existing exam schedules
    // - For DELETE: Archive or remove exam schedules for this semester

    // For now, we'll log the change
    console.log(`Exam service received ${operation} event for semester ${semester.id}`);
  }

  /**
   * Schedule examinations for a semester based on course offerings
   * This implementation includes venue allocation and invigilator assignment
   */
  async scheduleExaminations(semesterId: string): Promise<any> {
    // Get semester with course offerings
    const semester = await this.prisma.semester.findUnique({
      where: { id: semesterId },
      include: {
        courseOfferings: {
          include: {
            course: true,
            timetableSlots: {
              include: {
                timetable: true,
              },
            },
          },
        },
      },
    });

    if (!semester) {
      throw new NotFoundException(`Semester not found: ${semesterId}`);
    }

    // Get all venues/rooms for allocation
    const venues = await this.prisma.venue.findMany({
      include: {
        rooms: {
          include: {
            equipment: true,
          },
          where: { isActive: true },
        },
      },
      where: { isActive: true },
    });

    // Get all lecturers for invigilator assignment
    const lecturers = await this.prisma.lecturer.findMany({
      include: {
        user: true,
      },
      where: { isActive: true },
    });

    // Create examination timetable entity
    const examTimetable = await this.prisma.examTimetable.create({
      data: {
        semesterId,
        generatedAt: new Date(),
        status: 'DRAFT',
      },
    });

    // Schedule examinations with venue allocation and invigilator assignment
    const scheduledExams = await this.scheduleExamsWithAllocation(
      semester.courseOfferings,
      venues,
      lecturers,
      examTimetable.id
    );

    // Create exam timetable slots in the database
    const createdSlots = [];
    for (const examSlot of scheduledExams) {
      const createdSlot = await this.prisma.examTimetableSlot.create({
        data: {
          examTimetableId: examTimetable.id,
          courseOfferingId: examSlot.courseOfferingId,
          venueId: examSlot.venueId,
          invigilatorId: examSlot.invigilatorId,
          date: new Date(examSlot.date), // Convert string to Date
          startTime: examSlot.startTime,
          endTime: examSlot.endTime,
          durationMinutes: examSlot.durationMinutes,
          expectedAttendance: examSlot.expectedAttendance,
          status: 'SCHEDULED',
        },
        include: {
          courseOffering: {
            include: {
              course: true,
            },
          },
          venue: {
            include: {
              rooms: {
                include: {
                  equipment: true,
                },
              },
            },
          },
          invigilator: {
            include: {
              user: true,
            },
          },
        },
      });
      createdSlots.push(createdSlot);
    }

    return {
      examTimetableId: examTimetable.id,
      semesterId,
      semesterLabel: semester.label,
      examsScheduled: createdSlots.length,
      scheduledExams: createdSlots,
      message: 'Examinations scheduled successfully with venue allocation and invigilator assignment',
      nextSteps: [
        'Review and approve examination timetable',
        'Monitor for conflicts and make adjustments as needed',
        'Publish examination timetable when ready'
      ]
    };
  }

  /**
   * Schedule examinations with venue allocation and invigilator assignment
   * Uses a greedy algorithm to assign exams to time slots and venues
   */
  private async scheduleExamsWithAllocation(
    courseOfferings: any[],
    venues: any[],
    lecturers: any[],
    examTimetableId: string
  ): Promise<any[]> {
    const scheduledExams = [];

    // Create lookup maps for faster access
    const lecturerMap = new Map();
    lecturers.forEach(lecturer => {
      lecturerMap.set(lecturer.id, lecturer);
    });

    const venueMap = new Map();
    venues.forEach(venue => {
      venueMap.set(venue.id, venue);
    });

    // Track venue and lecturer schedules to prevent double-booking
    const venueSchedule = new Map(); // venueId -> Array of {date, startTime, endTime}
    const lecturerSchedule = new Map(); // lecturerId -> Array of {date, startTime, endTime}

    // Define examination period (2 weeks after teaching period ends)
    const examPeriodStart = new Date(); // Would normally be calculated from semester end date
    examPeriodStart.setDate(examPeriodStart.getDate() + 14); // 2 weeks after semester end
    const examPeriodEnd = new Date(examPeriodStart);
    examPeriodEnd.setDate(examPeriodEnd.getDate() + 10); // 10 days for exams

    // Generate date range for examination period (weekdays only)
    const examDates = this.generateWeekdayRange(examPeriodStart, examPeriodEnd);

    // Define time slots for exams (9:00-12:00 and 14:00-17:00)
    const timeSlots = this.generateExamTimeSlots();

    // Sort course offerings by expected attendance (descending) to allocate larger exams first
    const sortedOfferings = [...courseOfferings].sort(
      (a, b) =>
        (b.currentEnrolment || 0) - (a.currentEnrolment || 0)
    );

    // Process each course offering
    for (const offering of sortedOfferings) {
      let slotFound = false;

      // Try to find a suitable time slot, venue, and invigilator for this exam
      for (const date of examDates) {
        if (slotFound) break;

        for (const timeSlot of timeSlots) {
          if (slotFound) break;

          const { startTime, endTime } = timeSlot;

          // Calculate expected attendance (with buffer for absentees, etc.)
          const expectedAttendance = Math.ceil((offering.currentEnrolment || 0) * 1.1);

          // Determine exam duration based on course type
          const durationMinutes = this.calculateExamDuration(offering);

          // Find a suitable venue that meets capacity requirements
          const suitableVenue = this.findSuitableVenue(
            venues,
            venueSchedule,
            expectedAttendance,
            date,
            startTime,
            endTime
          );

          if (!suitableVenue) continue;

          // Find an available invigilator
          const suitableInvigilator = this.findAvailableInvigilator(
            lecturers,
            lecturerSchedule,
            date,
            startTime,
            endTime,
            offering.lecturerId // Prefer not to assign the course lecturer as invigilator
          );

          if (!suitableInvigilator) continue;

          // Found a suitable slot - create exam timetable slot
          scheduledExams.push({
            courseOfferingId: offering.id,
            venueId: suitableVenue.id,
            invigilatorId: suitableInvigilator.id,
            date: date.toISOString().split('T')[0], // YYYY-MM-DD format
            startTime,
            endTime,
            durationMinutes,
            expectedAttendance
          });

          // Update schedules
          this.updateVenueSchedule(venueSchedule, suitableVenue.id, date, startTime, endTime);
          this.updateLecturerSchedule(lecturerSchedule, suitableInvigilator.id, date, startTime, endTime);

          slotFound = true;
        }
      }

      // If no slot found after trying all combinations, log warning but continue
      if (!slotFound) {
        console.warn(`Could not find suitable slot for exam of course ${offering.course.code}`);
        // In a production system, we might want to implement constraint relaxation here
      }
    }

    return scheduledExams;
  }

  /**
   * Generate weekday range between two dates (inclusive)
   */
  private generateWeekdayRange(startDate: Date, endDate: Date): Date[] {
    const dates = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay(); // 0=Sunday, 1=Monday, etc.
      // Only include weekdays (Monday to Friday)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        dates.push(new Date(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  }

  /**
   * Generate time slots for exams (9:00-12:00 and 14:00-17:00)
   */
  private generateExamTimeSlots(): Array<{startTime: string, endTime: string}> {
    const slots = [];

    // Morning session: 9:00-12:00
    slots.push({ startTime: '09:00', endTime: '12:00' });

    // Afternoon session: 14:00-17:00
    slots.push({ startTime: '14:00', endTime: '17:00' });

    return slots;
  }

  /**
   * Calculate exam duration based on course type and credit hours
   */
  private calculateExamDuration(courseOffering: any): number {
    // Base duration: 2 hours per 3 credit hours
    const baseHours = (courseOffering.course.creditHours || 3) * 2 / 3;

    // Adjust for course type
    let multiplier = 1.0;
    switch (courseOffering.course.courseType) {
      case 'LAB':
      case 'PRACTICAL':
        multiplier = 1.5; // Practical exams take longer
        break;
      case 'CLINICAL':
        multiplier = 2.0; // Clinical exams take much longer
        break;
      default:
        multiplier = 1.0; // Theory exams
    }

    return Math.ceil(baseHours * 60 * multiplier); // Convert to minutes
  }

  /**
   * Find a suitable venue that meets capacity requirements
   */
  private findSuitableVenue(
    venues: any[],
    venueSchedule: Map<string, Array<{date: string, startTime: string, endTime: string}>>,
    requiredCapacity: number,
    date: Date,
    startTime: string,
    endTime: string
  ): any | null {
    // Sort venues by capacity (ascending) to find the smallest suitable venue first
    const sortedVenues = [...venues].sort((a, b) => {
      const capacityA = a.rooms.reduce((sum, room) => sum + room.capacity, 0);
      const capacityB = b.rooms.reduce((sum, room) => sum + room.capacity, 0);
      return capacityA - capacityB;
    });

    const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format

    for (const venue of sortedVenues) {
      // Calculate total capacity of venue
      const totalCapacity = venue.rooms.reduce((sum, room) => sum + room.capacity, 0);

      // Check if venue meets capacity requirements
      if (totalCapacity < requiredCapacity) continue;

      // Check for venue double-booking
      if (this.hasVenueScheduleConflict(
          venueSchedule,
          venue.id,
          dateString,
          startTime,
          endTime
        )) {
        continue;
      }

      // Venue is available and suitable
      return venue;
    }

    return null;
  }

  /**
   * Find an available invigilator
   */
  private findAvailableInvigilator(
    lecturers: any[],
    lecturerSchedule: Map<string, Array<{date: string, startTime: string, endTime: string}>>,
    date: Date,
    startTime: string,
    endTime: string,
    excludeLecturerId: string | null = null
  ): any | null {
    const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Shuffle lecturers to avoid always picking the same ones
    const shuffledLecturers = [...lecturers].sort(() => Math.random() - 0.5);

    for (const lecturer of shuffledLecturers) {
      // Skip the course lecturer if specified
      if (excludeLecturerId && lecturer.id === excludeLecturerId) continue;

      // Check for lecturer double-booking
      if (this.hasLecturerScheduleConflict(
          lecturerSchedule,
          lecturer.id,
          dateString,
          startTime,
          endTime
        )) {
        continue;
      }

      // Check if lecturer is available (not on leave, etc.)
      // In a full implementation, we would check leave records, etc.
      // For now, we'll assume all lecturers are available unless scheduled

      // Lecturer is available and suitable
      return lecturer;
    }

    return null;
  }

  /**
   * Check if there's a venue schedule conflict
   */
  private hasVenueScheduleConflict(
    scheduleMap: Map<string, Array<{date: string, startTime: string, endTime: string}>>,
    venueId: string,
    date: string,
    startTime: string,
    endTime: string
  ): boolean {
    const schedule = scheduleMap.get(venueId) || [];

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    for (const existing of schedule) {
      if (existing.date !== date) continue;

      const [exStartHour, exStartMin] = existing.startTime.split(':').map(Number);
      const [exEndHour, exEndMin] = existing.endTime.split(':').map(Number);
      const exStartMinutes = exStartHour * 60 + exStartMin;
      const exEndMinutes = exEndHour * 60 + exEndMin;

      // Check for overlap
      if (startMinutes < exEndMinutes && endMinutes > exStartMinutes) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if there's a lecturer schedule conflict
   */
  private hasLecturerScheduleConflict(
    scheduleMap: Map<string, Array<{date: string, startTime: string, endTime: string}>>,
    lecturerId: string,
    date: string,
    startTime: string,
    endTime: string
  ): boolean {
    const schedule = scheduleMap.get(lecturerId) || [];

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    for (const existing of schedule) {
      if (existing.date !== date) continue;

      const [exStartHour, exStartMin] = existing.startTime.split(':').map(Number);
      const [exEndHour, exEndMin] = existing.endTime.split(':').map(Number);
      const exStartMinutes = exStartHour * 60 + exStartMin;
      const exEndMinutes = exEndHour * 60 + exEndMin;

      // Check for overlap
      if (startMinutes < exEndMinutes && endMinutes > exStartMinutes) {
        return true;
      }
    }

    return false;
  }

  /**
   * Update venue schedule
   */
  private updateVenueSchedule(
    scheduleMap: Map<string, Array<{date: string, startTime: string, endTime: string}>>,
    venueId: string,
    date: Date,
    startTime: string,
    endTime: string
  ): void {
    const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    const schedule = scheduleMap.get(venueId) || [];
    schedule.push({ date: dateString, startTime, endTime });
    scheduleMap.set(venueId, schedule);
  }

  /**
   * Update lecturer schedule
   */
  private updateLecturerSchedule(
    scheduleMap: Map<string, Array<{date: string, startTime: string, endTime: string}>>,
    lecturerId: string,
    date: Date,
    startTime: string,
    endTime: string
  ): void {
    const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    const schedule = scheduleMap.get(lecturerId) || [];
    schedule.push({ date: dateString, startTime, endTime });
    scheduleMap.set(lecturerId, schedule);
  }

  /**
   * Process exam results for a course offering
   */
  async processExamResults(
    courseOfferingId: string,
    results: Array<{
      studentId: string;
      grade: string; // e.g., 'A', 'B+', 'F'
      gradePoint: number;
      marks?: number;
    }>
  ): Promise<any> {
    // Validate course offering exists
    const courseOffering = await this.prisma.courseOffering.findUnique({
      where: { id: courseOfferingId },
      include: {
        course: true,
        semester: true,
      },
    });

    if (!courseOffering) {
      throw new NotFoundException(`Course offering not found: ${courseOfferingId}`);
    }

    // Process each result
    const processedResults = [];
    for (const result of results) {
      // Validate student exists
      const student = await this.prisma.student.findUnique({
        where: { id: result.studentId },
      });

      if (!student) {
        throw new NotFoundException(`Student not found: ${result.studentId}`);
      }

      // Determine grade status based on grade
      let gradeStatus: 'PASS' | 'FAIL' | 'INCOMPLETE' | 'WITHDRAWN';
      // Simplified: assuming grades A-D are pass, F is fail
      // In reality, this would come from grading scheme
      const passGrades = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D'];
      if (passGrades.includes(result.grade)) {
        gradeStatus = 'PASS';
      } else if (result.grade === 'F') {
        gradeStatus = 'FAIL';
      } else {
        gradeStatus = 'INCOMPLETE'; // Default for other cases
      }

      // Create or update exam result
      const examResult = await this.prisma.examResult.upsert({
        where: {
          studentId_courseOfferingId: {
            studentId: result.studentId,
            courseOfferingId: courseOfferingId,
          },
        },
        update: {
          grade: result.grade,
          gradePoint: result.gradePoint,
          marks: result.marks,
          gradeStatus: gradeStatus,
          releasedAt: new Date(),
          releasedBy: 'SYSTEM', // In reality, would be the user who released
        },
        create: {
          studentId: result.studentId,
          courseOfferingId: courseOfferingId,
          courseId: courseOffering.courseId,
          grade: result.grade,
          gradePoint: result.gradePoint,
          marks: result.marks,
          gradeStatus: gradeStatus,
          releasedAt: new Date(),
          releasedBy: 'SYSTEM',
        },
      });

      processedResults.push(examResult);
    }

    return {
      message: `Processed ${processedResults.length} exam results for course offering ${courseOffering.course.code}`,
      courseOffering: {
        id: courseOffering.id,
        course: {
          id: courseOffering.course.id,
          code: courseOffering.course.code,
          name: courseOffering.course.name,
        },
        semester: {
          id: courseOffering.semester.id,
          label: courseOffering.semester.label,
        },
      },
      results: processedResults,
    };
  }

  /**
   * Generate grade reports for a student
   */
  async generateGradeReport(studentId: string): Promise<any> {
    // Get student with exam results
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: true,
        examResults: {
          include: {
            courseOffering: {
              include: {
                course: true,
                semester: true,
              },
            },
          },
          orderBy: {
            releasedAt: 'desc',
          },
        },
        academicPlan: {
          include: {
            semesters: {
              include: {
                plannedCourses: {
                  include: {
                    course: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException(`Student not found: ${studentId}`);
    }

    // Calculate GPA and statistics
    let totalCredits = 0;
    let totalGradePoints = 0;
    let passedCourses = 0;
    let totalCourses = 0;

    const examResults = student.examResults.filter(
      result => result.releasedAt !== null
    );

    for (const result of examResults) {
      totalCourses++;
      if (result.gradeStatus === 'PASS') {
        passedCourses++;
        totalCredits += result.courseOffering.course.creditHours;
        totalGradePoints += (result.gradePoint || 0) * result.courseOffering.course.creditHours;
      }
    }

    const gpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0;

    // Group results by semester
    const resultsBySemester = {};
    for (const result of examResults) {
      const semesterLabel = result.courseOffering.semester.label;
      if (!resultsBySemester[semesterLabel]) {
        resultsBySemester[semesterLabel] = [];
      }
      resultsBySemester[semesterLabel].push(result);
    }

    return {
      student: {
        id: student.id,
        studentId: student.studentId,
        name: student.user?.name || 'Unknown',
        email: student.user?.email || '',
      },
      gpa: Number(gpa.toFixed(2)),
      totalCreditsEarned: totalCredits,
      totalCoursesTaken: totalCourses,
      coursesPassed: passedCourses,
      passRate: totalCourses > 0 ? (passedCourses / totalCourses) * 100 : 0,
      resultsBySemester: Object.keys(resultsBySemester).map(semester => ({
        semester: semester,
        results: resultsBySemester[semester].map(result => ({
          courseCode: result.courseOffering.course.code,
          courseName: result.courseOffering.course.name,
          grade: result.grade,
          gradePoint: result.gradePoint,
          marks: result.marks,
          releasedAt: result.releasedAt,
        })),
      })),
      academicPlan: student.academicPlan ? {
        id: student.academicPlan.id,
        originalGraduation: student.academicPlan.originalGraduation,
        projectedGraduation: student.academicPlan.projectedGraduation,
        hasExtension: student.academicPlan.hasExtension,
        lastRevisedAt: student.academicPlan.lastRevisedAt,
      } : null,
    };
  }

  /**
   * Generate examination timetable for a semester
   */
  async generateExaminationTimetable(semesterId: string): Promise<any> {
    // Placeholder - in reality would:
    // 1. Determine exam periods based on teaching weeks
    // 2. Schedule exams for each course offering avoiding student conflicts
    // 3. Allocate venues and invigilators
    // 4. Create examination timetable entity
    return {
      message: 'Examination timetable generation service ready - implement algorithm',
      semesterId,
      nextSteps: [
        'Implement examination period determination',
        'Add conflict-free exam scheduling algorithm',
        'Implement venue allocation for exams',
        'Add invigilator assignment',
        'Create examination timetable entity',
        'Add examination timetable approval workflow'
      ]
    };
  }

  /**
   * Get examination timetable for a semester
   */
  async getExaminationTimetable(semesterId: string): Promise<any> {
    // Placeholder
    return {
      message: 'Examination timetable retrieval not yet implemented',
      semesterId,
    };
  }

  findAll() {
    return { module: 'M06 — Exam & Results', status: 'ready' };
  }
}