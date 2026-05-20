// @ts-nocheck
import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { AppealPreAssessmentService } from './appeal-pre-assessment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';

@Controller('appeals')
export class AppealPreAssessmentController {
  constructor(private readonly appealService: AppealPreAssessmentService) {}

  @Post('assess')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.Student)
  async assessAppeal(@Body() appealData: any) {
    // In a real implementation, we would get studentId from JWT token
    // For now, assuming it's passed in the body or we'd extract from request
    const studentId = appealData.studentId; // This should come from auth context
    if (!studentId) {
      throw new Error('Student ID is required');
    }
    return this.appealService.assessAppealRequest(studentId, appealData);
  }

  @Get('types')
  @UseGuards(JwtAuthGuard)
  getAppealTypes() {
    return [
      { value: 'GRADE_APPEAL', label: 'Grade Appeal' },
      { value: 'PREREQUISITE_WAIVER', label: 'Prerequisite Waiver' },
      { value: 'LATE_WITHDRAWAL', label: 'Late Withdrawal' },
      { value: 'COURSE_SUBSTITUTION', label: 'Course Substitution' },
      { value: 'OTHER', label: 'Other Appeal Type' }
    ];
  }
}