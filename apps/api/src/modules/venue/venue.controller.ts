import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { VenueService } from './venue.service';

/**
 * M05 — Venue & Resource Manager
 */
@Controller('venue')
export class VenueController {
  constructor(private readonly venueService: VenueService) {}

  @Get()
  findAll() {
    return this.venueService.findAll();
  }

  @Get('venues')
  async getVenuesWithDetails() {
    return this.venueService.getVenuesWithDetails();
  }

  @Get(':venueId')
  async getVenue(@Param('venueId') venueId: string) {
    return this.venueService.getVenue(venueId);
  }

  @Get('rooms')
  async getActiveRooms() {
    return this.venueService.getActiveRooms();
  }

  @Get('rooms/:roomId')
  async getRoom(@Param('roomId') roomId: string) {
    return this.venueService.getRoom(roomId);
  }

  @Post('rooms/book')
  async bookRoom(
    @Body() body: {
      roomId: string;
      startTime: string;
      endTime: string;
      date: string;
      purpose: string;
      bookedBy: string;
    }
  ) {
    return this.venueService.bookRoom(
      body.roomId,
      body.startTime,
      body.endTime,
      body.date,
      body.purpose,
      body.bookedBy
    );
  }

  @Get('rooms/available')
  async getRoomAvailability(
    @Body() body: {
      date: string;
      startTime: string;
      endTime: string;
    }
  ) {
    return this.venueService.getRoomAvailability(
      body.date,
      body.startTime,
      body.endTime
    );
  }

  @Get('rooms/:roomId/equipment')
  async getRoomEquipment(@Param('roomId') roomId: string) {
    return this.venueService.getRoomEquipment(roomId);
  }

  @Post('rooms/:roomId/equipment')
  async addRoomEquipment(
    @Param('roomId') roomId: string,
    @Body() body: { type: string; quantity?: number }
  ) {
    return this.venueService.addRoomEquipment(
      roomId,
      body.type,
      body.quantity || 1
    );
  }

  @Post('rooms/:roomId/maintenance')
  async scheduleMaintenance(
    @Param('roomId') roomId: string,
    @Body() body: {
      startDate: string;
      endDate: string;
      reason: string;
      scheduledBy: string;
    }
  ) {
    return this.venueService.scheduleMaintenance(
      roomId,
      body.startDate,
      body.endDate,
      body.reason,
      body.scheduledBy
    );
  }

  @Get('rooms/:roomId/maintenance')
  async getRoomMaintenanceSchedule(
    @Param('roomId') roomId: string,
    @Body() body: {
      startDate?: string;
      endDate?: string;
    }
  ) {
    return this.venueService.getRoomMaintenanceSchedule(
      roomId,
      body.startDate,
      body.endDate
    );
  }

  @Get('rooms/:roomId/bookings')
  async getRoomBookingCalendar(
    @Param('roomId') roomId: string,
    @Body() body: {
      startDate?: string;
      endDate?: string;
    }
  ) {
    return this.venueService.getRoomBookingCalendar(
      roomId,
      body.startDate,
      body.endDate
    );
  }

  @Post('rooms/bookings/:bookingId/cancel')
  async cancelRoomBooking(
    @Param('bookingId') bookingId: string,
    @Body() body: {
      reason: string;
      cancelledBy: string;
    }
  ) {
    return this.venueService.cancelRoomBooking(
      bookingId,
      body.reason,
      body.cancelledBy
    );
  }
}
