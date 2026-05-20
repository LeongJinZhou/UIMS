// @ts-nocheck
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * M07 — Enrolment & Registration
 */
@Injectable()
export class EnrolmentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all enrolments with optional filtering
   */
  async getEnrolments(filters: {
    studentId?: string;
    semesterId?: string;
    courseOfferingId?: string;
    isDropped?: boolean;
  } = {}): Promise<any> {
    const { studentId, semesterId, courseOfferingId, isDropped } = filters;

    const whereClause: any = {};
    if (studentId) whereClause.studentId = studentId;
    if (semesterId) whereClause.semesterId = semesterId;
    if (courseOfferingId) whereClause.courseOfferingId = courseOfferingId;
    if (isDropped !== undefined) whereClause.isDropped = isDropped;

    const enrolments = await this.prisma.enrolment.findMany({
      where: whereClause,
      include: {
        student: {
          include: {
            user: true,
          },
        },
        semester: true,
        courseOffering: {
          include: {
            course: true,
            lecturer: {
              include: {
                user: true,
              },
            },
          },
        },
        section: true,
      },
      orderBy: {
        enrolledAt: 'desc',
      },
    });

    return enrolments;
  }

  /**
   * Get enrolment by ID
   */
  async getEnrolmentById(enrolmentId: string): Promise<any> {
    const enrolment = await this.prisma.enrolment.findUnique({
      where: { id: enrolmentId },
      include: {
        student: {
          include: {
            user: true,
          },
        },
        semester: true,
        courseOffering: {
          include: {
            course: true,
            lecturer: {
              include: {
                user: true,
              },
            },
          },
        },
        section: true,
      },
    });

    if (!enrolment) {
      throw new NotFoundException(`Enrolment not found: ${enrolmentId}`);
    }

    return enrolment;
  }

  /**
   * Create a new enrolment
   */
  async createEnrolment(
    data: {
      studentId: string;
      semesterId: string;
      courseOfferingId: string;
      sectionId: string;
    }
  ): Promise<any> {
    // Validate student exists and is active
    const student = await this.prisma.student.findUnique({
      where: { id: data.studentId },
    });

    if (!student) {
      throw new NotFoundException(`Student not found: ${data.studentId}`);
    }

    if (!student.isActive) {
      throw new BadRequestException(`Student is not active: ${data.studentId}`);
    }

    // Validate semester exists and is active
    const semester = await this.prisma.semester.findUnique({
      where: { id: data.semesterId },
    });

    if (!semester) {
      throw new NotFoundException(`Semester not found: ${data.semesterId}`);
    }

    if (!semester.isActive) {
      throw new BadRequestException(`Semester is not active: ${data.semesterId}`);
    }

    // Validate course offering exists and is confirmed
    const courseOffering = await this.prisma.courseOffering.findUnique({
      where: { id: data.courseOfferingId },
      include: {
        course: true,
      },
    });

    if (!courseOffering) {
      throw new NotFoundException(`Course offering not found: ${data.courseOfferingId}`);
    }

    if (!courseOffering.isConfirmed) {
      throw new BadRequestException(`Course offering is not confirmed: ${data.courseOfferingId}`);
    }

    // Validate section exists
    const section = await this.prisma.section.findUnique({
      where: { id: data.sectionId },
    });

    if (!section) {
      throw new NotFoundException(`Section not found: ${data.sectionId}`);
    }

    // Check if student is already enrolled in this course offering
    const existingEnrolment = await this.prisma.enrolment.findFirst({
      where: {
        studentId: data.studentId,
        courseOfferingId: data.courseOfferingId,
        isDropped: false,
      },
    });

    if (existingEnrolment) {
      throw new BadRequestException(`Student is already enrolled in this course offering`);
    }

    // Check course capacity
    const currentEnrolmentCount = await this.prisma.enrolment.count({
      where: {
        courseOfferingId: data.courseOfferingId,
        isDropped: false,
      },
    });

    if (currentEnrolmentCount >= courseOffering.maxCapacity) {
      throw new BadRequestException(`Course offering has reached maximum capacity`);
    }

    // Check prerequisites
    const hasMetPrerequisites = await this.checkPrerequisites(data.studentId, data.courseOfferingId);
    if (!hasMetPrerequisites) {
      throw new BadRequestException(`Student has not met the prerequisites for this course`);
    }

    // Check schedule conflicts
    const hasScheduleConflict = await this.checkScheduleConflicts(
      data.studentId,
      data.semesterId,
      data.sectionId
    );

    if (hasScheduleConflict) {
      throw new BadRequestException(`Schedule conflict with existing enrolments`);
    }

    // Create enrolment
    const enrolment = await this.prisma.enrolment.create({
      data: {
        studentId: data.studentId,
        semesterId: data.semesterId,
        courseOfferingId: data.courseOfferingId,
        sectionId: data.sectionId,
      },
      include: {
        student: {
          include: {
            user: true,
          },
        },
        semester: true,
        courseOffering: {
          include: {
            course: true,
            lecturer: {
              include: {
                user: true,
              },
            },
          },
        },
        section: true,
      },
    });

    return enrolment;
  }

  /**
   * Drop/enrollment withdrawal
   */
  async dropEnrolment(
    enrolmentId: string,
    data: {
      reason: string;
      studentAcknowledged: boolean;
    }
  ): Promise<any> {
    // Validate enrolment exists and is not already dropped
    const enrolment = await this.prisma.enrolment.findUnique({
      where: { id: enrolmentId },
      include: {
        student: true,
        courseOffering: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!enrolment) {
      throw new NotFoundException(`Enrolment not found: ${enrolmentId}`);
    }

    if (enrolment.isDropped) {
      throw new BadRequestException(`Enrolment is already dropped`);
    }

    // Create drop request
    const dropRequest = await this.prisma.dropRequest.create({
      data: {
        studentId: enrolment.studentId,
        enrolmentId: enrolment.id,
        courseCode: enrolment.courseOffering.course.code,
        reason: data.reason,
        studentAcknowledged: data.studentAcknowledged,
        status: 'PENDING',
      },
    });

    return dropRequest;
  }

  /**
   * Approve a drop request
   */
  async approveDropRequest(
    dropRequestId: string,
    approvedBy: string
  ): Promise<any> {
    // Validate drop request exists and is pending
    const dropRequest = await this.prisma.dropRequest.findUnique({
      where: { id: dropRequestId },
      include: {
        enrolment: {
          include: {
            student: true,
            courseOffering: {
              include: {
                course: true,
              },
            },
          },
        },
        student: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!dropRequest) {
      throw new NotFoundException(`Drop request not found: ${dropRequestId}`);
    }

    if (dropRequest.status !== 'PENDING') {
      throw new BadRequestException(`Drop request is not in pending status`);
    }

    // Validate approver exists
    const approver = await this.prisma.user.findUnique({
      where: { id: approvedBy },
    });

    if (!approver) {
      throw new NotFoundException(`User not found: ${approvedBy}`);
    }

    // Update drop request status
    const updatedDropRequest = await this.prisma.dropRequest.update({
      where: { id: dropRequestId },
      data: {
        status: 'APPROVED',
      },
    });

    // Actually drop the enrolment
    const droppedEnrolment = await this.prisma.enrolment.update({
      where: { id: dropRequest.enrolmentId },
      data: {
        isDropped: true,
        droppedAt: new Date(),
      },
      include: {
        student: {
          include: {
            user: true,
          },
        },
        semester: true,
        courseOffering: {
          include: {
            course: true,
            lecturer: {
              include: {
                user: true,
              },
            },
          },
        },
        section: true,
      },
    });

    return {
      dropRequest: updatedDropRequest,
      enrolment: droppedEnrolment,
    };
  }

  /**
   * Reject a drop request
   */
  async rejectDropRequest(
    dropRequestId: string,
    rejectedBy: string
  ): Promise<any> {
    // Validate drop request exists and is pending
    const dropRequest = await this.prisma.dropRequest.findUnique({
      where: { id: dropRequestId },
      include: {
        student: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!dropRequest) {
      throw new NotFoundException(`Drop request not found: ${dropRequestId}`);
    }

    if (dropRequest.status !== 'PENDING') {
      throw new BadRequestException(`Drop request is not in pending status`);
    }

    // Validate rejector exists
    const rejector = await this.prisma.user.findUnique({
      where: { id: rejectedBy },
    });

    if (!rejector) {
      throw new NotFoundException(`User not found: ${rejectedBy}`);
    }

    // Update drop request status
    const updatedDropRequest = await this.prisma.dropRequest.update({
      where: { id: dropRequestId },
      data: {
        status: 'REJECTED',
      },
    });

    return updatedDropRequest;
  }

  /**
   * Get drop requests with optional filtering
   */
  async getDropRequests(filters: {
    studentId?: string;
    status?: string;
  } = {}): Promise<any> {
    const { studentId, status } = filters;

    const whereClause: any = {};
    if (studentId) whereClause.studentId = studentId;
    if (status) whereClause.status = status;

    const dropRequests = await this.prisma.dropRequest.findMany({
      where: whereClause,
      include: {
        student: {
          include: {
            user: true,
          },
        },
        enrolment: {
          include: {
            student: {
              include: {
                user: true,
              },
            },
            courseOffering: {
              include: {
                course: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return dropRequests;
  }

  /**
   * Get enrolment analytics for a semester
   */
  async getEnrolmentAnalytics(semesterId: string): Promise<any> {
    // Validate semester exists
    const semester = await this.prisma.semester.findUnique({
      where: { id: semesterId },
    });

    if (!semester) {
      throw new NotFoundException(`Semester not found: ${semesterId}`);
    }

    // Get total enrolments
    const totalEnrolments = await this.prisma.enrolment.count({
      where: {
        semesterId,
        isDropped: false,
      },
    });

    // Get dropped enrolments
    const droppedEnrolments = await this.prisma.enrolment.count({
      where: {
        semesterId,
        isDropped: true,
      },
    });

    // Get enrolments by course offering
    const enrolmentsByCourse = await this.prisma.enrolment.groupBy({
      by: ['courseOfferingId'],
      where: {
        semesterId,
        isDropped: false,
      },
      _count: true,
    });

    // Get course details for each group
    const courseOfferingIds = enrolmentsByCourse.map((item) => item.courseOfferingId);
    const courseOfferings = await this.prisma.courseOffering.findMany({
      where: {
        id: { in: courseOfferingIds },
      },
      include: {
        course: true,
      },
    });

    const enrolmentsByCourseDetail = enrolmentsByCourse.map((item) => {
      const courseOffering = courseOfferings.find(
        (co) => co.id === item.courseOfferingId
      );
      return {
        courseOfferingId: item.courseOfferingId,
        courseCode: courseOffering?.course?.code || 'Unknown',
        courseName: courseOffering?.course?.name || 'Unknown',
        enrolmentCount: item._count,
      };
    });

    // Get student count
    const uniqueStudents = await this.prisma.enrolment.findMany({
      where: {
        semesterId,
        isDropped: false,
      },
      select: {
        studentId: true,
      },
      distinct: ['studentId'],
    });

    return {
      semester: {
        id: semester.id,
        label: semester.label,
      },
      totalEnrolments,
      droppedEnrolments,
      activeEnrolments: totalEnrolments - droppedEnrolments,
      dropRate: totalEnrolments > 0 ? (droppedEnrolments / totalEnrolments) * 100 : 0,
      uniqueStudents: uniqueStudents.length,
      enrolmentsByCourse: enrolmentsByCourseDetail,
    };
  }

  /**
   * Check if student has met prerequisites for a course offering
   */
  private async checkPrerequisites(
    studentId: string,
    courseOfferingId: string
  ): Promise<boolean> {
    // Get course offering with course details
    const courseOffering = await this.prisma.courseOffering.findUnique({
      where: { id: courseOfferingId },
      include: {
        course: {
          include: {
            prerequisites: {
              include: {
                prerequisiteCourse: true,
              },
            },
          },
        },
      },
    });

    if (!courseOffering) {
      return false;
    }

    // Get student's passed courses
    const passedCourses = await this.prisma.examResult.findMany({
      where: {
        studentId,
        gradeStatus: 'PASS',
      },
      select: {
        courseId: true,
      },
    });

    const passedCourseIds = passedCourses.map((result) => result.courseId);

    // Check if all prerequisites are met
    for (const prereq of courseOffering.course.prerequisites) {
      if (prereq.isMandatory && !passedCourseIds.includes(prereq.prerequisiteCourseId)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check for schedule conflicts with existing enrolments
   */
  private async checkScheduleConflicts(
    studentId: string,
    semesterId: string,
    sectionId: string
  ): Promise<boolean> {
    // Get the section we're trying to enrol in
    const targetSection = await this.prisma.section.findUnique({
      where: { id: sectionId },
      include: {
        courseOffering: true,
      },
    });

    if (!targetSection) {
      return false;
    }

    // Get student's current enrolments for the same semester
    const currentEnrolments = await this.prisma.enrolment.findMany({
      where: {
        studentId,
        semesterId,
        isDropped: false,
      },
      include: {
        section: true,
        courseOffering: true,
      },
    });

    // Check for time conflicts
    for (const enrolment of currentEnrolments) {
      // Skip if it's the same section (shouldn't happen due to earlier check)
      if (enrolment.sectionId === sectionId) {
        continue;
      }

      // Check if sections have the same schedule
      const sectionA = enrolment.section;
      const sectionB = targetSection;

      // Simple conflict detection: same day and overlapping time
      // In a real system, you'd have more detailed schedule information
      if (
        sectionA.dayOfWeek === sectionB.dayOfWeek &&
        // Assuming startTime and endTime are in HH:MM format
        this.timesOverlap(
          sectionA.startTime,
          sectionA.endTime,
          sectionB.startTime,
          sectionB.endTime
        )
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if two time slots overlap
   * Times are in HH:MM format
   */
  private timesOverlap(
    startA: string,
    endA: string,
    startB: string,
    endB: string
  ): boolean {
    const [startAHour, startAMin] = startA.split(':').map(Number);
    const [endAHour, endAMin] = endA.split(':').map(Number);
    const [startBHour, startBMin] = startB.split(':').map(Number);
    const [endBHour, endBMin] = endB.split(':').map(Number);

    const startAMinutes = startAHour * 60 + startAMin;
    const endAMinutes = endAHour * 60 + endAMin;
    const startBMinutes = startBHour * 60 + startBMin;
    const endBMinutes = endBHour * 60 + endBMin;

    return startAMinutes < endBMinutes && endAMinutes > startBMinutes;
  }
}
