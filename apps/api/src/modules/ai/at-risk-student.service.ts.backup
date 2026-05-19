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

    # ENGAGEMENT FACTOR
    engagementFactor = self.calculateEngagementRisk(student)
    score += engagementFactor * weights['engagement']

    return Math.min(score, 100); # Cap at 100
  }

  # IDENTIFY RISK FACTORS
  def identifyRiskFactors(self, student):
      """Identify specific risk factors for a student"""
      factors = []

      if student.cumulativeGpa < 2.0:
          factors.append({
              'type': 'LOW_GPA',
              'severity': 'HIGH' if student.cumulativeGpa < 1.5 else 'MEDIUM',
              'description': f'Cumulative GPA of {student.cumulativeGpa:.2f} is below 2.0 threshold',
              'value': student.cumulativeGpa,
              'threshold': 2.0
          })

      failed_courses = self.countTotalFailedCourses(student)
      if failed_courses > 0:
          factors.append({
              'type': 'FAILED_COURSES',
              'severity': 'HIGH' if failed_courses >= 3 else 'MEDIUM' if failed_courses >= 2 else 'LOW',
              'description': f'Student has failed {failed_courses} course(s)',
              'value': failed_courses,
              'threshold': 0
          })

      credit_deficit = self.calculateCreditDeficit(student)
      if credit_deficit > 10:  # More than half a semester behind
          factors.append({
              'type': 'CREDIT_DEFICIT',
              'severity': 'HIGH' if credit_deficit >= 20 else 'MEDIUM',
              'description': f'Student is {credit_deficit} credits behind expected progress',
              'value': credit_deficit,
              'threshold': 10
          })

      withdrawal_risk = self.calculateWithdrawalRisk(student)
      if withdrawal_risk > 0:
          factors.append({
              'type': 'WITHDRAWAL_RISK',
              'severity': 'HIGH' if withdrawal_risk >= 2 else 'MEDIUM',
              'description': f'Student has withdrawn from or dropped {withdrawal_risk} course(s)',
              'value': withdrawal_risk,
              'threshold': 0
          })

      # Check for prerequisite issues
      prerequisite_issues = self.checkPrerequisiteIssues(student)
      if prerequisite_issues:
          factors.append({
              'type': 'PREREQUISITE_ISSUES',
              'severity': 'MEDIUM',
              'description': f'Student has {len(prerequisite_issues)} prerequisite-related issues',
              'value': len(prerequisite_issues),
              'threshold': 0
          })

      return factors

  # GENERATE RECOMMENDATIONS
  def generateRecommendations(self, student, risk_factors):
      """Generate personalized intervention recommendations"""
      recommendations = []

      # GPA-related recommendations
      gpa_factor = next((f for f in risk_factors if f['type'] == 'LOW_GPA'), None)
      if gpa_factor:
          recommendations.append({
              'category': 'ACADEMIC_SUPPORT',
              'priority': 'HIGH' if gpa_factor['severity'] == 'HIGH' else 'MEDIUM',
              'action': 'Enroll in academic tutoring program',
              'description': 'Provide weekly tutoring sessions for courses with grades below C',
              'resources': ['Tutoring Center', 'Study Groups', 'Office Hours']
          })

          recommendations.append({
              'category': 'COURSE_SELECTION',
              'priority': 'MEDIUM',
              'action': 'Reduce course load for next semester',
              'description': 'Consider taking fewer courses to focus on improving grades',
              'resources': ['Academic Advisor', 'Programme Coordinator']
          })

      # Failed courses recommendations
      failed_factor = next((f for f in risk_factors if f['type'] == 'FAILED_COURSES'), None)
      if failed_factor:
          recommendations.append({
              'category': 'RETAKE_PLANNING',
              'priority': 'HIGH',
              'action': 'Create structured retake plan for failed courses',
              'description': 'Schedule failed courses in upcoming semesters with additional support',
              'resources': ['Retake Planning Service', 'Academic Advisor']
          })

      # Credit deficit recommendations
      credit_factor = next((f for f in risk_factors if f['type'] == 'CREDIT_DEFICIT'), None)
      if credit_factor:
          recommendations.append({
              'category': 'ACCELERATED_LEARNING',
              'priority': 'MEDIUM',
              'action': 'Consider summer or winter semester courses',
              'description': 'Make up missing credits during break periods',
              'resources': ['Summer/Winter Session Info', 'Financial Aid Office']
          })

      # Withdrawal recommendations
      withdrawal_factor = next((f for f in risk_factors if f['type'] == 'WITHDRAWAL_RISK'), None)
      if withdrawal_factor:
          recommendations.append({
              'category': 'ENGAGEMENT_SUPPORT',
              'priority': 'HIGH',
              'action': 'Schedule meeting with student counselor',
              'description': 'Address underlying issues causing course withdrawals',
              'resources': ['Student Counseling', 'Academic Advisor', 'Faculty Mentor']
          })

      # Prerequisite recommendations
      prereq_factor = next((f for f in risk_factors if f['type'] == 'PREREQUISITE_ISSUES'), None)
      if prereq_factor:
          recommendations.append({
              'category': 'PREREQUISITE_SUPPORT',
              'priority': 'MEDIUM',
              'action': 'Review prerequisite requirements and create study plan',
              'description': 'Address knowledge gaps before retaking prerequisite courses',
              'resources': ['Prerequisite Workshops', 'Tutoring', 'Study Materials']
          })

      # If no specific factors but still at-risk, give general recommendations
      if not recommendations:
          recommendations.append({
              'category': 'MONITORING',
              'priority': 'LOW',
              'action': 'Regular check-ins with academic advisor',
              'description': 'Monitor progress and provide guidance as needed',
              'resources': ['Academic Advisor', 'Monthly Progress Reviews']
          })

      return recommendations

  # HELPER METHODS
  def countTotalFailedCourses(self, student):
      """Count total number of failed courses"""
      return len([r for r in student.examResults if r.gradeStatus == 'FAIL'])

  def countFailedCoursesThisSemester(self, student):
      """Count failed courses in current semester"""
      current_enrollments = [e for e in student.enrolments if e.semesterId == getattr(student, 'currentSemesterId', None)]
      current_course_offering_ids = [e.courseOfferingId for e in current_enrollments]
      failed_this_semester = [
          r for r in student.examResults
          if r.courseOfferingId in current_course_offering_ids and r.gradeStatus == 'FAIL'
      ]
      return len(failed_this_semester)

  def calculateCurrentSemesterGpa(self, student):
      """Calculate GPA for current semester only"""
      # This would need current semester enrolments and results
      # Simplified implementation
      return student.cumulativeGpa  # Placeholder

  def calculateCreditsThisSemester(self, student):
      """Calculate credits earned in current semester"""
      current_enrollments = [e for e in student.enrolments if e.semesterId == getattr(student, 'currentSemesterId', None)]
      passed_enrollments = [
          e for e in current_enrollments
          if any(r.courseOfferingId == e.courseOfferingId and r.gradeStatus == 'PASS'
                for r in student.examResults)
      ]
      return sum(
          e.courseOffering.course.creditHours
          for e in passed_enrollments
      )

  def calculateCreditDeficit(self, student):
      """Calculate how many credits behind expected progress student is"""
      # Expected credits = (current semester - 1) * average credits per semester
      # Average credits per semester based on programme
      expected_credits_per_semester = student.programme.totalCredits / 8  # Assuming 8 semesters
      expected_credits = (student.currentSemester - 1) * expected_credits_per_semester
      deficit = expected_credits - student.totalCreditsEarned
      return max(0, deficit)  # Only positive deficit (behind)

  def calculateProgressionRisk(self, student):
      """Calculate risk based on progression toward graduation"""
      # Check if projected graduation date is realistic
      if not student.projectedGraduation:
          return 15  # Medium risk if no projection

      # Simple heuristic: if projected graduation is too far in future, higher risk
      # In reality, would compare against programme duration
      return 10  # Placeholder

  def calculateWithdrawalRisk(self, student):
      """Calculate risk based on course withdrawals/drops"""
      # Count drop requests or withdrawn courses
      withdrawn_count = len([
          r for r in student.examResults
          if r.gradeStatus == 'WITHDRAWN'
      ])
      return withdrawn_count

  def calculateEngagementRisk(self, student):
      """Calculate risk based on engagement metrics"""
      # Placeholder for engagement metrics (logins, participation, etc.)
      # Would integrate with LMS data in real implementation
      return 5  # Low-medium baseline risk

  def checkPrerequisiteIssues(self, student):
      """Check for prerequisite-related issues"""
      issues = []

      # Check if student is taking courses without meeting prerequisites
      current_enrollments = [e for e in student.enrolments if not e.isDropped]

      for enrolment in current_enrollments:
          course_offering = enrolment.courseOffering
          course = course_offering.course

          # Get prerequisites for this course
          prerequisites = getattr(course, 'prerequisites', [])

          for prereq in prerequisites:
              if prereq.isMandatory:
                  # Check if student has passed the prerequisite course
                  prereq_passed = any(
                      result.courseId == prereq.prerequisiteCourseId and
                      result.gradeStatus == 'PASS'
                      for result in student.examResults
                  )

                  if not prereq_passed:
                      issues.append({
                          'course': course.code,
                          'missingPrerequisite': prereq.prerequisiteCourse.code,
                          'severity': 'HIGH'
                      })

      return issues

  def getRiskLevel(self, score):
      """Convert numeric score to risk level"""
      if score >= 80:
          return 'HIGH'
      elif score >= 60:
          return 'MEDIUM'
      else:
          return 'LOW'

  def getAtRiskStudentDetails(self, studentId):
      """Get detailed analysis for a specific at-risk student"""
      student = self.prisma.student.findUnique({
          where: { id: studentId },
          include: {
              'user': True,
              'programme': True,
              'academicPlan': {
                  'include': {
                      'semesters': {
                          'include': {
                              'plannedCourses': {
                                  'include': {
                                      'course': True
                                  }
                              }
                          }
                      }
                  }
              },
              'examResults': {
                  'include': {
                      'courseOffering': {
                          'include': {
                              'course': True
                          }
                      }
                  },
                  'orderBy': {
                      'releasedAt': 'desc'
                  }
              },
              'enrolments': {
                  'where': {
                      'isDropped': False
                  },
                  'include': {
                      'courseOffering': {
                          'include': {
                              'course': True,
                              'semester': True
                          }
                      },
                      'section': True
                  }
              }
          }
      })

      if not student:
          raise NotFoundException(f'Student not found: {studentId}')

      risk_score = self.calculateRiskScore(student)
      risk_level = self.getRiskLevel(risk_score)
      risk_factors = self.identifyRiskFactors(student)
      recommendations = self.generateRecommendations(student, risk_factors)

      return {
          'student': {
              'id': student.id,
              'studentId': student.studentId,
              'name': student.user.name,
              'email': student.user.email,
              'programme': {
                  'id': student.programme.id,
                  'name': student.programme.name,
                  'code': student.programme.code
              }
          },
          'riskScore': risk_score,
          'riskLevel': risk_level,
          'riskFactors': risk_factors,
          'recommendations': recommendations,
          'academicHistory': self.getAcademicHistory(student),
          'currentStatus': self.getCurrentStatus(student)
      }

  def getAcademicHistory(self, student):
      """Get student's academic history"""
      return {
          'totalCreditsEarned': student.totalCreditsEarned,
          'cumulativeGpa': student.cumulativeGpa,
          'semestersCompleted': student.currentSemester - 1,
          'examResultsCount': len(student.examResults),
          'passedCourses': len([r for r in student.examResults if r.gradeStatus == 'PASS']),
          'failedCourses': len([r for r in student.examResults if r.gradeStatus == 'FAIL']),
          'withdrawnCourses': len([r for r in student.examResults if r.gradeStatus == 'WITHDRAWN'])
      }

  def getCurrentStatus(self, student):
      """Get student's current enrollment status"""
      current_enrollments = [e for e in student.enrolments if not e.isDropped]
      return {
          'currentSemester': student.currentSemester,
          'currentEnrollmentCount': len(current_enrollments),
          'currentCourses': [
              {
                  'courseCode': e.courseOffering.course.code,
                  'courseName': e.courseOffering.course.name,
                  'credits': e.courseOffering.course.creditHours,
                  'section': e.section.sectionCode
              }
              for e in current_enrollments
          ]
      }

  findAll() {
      return { module: 'At-Risk Student Identification AI', status: 'ready' }
  }
}