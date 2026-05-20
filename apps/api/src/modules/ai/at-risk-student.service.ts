// @ts-nocheck
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AtRiskStudentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Analyze student performance and identify at-risk students
   * Uses multiple factors: grades, attendance, course progression, etc.
   */
  async analyzeAtRiskStudents(
    filters: {
      programmeId?: string;
      semesterId?: string;
      riskThreshold?: number; // 0-100, higher = more at-risk
    } = {}
  ): Promise<any> {
    const { programmeId, semesterId, riskThreshold = 60 } = filters;

    // Get students with their academic data
    const students = await this.prisma.student.findMany({
      where: {
        programmeId,
        isActive: true,
      },
      include: {
        user: true,
        programme: true,
        academicPlan: {
          include: {
            semesters: {
              include: {
                plannedCourses: {
                  include: {
                    course: true,
                  },
                },
              },
            },
          },
        },
        examResults: {
          include: {
            courseOffering: {
              include: {
                course: true,
              },
            },
          },
          orderBy: {
            releasedAt: 'desc',
          },
        },
        enrolments: {
          where: {
            isDropped: false,
          },
          include: {
            courseOffering: {
              include: {
                course: true,
                semester: true,
              },
            },
            section: true,
          },
        },
      },
    });

    const atRiskAnalysis = [];

    for (const student of students) {
      const riskScore = this.calculateRiskScore(student);
      const riskLevel = this.getRiskLevel(riskScore);

      if (riskScore >= riskThreshold) {
        const riskFactors = this.identifyRiskFactors(student);
        const recommendations = this.generateRecommendations(student, riskFactors);

        atRiskAnalysis.push({
          student: {
            id: student.id,
            studentId: student.studentId,
            name: student.user?.name || 'Unknown',
            email: student.user?.email || '',
            programme: {
              id: student.programme.id,
              name: student.programme.name,
              code: student.programme.code,
            },
            currentSemester: student.currentSemester,
            totalCreditsEarned: student.totalCreditsEarned,
            cumulativeGpa: student.cumulativeGpa,
          },
          riskScore: Number(riskScore.toFixed(2)),
          riskLevel,
          riskFactors,
          recommendations,
          academicStatus: {
            currentGpa: this.calculateCurrentSemesterGpa(student),
            creditsThisSemester: this.calculateCreditsThisSemester(student),
            coursesFailedThisSemester: this.countFailedCoursesThisSemester(student),
          },
        });
      }
    }

    // Sort by risk score descending
    atRiskAnalysis.sort((a, b) => b.riskScore - a.riskScore);

    return {
      analysisDate: new Date(),
      totalStudentsAnalyzed: students.length,
      atRiskStudentsCount: atRiskAnalysis.length,
      atRiskPercentage: students.length > 0 ? (atRiskAnalysis.length / students.length) * 100 : 0,
      atRiskStudents: atRiskAnalysis,
      summary: {
        highRisk: atRiskAnalysis.filter(s => s.riskLevel === 'HIGH').length,
        mediumRisk: atRiskAnalysis.filter(s => s.riskLevel === 'MEDIUM').length,
        lowRisk: atRiskAnalysis.filter(s => s.riskLevel === 'LOW').length,
      },
    };
  }

  /**
   * Calculate risk score for a student based on multiple factors
   * Returns a score from 0-100 (higher = more at-risk)
   */
  private calculateRiskScore(student: any): number {
    let score = 0;
    const weights = {
      gpa: 0.25,           // 25% weight
      failedCourses: 0.20, // 20% weight
      creditDeficit: 0.20, // 20% weight
      progression: 0.15,   // 15% weight
      withdrawal: 0.10,    // 10% weight
      engagement: 0.10,    // 10% weight
    };

    // GPA factor (lower GPA = higher risk)
    const gpaFactor = student.cumulativeGpa < 2.0
      ? (2.0 - student.cumulativeGpa) * 25 // Scale 0-2.0 GPA to 0-50 points
      : 0;
    score += Math.min(gpaFactor, 25) * weights.gpa;

    // Failed courses factor
    const failedCourses = this.countTotalFailedCourses(student);
    const failedCoursesFactor = Math.min(failedCourses * 10, 20); // Max 20 points
    score += failedCoursesFactor * weights.failedCourses;

    // Credit deficit factor (compared to expected progress)
    const creditDeficit = this.calculateCreditDeficit(student);
    const creditDeficitFactor = Math.min(creditDeficit / 5, 20); // Max 20 points
    score += creditDeficitFactor * weights.creditDeficit;

    // Academic progression factor (are they on track for graduation?)
    const progressionFactor = this.calculateProgressionRisk(student);
    score += progressionFactor * weights.progression;

    // Course withdrawal/drop factor
    const withdrawalFactor = this.calculateWithdrawalRisk(student);
    score += withdrawalFactor * weights.withdrawal;

    // Engagement factor
    const engagementFactor = this.calculateEngagementRisk(student);
    score += engagementFactor * weights.engagement;

    return Math.min(score, 100); // Cap at 100
  }

  /**
   * Identify specific risk factors for a student
   */
  private identifyRiskFactors(student: any): any[] {
    const factors = [];

    if (student.cumulativeGpa < 2.0) {
      factors.push({
        type: 'LOW_GPA',
        severity: student.cumulativeGpa < 1.5 ? 'HIGH' : 'MEDIUM',
        description: `Cumulative GPA of ${student.cumulativeGpa.toFixed(2)} is below 2.0 threshold`,
        value: student.cumulativeGpa,
        threshold: 2.0
      });
    }

    const failedCourses = this.countTotalFailedCourses(student);
    if (failedCourses > 0) {
      factors.push({
        type: 'FAILED_COURSES',
        severity: failedCourses >= 3 ? 'HIGH' : failedCourses >= 2 ? 'MEDIUM' : 'LOW',
        description: `Student has failed ${failedCourses} course(s)`,
        value: failedCourses,
        threshold: 0
      });
    }

    const creditDeficit = this.calculateCreditDeficit(student);
    if (creditDeficit > 10) { // More than half a semester behind
      factors.push({
        type: 'CREDIT_DEFICIT',
        severity: creditDeficit >= 20 ? 'HIGH' : 'MEDIUM',
        description: `Student is ${creditDeficit} credits behind expected progress`,
        value: creditDeficit,
        threshold: 10
      });
    }

    const withdrawalRisk = this.calculateWithdrawalRisk(student);
    if (withdrawalRisk > 0) {
      factors.push({
        type: 'WITHDRAWAL_RISK',
        severity: withdrawalRisk >= 2 ? 'HIGH' : 'MEDIUM',
        description: `Student has withdrawn from or dropped ${withdrawalRisk} course(s)`,
        value: withdrawalRisk,
        threshold: 0
      });
    }

    // Check for prerequisite issues
    const prerequisiteIssues = this.checkPrerequisiteIssues(student);
    if (prerequisiteIssues.length > 0) {
      factors.push({
        type: 'PREREQUISITE_ISSUES',
        severity: 'MEDIUM',
        description: `Student has ${prerequisiteIssues.length} prerequisite-related issues`,
        value: prerequisiteIssues.length,
        threshold: 0
      });
    }

    return factors;
  }

  /**
   * Generate personalized intervention recommendations
   */
  private generateRecommendations(student: any, risk_factors: any[]): any[] {
    const recommendations = [];

    // GPA-related recommendations
    const gpa_factor = risk_factors.find(f => f.type === 'LOW_GPA');
    if (gpa_factor) {
      recommendations.push({
        category: 'ACADEMIC_SUPPORT',
        priority: gpa_factor.severity === 'HIGH' ? 'HIGH' : 'MEDIUM',
        action: 'Enroll in academic tutoring program',
        description: 'Provide weekly tutoring sessions for courses with grades below C',
        resources: ['Tutoring Center', 'Study Groups', 'Office Hours']
      });

      recommendations.push({
        category: 'COURSE_SELECTION',
        priority: 'MEDIUM',
        action: 'Reduce course load for next semester',
        description: 'Consider taking fewer courses to focus on improving grades',
        resources: ['Academic Advisor', 'Programme Coordinator']
      });
    }

    // Failed courses recommendations
    const failed_factor = risk_factors.find(f => f.type === 'FAILED_COURSES');
    if (failed_factor) {
      recommendations.push({
        category: 'RETAKE_PLANNING',
        priority: 'HIGH',
        action: 'Create structured retake plan for failed courses',
        description: 'Schedule failed courses in upcoming semesters with additional support',
        resources: ['Retake Planning Service', 'Academic Advisor']
      });
    }

    // Credit deficit recommendations
    const credit_factor = risk_factors.find(f => f.type === 'CREDIT_DEFICIT');
    if (credit_factor) {
      recommendations.push({
        category: 'ACCELERATED_LEARNING',
        priority: 'MEDIUM',
        action: 'Consider summer or winter semester courses',
        description: 'Make up missing credits during break periods',
        resources: ['Summer/Winter Session Info', 'Financial Aid Office']
      });
    }

    // Withdrawal recommendations
    const withdrawal_factor = risk_factors.find(f => f.type === 'WITHDRAWAL_RISK');
    if (withdrawal_factor) {
      recommendations.push({
        category: 'ENGAGEMENT_SUPPORT',
        priority: 'HIGH',
        action: 'Schedule meeting with student counselor',
        description: 'Address underlying issues causing course withdrawals',
        resources: ['Student Counseling', 'Academic Advisor', 'Faculty Mentor']
      });
    }

    // Prerequisite recommendations
    const prereq_factor = risk_factors.find(f => f.type === 'PREREQUISITE_ISSUES');
    if (prereq_factor) {
      recommendations.push({
        category: 'PREREQUISITE_SUPPORT',
        priority: 'MEDIUM',
        action: 'Review prerequisite requirements and create study plan',
        description: 'Address knowledge gaps before retaking prerequisite courses',
        resources: ['Prerequisite Workshops', 'Tutoring', 'Study Materials']
      });
    }

    // If no specific factors but still at-risk, give general recommendations
    if (recommendations.length === 0) {
      recommendations.push({
        category: 'MONITORING',
        priority: 'LOW',
        action: 'Regular check-ins with academic advisor',
        description: 'Monitor progress and provide guidance as needed',
        resources: ['Academic Advisor', 'Monthly Progress Reviews']
      });
    }

    return recommendations;
  }

  /**
   * Helper methods
   */
  private countTotalFailedCourses(student: any): number {
    return student.examResults.filter(r => r.gradeStatus === 'FAIL').length;
  }

  private countFailedCoursesThisSemester(student: any): number {
    const current_enrollments = student.enrolments.filter(e => e.semesterId === student.currentSemesterId);
    const current_course_offering_ids = current_enrollments.map(e => e.courseOfferingId);
    return student.examResults.filter(r =>
      current_course_offering_ids.includes(r.courseOfferingId) && r.gradeStatus === 'FAIL'
    ).length;
  }

  private calculateCurrentSemesterGpa(student: any): number {
    // This would need current semester enrolments and results
    // Simplified implementation - in reality would calculate actual current semester GPA
    return student.cumulativeGpa; // Placeholder
  }

  private calculateCreditsThisSemester(student: any): number {
    const current_enrollments = student.enrolments.filter(e => e.semesterId === student.currentSemesterId);
    const passed_enrollments = current_enrollments.filter(e =>
      student.examResults.some(r =>
        r.courseOfferingId === e.courseOfferingId && r.gradeStatus === 'PASS')
    );
    return passed_enrollments.reduce(
      (sum, enrolment) => sum + enrolment.courseOffering.course.creditHours,
      0
    );
  }

  private calculateCreditDeficit(student: any): number {
    // Calculate how many credits behind expected progress student is
    // Expected credits = (current semester - 1) * average credits per semester
    const expected_credits_per_semester = student.programme.totalCredits / 8; // Assuming 8 semesters
    const expected_credits = (student.currentSemester - 1) * expected_credits_per_semester;
    const deficit = expected_credits - student.totalCreditsEarned;
    return Math.max(0, deficit); // Only positive deficit (behind)
  }

  private calculateProgressionRisk(student: any): number {
    // Calculate risk based on progression toward graduation
    if (!student.projectedGraduation) {
      return 15; // Medium risk if no projection
    }

    // Simple heuristic: if projected graduation is too far in future, higher risk
    // In reality, would compare against programme duration
    return 10; // Placeholder
  }

  private calculateWithdrawalRisk(student: any): number {
    // Calculate risk based on course withdrawals/drops
    const withdrawn_count = student.examResults.filter(r => r.gradeStatus === 'WITHDRAWN').length;
    return withdrawn_count;
  }

  private calculateEngagementRisk(student: any): number {
    // Calculate risk based on engagement metrics
    // Placeholder for engagement metrics (logins, participation, etc.)
    // Would integrate with LMS data in real implementation
    return 5; // Low-medium baseline risk
  }

  private checkPrerequisiteIssues(student: any): any[] {
    // Check for prerequisite-related issues
    const issues = [];

    // Check if student is taking courses without meeting prerequisites
    const current_enrollments = student.enrolments.filter(e => !e.isDropped);

    for (const enrolment of current_enrollments) {
      const course_offering = enrolment.courseOffering;
      const course = course_offering.course;

      // Get prerequisites for this course
      const prerequisites = course.prerequisites || [];

      for (const prereq of prerequisites) {
        if (prereq.isMandatory) {
          // Check if student has passed the prerequisite course
          const prereq_passed = student.examResults.some(
            result => result.courseId === prereq.prerequisiteCourseId && result.gradeStatus === 'PASS'
          );

          if (!prereq_passed) {
            issues.push({
              course: course.code,
              missingPrerequisite: prereq.prerequisiteCourse.code,
              severity: 'HIGH'
            });
          }
        }
      }
    }

    return issues;
  }

  private getRiskLevel(score: number): string {
    // Convert numeric score to risk level
    if (score >= 80) {
      return 'HIGH';
    } else if (score >= 60) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  /**
   * Get detailed analysis for a specific at-risk student
   */
  async getAtRiskStudentDetails(studentId: string): Promise<any> {
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

    const risk_score = this.calculateRiskScore(student);
    const risk_level = this.getRiskLevel(risk_score);
    const risk_factors = this.identifyRiskFactors(student);
    const recommendations = this.generateRecommendations(student, risk_factors);

    return {
      student: {
        id: student.id,
        studentId: student.studentId,
        name: student.user.name,
        email: student.user.email,
        programme: {
          id: student.programme.id,
          name: student.programme.name,
          code: student.programme.code
        }
      },
      riskScore: risk_score,
      riskLevel: risk_level,
      riskFactors: risk_factors,
      recommendations: recommendations,
      academicHistory: this.getAcademicHistory(student),
      currentStatus: this.getCurrentStatus(student)
    };
  }

  /**
   * Get student's academic history
   */
  private getAcademicHistory(student: any): any {
    return {
      totalCreditsEarned: student.totalCreditsEarned,
      cumulativeGpa: student.cumulativeGpa,
      semestersCompleted: student.currentSemester - 1,
      examResultsCount: student.examResults.length,
      passedCourses: student.examResults.filter(r => r.gradeStatus === 'PASS').length,
      failedCourses: student.examResults.filter(r => r.gradeStatus === 'FAIL').length,
      withdrawnCourses: student.examResults.filter(r => r.gradeStatus === 'WITHDRAWN').length
    };
  }

  /**
   * Get student's current enrollment status
   */
  private getCurrentStatus(student: any): any {
    const current_enrollments = student.enrolments.filter(e => !e.isDropped);
    return {
      currentSemester: student.currentSemester,
      currentEnrollmentCount: current_enrollments.length,
      currentCourses: current_enrollments.map(e => ({
        courseCode: e.courseOffering.course.code,
        courseName: e.courseOffering.course.name,
        credits: e.courseOffering.course.creditHours,
        section: e.section.sectionCode
      }))
    };
  }

  findAll() {
    return { module: 'At-Risk Student Identification AI', status: 'ready' };
  }
}