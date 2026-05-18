import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TimetableService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a timetable for a given semester based on course offerings
   * and constraints (room capacity, lecturer availability, student conflicts, etc.)
   */
  async generateTimetable(semesterId: string): Promise<any> {
    // Get semester with course offerings
    const semester = await this.prisma.semester.findUnique({
      where: { id: semesterId },
      include: {
        courseOfferings: {
          include: {
            course: true,
            lecturer: true,
            sections: true,
          },
        },
      },
    });

    if (!semester) {
      throw new NotFoundException(`Semester not found: ${semesterId}`);
    }

    // Get all rooms for allocation
    const rooms = await this.prisma.room.findMany({
      include: {
        venue: true,
        equipment: true,
      },
      where: { isActive: true },
    });

    // Get all lecturers with their availability
    const lecturers = await this.prisma.lecturer.findMany({
      include: {
        user: true,
        availability: {
          where: { semesterId },
        },
      },
      where: { isActive: true },
    });

    // For now, return a placeholder response indicating the service is ready
    // In a full implementation, this would run the actual timetable generation algorithm
    return {
      message: 'Timetable generation service ready - implement constraint-based algorithm',
      semesterId,
      semesterLabel: semester.label,
      courseOfferingsCount: semester.courseOfferings.length,
      roomsAvailable: rooms.length,
      lecturersAvailable: lecturers.length,
      nextSteps: [
        'Implement constraint-based timetable generation algorithm',
        'Add room allocation logic based on capacity and equipment',
        'Implement lecturer availability checking',
        'Add student conflict detection (prerequisites, enrolled courses)',
        'Create timetable slot generation and assignment',
        'Implement conflict resolution and optimization',
        'Add timetable approval workflow'
      ]
    };
  }

  /**
   * Get timetable details for viewing
   */
  async getTimetable(timetableId: string): Promise<any> {
    const timetable = await this.prisma.timetable.findUnique({
      where: { id: timetableId },
      include: {
        semester: true,
        slots: {
          include: {
            courseOffering: {
              include: {
                course: true,
                lecturer: {
                  include: { user: true }
                },
                sections: true,
              },
            },
            section: true,
            venue: {
              include: {
                rooms: true,
              },
            },
          },
          orderBy: {
            dayOfWeek: 'asc',
            startTime: 'asc',
          },
        },
      },
    });

    if (!timetable) {
      throw new NotFoundException(`Timetable not found: ${timetableId}`);
    }

    return timetable;
  }

  /**
   * Create a new timetable (draft)
   */
  async createTimetable(semesterId: string, generatedBy: string): Promise<any> {
    // Check if semester exists
    const semester = await this.prisma.semester.findUnique({
      where: { id: semesterId },
    });

    if (!semester) {
      throw new NotFoundException(`Semester not found: ${semesterId}`);
    }

    // Create new timetable in DRAFT status
    const timetable = await this.prisma.timetable.create({
      data: {
        semesterId,
        generatedAt: new Date(),
        approvalState: 'DRAFT',
        generatedBy,
      },
    });

    return timetable;
  }

  /**
   * Update timetable approval state
   */
  async updateTimetableApproval(
    timetableId: string,
    approvalState: string,
    approvedBy?: string,
  ): Promise<any> {
    const validStates = ['DRAFT', 'PENDING_PC', 'PENDING_HOP', 'APPROVED', 'REJECTED', 'PUBLISHED'];
    if (!validStates.includes(approvalState)) {
      throw new BadRequestException(`Invalid approval state: ${approvalState}`);
    }

    const timetable = await this.prisma.timetable.update({
      where: { id: timetableId },
      data: {
        approvalState,
        approvedAt: approvalState === 'APPROVED' || approvalState === 'PUBLISHED' ? new Date() : undefined,
        approvedBy: approvedBy || undefined,
      },
    });

    return timetable;
  }

  /**
   * Get timetable slots for a timetable
   */
  async getTimetableSlots(timetableId: string): Promise<any> {
    const slots = await this.prisma.timetableSlot.findMany({
      where: { timetableId },
      include: {
        courseOffering: {
          include: {
            course: true,
            lecturer: {
              include: { user: true }
            },
          },
        },
        section: true,
        venue: {
          include: {
            rooms: true,
          },
        },
      },
      orderBy: {
        dayOfWeek: 'asc',
        startTime: 'asc',
      },
    });

    return slots;
  }

  /**
   * Create a timetable slot
   */
  async createTimetableSlot(
    timetableId: string,
    courseOfferingId: string,
    sectionId: string,
    venueId: string,
    dayOfWeek: number, // 0=Mon, 1=Tue, etc.
    startTime: string, // HH:MM format
    endTime: string,   // HH:MM format
  ): Promise<any> {
    // Validate timetable exists
    const timetable = await this.prisma.timetable.findUnique({
      where: { id: timetableId },
    });

    if (!timetable) {
      throw new NotFoundException(`Timetable not found: ${timetableId}`);
    }

    // Create the slot
    const slot = await this.prisma.timetableSlot.create({
      data: {
        timetableId,
        courseOfferingId,
        sectionId,
        venueId,
        dayOfWeek,
        startTime: startTime,
        endTime: endTime,
        status: 'SCHEDULED',
      },
      include: {
        courseOffering: {
          include: {
            course: true,
            lecturer: { include: { user: true } },
          },
        },
        section: true,
        venue: { include: { rooms: true } },
      },
    });

    return slot;
  }

  /**
   * Cancel a timetable slot and suggest replacements
   */
  async cancelTimetableSlot(slotId: string, reason: string): Promise<any> {
    // Get the slot with related data
    const slot = await this.prisma.timetableSlot.findUnique({
      where: { id: slotId },
      include: {
        timetable: true,
        courseOffering: {
          include: {
            course: true,
            lecturer: { include: { user: true } },
          },
        },
        section: true,
        venue: { include: { rooms: true } },
      },
    });

    if (!slot) {
      throw new NotFoundException(`Timetable slot not found: ${slotId}`);
    }

    // Mark slot as cancelled
    const updatedSlot = await this.prisma.timetableSlot.update({
      where: { id: slotId },
      data: {
        status: 'CANCELLED',
        // In a full implementation, we would also store the reason and suggest replacements
      },
      include: {
        timetable: true,
        courseOffering: {
          include: {
            course: true,
            lecturer: { include: { user: true } },
          },
        },
        section: true,
        venue: { include: { rooms: true } },
      },
    });

    return {
      message: `Timetable slot cancelled for reason: ${reason}`,
      slot: updatedSlot,
      nextSteps: [
        'Find replacement slots for the cancelled course offering',
        'Notify affected students and lecturer',
        'Update timetable if replacement is found'
      ]
    };
  }

  /**
   * Get available rooms for a given time slot
   */
  async getAvailableRooms(
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    excludeRoomIds: string[] = [],
  ): Promise<any> {
    // Find rooms that are not booked during this time slot
    const bookedRooms = await this.prisma.timetableSlot.findMany({
      where: {
        dayOfWeek,
        OR: [
          // Slot starts during existing slot
          {
            startTime: { lte: startTime },
            endTime: { gt: startTime },
          },
          // Slot ends during existing slot
          {
            startTime: { lt: endTime },
            endTime: { gte: endTime },
          },
          // Slot completely encompasses existing slot
          {
            startTime: { gte: startTime },
            endTime: { lte: endTime },
          },
        ],
        NOT: {
          status: 'CANCELLED',
        },
        venueId: {
          notIn: excludeRoomIds.length > 0 ? undefined : {}, // We'll filter by roomId below
        },
      },
      select: {
        venueId: true,
      },
    });

    // Get all active rooms
    const allRooms = await this.prisma.room.findMany({
      where: { isActive: true },
      include: {
        venue: true,
      },
    });

    // Filter out booked rooms and rooms in exclude list
    const bookedRoomIds = new Set(bookedRooms.map(b => b.venueId));
    const availableRooms = allRooms.filter(room =>
      !bookedRoomIds.has(room.venueId) &&
      !excludeRoomIds.includes(room.id)
    );

    return availableRooms.map(room => ({
      id: room.id,
      code: room.code,
      name: room.name,
      capacity: room.capacity,
      venue: {
        id: room.venue.id,
        name: room.venue.name,
        building: room.venue.building,
        floor: room.venue.floor,
      },
      equipment: room.equipment,
      floorPlanX: room.floorPlanX,
      floorPlanY: room.floorPlanY,
    }));
  }

  /**
   * Check lecturer availability for a given time slot
   */
  async checkLecturerAvailability(
    lecturerId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    semesterId: string,
  ): Promise<boolean> {
    // Check if lecturer has any availability records that conflict
    const conflictingAvailability = await this.prisma.lecturerAvailability.findFirst({
      where: {
        lecturerId,
        semesterId,
        // Check if the requested time conflicts with lecturer's unavailable times
        // For simplicity, we'll assume lecturer availability defines when they ARE available
        // In a real system, this might be more complex (unavailable times, preferred times, etc.)
        AND: [
          { availableDays: { has: dayOfWeek } },
          // Time checking would be more complex in reality
        ],
      },
    });

    // If no availability record found, assume not available (conservative approach)
    // In a real system, you'd have separate unavailable times or default to unavailable
    return !!conflictingAvailability;
  }

  /**
   * Check for student conflicts (simplified)
   * In reality, this would check enrolments and prerequisite conflicts
   */
  async checkStudentConflicts(
    courseOfferingId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    semesterId: string,
  ): Promise<boolean> {
    // Placeholder - in reality would check:
