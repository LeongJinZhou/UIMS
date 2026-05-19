import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AppealPreAssessmentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Assess an appeal request and provide pre-assessment guidance
   * Helps students understand likelihood of success and required documentation
   */
  async assessAppealRequest(
    studentId: string,
    appealData: {
      appealType: string; // e.g., 'GRADE_APPEAL', 'PREREQUISITE_WAIVER', 'LATE_WITHDRAWAL'
      description: string;
      supportingDocuments?: string[]; // List of document IDs or descriptions
      courseId?: string;
      semesterId?: string;
    }
  ): Promise<any> {
    // Validate student exists
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: true,
        programme: true,
        academicPlan: {
          include: {
            semesters: {
              include: {
                plannedCourses: {
                  include: {
                    course: true
                  }
                }
              }
            }
          }
        },
        examResults: {
          include: {
            courseOffering: {
              include: {
                course: true
              }
            }
          },
          orderBy: {
            releasedAt: 'desc'
          }
        },
        enrolments: {
          where: {
            isDropped: false
          },
          include: {
            courseOffering: {
              include: {
                course: true,
                semester: true
              }
            },
            section: true
          }
        }
      }
    });

    if (!student) {
      throw new NotFoundException(`Student not found: ${studentId}`);
    }

    // Perform appeal assessment based on type
    let assessmentResult;
    switch (appealData.appealType.toUpperCase()) {
      case 'GRADE_APPEAL':
        assessmentResult = await this.assessGradeAppeal(student, appealData);
        break;
      case 'PREREQUISITE_WAIVER':
        assessmentResult = await this.assessPrerequisiteWaiver(student, appealData);
        break;
      case 'LATE_WITHDRAWAL':
        assessmentResult = await this.assessLateWithdrawal(student, appealData);
        break;
      case 'COURSE_SUBSTITUTION':
        assessmentResult = await this.assessCourseSubstitution(student, appealData);
        break;
      default:
        assessmentResult = await this.assessGeneralAppeal(student, appealData);
    }

    return {
      appealId: `APPEAL_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      studentId: student.studentId,
      appealType: appealData.appealType,
      assessmentDate: new Date(),
      ...assessmentResult
    };
  }

  /**
   * Assess grade appeal request
   */
  private async assessGradeAppeal(student: any, appealData: any): Promise<any> {
    // Find the specific course offering and exam result
    let targetExamResult = null;
    if (appealData.courseId) {
      targetExamResult = student.examResults.find(r =>
        r.courseOffering.course.id === appealData.courseId &&
        r.courseOffering.semester.id === appealData.semesterId
      );
    } else {
      // Most recent exam result
      targetExamResult = student.examResults[0];
    }

    if (!targetExamResult) {
      return {
        eligibility: 'NOT_ELIGIBLE',
        successLikelihood: 'LOW',
        message: 'No exam results found for the specified course/semester',
        requiredDocuments: [],
        recommendations: ['Verify course and semester details', 'Ensure exam results are published']
      };
    }

    // Check if grade is appealable (typically only FAIL or borderline grades)
    const isAppealable = targetExamResult.gradeStatus === 'FAIL' ||
                        ['D+', 'D'].includes(targetExamResult.grade);

    let successLikelihood = 'LOW';
    let message = '';
    const requiredDocuments = [];
    const recommendations = [];

    if (!isAppealable) {
      message = `Grade ${targetExamResult.grade} in ${targetExamResult.courseOffering.course.code} is not typically eligible for grade appeal`;
      requiredDocuments.push('Course syllabus and grading rubric');
      requiredDocuments.push('All graded assignments and feedback');
      recommendations.push('Consider speaking with lecturer about grade concerns');
      recommendations.push('Request detailed feedback on assessment items');
    } else {
      // Analyze factors that affect grade appeal success
      const factors = this.analyzeGradeAppealFactors(student, targetExamResult, appealData);

      if (factors.supportingEvidence >= 3) {
        successLikelihood = 'HIGH';
        message = 'Strong case for grade appeal based on available evidence';
      } else if (factors.supportingEvidence >= 2) {
        successLikelihood = 'MEDIUM';
        message = 'Moderate case for grade appeal';
      } else {
        successLikelihood = 'LOW';
        message = 'Weak case for grade appeal - consider gathering more evidence';
      }

      requiredDocuments.push('Detailed grading rubric for the assessment');
      requiredDocuments.push('Copy of your submitted work with lecturer feedback');
      requiredDocuments.push('Course syllabus outlining assessment criteria');

      if (factors.missingFeedback) {
        recommendations.push('Request detailed feedback from lecturer on all assessment components');
      }
      if (factors.lowParticipation) {
        recommendations.push('Document any extenuating circumstances that affected participation');
      }
      recommendations.push('Review lecturer office hours and schedule a meeting');
      recommendations.push('Consider seeking advice from academic advisor');
    }

    return {
      eligibility: isAppealable ? 'ELIGIBLE' : 'NOT_ELIGIBLE',
      successLikelihood,
      message,
      courseInfo: {
        courseCode: targetExamResult.courseOffering.course.code,
        courseName: targetExamResult.courseOffering.course.name,
        semester: targetExamResult.courseOffering.semester.label,
        grade: targetExamResult.grade,
        assessmentDate: targetExamResult.releasedAt
      },
      requiredDocuments,
      recommendations,
      factors: {
        supportingEvidence: factors.supportingEvidence,
        missingFeedback: factors.missingFeedback,
        lowParticipation: factors.lowParticipation
      }
    };
  }

  /**
   * Assess prerequisite waiver request
   */
  private async assessPrerequisiteWaiver(student: any, appealData: any): Promise<any> {
    if (!appealData.courseId) {
      return {
        eligibility: 'NOT_ELIGIBLE',
        successLikelihood: 'LOW',
        message: 'Course ID is required for prerequisite waiver assessment',
        requiredDocuments: [],
        recommendations: ['Specify the course for which you are seeking prerequisite waiver']
      };
    }

    // Find the target course
    const targetCourse = await this.prisma.course.findFirst({
      where: {
        id: appealData.courseId,
        programmeId: student.programmeId,
        isActive: true
      },
      include: {
        prerequisites: {
          include: {
            prerequisiteCourse: true
          }
        }
      }
    });

    if (!targetCourse) {
      return {
        eligibility: 'NOT_ELIGIBLE',
        successLikelihood: 'LOW',
        message: 'Course not found in your programme',
        requiredDocuments: [],
        recommendations: ['Verify course code and ensure it is part of your programme']
      };
    }

    // Check if course has prerequisites
    if (!targetCourse.prerequisites || targetCourse.prerequisites.length === 0) {
      return {
        eligibility: 'NOT_APPLICABLE',
        successLikelihood: 'N/A',
        message: 'Course has no prerequisites - waiver not required',
        requiredDocuments: [],
        recommendations: ['You can enroll in this course without prerequisites']
      };
    }

    // Check which prerequisites are missing
    const missingPrerequisites = [];
    const metPrerequisites = [];

    for (const prereq of targetCourse.prerequisites) {
      const prereqMet = student.examResults.some(
        result => result.courseId === prereq.prerequisiteCourseId &&
                 result.gradeStatus === 'PASS'
      );

      if (prereqMet) {
        metPrerequisites.push({
          courseCode: prereq.prerequisiteCourse.code,
          courseName: prereq.prerequisiteCourse.name
        });
      } else {
        missingPrerequisites.push({
          courseCode: prereq.prerequisiteCourse.code,
          courseName: prereq.prerequisiteCourse.name,
          isMandatory: prereq.isMandatory
        });
      }
    }

    // Assess eligibility based on university policy
    let eligibility = 'NOT_ELIGIBLE';
    let successLikelihood = 'LOW';
    let message = '';
    const requiredDocuments = [];
    const recommendations = [];

    // Check for alternative evidence of prerequisite knowledge
    const alternativeEvidence = this.assessAlternativeEvidence(student, missingPrerequisites);

    if (missingPrerequisites.length === 0) {
      eligibility = 'NOT_APPLICABLE';
      successLikelihood = 'N/A';
      message = 'All prerequisites have been met - waiver not required';
    } else if (alternativeEvidence.strongEvidence.length >= 2) {
      eligibility = 'ELIGIBLE_WITH_CONDITIONS';
      successLikelihood = 'MEDIUM';
      message = 'Some alternative evidence of prerequisite knowledge exists';
      requiredDocuments.push('Official transcripts or certificates');
      requiredDocuments.push('Portfolio of relevant work or projects');
      recommendations.push('Consider taking a placement test if available');
      recommendations.push('Provide detailed syllabi of alternative learning experiences');
    } else {
      eligibility = 'NOT_ELIGIBLE';
      successLikelihood = 'LOW';
      message = 'Insufficient evidence to support prerequisite waiver';
      requiredDocuments.push('Detailed explanation of alternative learning');
      requiredDocuments.push('Evidence of equivalent knowledge or experience');
      recommendations.push('Consider completing prerequisite courses first');
      recommendations.push('Explore bridge courses or preparatory modules');
    }

    return {
      eligibility,
      successLikelihood,
      message,
      courseInfo: {
        courseCode: targetCourse.code,
        courseName: targetCourse.name,
        prerequisites: targetCourse.prerequisites.map(p => ({
          courseCode: p.prerequisiteCourse.code,
          courseName: p.prerequisiteCourse.name,
          isMandatory: p.isMandatory
        }))
      },
      metPrerequisites,
      missingPrerequisites,
      alternativeEvidence: {
        strongEvidence: alternativeEvidence.strongEvidence,
        moderateEvidence: alternativeEvidence.moderateEvidence
      },
      requiredDocuments,
      recommendations
    };
  }

  /**
   * Assess late withdrawal request
   */
  private async assessLateWithdrawal(student: any, appealData: any): Promise<any> {
    if (!appealData.courseId || !appealData.semesterId) {
      return {
        eligibility: 'NOT_ELIGIBLE',
        successLikelihood: 'LOW',
        message: 'Course ID and Semester ID are required for late withdrawal assessment',
        requiredDocuments: [],
        recommendations: ['Specify both course and semester for the withdrawal request']
      };
    }

    // Find the enrollment
    const enrollment = student.enrolments.find(e =>
      e.courseOffering.course.id === appealData.courseId &&
      e.courseOffering.semester.id === appealData.semesterId &&
      !e.isDropped
    );

    if (!enrollment) {
      return {
        eligibility: 'NOT_ELIGIBLE',
        successLikelihood: 'LOW',
        message: 'No active enrollment found for the specified course/semester',
        requiredDocuments: [],
        recommendations: ['Verify you are currently enrolled in the course', 'Check enrollment status in student portal']
      };
    }

    // Check current date vs withdrawal deadline
    // In reality, would check against academic calendar
    const isPastDeadline = true; // Assume past deadline for assessment

    if (!isPastDeadline) {
      return {
        eligibility: 'NOT_APPLICABLE',
        successLikelihood: 'N/A',
        message: 'Withdrawal deadline has not passed - use standard withdrawal process',
        requiredDocuments: [],
        recommendations: ['Use standard course withdrawal procedure via student portal']
      };
    }

    // Assess grounds for late withdrawal
    const grounds = this.assessLateWithdrawalGrounds(appealData.description);
    const successLikelihood = this.calculateWithdrawalSuccessLikelihood(grounds);

    let message = '';
    const requiredDocuments = [];
    const recommendations = [];

    if (grounds.length === 0) {
      message = 'No valid grounds for late withdrawal identified in your description';
      requiredDocuments.push('Detailed explanation of circumstances preventing timely withdrawal');
    } else {
      message = `Identified ${grounds.length} potential ground(s) for late withdrawal`;

      // Add document requirements based on grounds
      if (grounds.includes('MEDICAL')) {
        requiredDocuments.push('Medical certificate from licensed practitioner');
        requiredDocuments.push('Letter detailing how condition affected ability to withdraw');
      }
      if (grounds.includes('GRIEVANCE')) {
        requiredDocuments.push('Formal grievance documentation');
        requiredDocuments.push('Evidence of attempted resolution through official channels');
      }
      if (grounds.includes('ERROR')) {
        requiredDocuments.push('Evidence of administrative or system error');
        requiredDocuments.push('Communication records showing the error');
      }

      recommendations.push('Contact student services for guidance on late withdrawal process');
      recommendations.push('Schedule meeting with academic advisor to discuss implications');
      recommendations.push('Gather all supporting documentation before submitting formal appeal');
    }

    return {
      eligibility: grounds.length > 0 ? 'ELIGIBLE' : 'NOT_ELIGIBLE',
      successLikelihood,
      message,
      courseInfo: {
        courseCode: enrollment.courseOffering.course.code,
        courseName: enrollment.courseOffering.course.name,
        semester: enrollment.courseOffering.semester.label,
        enrollmentDate: enrollment.enrolledAt,
        credits: enrollment.courseOffering.course.creditHours
      },
      grounds,
      requiredDocuments,
      recommendations
    };
  }

  /**
   * Assess course substitution request
   */
  private async assessCourseSubstitution(student: any, appealData: any): Promise<any> {
    if (!appealData.courseId) {
      return {
        eligibility: 'NOT_ELIGIBLE',
        successLikelihood: 'LOW',
        message: 'Course ID is required for course substitution assessment',
        requiredDocuments: [],
        recommendations: ['Specify the course you wish to substitute']
      };
    }

    // Find the target course (the one wanting to substitute)
    const targetCourse = await this.prisma.course.findFirst({
      where: {
        id: appealData.courseId,
        programmeId: student.programmeId,
        isActive: true
      }
    });

    if (!targetCourse) {
      return {
        eligibility: 'NOT_ELIGIBLE',
        successLikelihood: 'LOW',
        message: 'Course not found in your programme',
        requiredDocuments: [],
        recommendations: ['Verify course code and ensure it is part of your programme']
      };
    }

    // Find alternative course mentioned in appeal data or suggest alternatives
    // For now, we'll check if student has completed any equivalent courses
    const completedCourses = student.examResults
      .filter(r => r.gradeStatus === 'PASS')
      .map(r => r.courseId);

    const equivalentCourses = await this.findEquivalentCourses(targetCourse, completedCourses);

    let eligibility = 'NOT_ELIGIBLE';
    let successLikelihood = 'LOW';
    let message = '';
    const requiredDocuments = [];
    const recommendations = [];

    if (equivalentCourses.length > 0) {
      eligibility = 'ELIGIBLE_WITH_REVIEW';
      successLikelihood = 'MEDIUM';
      message = `Found ${equivalentCourses.length} potentially equivalent courses in your academic record`;

      requiredDocuments.push('Syllabus of completed equivalent course');
      requiredDocuments.push('Official transcript showing course completion and grade');
      requiredDocuments.push('Detailed comparison of learning outcomes between courses');

      recommendations.push('Provide detailed syllabi for both courses');
      recommendations.push('Highlight similarities in learning outcomes, assessment methods, and content');
      recommendations.push('Consult with programme coordinator about substitution process');
    } else {
      message = 'No equivalent courses found in your academic record';
      requiredDocuments.push('Syllabus of proposed substitute course');
      requiredDocuments.push('Evidence of learning from alternative sources (MOOCs, certifications, etc.)');
      recommendations.push('Identify alternative courses that cover similar learning outcomes');
      recommendations.push('Gather evidence of equivalent learning experience');
      recommendations.push('Prepare detailed justification for substitution request');
    }

    return {
      eligibility,
      successLikelihood,
      message,
      targetCourse: {
        courseCode: targetCourse.code,
        courseName: targetCourse.name,
        creditHours: targetCourse.creditHours
      },
      equivalentCourses: equivalentCourses.map(course => ({
        courseCode: course.code,
        courseName: course.name,
        creditHours: course.creditHours,
        grade: student.examResults.find(r => r.courseId === course.id)?.grade || 'Unknown'
      })),
      requiredDocuments,
      recommendations
    };
  }

  /**
   * Assess general appeal request (fallback)
   */
  private async assessGeneralAppeal(student: any, appealData: any): Promise<any> {
    return {
      eligibility: 'REQUIRES_REVIEW',
      successLikelihood: 'UNKNOWN',
      message: `Appeal type '${appealData.appealType}' requires manual review by appeals committee`,
      requiredDocuments: [
        'Detailed written explanation of the appeal grounds',
        'All relevant supporting documentation',
        'Any relevant policies or precedents being referenced'
      ],
      recommendations: [
        'Consult the student handbook for appeal procedures and deadlines',
        'Contact student services for guidance on the specific appeal type',
        'Consider seeking advice from academic advisor or programme coordinator',
        'Ensure all documentation is organized and clearly labeled'
      ]
    };
  }

  /**
   * Helper methods for grade appeal assessment
   */
  private analyzeGradeAppealFactors(student: any, examResult: any, appealData: any): any {
    // Analyze factors that influence grade appeal success
    let supportingEvidence = 0;
    let missingFeedback = false;
    let lowParticipation = false;

    // Check for evidence of grading inconsistencies
    if (appealData.description &&
        (appealData.description.includes('rubric') ||
         appealData.description.includes('marking') ||
         appealData.description.includes('consistent'))) {
      supportingEvidence++;
    }

    // Check for evidence of unmarked work
    if (appealData.description &&
        (appealData.description.includes('unmarked') ||
         appealData.description.includes('missing') ||
         appealData.description.includes('not graded'))) {
      supportingEvidence++;
      missingFeedback = true;
    }

    // Check for evidence of extenuating circumstances
    if (appealData.description &&
        (appealData.description.includes('extenuating') ||
         appealData.description.includes('circumstances') ||
         appealData.description.includes('medical') ||
         appealData.description.includes('personal'))) {
      supportingEvidence++;
    }

    // Simple heuristic for participation - in reality would check LMS data
    if (Math.random() > 0.7) { // 30% chance of low participation flag
      lowParticipation = true;
    }

    return { supportingEvidence, missingFeedback, lowParticipation };
  }

  /**
   * Helper methods for prerequisite waiver assessment
   */
  private assessAlternativeEvidence(student: any, missingPrerequisites: any[]): any {
    const strongEvidence = [];
    const moderateEvidence = [];

    // Check for advanced placement or transfer credits
    // In reality, would check specific tables for alternative credits
    if (Math.random() > 0.5) {
      strongEvidence.push('Advanced placement or transfer credits');
    }

    // Check for relevant work experience
    if (Math.random() > 0.6) {
      moderateEvidence.push('Relevant professional experience');
    }

    // Check for self-study or online course completion
    if (Math.random() > 0.7) {
      moderateEvidence.push('Completed relevant online courses or certifications');
    }

    return { strongEvidence, moderateEvidence };
  }

  /**
   * Helper methods for late withdrawal assessment
   */
  private assessLateWithdrawalGrounds(description: string): string[] {
    const grounds = [];
    const lowerDesc = description.toLowerCase();

    if (lowerDesc.includes('medical') || lowerDesc.includes('health') ||
        lowerDesc.includes('illness') || lowerDesc.includes('hospital')) {
      grounds.push('MEDICAL');
    }

    if (lowerDesc.includes('grievance') || lowerDesc.includes('complaint') ||
        lowerDesc.includes('discrimination') || lowerDesc.includes('harassment')) {
      grounds.push('GRIEVANCE');
    }

    if (lowerDesc.includes('error') || lowerDesc.includes('mistake') ||
        lowerDesc.includes('admin') || lowerDesc.includes('system')) {
      grounds.push('ERROR');
    }

    if (lowerDesc.includes('financial') || lowerDesc.includes('money') ||
        lowerDesc.includes('payment') || lowerDesc.includes('fees')) {
      grounds.push('FINANCIAL');
    }

    return grounds;
  }

  private calculateWithdrawalSuccessLikelihood(grounds: string[]): string {
    if (grounds.length === 0) return 'LOW';
    if (grounds.includes('MEDICAL') || grounds.includes('GRIEVANCE')) return 'HIGH';
    if (grounds.includes('ERROR') || grounds.includes('FINANCIAL')) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Helper methods for course substitution assessment
   */
  private async findEquivalentCourses(targetCourse: any, completedCourseIds: string[]): Promise<any[]> {
    // In reality, would check course equivalency tables or learning outcome mappings
    // For now, return empty array as placeholder
    return [];
  }

  findAll() {
    return { module: 'Appeal Pre-Assessment AI Assistance', status: 'ready' };
  }
}