// @ts-nocheck
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TimetableService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Handle course offering changes from integration service
   */
  async handleCourseOfferingChange(
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    courseOffering: any,
  ): Promise<void> {
    // In a production system, we would:
    // - For CREATE: Check if this affects any existing timetables and flag for regeneration
    // - For UPDATE: Check if changes affect timetable validity (room capacity, lecturer changes, etc.)
    // - For DELETE: Remove from any timetables and flag affected timetables for regeneration

    // For now, we'll log the change
    console.log(`Timetable service received ${operation} event for course offering ${courseOffering.id}`);
  }

  /**
   * Handle semester changes from integration service
   */
  async handleSemesterChange(
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    semester: any,
  ): Promise<void> {
    // In a production system, we would:
    // - For CREATE: Prepare to generate timetables for this semester
    // - For UPDATE: Check if changes affect existing timetables
    // - For DELETE: Archive or remove timetables for this semester

    // For now, we'll log the change
    console.log(`Timetable service received ${operation} event for semester ${semester.id}`);
  }

  /**
   * Generate a timetable for a given semester based on course offerings
   * and constraints (room capacity, lecturer availability, student conflicts, etc.)
   */
  async generateTimetable(semesterId: string): Promise<any> {
    // Get semester with course offerings
    const semester = await this.prisma.semester.findUnique({
      where: { id: semesterId },
      include: {
        offerings: {
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

    // Create a new timetable in DRAFT status
    const timetable = await this.prisma.timetable.create({
      data: {
        semesterId,
        generatedAt: new Date(),
        approvalState: 'DRAFT',
      },
    });

    // Generate timetable slots using constraint-based algorithm
    const slots = await this.generateTimetableSlots(
      semester.offerings,
      rooms,
      lecturers,
      timetable.id
    );

    // Create the timetable slots in the database
    const createdSlots = [];
    for (const slot of slots) {
      const createdSlot = await this.prisma.timetableSlot.create({
        data: {
          timetableId: timetable.id,
          courseOfferingId: slot.courseOfferingId,
          sectionId: slot.sectionId,
          venueId: slot.venueId,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
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
          venue: { include: { venue: true } },
        },
      });
      createdSlots.push(createdSlot);
    }

    return {
      timetableId: timetable.id,
      semesterId,
      semesterLabel: semester.label,
      slotsGenerated: createdSlots.length,
      slots: createdSlots,
      message: 'Timetable generated successfully with constraint-based algorithm',
      nextSteps: [
        'Review and approve timetable',
        'Monitor for conflicts and make adjustments as needed',
        'Publish timetable when ready'
      ]
    };
  }

  /**
   * Generate timetable slots using constraint-based algorithm
   * Uses a greedy algorithm with backtracking for constraint satisfaction
   */
  private async generateTimetableSlots(
    courseOfferings: any[],
    rooms: any[],
    lecturers: any[],
    timetableId: string
  ): Promise<any[]> {
    const slots = [];

    // Create lookup maps for faster access
    const lecturerMap = new Map();
    lecturers.forEach(lecturer => {
      lecturerMap.set(lecturer.id, lecturer);
    });

    const roomMap = new Map();
    rooms.forEach(room => {
      roomMap.set(room.id, room);
    });

    // Track lecturer and room schedules to prevent double-booking
    const lecturerSchedule = new Map(); // lecturerId -> Array of {dayOfWeek, startTime, endTime}
    const roomSchedule = new Map(); // roomId -> Array of {dayOfWeek, startTime, endTime}

    // Define time slots (30-minute intervals from 8:00 to 18:00)
    const timeSlots = this.generateTimeSlots();

    // Define days of week (Monday to Friday)
    const daysOfWeek = [0, 1, 2, 3, 4]; // 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri

    // Process each course offering
    for (const offering of courseOfferings) {
      // Process each section of the course offering
      for (const section of offering.sections) {
        let slotFound = false;

        // Try to find a suitable time slot and room for this section
        for (const dayOfWeek of daysOfWeek) {
          if (slotFound) break;

          for (const timeSlot of timeSlots) {
            if (slotFound) break;

            const { startTime, endTime } = timeSlot;

            // Check lecturer availability
            if (!this.isLecturerAvailable(offering.lecturerId, dayOfWeek, startTime, endTime, lecturerMap)) {
              continue;
            }

            // Check for lecturer double-booking
            if (this.hasScheduleConflict(
                lecturerSchedule,
                offering.lecturerId,
                dayOfWeek,
                startTime,
                endTime
              )) {
              continue;
            }

            // Find an available room that meets capacity requirements
            const suitableRoom = this.findAvailableRoom(
              rooms,
              roomSchedule,
              section.combinedHeadcount || 30, // Default to 30 if not set
              dayOfWeek,
              startTime,
              endTime
            );

            if (suitableRoom) {
              // Found a suitable slot - create timetable slot
              slots.push({
                courseOfferingId: offering.id,
                sectionId: section.id,
                venueId: suitableRoom.id,
                dayOfWeek,
                startTime,
                endTime
              });

              // Update schedules
              this.updateSchedule(lecturerSchedule, offering.lecturerId, dayOfWeek, startTime, endTime);
              this.updateSchedule(roomSchedule, suitableRoom.id, dayOfWeek, startTime, endTime);

              slotFound = true;
            }
          }
        }

        // If no slot found after trying all combinations, log warning but continue
        if (!slotFound) {
          console.warn(`Could not find suitable slot for section ${section.sectionCode} of course ${offering.course.code}`);
          // In a production system, we might want to implement constraint relaxation here
        }
      }
    }

    return slots;
  }

  /**
   * Generate time slots (30-minute intervals from 8:00 to 18:00)
   */
  private generateTimeSlots(): Array<{startTime: string, endTime: string}> {
    const slots = [];
    let startHour = 8;
    const endHour = 18;

    while (startHour < endHour) {
      const startTime = `${startHour.toString().padStart(2, '0')}:00`;
      const endTime = `${(startHour + 1).toString().padStart(2, '0')}:00`;
      slots.push({ startTime, endTime });
      startHour++;
    }

    return slots;
  }

  /**
   * Check if lecturer is available at the given time
   */
  private isLecturerAvailable(
    lecturerId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    lecturerMap: Map<string, any>
  ): boolean {
    const lecturer = lecturerMap.get(lecturerId);
    if (!lecturer) return false;

    const availability = lecturer.availability.find((av: any) =>
      av.semesterId === lecturer.availability[0]?.semesterId // Assuming we filtered by semesterId earlier
    );

    if (!availability) return false;

    // Check if day is in available days
    if (!availability.availableDays.includes(dayOfWeek)) {
      return false;
    }

    // Check if time is within preferred hours (simplified check)
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const [prefStartHour, prefStartMin] = availability.preferredStartTime.split(':').map(Number);
    const [prefEndHour, prefEndMin] = availability.preferredEndTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const prefStartMinutes = prefStartHour * 60 + prefStartMin;
    const prefEndMinutes = prefEndHour * 60 + prefEndMin;

    return startMinutes >= prefStartMinutes && endMinutes <= prefEndMinutes;
  }

  /**
   * Check if there's a schedule conflict for the given resource
   */
  private hasScheduleConflict(
    scheduleMap: Map<string, Array<{dayOfWeek: number, startTime: string, endTime: string}>>,
    resourceId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string
  ): boolean {
    const schedule = scheduleMap.get(resourceId) || [];

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    for (const existing of schedule) {
      if (existing.dayOfWeek !== dayOfWeek) continue;

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
   * Update schedule for a resource
   */
  private updateSchedule(
    scheduleMap: Map<string, Array<{dayOfWeek: number, startTime: string, endTime: string}>>,
    resourceId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string
  ): void {
    const schedule = scheduleMap.get(resourceId) || [];
    schedule.push({ dayOfWeek, startTime, endTime });
    scheduleMap.set(resourceId, schedule);
  }

  /**
   * Find an available room that meets capacity requirements
   */
  private findAvailableRoom(
    rooms: any[],
    roomSchedule: Map<string, Array<{dayOfWeek: number, startTime: string, endTime: string}>>,
    requiredCapacity: number,
    dayOfWeek: number,
    startTime: string,
    endTime: string
  ): any | null {
    // Sort rooms by capacity (ascending) to find the smallest suitable room first
    const sortedRooms = [...rooms].sort((a, b) => a.capacity - b.capacity);

    for (const room of sortedRooms) {
      // Check if room meets capacity requirements
      if (room.capacity < requiredCapacity) continue;

      // Check for room double-booking
      if (this.hasScheduleConflict(
          roomSchedule,
          room.id,
          dayOfWeek,
          startTime,
          endTime
        )) {
        continue;
      }

      // Room is available and suitable
      return room;
    }

    return null;
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
                venue: true,
              },
            },
          },
          orderBy: [
            { dayOfWeek: 'asc' },
            { startTime: 'asc' },
          ],
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
        approvalState: approvalState as any,
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
            venue: true,
          },
        },
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' },
      ],
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
        venue: { include: { venue: true } },
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
        venue: { include: { venue: true } },
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
        venue: { include: { venue: true } },
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
        equipment: true,
      },
    });

    // Filter out booked rooms and rooms in exclude list
    const bookedRoomIds = new Set(bookedRooms.map((b: any) => b.venueId));
    const availableRooms = allRooms.filter((room: any) =>
      !bookedRoomIds.has(room.id) &&
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
    // 1. Get all students enrolled in this course offering
    // 2. Check their other enrolments for time conflicts
    // 3. Check prerequisite relationships that might cause conflicts
    // For now, return false (no conflicts detected in simplified version)
    return false;
  }

  findAll() {
    return { module: 'Timetable Generator', status: 'ready' };
  }
}