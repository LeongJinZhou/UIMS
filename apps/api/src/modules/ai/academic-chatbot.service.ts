import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AcademicChatbotService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Process a student's academic query and provide AI-powered response
   * Handles prerequisite questions, course recommendations, and academic guidance
   */
  async processAcademicQuery(
    studentId: string,
    query: string,
    context: {
      semesterId?: string;
      includeHistory?: boolean;
    } = {}
  ): Promise<any> {
    const { semesterId, includeHistory = false } = context;

    // Validate student exists
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: true,
        programme: true,
        programmeVersion: true,
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

    if (!student) {
      throw new NotFoundException(`Student not found: ${studentId}`);
    }

    // Analyze the query to determine intent
    const queryAnalysis = this.analyzeQueryIntent(query.toLowerCase());

    // Generate response based on query type
    let response;

    switch (queryAnalysis.primaryIntent) {
      case 'PREREQUISITE':
        response = await this.handlePrerequisiteQuery(student, query, queryAnalysis);
        break;
      case 'COURSE_RECOMMENDATION':
        response = await this.handleCourseRecommendationQuery(student, query, queryAnalysis, semesterId);
        break;
      case 'ACADEMIC_PLANNING':
        response = await this.handleAcademicPlanningQuery(student, query, queryAnalysis);
        break;
      case 'PROGRAMME_INFO':
        response = await this.handleProgrammeInfoQuery(student, query, queryAnalysis);
        break;
      case 'GRADUATION_PATH':
        response = await this.handleGraduationPathQuery(student, query, queryAnalysis);
        break;
      default:
        response = await this.handleGeneralAcademicQuery(student, query, queryAnalysis);
    }

    // Add contextual information if requested
    if (includeHistory) {
      response.context = {
        studentProfile: this.getStudentProfileSummary(student),
        academicHistory: this.getAcademicHistorySummary(student),
        currentEnrollment: this.getCurrentEnrollmentSummary(student),
      };
    }

    return {
      query,
      studentId: student.studentId,
      timestamp: new Date(),
      response,
      confidenceScore: queryAnalysis.confidence,
      suggestedFollowUps: queryAnalysis.suggestedFollowUps,
      escalationNeeded: queryAnalysis.requiresHumanReview,
    };
  }

  /**
   * Analyze query to determine intent and extract relevant information
   */
  private analyzeQueryIntent(query: string): any {
    const intentPatterns = {
      PREREQUISITE: [
        /prerequisite/i,
        /required/i,
        /need.*before/i,
        /can.i.take/i,
        /qualified.for/i,
        /what.do.i.need/i,
      ],
      COURSE_RECOMMENDATION: [
        /recommend/i,
        /suggest/i,
        /what.should.i.take/i,
        /best.courses/i,
        /elective/i,
      ],
      ACADEMIC_PLANNING: [
        /plan/i,
        /schedule/i,
        /timeline/i,
        /graduat/i,
        /semester/i,
        /year/i,
      ],
      PROGRAMME_INFO: [
        /programme/i,
        /major/i,
        /degree/i,
        /curriculum/i,
        /requirement/i,
      ],
      GRADUATION_PATH: [
        /graduate/i,
        /finish/i,
        /complete/i,
        /when.will.i.graduate/i,
        /timeline.to.graduation/i,
      ],
    };

    let primaryIntent = 'GENERAL';
    let confidence = 0.5;
    let matchedPatterns = 0;

    for (const [intent, patterns] of Object.entries(intentPatterns)) {
      const matches = patterns.filter(pattern => pattern.test(query)).length;
      if (matches > matchedPatterns) {
        matchedPatterns = matches;
        primaryIntent = intent as any;
        confidence = Math.min(0.5 + (matches * 0.15), 0.95);
      }
    }

    // Extract entities from query
    const entities = this.extractEntities(query);

    return {
      primaryIntent,
      confidence,
      entities,
      suggestedFollowUps: this.generateSuggestedFollowUps(primaryIntent, entities),
      requiresHumanReview: this.requiresHumanReview(query, primaryIntent),
    };
  }

  /**
   * Extract entities like course codes, programme names, etc. from query
   */
  private extractEntities(query: string): any {
    const entities = {
      courseCodes: [],
      programmeNames: [],
      semesterNumbers: [],
      grades: [],
    };

    // Extract course codes (e.g., COMP301, MATH101)
    const courseCodeMatches = query.match(/[A-Z]{2,4}\s*\d{3}/g) || [];
    entities.courseCodes = [...new Set(courseCodeMatches.map(code => code.replace(/\s/g, '')))];

    // Extract semester numbers
    const semesterMatches = query.match(/(semester|term)\s*(\d+)/gi) || [];
    entities.semesterNumbers = semesterMatches
      .map(match => parseInt(match.replace(/\D/g, '')))
      .filter(num => !isNaN(num));

    // Extract grades
    const gradeMatches = query.match(/\b[A-F][\+-]?\b/g) || [];
    entities.grades = [...new Set(gradeMatches)];

    return entities;
  }

  /**
   * Handle prerequisite-related queries
   */
  private async handlePrerequisiteQuery(student: any, query: string, analysis: any): Promise<any> {
    const { courseCodes } = analysis.entities;

    if (courseCodes.length === 0) {
      // General prerequisite inquiry
      return {
        type: 'PREREQUISITE_EXPLANATION',
        message: 'I can help you understand prerequisite requirements for specific courses. Which course are you interested in?',
        suggestions: [
          'What are the prerequisites for COMP301?',
          'Do I need to take MATH101 before PHYS201?',
          'What courses require programming fundamentals?',
        ],
      };
    }

    // Check prerequisites for specific courses
    const prerequisiteInfo = [];

    for (const courseCode of courseCodes) {
      const course = await this.prisma.course.findFirst({
        where: {
          code: courseCode,
          programmeId: student.programmeId,
          isActive: true,
        },
        include: {
          prerequisites: {
            include: {
              prerequisiteCourse: true,
            },
          },
        },
      });

      if (!course) {
        prerequisiteInfo.push({
          courseCode,
          error: `Course ${courseCode} not found in your programme`,
        });
        continue;
      }

      // Check if student has met prerequisites
      const metPrerequisites = [];
      const unmetPrerequisites = [];

      for (const prereq of course.prerequisites) {
        const hasPassed = student.examResults.some(
          result =>
            result.courseId === prereq.prerequisiteCourseId &&
            result.gradeStatus === 'PASS'
        );

        if (hasPassed) {
          metPrerequisites.push({
            courseCode: prereq.prerequisiteCourse.code,
            courseName: prereq.prerequisiteCourse.name,
            grade: this.getStudentGradeForCourse(student, prereq.prerequisiteCourseId),
          });
        } else {
          unmetPrerequisites.push({
            courseCode: prereq.prerequisiteCourse.code,
            courseName: prereq.prerequisiteCourse.name,
            isMandatory: prereq.isMandatory,
          });
        }
      }

      prerequisiteInfo.push({
        courseCode: course.code,
        courseName: course.name,
        metPrerequisites,
        unmetPrerequisites,
        canEnroll: unmetPrerequisites.every(p => !p.isMandatory),
        recommendations: unmetPrerequisites.length > 0
          ? this.getPrerequisiteRecommendations(unmetPrerequisites, student)
          : [],
      });
    }

    return {
      type: 'PREREQUISITE_ANALYSIS',
      studentId: student.studentId,
      prerequisiteInfo,
      summary: this.generatePrerequisiteSummary(prerequisiteInfo),
    };
  }

  /**
   * Handle course recommendation queries
   */
  private async handleCourseRecommendationQuery(
    student: any,
    query: string,
    analysis: any,
    semesterId: string | undefined
  ): Promise<any> {
    const { courseCodes } = analysis.entities;

    // Get student's academic profile
    const completedCourses = student.examResults
      .filter(result => result.gradeStatus === 'PASS')
      .map(result => result.courseId);

    const currentEnrollments = student.enrolments
      .filter(enrolment => !enrolment.isDropped)
      .map(enrolment => enrolment.courseOfferingId);

    // Get available courses for recommendation
    let availableCoursesQuery = this.prisma.courseOffering.findMany({
      where: {
        course: {
          programmeId: student.programmeId,
          isActive: true,
        },
        isConfirmed: true,
      },
      include: {
        course: true,
        lecturer: {
          include: {
            user: true,
          },
        },
        semester: true,
      },
    });

    if (semesterId) {
      availableCoursesQuery = availableCoursesQuery.where({ semesterId });
    }

    const availableCourses = await availableCoursesQuery;

    // Filter and rank courses based on student's profile
    const recommendations = this.rankCourseRecommendations(
      availableCourses,
      student,
      completedCourses,
      currentEnrollments,
      analysis.entities
    );

    return {
      type: 'COURSE_RECOMMENDATIONS',
      studentId: student.studentId,
      semester: semesterId ? await this.prisma.semester.findUnique({ where: { id: semesterId } }) : null,
      recommendations: recommendations.slice(0, 5), // Top 5 recommendations
      reasoning: this.generateRecommendationReasoning(recommendations.slice(0, 3), student),
      nextSteps: [
        'Review recommended courses with your academic advisor',
        'Check course schedules and availability',
        'Consider prerequisite requirements',
      ],
    };
  }

  /**
   * Handle academic planning queries
   */
  private async handleAcademicPlanningQuery(
    student: any,
    query: string,
    analysis: any
  ): Promise<any> {
    const academicPlan = student.academicPlan;

    if (!academicPlan) {
      return {
        type: 'ACADEMIC_PLANNING_HELP',
        message: 'It appears you do not have an academic plan yet. Would you like me to help you create one based on your programme requirements?',
        actions: [
          'Create initial academic plan',
          'View programme requirements',
          'See recommended course sequence',
        ],
      };
    }

    // Analyze current academic plan status
    const planAnalysis = this.analyzeAcademicPlan(academicPlan, student);

    return {
      type: 'ACADEMIC_PLANNING_ANALYSIS',
      studentId: student.studentId,
      academicPlan: {
        id: academicPlan.id,
        originalGraduation: academicPlan.originalGraduation,
        projectedGraduation: academicPlan.projectedGraduation,
        planStatus: academicPlan.planStatus,
        hasExtension: academicPlan.hasExtension,
      },
      analysis: planAnalysis,
      suggestions: this.generateAcademicPlanningSuggestions(planAnalysis, student),
    };
  }

  /**
   * Handle programme information queries
   */
  private async handleProgrammeInfoQuery(
    student: any,
    query: string,
    analysis: any
  ): Promise<any> {
    const programme = student.programme;

    // Get programme structure
    const programmeVersions = await this.prisma.programmeVersion.findMany({
      where: {
        programmeId: programme.id,
        isActive: true,
      },
      include: {
        semesterPlans: {
          include: {
            courses: {
              include: {
                course: true,
              },
            },
          },
          orderBy: {
            semesterNumber: 'asc',
          },
        },
      },
      orderBy: {
        effectiveFrom: 'desc',
      },
      take: 3, // Most recent versions
    });

    return {
      type: 'PROGRAMME_INFORMATION',
      programme: {
        id: programme.id,
        name: programme.name,
        code: programme.code,
        totalCredits: programme.totalCredits,
        maxDurationSemesters: programme.maxDurationSemesters,
        calendarType: programme.calendarType,
      },
      activeVersions: programmeVersions.map(v => ({
        id: v.id,
        version: v.version,
        effectiveFrom: v.effectiveFrom,
        effectiveTo: v.effectiveTo,
        isActive: v.isActive,
        totalSemesters: v.semesterPlans.length,
      })),
      currentVersion: student.programmeVersionId
        ? programmeVersions.find(v => v.id === student.programmeVersionId)
        : programmeVersions[0],
    };
  }

  /**
   * Handle graduation path queries
   */
  private async handleGraduationPathQuery(
    student: any,
    query: string,
    analysis: any
  ): Promise<any> {
    const academicPlan = student.academicPlan;
    const programme = student.programme;

    if (!academicPlan) {
      return {
        type: 'GRADUATION_PATH_HELP',
        message: 'To estimate your graduation timeline, I need to create an academic plan for you first.',
        actions: ['Create academic plan', 'View programme requirements'],
      };
    }

    // Calculate graduation timeline
    const graduationAnalysis = this.calculateGraduationTimeline(student, academicPlan, programme);

    return {
      type: 'GRADUATION_PATH_ANALYSIS',
      studentId: student.studentId,
      programme: {
        name: programme.name,
        totalCreditsRequired: programme.totalCredits,
      },
      academicProgress: {
        creditsEarned: student.totalCreditsEarned,
        creditsRemaining: programme.totalCredits - student.totalCreditsEarned,
        gpa: student.cumulativeGpa,
      },
      graduationTimeline: graduationAnalysis,
      recommendations: this.generateGraduationRecommendations(graduationAnalysis, student),
    };
  }

  /**
   * Handle general academic queries
   */
  private async handleGeneralAcademicQuery(
    student: any,
    query: string,
    analysis: any
  ): Promise<any> {
    return {
      type: 'GENERAL_ACADEMIC_HELP',
      message: 'I can help you with various academic questions including prerequisites, course recommendations, academic planning, and graduation paths. What would you like to know?',
      suggestedTopics: [
        'Prerequisites for specific courses',
        'Course recommendations for next semester',
        'Academic planning and graduation timeline',
        'Programme requirements and curriculum',
        'At-risk student identification and support',
      ],
      exampleQueries: [
        'What are the prerequisites for COMP301?',
        'What courses should I take next semester?',
        'Am I on track to graduate on time?',
        'What are the requirements for my programme?',
      ],
    };
  }

  /**
   * Helper methods for generating recommendations and analysis
   */
  private getStudentGradeForCourse(student: any, courseId: string): string | null {
    const result = student.examResults.find(
      r => r.courseId === courseId && r.gradeStatus === 'PASS'
    );
    return result ? result.grade : null;
  }

  private getPrerequisiteRecommendations(unmetPrerequisites: any[], student: any): any[] {
    const recommendations = [];

    for (const prereq of unmetPrerequisites) {
      if (prereq.isMandatory) {
        recommendations.push({
          type: 'PREREQUISITE_REQUIRED',
          action: `Complete ${prereq.courseCode} before enrolling in the target course`,
          priority: 'HIGH',
          resources: [
            `Check availability of ${prereq.courseCode} in upcoming semesters`,
            'Speak with your academic advisor about scheduling',
            'Consider prerequisite workshops or tutoring if available',
          ],
        });
      }
    }

    return recommendations;
  }

  private rankCourseRecommendations(
    availableCourses: any[],
    student: any,
    completedCourses: string[],
    currentEnrollments: string[],
    entities: any
  ): any[] {
    const scoredCourses = [];

    for (const offering of availableCourses) {
      let score = 0;
      const course = offering.course;

      // Skip if already completed or currently enrolled
      if (completedCourses.includes(course.id) || currentEnrollments.includes(offering.id)) {
        continue;
      }

      // Prerequisite bonus
      const prereqsMet = course.prerequisites.every(prereq =>
        completedCourses.includes(prereq.prerequisiteCourseId)
      );
      if (prereqsMet) {
        score += 30;
      } else {
        // Penalty for unmet prerequisites
        const unmetCount = course.prerequisites.filter(prereq =>
          !completedCourses.includes(prereq.prerequisiteCourseId)
        ).length;
        score -= unmetCount * 15;
      }

      // Credit level appropriateness
      const studentYear = Math.ceil(student.currentSemester / 2); // Approximate year
      const courseLevel = parseInt(course.code.replace(/\D/g, '')) || 100;
      const levelDifference = Math.abs(courseLevel - (studentYear * 100 + 100));
      if (levelDifference <= 100) {
        score += 20; // Appropriate level
      } else if (levelDifference <= 200) {
        score += 10; // Reasonably close
      } else {
        score -= 10; // Too far from level
      }

      // Credit hours balance (prefer normal load)
      const idealCreditsPerCourse = 3; // Assuming 3 credit hours average
      const creditScore = Math.abs(course.creditHours - idealCreditsPerCourse);
      score += Math.max(0, 10 - creditScore);

      // Elective bonus if mentioned in query
      if (course.isElective && entities.courseCodes.length > 0) {
        score += 10;
      }

      scoredCourses.push({
        offering,
        course,
        score,
        reason: this.generateCourseReasoning(course, prereqsMet, completedCourses, studentYear),
      });
    }

    // Sort by score descending
    scoredCourses.sort((a, b) => b.score - a.score);

    return scoredCourses.map(item => ({
      course: {
        id: item.course.id,
        code: item.course.code,
        name: item.course.name,
        creditHours: item.course.creditHours,
        courseType: item.course.courseType,
        description: item.course.description,
      },
      offering: {
        id: item.offering.id,
        semester: item.offering.semester.label,
        lecturer: item.offering.lecturer.user.name,
        maxCapacity: item.offering.maxCapacity,
        currentEnrolment: item.offering.currentEnrolment,
      },
      score: item.score,
      reason: item.reason,
    }));
  }

  private generateCourseReasoning(
    course: any,
    prereqsMet: boolean,
    completedCourses: string[],
    studentYear: number
  ): string {
    const reasons = [];

    if (prereqsMet) {
      reasons.push('All prerequisites satisfied');
    } else {
      reasons.push('Some prerequisites may need to be completed first');
    }

    const courseLevel = parseInt(course.code.replace(/\D/g, '')) || 100;
    const expectedLevel = studentYear * 100 + 100;
    if (Math.abs(courseLevel - expectedLevel) <= 50) {
      reasons.push('Appropriate for your academic level');
    } else if (courseLevel > expectedLevel) {
      reasons.push('Advanced course - consider if you\'re ready for the challenge');
    } else {
      reasons.push('Foundational course - good for building basics');
    }

    if (course.isElective) {
      reasons.push('Elective course - offers flexibility in your schedule');
    }

    return reasons.join('; ');
  }

  private generateRecommendationReasoning(recommendations: any[], student: any): string {
    if (recommendations.length === 0) {
      return 'No suitable recommendations found based on your current profile.';
    }

    const reasons = [];
    reasons.push(`Based on your academic record (${student.totalCreditsEarned} credits earned, GPA: ${student.cumulativeGpa}):`);

    if (recommendations.some(r => r.score >= 80)) {
      reasons.push('Several courses strongly match your academic profile and progress');
    }

    if (recommendations.some(r => !r.course.isElective)) {
      reasons.push('Core programme requirements prioritized');
    }

    if (recommendations.some(r => r.course.isElective)) {
      reasons.push('Elective options included for schedule flexibility');
    }

    return reasons.join(' ');
  }

  private analyzeAcademicPlan(academicPlan: any, student: any): any {
    const totalPlannedCredits = academicPlan.semesters.reduce(
      (sum, semester) => sum + semester.totalCredits, 0
    );

    const completedCredits = student.totalCreditsEarned;
    const remainingCredits = totalPlannedCredits - completedCredits;

    // Check for semesters with overloads
    const overloadedSemesters = academicPlan.semesters.filter(
      semester => semester.totalCredits > 20 // Assuming 20 is max for long semester
    );

    // Check for semesters with very light load
    const lightSemesters = academicPlan.semesters.filter(
      semester => semester.totalCredits < 12 // Assuming 12 is minimum for full-time
    );

    return {
      totalPlannedCredits,
      completedCredits,
      remainingCredits,
      completionPercentage: totalPlannedCredits > 0
        ? (completedCredits / totalPlannedCredits) * 100
        : 0,
      semestersTotal: academicPlan.semesters.length,
      semestersCompleted: academicPlan.semesters.reduce(
        (count, semester) =>
          count + (semester.plannedCourses.filter(course =>
            student.examResults.some(result =>
              result.courseId === course.courseId &&
              result.gradeStatus === 'PASS'
            )).length === semester.plannedCourses.length ? 1 : 0
          ), 0
      ),
      overloadedSemesters: overloadedSemesters.length,
      lightSemesters: lightSemesters.length,
      hasExtension: academicPlan.hasExtension,
      projectionVariance: this.calculateProjectionVariance(academicPlan, student),
    };
  }

  private calculateProjectionVariance(academicPlan: any, student: any): any {
    if (!academicPlan.projectedGraduation || !student.programmeVersionId) {
      return null;
    }

    // Simple comparison - in reality would be more complex
    return {
      note: 'Detailed variance calculation requires comparing against programme structure',
      suggestion: 'Consult with academic advisor for precise graduation timeline',
    };
  }

  private generateAcademicPlanningSuggestions(analysis: any, student: any): any[] {
    const suggestions = [];

    if (analysis.completionPercentage < 50 && student.currentSemester > 2) {
      suggestions.push({
        type: 'PROGRESSION_CONCERN',
        message: 'You may be behind on your academic plan completion',
        action: 'Review your course load and consider summer/winter courses',
        priority: 'HIGH',
      });
    }

    if (analysis.overloadedSemesters > 0) {
      suggestions.push({
        type: 'WORKLOAD_BALANCE',
        message: 'Some semesters in your plan exceed recommended credit limits',
        action: 'Consider redistributing courses to balance workload',
        priority: 'MEDIUM',
      });
    }

    if (analysis.lightSemesters > 2) {
      suggestions.push({
        type: 'ACCELERATION_OPPORTUNITY',
        message: 'You have opportunities to accelerate your programme',
        action: 'Discuss with advisor about taking additional courses',
        priority: 'MEDIUM',
      });
    }

    if (analysis.hasExtension) {
      suggestions.push({
        type: 'EXTENSION_AWARENESS',
        message: 'Your academic plan includes an approved extension',
        action: 'Ensure extension conditions are being met',
        priority: 'LOW',
      });
    }

    return suggestions;
  }

  private calculateGraduationTimeline(
    student: any,
    academicPlan: any,
    programme: any
  ): any {
    const creditsEarned = student.totalCreditsEarned;
    const creditsRequired = programme.totalCredits;
    const creditsRemaining = creditsRequired - creditsEarned;

    // Calculate based on current pace
    const creditsPerSemester = student.totalCreditsEarned / Math.max(student.currentSemester - 1, 1);
    const semestersToGraduate = creditsPerSemester > 0
      ? Math.ceil(creditsRemaining / creditsPerSemester)
      : null;

    // Compare with academic plan
    const plannedRemaining = academicPlan.semesters.reduce(
      (sum, semester, index) =>
        index >= student.currentSemester - 1 ? sum + semester.totalCredits : sum, 0
    );

    return {
      creditsEarned,
      creditsRequired,
      creditsRemaining,
      estimatedSemestersToGraduate: semestersToGraduate,
      plannedSemestersRemaining: plannedRemaining > 0 ? Math.ceil(plannedRemaining / 15) : null, // Assuming 15 avg credits/semester
      graduationFeasibility: creditsRemaining > 0 && semestersToGraduate ?
        semestersToGraduate <= (programme.maxDurationSemesters - student.currentSemester + 1)
        : false,
    };
  }

  private generateGraduationRecommendations(analysis: any, student: any): any[] {
    const recommendations = [];

    if (!analysis.graduationFeasibility) {
      recommendations.push({
        type: 'TIMELINE_CONCERN',
        message: 'Based on your current progress, graduating within programme limits may be challenging',
        actions: [
          'Consider credit overload in future semesters (if policy allows)',
          'Explore summer/winter semester options',
          'Discuss programme extension with academic advisor',
          'Review course failures and retake planning',
        ],
        priority: 'HIGH',
      });
    } else if (analysis.estimatedSemestersToGraduate && analysis.estimatedSemestersToGraduate > 2) {
      recommendations.push({
        type: 'PROGRESSION_MONITORING',
        message: 'You are on track to graduate, but monitor your progress closely',
        actions: [
          'Maintain current course load and performance',
          'Regular check-ins with academic advisor',
          'Address any academic difficulties early',
        ],
        priority: 'MEDIUM',
      });
    } else {
      recommendations.push({
        type: 'ON_TRACK',
        message: 'You are progressing well toward your graduation goal',
        actions: [
          'Continue with your current academic plan',
          'Enjoy your academic journey!',
          'Consider electives or minors to enhance your degree',
        ],
        priority: 'LOW',
      });
    }

    return recommendations;
  }

  private requiresHumanReview(query: string, intent: string): boolean {
    const complexPatterns = [
      /appeal/i,
      /grievance/i,
      /dispute/i,
      /complaint/i,
      /personal/i,
      /medical/i,
      /emergency/i,
    ];

    return complexPatterns.some(pattern => pattern.test(query));
  }

  private generateSuggestedFollowUps(intent: string, entities: any): string[] {
    const followUps = {
      PREREQUISITE: [
        'What happens if I don\'t meet a prerequisite?',
        'Can I request a prerequisite waiver?',
        'Are there alternative courses that satisfy the same requirement?',
      ],
      COURSE_RECOMMENDATION: [
        'What is the workload like for these courses?',
        'When are these courses offered?',
        'Do these courses have any special requirements?',
      ],
      ACADEMIC_PLANNING: [
        'How can I improve my academic performance?',
        'What support services are available?',
        'Should I consider changing my programme?',
      ],
      PROGRAMME_INFO: [
        'What specializations are available within this programme?',
        'Are there internship or co-op opportunities?',
        'What careers do graduates typically pursue?',
      ],
      GRADUATION_PATH: [
        'What if I need to take a semester off?',
        'How do I apply for graduation?',
        'What happens if I fail a required course?',
      ],
      GENERAL: [
        'Can you help me with specific course questions?',
        'What academic support services are available?',
        'How do I contact my academic advisor?',
      ],
    };

    return followUps[intent] || followUps.GENERAL;
  }

  private getStudentProfileSummary(student: any): any {
    return {
      studentId: student.studentId,
      name: student.user?.name || 'Unknown',
      programme: {
        name: student.programme?.name,
        code: student.programme?.code,
      },
      currentSemester: student.currentSemester,
      totalCreditsEarned: student.totalCreditsEarned,
      cumulativeGpa: student.cumulativeGpa,
    };
  }

  private getAcademicHistorySummary(student: any): any {
    const passedCourses = student.examResults.filter(r => r.gradeStatus === 'PASS');
    const failedCourses = student.examResults.filter(r => r.gradeStatus === 'FAIL');
    const withdrawnCourses = student.examResults.filter(r => r.gradeStatus === 'WITHDRAWN');

    return {
      totalCoursesAttempted: student.examResults.length,
      passedCourses: passedCourses.length,
      failedCourses: failedCourses.length,
      withdrawnCourses: withdrawnCourses.length,
      passRate: student.examResults.length > 0
        ? (passedCourses.length / student.examResults.length) * 100
        : 0,
      recentPerformance: passedCourses
        .slice(0, 5)
        .map(r => ({
          course: r.courseOffering.course.code,
          grade: r.grade,
          date: r.releasedAt,
        })),
    };
  }

  private getCurrentEnrollmentSummary(student: any): any {
    const currentEnrolments = student.enrolments.filter(e => !e.isDropped);

    return {
      currentSemester: student.currentSemester,
      totalCourses: currentEnrolments.length,
      totalCredits: currentEnrolments.reduce(
        (sum, enrolment) => sum + enrolment.courseOffering.course.creditHours, 0
      ),
      courses: currentEnrolments.map(enrolment => ({
        courseCode: enrolment.courseOffering.course.code,
        courseName: enrolment.courseOffering.course.name,
        credits: enrolment.courseOffering.course.creditHours,
        section: enrolment.section.sectionCode,
      })),
    };
  }

  findAll() {
    return { module: 'Academic Chatbot AI Assistance', status: 'ready' };
  }
}