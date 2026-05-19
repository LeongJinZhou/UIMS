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
  async getLecturer(lectorId: string): Promise<any> {
    const lecturer = await this.prisma.lecturer.findUnique({
      where: { id: lectorId },
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
      throw new NotFoundException(`Lecturer not found: ${lectorId}`);
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
   * Create or update lecturer availability
   */
  async setLecturerAvailability(
    lecturerId: string,
    semesterId: string,
    data: {
      availableDays: number[]; // [0,1,2,3,4] = Mon-Fri
      preferredStartTime: string; // HH:MM format
      preferredEndTime: string; // HH:MM format
      maxConsecutiveHours: number;
    },
  ): Promise<any> {
    // Validate lecturer exists
    const lecturer = await this.prisma.lecturer.findUnique({
      where: { id: lecturerId },
    });

    if (!lecturer) {
      throw new NotFoundException(`Lecturer not found: ${lecturerId}`);
    }

    // Validate semester exists
    const semester = await this.prisma.semester.findUnique({
      where: { id: semesterId },
    });

    if (!semester) {
      throw new NotFoundException(`Semester not found: ${semesterId}`);
    }

    // Check if availability record already exists
    const existingAvailability = await this.prisma.lecturerAvailability.findFirst({
      where: {
        lecturerId,
        semesterId,
      },
    });

    if (existingAvailability) {
      // Update existing record
      return await this.prisma.lecturerAvailability.update({
        where: { id: existingAvailability.id },
        data: {
          availableDays: data.availableDays,
          preferredStartTime: data.preferredStartTime,
          preferredEndTime: data.preferredEndTime,
          maxConsecutiveHours: data.maxConsecutiveHours,
        },
      });
    } else {
      // Create new record
      return await this.prisma.lecturerAvailability.create({
        data: {
          lecturerId,
          semesterId,
          availableDays: data.availableDays,
          preferredStartTime: data.preferredStartTime,
          preferredEndTime: data.preferredEndTime,
          maxConsecutiveHours: data.maxConsecutiveHours,
        },
      });
    }
  }

  /**
   * Get lecturer teaching assignments (offerings)
   */
  async getLecturerOfferings(lecturerId: string, semesterId?: string): Promise<any> {
    const whereClause: any = { lecturerId };
    if (semesterId) {
      whereClause.semesterId = semesterId;
    }

    const offerings = await this.prisma.courseOffering.findMany({
      where: whereClause,
      include: {
        course: true,
        semester: true,
        sections: {
          include: {
            enrolments: {
              include: {
                student: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        semester: {
          label: 'asc',
        },
        course: {
          code: 'asc',
        },
      },
    });

    return offerings;
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
      lecturersWithAvailability,
    ] = await Promise.all([
      this.prisma.lecturer.count(),
      this.prisma.lecturer.count({ where: { isActive: true } }),
      this.prisma.leaveRecord.count({
        where: {
          status: { in: ['APPROVED', 'PENDING'] },
        },
      }),
      this.prisma.course.count(),
      this.prisma.lecturerAvailability.count(),
    ]);

    return {
      totalLecturers,
      activeLecturers,
      onLeaveLecturers,
      totalCourses,
      lecturerUtilizationRate: totalLecturers > 0
        ? (activeLecturers / totalLecturers) * 100
        : 0,
      availabilityCoverageRate: totalLecturers > 0
        ? (lecturersWithAvailability / totalLecturers) * 100
        : 0,
    };
  }

  /**
   * Get lecturers who are overloaded (exceeding max teaching load)
   */
  async getOverloadedLecturers(): Promise<any> {
    const lecturers = await this.prisma.lecturer.findMany({
      where: { isActive: true },
      include: {
        offerings: {
          include: {
            course: true,
            semester: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    const overloadedLecturers = [];

    for (const lecturer of lecturers) {
      let totalCreditHours = 0;

      for (const offering of lecturer.offerings) {
        // Only count offerings for active semesters
        if (offering.semester.isActive) {
          totalCreditHours += offering.course.creditHours;
        }
      }

      const maxTeachingLoad = lecturer.maxTeachingLoad || 0;
      const workloadPercentage =
        maxTeachingLoad > 0
          ? (totalCreditHours / maxTeachingLoad) * 100
          : 0;

      if (workloadPercentage > 100) {
        overloadedLecturers.push({
          lecturerId: lecturer.id,
          lecturerName: lecturer.user?.name || 'Unknown',
          department: lecturer.department,
          contractType: lecturer.contractType,
          maxTeachingLoad,
          currentCreditHours: totalCreditHours,
          workloadPercentage: Number(workloadPercentage.toFixed(2)),
          isOverloaded: true,
        });
      }
    }

    return overloadedLecturers;
  }

  findAll() {
    return { module: 'M08 — HR & Lecturer Management', status: 'ready' };
  }
}
