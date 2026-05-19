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

  @Get('performance-reviews')
  async getPerformanceReviews(
    @Body() filters: {
      lecturerId?: string;
      status?: string;
      reviewPeriod?: string;
    } = {}
  ) {
    return this.hrService.getPerformanceReviews(filters);
  }

  @Get('performance-reviews/:reviewId')
  async getPerformanceReview(@Param('reviewId') reviewId: string) {
    return this.hrService.getPerformanceReview(reviewId);
  }

  @Post('performance-reviews')
  async createPerformanceReview(
    @Body() body: {
      lecturerId: string;
      reviewPeriod: string;
      reviewerId: string;
      teachingScore?: number;
      researchScore?: number;
      serviceScore?: number;
      leadershipScore?: number;
      comments?: string;
    }
  ) {
    return this.hrService.createPerformanceReview(
      body.lecturerId,
      body
    );
  }

  @Post('performance-reviews/:reviewId/update')
  async updatePerformanceReview(
    @Param('reviewId') reviewId: string,
    @Body() body: {
      teachingScore?: number;
      researchScore?: number;
      serviceScore?: number;
      leadershipScore?: number;
      comments?: string;
      status?: 'DRAFT' | 'PENDING_REVIEW' | 'REVIEWED' | 'FINALIZED';
      reviewedById?: string;
    }
  ) {
    return this.hrService.updatePerformanceReview(reviewId, body);
  }

  @Get('lecturers/:lecturerId/performance-statistics')
  async getLecturerPerformanceStatistics(@Param('lecturerId') lecturerId: string) {
    return this.hrService.getLecturerPerformanceStatistics(lecturerId);
  }

  @Get('dashboard')
  async getHrDashboard() {
    return this.hrService.getHrDashboard();
  }
}
