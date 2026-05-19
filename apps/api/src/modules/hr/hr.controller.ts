import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { HrService } from './hr.service';

/**
 * M08 — HR & Lecturer Management
 */
@Controller('hr')
export class HrController {
  constructor(private readonly hrService: HrService) {}

  @Get()
  findAll() {
    return this.hrService.findAll();
  }

  @Get('lecturers')
  async getLecturersWithDetails() {
    return this.hrService.getLecturersWithDetails();
  }

  @Get('lecturers/:lecturerId')
  async getLecturer(@Param('lecturerId') lecturerId: string) {
    return this.hrService.getLecturer(lecturerId);
  }

  @Post('lecturers/:lecturerId/update')
  async updateLecturer(
    @Param('lecturerId') lecturerId: string,
    @Body() body: {
      department?: string;
      contractType?: string;
      maxTeachingLoad?: number;
      isActive?: boolean;
    }
  ) {
    return this.hrService.updateLecturer(lecturerId, body);
  }

  @Get('lecturers/:lecturerId/workload')
  async getLecturerWorkload(@Param('lecturerId') lecturerId: string) {
    return this.hrService.getLecturerWorkload(lecturerId);
  }

  @Get('lecturers/:lecturerId/leave')
  async getLecturerLeaveRecords(@Param('lecturerId') lecturerId: string) {
    return this.hrService.getLecturerLeaveRecords(lecturerId);
  }

  @Post('lecturers/:lecturerId/leave')
  async createLeaveRecord(
    @Param('lecturerId') lecturerId: string,
    @Body() body: {
      leaveType: string;
      startDate: string;
      endDate: string;
      replacementLecturerId?: string;
      status?: string;
    }
  ) {
    return this.hrService.createLeaveRecord(lecturerId, body);
  }

  @Get('lecturers/:lecturerId/availability')
  async getLecturerAvailability(
    @Param('lecturerId') lecturerId: string,
    @Body() body: {
      semesterId: string;
    }
  ) {
    return this.hrService.getLecturerAvailability(lecturerId, body.semesterId);
  }

  @Get('dashboard')
  async getHrDashboard() {
    return this.hrService.getHrDashboard();
  }
}
