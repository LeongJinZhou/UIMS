import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * M08 — HR & Lecturer Management
 */
@Injectable()
export class HrService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all lecturers with their details
   */
  async getLecturersWithDetails(): Promise<any> {
    const lecturers = await this.prisma.lecturer.findMany({
      include: {
        user: true,
        faculty: true,
        availability: true,
        leaveRecords: true,
        offerings: true,
      },
      where: { isActive: true },
    });

    return lecturers;
  }

  /**
   * Get a specific lecturer with details
   */
  async getLecturer(lecturerId: string): Promise<any> {
    const lecturer = await this.prisma.lecturer.findUnique({
      where: { id: lecturerId },
      include: {
        user: true,
        faculty: true,
        availability: true,
        leaveRecords: true,
        offerings: {
          include: {
            course: true,
            semester: true,
          },
        },
      },
    });

    if (!lecturer) {
      throw new NotFoundException(`Lecturer not found: ${lecturerId}`);
    }

    return lecturer;
  }

  /**
   * Update lecturer information
   */
  async updateLecturer(
    lecturerId: string,
    data: {
      department?: string;
      contractType?: string;
      maxTeachingLoad?: number;
      isActive?: boolean;
    },
  ): Promise<any> {
    // Validate lecturer exists
    const lecturer = await this.prisma.lecturer.findUnique({
      where: { id: lecturerId },
    });

    if (!lecturer) {
      throw new NotFoundException(`Lecturer not found: ${lecturerId}`);
    }

    // Update lecturer
    const updatedLecturer = await this.prisma.lecturer.update({
      where: { id: lecturerId },
      data,
    });

    return updatedLecturer;
  }

  /**
   * Get lecturer workload statistics
   */
  async getLecturerWorkload(lecturerId: string): Promise<any> {
    const lecturer = await this.prisma.lecturer.findUnique({
      where: { id: lecturerId },
      include: {
        offerings: {
          include: {
            course: true,
            semester: true,
          },
        },
      },
    });

    if (!lecturer) {
      throw new NotFoundException(`Lecturer not found: ${lecturerId}`);
    }

    // Calculate total credit hours from current offerings
    let totalCreditHours = 0;
    let currentSemesterOfferings = 0;

    for (const offering of lecturer.offerings) {
      // Only count offerings for active semesters
      if (offering.semester.isActive) {
        totalCreditHours += offering.course.creditHours;
        currentSemesterOfferings++;
      }
    }

    const maxTeachingLoad = lecturer.maxTeachingLoad || 0;
    const workloadPercentage =
      maxTeachingLoad > 0
        ? (totalCreditHours / maxTeachingLoad) * 100
        : 0;

    return {
      lecturerId,
      lecturerName: lecturer.user?.name || 'Unknown',
      department: lecturer.department,
      contractType: lecturer.contractType,
      maxTeachingLoad,
      currentCreditHours: totalCreditHours,
      currentSemesterOfferings: currentSemesterOfferings,
      workloadPercentage: Number(workloadPercentage.toFixed(2)),
      isOverloaded: workloadPercentage > 100,
    };
  }

  /**
   * Get leave records for a lecturer
   */
  async getLecturerLeaveRecords(lecturerId: string): Promise<any> {
    const leaveRecords = await this.prisma.leaveRecord.findMany({
      where: { lecturerId },
      include: {
        lecturer: {
          include: {
            user: true,
          },
        },
        replacementLecturer: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    return leaveRecords;
  }

  /**
   * Create a leave record for a lecturer
   */
  async createLeaveRecord(
    lecturerId: string,
    data: {
      leaveType: string;
      startDate: string; // YYYY-MM-DD
      endDate: string; // YYYY-MM-DD
      replacementLecturerId?: string;
      status?: string;
    },
  ): Promise<any> {
    // Validate lecturer exists
    const lecturer = await this.prisma.lecturer.findUnique({
      where: { id: lecturerId },
    });

    if (!lecturer) {
      throw new NotFoundException(`Lecturer not found: ${lecturerId}`);
    }

    // Validate replacement lecturer if provided
    if (data.replacementLecturerId) {
      const replacementLecturer = await this.prisma.lecturer.findUnique({
        where: { id: data.replacementLecturerId },
      });

      if (!replacementLecturer) {
        throw new NotFoundException(
          `Replacement lecturer not found: ${data.replacementLecturerId}`,
        );
      }
    }

    // Create leave record
    const leaveRecord = await this.prisma.leaveRecord.create({
      data: {
        lecturerId,
        leaveDate: new Date(data.startDate), // Using leaveDate field from schema
        returnDate: new Date(data.endDate), // Using returnDate field from schema
        leaveType: data.leaveType as any, // Map to enum
        status: (data.status as any) || 'PENDING', // Map to enum
        replacementLecturerId: data.replacementLecturerId,
      },
    });

    return leaveRecord;
  }

  /**
   * Get lecturer availability for scheduling
   */
  async getLecturerAvailability(
    lecturerId: string,
    semesterId: string,
  ): Promise<any> {
    const availability = await this.prisma.lecturerAvailability.findFirst({
      where: {
        lecturerId,
        semesterId,
      },
    });

    if (!availability) {
      return null;
    }

    return {
      lecturerId,
      semesterId,
      availableDays: availability.availableDays,
      preferredStartTime: availability.preferredStartTime,
      preferredEndTime: availability.preferredEndTime,
      maxConsecutiveHours: availability.maxConsecutiveHours,
    };
  }

  /**
   * Get HR dashboard statistics
   */
  async getHrDashboard(): Promise<any> {
    const [
      totalLecturers,
      activeLecturers,
      onLeaveLecturers,
      totalCourses,
    ] = await Promise.all([
      this.prisma.lecturer.count(),
      this.prisma.lecturer.count({ where: { isActive: true } }),
      this.prisma.leaveRecord.count({
        where: {
          status: { in: ['APPROVED', 'PENDING'] },
        },
      }),
      this.prisma.course.count(),
    ]);

    return {
      totalLecturers,
      activeLecturers,
      onLeaveLecturers,
      totalCourses,
      lecturerUtilizationRate: totalLecturers > 0
        ? (activeLecturers / totalLecturers) * 100
        : 0,
    };
  }

  findAll() {
    return { module: 'M08 — HR & Lecturer Management', status: 'ready' };
  }
}
