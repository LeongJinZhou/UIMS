import { Controller, Get, Post, Body, Param, UploadedFile, UseInterceptors } from '@nestjs/common';
import { TimetableService } from './timetable.service';
import { FileInterceptor } from '@nestjs/platform-express';

/**
 * M04 — Timetable Generator
 */
@Controller('timetable')
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @Get()
  findAll() {
    return this.timetableService.findAll();
  }

  @Get(':semesterId/generate')
  async generateTimetable(@Param('semesterId') semesterId: string) {
    return this.timetableService.generateTimetable(semesterId);
  }

  @Get(':timetableId')
  async getTimetable(@Param('timetableId') timetableId: string) {
    return this.timetableService.getTimetable(timetableId);
  }

  @Post(':semesterId/create')
  async createTimetable(
    @Param('semesterId') semesterId: string,
    @Body('generatedBy') generatedBy: string
  ) {
    return this.timetableService.createTimetable(semesterId, generatedBy);
  }

  @Post(':timetableId/approve')
  async updateTimetableApproval(
    @Param('timetableId') timetableId: string,
    @Body() body: { approvalState: string; approvedBy?: string }
  ) {
    return this.timetableService.updateTimetableApproval(
      timetableId,
      body.approvalState,
      body.approvedBy
    );
  }

  @Get(':timetableId/slots')
  async getTimetableSlots(@Param('timetableId') timetableId: string) {
    return this.timetableService.getTimetableSlots(timetableId);
  }

  @Post(':timetableId/slots')
  async createTimetableSlot(
    @Param('timetableId') timetableId: string,
    @Body() body: {
      courseOfferingId: string;
      sectionId: string;
      venueId: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
    }
  ) {
    return this.timetableService.createTimetableSlot(
      timetableId,
      body.courseOfferingId,
      body.sectionId,
      body.venueId,
      body.dayOfWeek,
      body.startTime,
      body.endTime
    );
  }

  @Post(':slotId/cancel')
  async cancelTimetableSlot(
    @Param('slotId') slotId: string,
    @Body('reason') reason: string
  ) {
    return this.timetableService.cancelTimetableSlot(slotId, reason);
  }

  @Get('rooms/available')
  async getAvailableRooms(
    @Body() body: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      excludeRoomIds?: string[];
    }
  ) {
    return this.timetableService.getAvailableRooms(
      body.dayOfWeek,
      body.startTime,
      body.endTime,
      body.excludeRoomIds || []
    );
  }

  @Post('lecturer/availability')
  async checkLecturerAvailability(
    @Body() body: {
      lecturerId: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      semesterId: string;
    }
  ) {
    return this.timetableService.checkLecturerAvailability(
      body.lecturerId,
      body.dayOfWeek,
      body.startTime,
      body.endTime,
      body.semesterId
    );
  }

  @Post('student/conflicts')
  async checkStudentConflicts(
    @Body() body: {
      courseOfferingId: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      semesterId: string;
    }
  ) {
    return this.timetableService.checkStudentConflicts(
      body.courseOfferingId,
      body.dayOfWeek,
      body.startTime,
      body.endTime,
      body.semesterId
    );
  }
}
