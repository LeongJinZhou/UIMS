import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * M05 — Venue & Resource Manager
 */
@Injectable()
export class VenueService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all venues with their rooms and equipment
   */
  async getVenuesWithDetails(): Promise<any> {
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

    return venues;
  }

  /**
   * Get a specific venue with its rooms
   */
  async getVenue(venueId: string): Promise<any> {
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
      include: {
        rooms: {
          include: {
            equipment: true,
          },
          where: { isActive: true },
        },
      },
    });

    if (!venue) {
      throw new NotFoundException(`Venue not found: ${venueId}`);
    }

    return venue;
  }

  /**
   * Get all active rooms
   */
  async getActiveRooms(): Promise<any> {
    const rooms = await this.prisma.room.findMany({
      where: { isActive: true },
      include: {
        venue: true,
        equipment: true,
      },
    });

    return rooms;
  }

  /**
   * Get a specific room with its equipment
   */
  async getRoom(roomId: string): Promise<any> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        venue: true,
        equipment: true,
      },
    });

    if (!room) {
      throw new NotFoundException(`Room not found: ${roomId}`);
    }

    return room;
  }

  /**
   * Book a room for a specific time slot
   */
  async bookRoom(
    roomId: string,
    startTime: string, // HH:MM format
    endTime: string,   // HH:MM format
    date: string,      // YYYY-MM-DD format
    purpose: string,
    bookedBy: string
  ): Promise<any> {
    // Validate room exists and is active
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { venue: true },
    });

    if (!room) {
      throw new NotFoundException(`Room not found: ${roomId}`);
    }

    if (!room.isActive) {
      throw new BadRequestException(`Room is not active: ${room.code}`);
    }

    // Check for existing bookings during this time slot
    const existingBooking = await this.prisma.roomBooking.findFirst({
      where: {
        roomId,
        date,
        AND: [
          // Booking starts during existing booking
          {
            startTime: { lte: startTime },
            endTime: { gt: startTime },
          },
          // Booking ends during existing booking
          {
            startTime: { lt: endTime },
            endTime: { gte: endTime },
          },
          // Booking completely encompasses existing booking
          {
            startTime: { gte: startTime },
            endTime: { lte: endTime },
          },
        ],
        status: { not: 'CANCELLED' },
      },
    });

    if (existingBooking) {
      throw new BadRequestException(`Room is already booked during this time slot`);
    }

    // Check for maintenance blocks
    const maintenanceBlock = await this.prisma.maintenanceBlock.findFirst({
      where: {
        roomId,
        AND: [
          { startDate: { lte: date } },
          { endDate: { gte: date } },
        ],
      },
    });

    if (maintenanceBlock) {
      throw new BadRequestException(`Room is under maintenance during this date`);
    }

    // Create the booking
    const booking = await this.prisma.roomBooking.create({
      data: {
        roomId,
        date,
        startTime,
        endTime,
        purpose,
        bookedBy,
        status: 'CONFIRMED',
      },
      include: {
        room: {
          include: {
            venue: true,
          },
        },
      },
    });

    return {
      message: `Room ${booking.room.code} booked for ${date} from ${startTime} to ${endTime}`,
      booking: {
        id: booking.id,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        purpose: booking.purpose,
        bookedBy: booking.bookedBy,
        bookedAt: booking.createdAt,
        status: booking.status,
      },
      room: {
        id: booking.room.id,
        code: booking.room.code,
        name: booking.room.name,
        venue: {
          id: booking.room.venue.id,
          name: booking.room.venue.name,
          building: booking.room.venue.building,
          floor: booking.room.venue.floor,
        },
      },
    };
  }

  /**
   * Get room availability for a specific date and time
   */
  async getRoomAvailability(
    date: string,      // YYYY-MM-DD format
    startTime: string, // HH:MM format
    endTime: string,   // HH:MM format
  ): Promise<any> {
    // Check for maintenance blocks on this date
    const maintenanceBlocks = await this.prisma.maintenanceBlock.findMany({
      where: {
        AND: [
          { startDate: { lte: date } },
          { endDate: { gte: date } },
        ],
      },
      include: {
        room: {
          select: {
            id: true,
          },
        },
      },
    });

    const blockedRoomIds = new Set(maintenanceBlocks.map(mb => mb.roomId));

    // Get all active rooms
    const allRooms = await this.prisma.room.findMany({
      where: { isActive: true },
      include: {
        venue: true,
        equipment: true,
      },
    });

    // Filter out blocked rooms
    const availableRooms = allRooms.filter(room => !blockedRoomIds.has(room.id));

    // Check for existing bookings during this time slot
    const bookedRooms = await this.prisma.roomBooking.findMany({
      where: {
        date,
        AND: [
          // Booking starts during existing booking
          {
            startTime: { lte: startTime },
            endTime: { gt: startTime },
          },
          // Booking ends during existing booking
          {
            startTime: { lt: endTime },
            endTime: { gte: endTime },
          },
          // Booking completely encompasses existing booking
          {
            startTime: { gte: startTime },
            endTime: { lte: endTime },
          },
        ],
        status: { not: 'CANCELLED' },
      },
      select: {
        roomId: true,
      },
    });

    const bookedRoomIds = new Set(bookedRooms.map(b => b.roomId));

    // Filter out booked rooms
    const trulyAvailableRooms = availableRooms.filter(room => !bookedRoomIds.has(room.id));

    return {
      date,
      startTime,
      endTime,
      availableRooms: trulyAvailableRooms.map(room => ({
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
      })),
      blockedRoomsCount: maintenanceBlocks.length,
      bookedRoomsCount: bookedRooms.length,
      message: `Found ${trulyAvailableRooms.length} available rooms`,
    };
  }

  /**
   * Get equipment for a room
   */
  async getRoomEquipment(roomId: string): Promise<any> {
    const roomEquipment = await this.prisma.roomEquipment.findMany({
      where: { roomId },
    });

    return roomEquipment;
  }

  /**
   * Add equipment to a room
   */
  async addRoomEquipment(
    roomId: string,
    type: string,
    quantity: number = 1
  ): Promise<any> {
    // Validate room exists
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException(`Room not found: ${roomId}`);
    }

    const equipment = await this.prisma.roomEquipment.create({
      data: {
        roomId,
        type,
        quantity,
      },
    });

    return equipment;
  }

  /**
   * Schedule maintenance for a room
   */
  async scheduleMaintenance(
    roomId: string,
    startDate: string, // YYYY-MM-DD format
    endDate: string,   // YYYY-MM-DD format
    reason: string,
    scheduledBy: string
  ): Promise<any> {
    // Validate room exists
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException(`Room not found: ${roomId}`);
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      throw new BadRequestException(`End date must be after start date`);
    }

    // Check for existing maintenance blocks that overlap
    const overlappingMaintenance = await this.prisma.maintenanceBlock.findFirst({
      where: {
        roomId,
        OR: [
          // Existing maintenance starts during new maintenance
          {
            AND: [
              { startDate: { lte: endDate } },
              { endDate: { gte: startDate } },
            ],
          },
          // Existing maintenance encompasses new maintenance
          {
            AND: [
              { startDate: { gte: startDate } },
              { endDate: { lte: endDate } },
            ],
          },
          // New maintenance encompasses existing maintenance
          {
            AND: [
              { startDate: { lte: startDate } },
              { endDate: { gte: endDate } },
            ],
          },
        ],
      },
    });

    if (overlappingMaintenance) {
      throw new BadRequestException(`Maintenance block overlaps with existing maintenance`);
    }

    // Check for existing bookings during this maintenance period
    const existingBookings = await this.prisma.roomBooking.findMany({
      where: {
        roomId,
        AND: [
          { date: { gte: startDate } },
          { date: { lte: endDate } },
        ],
        status: { not: 'CANCELLED' },
      },
    });

    if (existingBookings.length > 0) {
      throw new BadRequestException(`Cannot schedule maintenance: room has existing bookings during this period`);
    }

    // Create the maintenance block
    const maintenance = await this.prisma.maintenanceBlock.create({
      data: {
        roomId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
        scheduledBy,
      },
      include: {
        room: {
          include: {
            venue: true,
          },
        },
      },
    });

    return {
      message: `Maintenance scheduled for room ${maintenance.room.code} from ${startDate} to ${endDate}`,
      maintenance: {
        id: maintenance.id,
        room: {
          id: maintenance.room.id,
          code: maintenance.room.code,
          name: maintenance.room.name,
          venue: {
            id: maintenance.room.venue.id,
            name: maintenance.room.venue.name,
            building: maintenance.room.venue.building,
            floor: maintenance.room.venue.floor,
          },
        },
        startDate: maintenance.startDate,
        endDate: maintenance.endDate,
        reason: maintenance.reason,
        scheduledBy: maintenance.scheduledBy,
        scheduledAt: maintenance.createdAt,
      },
    };
  }

  /**
   * Get maintenance schedule for a room
   */
  async getRoomMaintenanceSchedule(
    roomId: string,
    startDate?: string,
    endDate?: string
  ): Promise<any> {
    // Validate room exists
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException(`Room not found: ${roomId}`);
    }

    // Build where clause
    const whereClause: any = { roomId };
    if (startDate && endDate) {
      whereClause.AND = [
        { startDate: { lte: endDate } },
        { endDate: { gte: startDate } },
      ];
    } else if (startDate) {
      whereClause.endDate = { gte: startDate };
    } else if (endDate) {
      whereClause.startDate = { lte: endDate };
    }

    const maintenanceBlocks = await this.prisma.maintenanceBlock.findMany({
      where: whereClause,
      include: {
        room: {
          include: {
            venue: true,
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    return {
      roomId,
      room: {
        id: room.id,
        code: room.code,
        name: room.name,
        venue: {
          id: room.venue.id,
          name: room.venue.name,
          building: room.venue.building,
          floor: room.venue.floor,
        },
      },
      maintenanceBlocks: maintenanceBlocks.map(mb => ({
        id: mb.id,
        startDate: mb.startDate,
        endDate: mb.endDate,
        reason: mb.reason,
        scheduledBy: mb.scheduledBy,
        scheduledAt: mb.createdAt,
      })),
    };
  }

  /**
   * Get booking calendar for a room
   */
  async getRoomBookingCalendar(
    roomId: string,
    startDate?: string,
    endDate?: string
  ): Promise<any> {
    // Validate room exists
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException(`Room not found: ${roomId}`);
    }

    // Build where clause
    const whereClause: any = { roomId, status: { not: 'CANCELLED' } };
    if (startDate && endDate) {
      whereClause.date = { gte: startDate, lte: endDate };
    } else if (startDate) {
      whereClause.date = { gte: startDate };
    } else if (endDate) {
      whereClause.date = { lte: endDate };
    }

    const bookings = await this.prisma.roomBooking.findMany({
      where: whereClause,
      include: {
        room: {
          include: {
            venue: true,
          },
        },
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
      ],
    });

    return {
      roomId,
      room: {
        id: room.id,
        code: room.code,
        name: room.name,
        venue: {
          id: room.venue.id,
          name: room.venue.name,
          building: room.venue.building,
          floor: room.venue.floor,
        },
      },
      bookings: bookings.map(b => ({
        id: b.id,
        date: b.date,
        startTime: b.startTime,
        endTime: b.endTime,
        purpose: b.purpose,
        bookedBy: b.bookedBy,
        bookedAt: b.createdAt,
        status: b.status,
      })),
    };
  }

  /**
   * Cancel a room booking
   */
  async cancelRoomBooking(
    bookingId: string,
    reason: string,
    cancelledBy: string
  ): Promise<any> {
    // Get the booking
    const booking = await this.prisma.roomBooking.findUnique({
      where: { id: bookingId },
      include: {
        room: {
          include: {
            venue: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking not found: ${bookingId}`);
    }

    if (booking.status === 'CANCELLED') {
      throw new BadRequestException(`Booking is already cancelled`);
    }

    // Update the booking
    const updatedBooking = await this.prisma.roomBooking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCELLED',
        // In a full implementation, we would store cancellation reason and who cancelled
      },
      include: {
        room: {
          include: {
            venue: true,
          },
        },
      },
    });

    return {
      message: `Booking cancelled for room ${updatedBooking.room.code} on ${updatedBooking.date}`,
      booking: {
        id: updatedBooking.id,
        date: updatedBooking.date,
        startTime: updatedBooking.startTime,
        endTime: updatedBooking.endTime,
        purpose: updatedBooking.purpose,
        bookedBy: updatedBooking.bookedBy,
        cancelledBy,
        cancelledAt: new Date(),
        status: updatedBooking.status,
      },
      room: {
        id: updatedBooking.room.id,
        code: updatedBooking.room.code,
        name: updatedBooking.room.name,
        venue: {
          id: updatedBooking.room.venue.id,
          name: updatedBooking.room.venue.name,
          building: updatedBooking.room.venue.building,
          floor: updatedBooking.room.venue.floor,
        },
      },
    };
  }

  findAll() {
    return { module: 'M05 — Venue & Resource Manager', status: 'ready' };
  }
}
