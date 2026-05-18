import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class StudentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate academic plan for a student based on their intake cohort
   * and the MQA-approved course structure for their programme version
   */
  async generateAcademicPlan(studentId: string): Promise<any> {
    // Get student with programme and version info
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        programme: true,
        programmeVersion: {
          include: {
            semesterPlans: {
              include: {
                mqaPlanCourses: {
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

    if (!student.programmeVersion) {
      throw new BadRequestException(`Student has no programme version assigned`);
    }

    // Check if academic plan already exists
    let academicPlan = await this.prisma.academicPlan.findUnique({
      where: { studentId: student.id },
    });

    if (!academicPlan) {
      // Create new academic plan
      academicPlan = await this.prisma.academicPlan.create({
        data: {
          studentId: student.id,
          originalGraduation: this.calculateOriginalGraduation(student),
          projectedGraduation: this.calculateOriginalGraduation(student), // Will be updated as we process
          lastRevisedAt: new Date(),
        },
      });
    } else {
      // Clear existing planned courses for revision
      await this.prisma.plannedCourse.deleteMany({
        where: {
          semesterPlan: {
            academicPlanId: academicPlan.id,
          },
        },
      });

      // Delete existing semester plans
      await this.prisma.semesterPlan.deleteMany({
        where: {
          academicPlanId: academicPlan.id,
        },
      });
    }

    // Generate the academic plan based on programme structure
    await this.populateAcademicPlan(student, academicPlan);

    // Return the generated plan
    return this.getAcademicPlanDetails(academicPlan.id);
  }

  /**
   * Calculate original graduation date based on intake and programme duration
   */
  private calculateOriginalGraduation(student: any): string {
    // This is a simplified calculation - in reality would depend on intake period/year
    // and programme structure (semester types, etc.)
    const intakeYear = student.intakeYear;
    const intakePeriod = student.intakePeriod; // APRIL, JULY, OCTOBER
    const totalSemesters = student.programmeVersion.semesterPlans.length;

    // Simple approximation: each semester is ~6 months
    const totalMonths = totalSemesters * 6;
    const graduationDate = new Date(intakeYear, this.monthFromPeriod(intakePeriod) - 1 + totalMonths);

    const year = graduationDate.getFullYear();
    const semester = graduationDate.getMonth() >= 6 ? 2 : 1; // Simplified

    return `${year}-S${semester}`;
  }

  /**
   * Convert intake period to month number (1-12)
   */
  private monthFromPeriod(period: string): number {
    switch (period) {
      case 'APRIL': return 4;
      case 'JULY': return 7;
      case 'OCTOBER': return 10;
      default: return 1; // Default to January
    }
  }

  /**
   * Populate the academic plan with semester plans and planned courses
   */
  private async populateAcademicPlan(student: any, academicPlan: any): Promise<void> {
    // Create semester plans for the academic plan
    const semesterPlansToCreate = student.programmeVersion.semesterPlans.map((mqaSemesterPlan: any) => ({
      academicPlanId: academicPlan.id,
      semesterNumber: mqaSemesterPlan.semesterNumber,
      calendarSemester: this.generateCalendarSemester(
        student.intakeYear,
        student.intakePeriod,
        mqaSemesterPlan.semesterNumber
      ),
      totalCredits: mqaSemesterPlan.totalCredits,
      isExtension: false,
    }));

    const createdSemesterPlans = await this.prisma.semesterPlan.createMany({
      data: semesterPlansToCreate,
    });

    // Get the created semester plans with their IDs
    const semesterPlans = await this.prisma.semesterPlan.findMany({
      where: { academicPlanId: academicPlan.id },
      orderBy: { semesterNumber: 'asc' },
    });

    // Create a map of MQA semester numbers to created semester plan IDs
    const semesterPlanMap = new Map();
    semesterPlans.forEach((sp, index) => {
      semesterPlanMap.set(
        student.programmeVersion.semesterPlans[index].semesterNumber,
        sp.id
      );
    });

    // Create planned courses for each semester
    const plannedCoursesToCreate = [];

    for (const mqaSemesterPlan of student.programmeVersion.semesterPlans) {
      const semesterPlanId = semesterPlanMap.get(mqaSemesterPlan.semesterNumber);

      if (!semesterPlanId) {
        continue; // Skip if semester plan not found
      }

      for (const mqaPlanCourse of mqaSemesterPlan.mqaPlanCourses) {
        plannedCoursesToCreate.push({
          semesterPlanId,
          courseId: mqaPlanCourse.courseId,
          courseCode: mqaPlanCourse.course.code,
          creditHours: mqaPlanCourse.course.creditHours,
          isRetake: false,
          isDeferred: false,
          gradeStatus: null, // No grade yet for planned courses
        });
      }
    }

    // Create all planned courses
    if (plannedCoursesToCreate.length > 0) {
      await this.prisma.plannedCourse.createMany({
        data: plannedCoursesToCreate,
      });
    }
  }

  /**
   * Generate calendar semester string (e.g., "2026-S1") based on intake and semester number
   */
  private generateCalendarSemester(intakeYear: number, intakePeriod: string, semesterNumber: number): string {
    // Simplified calculation - each semester advances 6 months
    const startMonth = this.monthFromPeriod(intakePeriod);
    const totalMonths = (semesterNumber - 1) * 6;
    const semesterDate = new Date(intakeYear, startMonth - 1 + totalMonths, 1);

    const year = semesterDate.getFullYear();
    const month = semesterDate.getMonth() + 1;
    const semester = month >= 7 ? 2 : 1; // Simplified: Jan-Jun = S1, Jul-Dec = S2

    return `${year}-S${semester}`;
  }

  /**
   * Get detailed academic plan information for display
   */
  async getAcademicPlanDetails(academicPlanId: string): Promise<any> {
    const academicPlan = await this.prisma.academicPlan.findUnique({
      where: { id: academicPlanId },
      include: {
        student: {
          include: {
            user: true,
            programme: true,
            programmeVersion: true,
          },
        },
        semesters: {
          include: {
            plannedCourses: {
              include: {
                course: true,
              },
              orderBy: {
                course: {
                  code: 'asc',
                },
              },
            },
          },
          orderBy: {
            semesterNumber: 'asc',
          },
        },
      },
    });

    if (!academicPlan) {
      throw new NotFoundException(`Academic plan not found: ${academicPlanId}`);
    }

    // Calculate statistics
    let totalCreditsEarned = 0;
    let totalCreditsPlanned = 0;
    let coursesCompleted = 0;
    let coursesPlanned = 0;
    let failedCourses = 0;

    // Count completed courses from exam results (would need to join with enrolments/exam results)
    // For now, we'll focus on planned structure

    for (const semester of academicPlan.semesters) {
      for (const plannedCourse of semester.plannedCourses) {
        totalCreditsPlanned += plannedCourse.creditHours;
        coursesPlanned++;

        // In a real implementation, we would check actual grades here
        // For now, all planned courses are considered not yet completed
      }
    }

    // Get student's actual academic progress (simplified)
    // In reality, this would come from enrolments and exam results

    return {
      academicPlan: {
        id: academicPlan.id,
        studentId: academicPlan.studentId,
        planStatus: academicPlan.planStatus,
        originalGraduation: academicPlan.originalGraduation,
        projectedGraduation: academicPlan.projectedGraduation,
        hasExtension: academicPlan.hasExtension,
        lastRevisedAt: academicPlan.lastRevisedAt,
      },
      student: {
        id: academicPlan.student.id,
        studentId: academicPlan.student.studentId,
        name: academicPlan.student.user?.name || 'Unknown',
        email: academicPlan.student.user?.email || '',
        programme: {
          id: academicPlan.student.programme.id,
          name: academicPlan.student.programme.name,
          code: academicPlan.student.programme.code,
        },
        programmeVersion: {
          version: academicPlan.student.programmeVersion.version,
        },
        intakePeriod: academicPlan.student.intakePeriod,
        intakeYear: academicPlan.student.intakeYear,
        currentSemester: academicPlan.student.currentSemester,
      },
      planStructure: {
        totalSemesters: academicPlan.semesters.length,
        totalCoursesPlanned: coursesPlanned,
        totalCreditsPlanned: totalCreditsPlanned,
        semesters: academicPlan.semesters.map((semester) => ({
          semesterNumber: semester.semesterNumber,
          calendarSemester: semester.calendarSemester,
          totalCredits: semester.totalCredits,
          isExtension: semester.isExtension,
          courses: semester.plannedCourses.map((plannedCourse) => ({
            id: plannedCourse.id,
            course: {
              id: plannedCourse.course.id,
              code: plannedCourse.course.code,
              name: plannedCourse.course.name,
              creditHours: plannedCourse.course.creditHours,
              courseType: plannedCourse.course.courseType,
              description: plannedCourse.course.description,
            },
            creditHours: plannedCourse.creditHours,
            isRetake: plannedCourse.isRetake,
            isDeferred: plannedCourse.isDeferred,
            gradeStatus: plannedCourse.gradeStatus,
          })),
        })),
      }),
      // Progress tracking would be calculated from actual enrolments/exam results
      progress: {
        totalCreditsEarned: totalCreditsEarned, // Would come from actual completed courses
        totalCreditsPlanned: totalCreditsPlanned,
        completionPercentage: totalCreditsPlanned > 0 ? (totalCreditsEarned / totalCreditsPlanned) * 100 : 0,
        coursesCompleted: coursesCompleted,
        coursesPlanned: coursesPlanned,
        failedCourses: failedCourses,
        currentSemester: academicPlan.student.currentSemester,
      },
    };
  }

  /**
   * Update academic plan when a student fails a course
   * This would insert the failed course into future semesters while preserving graduation timeline
   */
  async handleCourseFailure(studentId: string, courseId: string, failedSemesterNumber: number): Promise<any> {
    // Get student's academic plan
    const academicPlan = await this.prisma.academicPlan.findUnique({
      where: { studentId },
      include: {
        semesters: {
          include: {
            plannedCourses: {
              include: {
                course: true,
              },
            },
          },
          orderBy: {
            semesterNumber: 'asc',
          },
        },
      },
    });

    if (!academicPlan) {
      throw new NotFoundException(`Academic plan not found for student: ${studentId}`);
    }

    // Find the failed course in the specified semester
    const failedSemester = academicPlan.semesters.find(s => s.semesterNumber === failedSemesterNumber);
    if (!failedSemester) {
      throw new NotFoundException(`Semester ${failedSemesterNumber} not found in academic plan`);
    }

    const failedPlannedCourse = failedSemester.plannedCourses.find(pc => pc.courseId === courseId);
    if (!failedPlannedCourse) {
      throw new NotFoundException(`Course ${courseId} not found in semester ${failedSemesterNumber}`);
    }

    // Mark the course as failed
    await this.prisma.plannedCourse.update({
      where: { id: failedPlannedCourse.id },
      data: {
        gradeStatus: 'FAIL',
        isRetake: true, // Mark as needing retake
      },
    });

    // In a full implementation, we would:
    // 1. Find the next available slot for this course in future semesters
    // 2. Check if adding the course would exceed credit limits
    // 3. If it would exceed limits, defer other courses or extend timeline
    // 4. Insert the retake course into the appropriate future semester
    // 5. Update projected graduation date if needed

    // For now, we'll return a simplified response indicating the failure was recorded
    return {
      message: `Course failure recorded for student ${studentId}, course ${courseId} in semester ${failedSemesterNumber}`,
      academicPlanId: academicPlan.id,
      nextSteps: [
        'Course marked as failed and requiring retake',
        'Academic plan needs to be revised to accommodate retake',
        'Student should consult with academic advisor for plan revision'
      ]
    };
  }

  findAll() {
    return { module: 'M02 — Student Academic Profile', status: 'ready' };
  }
}
