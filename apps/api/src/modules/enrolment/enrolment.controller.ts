import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { EnrolmentService } from './enrolment.service';

/**
 * M07 — Enrolment & Registration
 */
@Controller('enrolment')
export class EnrolmentController {
  constructor(private readonly enrolmentService: EnrolmentService) {}

  @Get()
  findAll() {
    return this.enrolmentService.findAll();
  }

  @Get('list')
  async getEnrolments(
    @Body() filters: {
      studentId?: string;
      semesterId?: string;
      courseOfferingId?: string;
      isDropped?: boolean;
    } = {}
  ) {
    return this.enrolmentService.getEnrolments(filters);
  }

  @Get(':enrolmentId')
  async getEnrolment(@Param('enrolmentId') enrolmentId: string) {
    return this.enrolmentService.getEnrolmentById(enrolmentId);
  }

  @Post()
  async createEnrolment(@Body() body: {
    studentId: string;
    semesterId: string;
    courseOfferingId: string;
    sectionId: string;
  }) {
    return this.enrolmentService.createEnrolment(body);
  }

  @Post(':enrolmentId/drop-request')
  async createDropRequest(
    @Param('enrolmentId') enrolmentId: string,
    @Body() body: {
      reason: string;
      studentAcknowledged: boolean;
    }
  ) {
    return this.enrolmentService.dropEnrolment(enrolmentId, body);
  }

  @Post('drop-requests/:dropRequestId/approve')
  async approveDropRequest(
    @Param('dropRequestId') dropRequestId: string,
    @Body() body: {
      approvedBy: string;
    }
  ) {
    return this.enrolmentService.approveDropRequest(dropRequestId, body.approvedBy);
  }

  @Post('drop-requests/:dropRequestId/reject')
  async rejectDropRequest(
    @Param('dropRequestId') dropRequestId: string,
    @Body() body: {
      rejectedBy: string;
    }
  ) {
    return this.enrolmentService.rejectDropRequest(dropRequestId, body.rejectedBy);
  }

  @Get('drop-requests')
  async getDropRequests(
    @Body() filters: {
      studentId?: string;
      status?: string;
    } = {}
  ) {
    return this.enrolmentService.getDropRequests(filters);
  }

  @Get('analytics/:semesterId')
  async getEnrolmentAnalytics(@Param('semesterId') semesterId: string) {
    return this.enrolmentService.getEnrolmentAnalytics(semesterId);
  }
}
