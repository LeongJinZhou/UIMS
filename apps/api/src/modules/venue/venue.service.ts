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

    // In a full implementation, we would check for existing bookings
    // For now, we'll just return a success message
    return {
      message: `Room ${room.code} booked for ${date} from ${startTime} to ${endTime}`,
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
      bookingDetails: {
        date,
        startTime,
        endTime,
        purpose,
        bookedBy,
        bookedAt: new Date(),
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
    // Placeholder - in reality would check existing bookings and maintenance blocks
    const rooms = await this.prisma.room.findMany({
      where: { isActive: true },
      include: {
        venue: true,
        equipment: true,
      },
      take: 10, // Limit for demo
    });

    return {
      date,
      startTime,
      endTime,
      availableRooms: rooms.map(room => ({
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
      message: 'Availability checking placeholder - implement actual booking conflict detection',
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

    // In a full implementation, we would create a maintenance block
    // For now, return placeholder
    return {
      message: `Maintenance scheduled for room ${room.code} from ${startDate} to ${endDate}`,
      room: {
        id: room.id,
        code: room.code,
        name: room.name,
      },
      maintenanceDetails: {
        startDate,
        endDate,
        reason,
        scheduledBy,
        scheduledAt: new Date(),
      },
    };
  }

  findAll() {
    return { module: 'M05 — Venue & Resource Manager', status: 'ready' };
  }
}
