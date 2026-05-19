import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class StudentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Handle course offering changes from integration service
   */
  async handleCourseOfferingChange(
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    courseOffering: any,
  ): Promise<void> {
    // In a production system, we would:
    // - For CREATE: Check if this affects any student academic plans
    // - For UPDATE: Check if changes affect academic plan validity (course deletions, etc.)
    // - For DELETE: Mark affected academic plans for revision

    // For now, we'll log the change
    console.log(`Student service received ${operation} event for course offering ${courseOffering.id}`);
  }

  /**
   * Handle semester changes from integration service
   */
  async handleSemesterChange(
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    semester: any,
  ): Promise<void> {
    // In a production system, we would:
    // - For CREATE: Prepare to generate academic plans for this semester
    // - For UPDATE: Check if changes affect existing academic plans
    // - For DELETE: Archive or remove academic plans for this semester

    // For now, we'll log the change
    console.log(`Student service received ${operation} event for semester ${semester.id}`);
  }

  /**
   * Generate academic plan for a student based on their intake cohort
   * and the MQA-approved course structure for their programme version
   */
  async generateAcademicPlan(studentId: string): Promise<any> {
    // Get student with programme and version info
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        programme: true,
        programmeVersion: {
          include: {
            semesterPlans: {
              include: {
                mqaPlanCourses: {
                  include: {
                    course: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException(`Student not found: ${studentId}`);
    }

    if (!student.programmeVersion) {
      throw new BadRequestException(`Student has no programme version assigned`);
    }

    // Check if academic plan already exists
    let academicPlan = await this.prisma.academicPlan.findUnique({
      where: { studentId: student.id },
    });

    if (!academicPlan) {
      // Create new academic plan
      academicPlan = await this.prisma.academicPlan.create({
        data: {
          studentId: student.id,
          originalGraduation: this.calculateOriginalGraduation(student),
          projectedGraduation: this.calculateOriginalGraduation(student), // Will be updated as we process
          lastRevisedAt: new Date(),
        },
      });
    } else {
      // Clear existing planned courses for revision
      await this.prisma.plannedCourse.deleteMany({
        where: {
          semesterPlan: {
            academicPlanId: academicPlan.id,
          },
        },
      });

      // Delete existing semester plans
      await this.prisma.semesterPlan.deleteMany({
        where: {
          academicPlanId: academicPlan.id,
        },
      });
    }

    // Generate the academic plan based on programme structure
    await this.populateAcademicPlan(student, academicPlan);

    // Return the generated plan
    return this.getAcademicPlanDetails(academicPlan.id);
  }

  /**
   * Calculate original graduation date based on intake and programme duration
   */
  private calculateOriginalGraduation(student: any): string {
    // This is a simplified calculation - in reality would depend on intake period/year
    // and programme structure (semester types, etc.)
    const intakeYear = student.intakeYear;
    const intakePeriod = student.intakePeriod; // APRIL, JULY, OCTOBER
    const totalSemesters = student.programmeVersion.semesterPlans.length;

    // Simple approximation: each semester is ~6 months
    const totalMonths = totalSemesters * 6;
    const graduationDate = new Date(intakeYear, this.monthFromPeriod(intakePeriod) - 1 + totalMonths);

    const year = graduationDate.getFullYear();
    const semester = graduationDate.getMonth() >= 6 ? 2 : 1; // Simplified

    return `${year}-S${semester}`;
  }

  /**
   * Convert intake period to month number (1-12)
   */
  private monthFromPeriod(period: string): number {
    switch (period) {
      case 'APRIL': return 4;
      case 'JULY': return 7;
      case 'OCTOBER': return 10;
      default: return 1; // Default to January
    }
  }

  /**
   * Populate the academic plan with semester plans and planned courses
   */
  private async populateAcademicPlan(student: any, academicPlan: any): Promise<void> {
    // Create semester plans for the academic plan
    const semesterPlansToCreate = student.programmeVersion.semesterPlans.map((mqaSemesterPlan: any) => ({
      academicPlanId: academicPlan.id,
      semesterNumber: mqaSemesterPlan.semesterNumber,
      calendarSemester: this.generateCalendarSemester(
        student.intakeYear,
        student.intakePeriod,
        mqaSemesterPlan.semesterNumber
      ),
      totalCredits: mqaSemesterPlan.totalCredits,
      isExtension: false,
    }));

    const createdSemesterPlans = await this.prisma.semesterPlan.createMany({
      data: semesterPlansToCreate,
    });

    // Get the created semester plans with their IDs
    const semesterPlans = await this.prisma.semesterPlan.findMany({
      where: { academicPlanId: academicPlan.id },
      orderBy: { semesterNumber: 'asc' },
    });

    // Create a map of MQA semester numbers to created semester plan IDs
    const semesterPlanMap = new Map();
    semesterPlans.forEach((sp, index) => {
      semesterPlanMap.set(
        student.programmeVersion.semesterPlans[index].semesterNumber,
        sp.id
      );
    });

    // Create planned courses for each semester
    const plannedCoursesToCreate = [];

    for (const mqaSemesterPlan of student.programmeVersion.semesterPlans) {
      const semesterPlanId = semesterPlanMap.get(mqaSemesterPlan.semesterNumber);

      if (!semesterPlanId) {
        continue; // Skip if semester plan not found
      }

      for (const mqaPlanCourse of mqaSemesterPlan.mqaPlanCourses) {
        plannedCoursesToCreate.push({
          semesterPlanId,
          courseId: mqaPlanCourse.courseId,
          courseCode: mqaPlanCourse.course.code,
          creditHours: mqaPlanCourse.course.creditHours,
          isRetake: false,
          isDeferred: false,
          gradeStatus: null, // No grade yet for planned courses
        });
      }
    }

    // Create all planned courses
    if (plannedCoursesToCreate.length > 0) {
      await this.prisma.plannedCourse.createMany({
        data: plannedCoursesToCreate,
      });
    }
  }

  /**
   * Generate calendar semester string (e.g., "2026-S1") based on intake and semester number
   */
  private generateCalendarSemester(intakeYear: number, intakePeriod: string, semesterNumber: number): string {
    // Simplified calculation - each semester advances 6 months
    const startMonth = this.monthFromPeriod(intakePeriod);
    const totalMonths = (semesterNumber - 1) * 6;
    const semesterDate = new Date(intakeYear, startMonth - 1 + totalMonths, 1);

    const year = semesterDate.getFullYear();
    const month = semesterDate.getMonth() + 1;
    const semester = month >= 7 ? 2 : 1; // Simplified: Jan-Jun = S1, Jul-Dec = S2

    return `${year}-S${semester}`;
  }

  /**
   * Get detailed academic plan information for display
   */
  async getAcademicPlanDetails(academicPlanId: string): Promise<any> {
    const academicPlan = await this.prisma.academicPlan.findUnique({
      where: { id: academicPlanId },
      include: {
        student: {
          include: {
            user: true,
            programme: true,
            programmeVersion: true,
          },
        },
        semesters: {
          include: {
            plannedCourses: {
              include: {
                course: true,
              },
              orderBy: {
                course: {
                  code: 'asc',
                },
              },
            },
          },
          orderBy: {
            semesterNumber: 'asc',
          },
        },
      },
    });

    if (!academicPlan) {
      throw new NotFoundException(`Academic plan not found: ${academicPlanId}`);
    }

    // Calculate statistics
    let totalCreditsEarned = 0;
    let totalCreditsPlanned = 0;
    let coursesCompleted = 0;
    let coursesPlanned = 0;
    let failedCourses = 0;

    // Count completed courses from exam results (would need to join with enrolments/exam results)
    // For now, we'll focus on planned structure

    for (const semester of academicPlan.semesters) {
      for (const plannedCourse of semester.plannedCourses) {
        totalCreditsPlanned += plannedCourse.creditHours;
        coursesPlanned++;

        // In a real implementation, we would check actual grades here
        // For now, all planned courses are considered not yet completed
      }
    }

    // Get student's actual academic progress (simplified)
    // In reality, this would come from enrolments and exam results

    return {
      academicPlan: {
        id: academicPlan.id,
        studentId: academicPlan.studentId,
        planStatus: academicPlan.planStatus,
        originalGraduation: academicPlan.originalGraduation,
        projectedGraduation: academicPlan.projectedGraduation,
        hasExtension: academicPlan.hasExtension,
        lastRevisedAt: academicPlan.lastRevisedAt,
      },
      student: {
        id: academicPlan.student.id,
        studentId: academicPlan.student.studentId,
        name: academicPlan.student.user?.name || 'Unknown',
        email: academicPlan.student.user?.email || '',
        programme: {
          id: academicPlan.student.programme.id,
          name: academicPlan.student.programme.name,
          code: academicPlan.student.programme.code,
        },
        programmeVersion: {
          version: academicPlan.student.programmeVersion.version,
        },
        intakePeriod: academicPlan.student.intakePeriod,
        intakeYear: academicPlan.student.intakeYear,
        currentSemester: academicPlan.student.currentSemester,
      },
      planStructure: {
        totalSemesters: academicPlan.semesters.length,
        totalCoursesPlanned: coursesPlanned,
        totalCreditsPlanned: totalCreditsPlanned,
        semesters: academicPlan.semesters.map((semester) => ({
          semesterNumber: semester.semesterNumber,
          calendarSemester: semester.calendarSemester,
          totalCredits: semester.totalCredits,
          isExtension: semester.isExtension,
          courses: semester.plannedCourses.map((plannedCourse) => ({
            id: plannedCourse.id,
            course: {
              id: plannedCourse.course.id,
              code: plannedCourse.course.code,
              name: plannedCourse.course.name,
              creditHours: plannedCourse.course.creditHours,
              courseType: plannedCourse.course.courseType,
              description: plannedCourse.course.description,
            },
            creditHours: plannedCourse.creditHours,
            isRetake: plannedCourse.isRetake,
            isDeferred: plannedCourse.isDeferred,
            gradeStatus: plannedCourse.gradeStatus,
          })),
        })),
      }),
      // Progress tracking would be calculated from actual enrolments/exam results
      progress: {
        totalCreditsEarned: totalCreditsEarned, // Would come from actual completed courses
        totalCreditsPlanned: totalCreditsPlanned,
        completionPercentage: totalCreditsPlanned > 0 ? (totalCreditsEarned / totalCreditsPlanned) * 100 : 0,
        coursesCompleted: coursesCompleted,
        coursesPlanned: coursesPlanned,
        failedCourses: failedCourses,
        currentSemester: academicPlan.student.currentSemester,
      },
    };
  }

  /**
   * Update academic plan when a student fails a course
   * This inserts the failed course into future semesters while preserving graduation timeline
   * and credit limits, deferring other courses if necessary
   */
  async handleCourseFailure(studentId: string, courseId: string, failedSemesterNumber: number): Promise<any> {
    // Get student's academic plan with all needed data
    const academicPlan = await this.prisma.academicPlan.findUnique({
      where: { studentId },
      include: {
        semesters: {
          include: {
            plannedCourses: {
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
    });

    if (!academicPlan) {
      throw new NotFoundException(`Academic plan not found for student: ${studentId}`);
    }

    // Find the failed course in the specified semester
    const failedSemester = academicPlan.semesters.find(s => s.semesterNumber === failedSemesterNumber);
    if (!failedSemester) {
      throw new NotFoundException(`Semester ${failedSemesterNumber} not found in academic plan`);
    }

    const failedPlannedCourse = failedSemester.plannedCourses.find(pc => pc.courseId === courseId);
    if (!failedPlannedCourse) {
      throw new NotFoundException(`Course ${courseId} not found in semester ${failedSemesterNumber}`);
    }

    // Get the course details for credit hours
    const failedCourse = failedPlannedCourse.course;
    const failedCourseCredits = failedCourse.creditHours;

    // Mark the original course as failed
    await this.prisma.plannedCourse.update({
      where: { id: failedPlannedCourse.id },
      data: {
        gradeStatus: 'FAIL',
        isRetake: true, // Mark as needing retake
      },
    });

    // Find the student's programme version to get curriculum structure
    const programmeVersion = await this.prisma.programmeVersion.findUnique({
      where: { id: academicPlan.student?.programmeVersionId },
      include: {
        semesterPlans: {
          include: {
            mqaPlanCourses: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });

    if (!programmeVersion) {
      throw new NotFoundException(`Programme version not found for student's academic plan`);
    }

    // Get all MQA-approved courses for reference (what the student SHOULD be taking)
    const mqaCoursesBySemester = new Map();
    for (const mqaSemesterPlan of programmeVersion.semesterPlans) {
      mqaCoursesBySemester.set(
        mqaSemesterPlan.semesterNumber,
        mqaSemesterPlan.mqaPlanCourses.map(mqpc => ({
          courseId: mqpc.courseId,
          courseCode: mqpc.course.code,
          courseName: mqpc.course.name,
          creditHours: mqpc.course.creditHours,
          isElective: mqpc.isElective,
        }))
      );
    }

    // Get current planned courses by semester for comparison
    const plannedCoursesBySemester = new Map();
    for (const semesterPlan of academicPlan.semesters) {
      plannedCoursesBySemester.set(
        semesterPlan.semesterNumber,
        semesterPlan.plannedCourses.map(pc => ({
          id: pc.id,
          courseId: pc.courseId,
          courseCode: pc.course.code,
          courseName: pc.course.name,
          creditHours: pc.course.creditHours,
          isRetake: pc.isRetake,
          isDeferred: pc.isDeferred,
          gradeStatus: pc.gradeStatus,
        }))
      );
    }

    // Calculate current credits per semester (only counting non-retake, non-deferred, passed courses)
    const earnedCreditsBySemester = new Map();
    for (const [semesterNum, plannedCourses] of plannedCoursesBySemester.entries()) {
      let earnedCredits = 0;
      for (const pc of plannedCourses) {
        // Only count courses that are not retakes (original attempts) and have been passed
        // In a real system, we'd check actual exam results, but for now we'll use gradeStatus
        if (!pc.isRetake && pc.gradeStatus === 'PASS') {
          earnedCredits += pc.creditHours;
        }
      }
      earnedCreditsBySemester.set(semesterNum, earnedCredits);
    }

    // Determine which semester to insert the retake into
    // Strategy: Find the first future semester where adding the course won't exceed credit limits
    let targetSemester = failedSemesterNumber + 1; // Start with next semester
    const maxSemesters = programmeVersion.semesterPlans.length;
    const maxCreditsPerSemester = 20; // Standard limit
    const maxCreditsWithAppeal = 21; // With appeal

    let retakeInserted = false;
    let deferredCourses: any[] = [];

    // Try to find a slot for the retake course
    while (targetSemester <= maxSemesters && !retakeInserted) {
      const currentCredits = earnedCreditsBySemester.get(targetSemester) || 0;
      const mqaCourses = mqaCoursesBySemester.get(targetSemester) || [];
      const plannedCourses = plannedCoursesBySemester.get(targetSemester) || [];

      // Calculate credits from MQA-approved courses (what's officially required)
      let mqaCredits = 0;
      for (const mqaCourse of mqaCourses) {
        mqaCredits += mqaCourse.creditHours;
      }

      // Calculate credits from currently planned non-retake courses
      let plannedCredits = 0;
      for (const pc of plannedCourses) {
        if (!pc.isRetake && !pc.isDeferred) {
          plannedCredits += pc.creditHours;
        }
      }

      // Total credits if we add the retake course
      const totalWithRetake = mqaCredits + plannedCredits + failedCourseCredits;

      // Check if we can fit the retake without exceeding limits
      if (totalWithRetake <= maxCreditsWithAppeal) {
        // We can fit it! Insert the retake course

        // First, check if this course is already planned for this semester (as a deferral possibility)
        let existingPlannedIndex = -1;
        for (let i = 0; i < plannedCourses.length; i++) {
          if (plannedCourses[i].courseId === courseId) {
            existingPlannedIndex = i;
            break;
          }
        }

        if (existingPlannedIndex >= 0) {
          // The course was already planned (possibly as a deferral), just mark it as retake
          await this.prisma.plannedCourse.update({
            where: { id: plannedCourses[existingPlannedIndex].id },
            data: {
              isRetake: true,
              isDeferred: false,
              gradeStatus: null, // Reset grade status for retake attempt
            },
          });
        } else {
          // Need to create a new planned course entry for the retake
          await this.prisma.plannedCourse.create({
            data: {
              semesterPlanId: academicPlan.semesters.find(s => s.semesterNumber === targetSemester)!.id,
              courseId: courseId,
              courseCode: failedCourse.code,
              creditHours: failedCourse.creditHours,
              isRetake: true,
              isDeferred: false,
              gradeStatus: null,
            },
          });
        }

        retakeInserted = true;

        // If we exceeded the standard limit (20) but are within appeal limit (21), note that appeal is needed
        if (totalWithRetake > maxCreditsPerSemester) {
          // In a full implementation, we would flag this for appeal processing
          // For now, we'll just note it in the response
        }
      } else {
        // Can't fit in this semester, need to defer some courses to make room
        // Find non-retake, non-deferred courses that could be deferred
        const deferrableCourses = plannedCourses.filter(pc =>
          !pc.isRetake && !pc.isDeferred && pc.courseId !== courseId
        );

        // Sort by credit hours descending to defer larger courses first (more efficient)
        deferrableCourses.sort((a, b) => b.creditHours - a.creditHours);

        let creditsNeeded = totalWithRetake - maxCreditsWithAppeal; // How much we need to free up
        let creditsDeferred = 0;

        for (const course of deferrableCourses) {
          if (creditsDeferred >= creditsNeeded) break;

          // Mark this course as deferred
          await this.prisma.plannedCourse.update({
            where: { id: course.id },
            data: {
              isDeferred: true,
            },
          });

          deferredCourses.push({
            courseId: course.courseId,
            courseCode: course.courseCode,
            creditHours: course.creditHours,
          });

          creditsDeferred += course.creditHours;
        }

        // Recalculate after deferrals
        let plannedCreditsAfterDeferral = 0;
        for (const pc of plannedCourses) {
          if (!pc.isRetake && !pc.isDeferred) {
            plannedCreditsAfterDeferral += pc.creditHours;
          }
        }

        const totalWithRetakeAfterDeferral = mqaCredits + plannedCreditsAfterDeferral + failedCourseCredits;

        if (totalWithRetakeAfterDeferral <= maxCreditsWithAppeal) {
          // Now we can fit the retake
          // Find or create the retake course entry
          let existingPlannedIndex = -1;
          for (let i = 0; i < plannedCourses.length; i++) {
            if (plannedCourses[i].courseId === courseId) {
              existingPlannedIndex = i;
              break;
            }
          }

          if (existingPlannedIndex >= 0) {
            // The course was already planned (possibly as a deferral), just mark it as retake
            await this.prisma.plannedCourse.update({
              where: { id: plannedCourses[existingPlannedIndex].id },
              data: {
                isRetake: true,
                isDeferred: false,
                gradeStatus: null, // Reset grade status for retake attempt
              },
            });
          } else {
            // Need to create a new planned course entry for the retake
            await this.prisma.plannedCourse.create({
              data: {
                semesterPlanId: academicPlan.semesters.find(s => s.semesterNumber === targetSemester)!.id,
                courseId: courseId,
                courseCode: failedCourse.code,
                creditHours: failedCourse.creditHours,
                isRetake: true,
                isDeferred: false,
                gradeStatus: null,
              },
            });
          }

          retakeInserted = true;

          // If we exceeded the standard limit (20) but are within appeal limit (21), note that appeal is needed
          if (totalWithRetakeAfterDeferral > maxCreditsPerSemester) {
            // In a full implementation, we would flag this for appeal processing
            // For now, we'll just note it in the response
          }
        }
        // If still can't fit, continue to next semester
      }

      if (!retakeInserted) {
        targetSemester++;
      }
    }

    // If we went beyond the maximum semesters, we need to extend the timeline
    let timelineExtended = false;
    if (!retakeInserted && targetSemester > maxSemesters) {
      // In a full implementation, we would:
      // 1. Add additional semesters to the academic plan
      // 2. Insert the retake course into the new semester
      // 3. Update projected graduation date

      timelineExtended = true;
      // For now, we'll just note this in the response
    }

    // Recalculate projected graduation date based on updated plan
    const updatedAcademicPlan = await this.prisma.academicPlan.findUnique({
      where: { id: academicPlan.id },
      include: {
        semesters: {
          include: {
            plannedCourses: {
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
    });

    // Update projected graduation date in academic plan
    const projectedGraduation = this.calculateProjectedGraduationFromPlan(updatedAcademicPlan);
    await this.prisma.academicPlan.update({
      where: { id: academicPlan.id },
      data: {
        projectedGraduation,
        hasExtension: timelineExtended ||
          (updatedAcademicPlan.projectedGraduation !== updatedAcademicPlan.originalGraduation),
        lastRevisedAt: new Date(),
      },
    });

    return {
      message: `Course failure processed for student ${studentId}, course ${courseId}`,
      academicPlanId: academicPlan.id,
      details: {
        failedCourse: {
          courseId: failedCourse.code,
          courseName: failedCourse.name,
          creditHours: failedCourse.creditHours,
          originalSemester: failedSemesterNumber,
        },
        retakeInserted: retakeInserted,
        retakeSemester: retakeInserted ? targetSemester : null,
        timelineExtended: timelineExtended,
        deferredCourses: deferredCourses,
        nextSteps: [
          retakeInserted
            ? `Retake course ${failedCourse.code} scheduled for semester ${targetSemester}`
            : `Could not place retake course ${failedCourse.code} within curriculum timeline`,
          ...(deferredCourses.length > 0
            ? [`Deferred ${deferredCourses.length} courses to make room for retake:`]
            : []),
          ...deferredCourses.map(course =>
            `  - ${course.courseCode} (${course.creditHours} credits)`
          ),
          timelineExtended
            ? ['Academic timeline extended to accommodate retake']
            : [],
          ...(totalWithRetake > maxCreditsPerSemester && retakeInserted
            ? [`Semester ${targetSemester} requires appeal for credit overload (${totalWithRetake} > ${maxCreditsPerSemester} credits)`]
            : []),
          'Student should review updated academic plan with advisor',
          'Monitor progress and adjust as needed based on actual course availability'
        ]
      }
    };
  }

  /**
   * Update student progress based on exam results and enrolments
   * This calculates earned credits, GPA, and updates academic standing
   */
  async updateStudentProgress(studentId: string): Promise<any> {
    // Get student with enrolments and exam results
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        enrolments: {
          include: {
            courseOffering: {
              include: {
                course: true,
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
        },
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
      },
    });

    if (!student) {
      throw new NotFoundException(`Student not found: ${studentId}`);
    }

    // Calculate earned credits and GPA from exam results
    let totalCreditsEarned = 0;
    let totalGradePoints = 0;
    let totalCourses = 0;
    let passedCourses = 0;

    // Process exam results to calculate earned credits and GPA
    for (const examResult of student.examResults) {
      // Only count results that have been released
      if (examResult.releasedAt) {
        totalCourses++;

        // Only count if the student passed the course
        if (examResult.gradeStatus === 'PASS') {
          passedCourses++;
          totalCreditsEarned += examResult.courseOffering.course.creditHours;
          totalGradePoints += (examResult.gradePoint || 0) * examResult.courseOffering.course.creditHours;
        }
      }
    }

    // Calculate GPA (grade points per credit)
    const cumulativeGpa = totalCreditsEarned > 0 ? totalGradePoints / totalCreditsEarned : 0.0;

    // Determine academic plan status based on performance
    let planStatus = 'ON_TRACK';

    // Check if student is behind on credits (simplified logic)
    // In reality, this would compare against expected credits for current semester
    const expectedCreditsBySemester = 20; // Assuming 20 credits per semester as target
    const expectedCredits = student.currentSemester * expectedCreditsBySemester;

    if (totalCreditsEarned < expectedCredits * 0.8) { // Behind by more than 20%
      planStatus = 'DELAYED';
    }

    if (totalCreditsEarned < expectedCredits * 0.5) { // Behind by more than 50%
      planStatus = 'EXTENSION_REQUIRED';
    }

    // Update student record with calculated progress
    const updatedStudent = await this.prisma.student.update({
      where: { id: studentId },
      data: {
        totalCreditsEarned,
        cumulativeGpa: Number(cumulativeGpa.toFixed(2)), // Keep 2 decimal places
        planStatus,
        // Update current semester based on earned credits (simplified)
        currentSemester: Math.min(
          Math.floor(totalCreditsEarned / expectedCreditsBySemester) + 1,
          12 // Cap at reasonable maximum
        ),
      },
    });

    // Update projected graduation date if needed
    if (academicPlan) {
      const projectedGraduation = this.calculateProjectedGraduation(
        student,
        totalCreditsEarned,
        cumulativeGpa
      );

      await this.prisma.academicPlan.update({
        where: { id: academicPlan.id },
        data: {
          projectedGraduation,
          hasExtension: projectedGraduation !== academicPlan.originalGraduation,
          lastRevisedAt: new Date(),
        },
      });
    }

    return {
      studentId: updatedStudent.id,
      totalCreditsEarned: updatedStudent.totalCreditsEarned,
      cumulativeGpa: updatedStudent.cumulativeGpa,
      planStatus: updatedStudent.planStatus,
      currentSemester: updatedStudent.currentSemester,
      progressSummary: {
        totalCoursesAttempted: totalCourses,
        totalCoursesPassed: passedCourses,
        passRate: totalCourses > 0 ? (passedCourses / totalCourses) * 100 : 0,
        creditsEarned: totalCreditsEarned,
        gpa: cumulativeGpa,
      },
    };
  }

  /**
   * Calculate projected graduation date based on current progress
   */
  private calculateProjectedGraduation(student: any, totalCreditsEarned: number, cumulativeGpa: number): string {
    // Get student's programme version to see remaining requirements
    if (!student.programmeVersion) {
      return this.calculateOriginalGraduation(student); // Fallback
    }

    // Get total credits required for graduation
    // In a real system, this would come from the programme structure
    const totalCreditsRequired = 120; // Typical undergraduate degree

    // Calculate remaining credits
    const remainingCredits = Math.max(0, totalCreditsRequired - totalCreditsEarned);

    // Calculate remaining semesters needed (assuming 20 credits per semester)
    const remainingSemesters = Math.ceil(remainingCredits / 20);

    // Project graduation date based on current semester and remaining semesters
    const projectedSemesterNumber = student.currentSemester + remainingSemesters;

    // Convert to academic year/semester format (simplified)
    // This assumes semester 1 = Fall, semester 2 = Spring
    const baseYear = student.intakeYear;
    const baseSemester = 1; // Assuming started in semester 1 (Fall)

    let projectedYear = baseYear;
    let projectedSemester = baseSemester + (projectedSemesterNumber - 1);

    // Handle year rollover (2 semesters per year)
    while (projectedSemester > 2) {
      projectedYear++;
      projectedSemester -= 2;
    }

    // Adjust for intake period (simplified - assuming Fall intake)
    // In reality, this would be more complex based on actual intake period

    return `${projectedYear}-S${projectedSemester}`;
  }

  /**
   * Get comprehensive student progress report
   */
  async getProgressReport(studentId: string): Promise<any> {
    // Update progress first to ensure we have latest data
    const progressUpdate = await this.updateStudentProgress(studentId);

    // Get student with full details
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: true,
        programme: {
          include: {
            faculty: true,
          },
        },
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
        enrolments: {
          include: {
            courseOffering: {
              include: {
                course: true,
                semester: true,
              },
            },
          },
          orderBy: {
            enrolledAt: 'desc',
          },
          take: 10, // Recent enrolments
        },
        examResults: {
          include: {
            courseOffering: {
              include: {
                course: true,
                semester: true,
              },
            },
          },
          orderBy: {
            releasedAt: 'desc',
          },
          take: 10, // Recent exam results
        },
      },
    });

    if (!student) {
      throw new NotFoundException(`Student not found: ${studentId}`);
    }

    // Calculate detailed statistics
    const passedExams = student.examResults.filter(
      result => result.releasedAt && result.gradeStatus === 'PASS'
    );

    const failedExams = student.examResults.filter(
      result => result.releasedAt && result.gradeStatus === 'FAIL'
    );

    const totalAttemptedCredits = student.examResults
      .filter(result => result.releasedAt)
      .reduce((sum, result) => sum + (result.courseOffering?.course?.creditHours || 0), 0);

    const earnedCredits = passedExams
      .reduce((sum, result) => sum + (result.courseOffering?.course?.creditHours || 0), 0);

    // Calculate GPA from exam results
    let totalGradePoints = 0;
    let totalCreditsForGpa = 0;

    for (const exam of passedExams) {
      const creditHours = exam.courseOffering?.course?.creditHours || 0;
      const gradePoints = exam.gradePoint || 0;
      totalGradePoints += gradePoints * creditHours;
      totalCreditsForGpa += creditHours;
    }

    const calculatedGpa = totalCreditsForGpa > 0 ? totalGradePoints / totalCreditsForGpa : 0;

    return {
      student: {
        id: student.id,
        studentId: student.studentId,
        name: student.user?.name || 'Unknown',
        email: student.user?.email || '',
      },
      programme: {
        id: student.programme.id,
        name: student.programme.name,
        code: student.programme.code,
        faculty: {
          name: student.programme.faculty?.name || 'Unknown',
          code: student.programme.faculty?.code || 'Unknown',
        },
      },
      programmeVersion: {
        version: student.programmeVersion?.version || 'Unknown',
      },
      academicProgress: {
        currentSemester: student.currentSemester,
        totalCreditsEarned: student.totalCreditsEarned,
        totalCreditsRequired: 120, // Typical requirement
        creditsRemaining: Math.max(0, 120 - student.totalCreditsEarned),
        cumulativeGpa: Number(calculatedGpa.toFixed(2)),
        planStatus: student.planStatus,
        projectedGraduation: student.projectedGraduation ||
          this.calculateProjectedGraduation(student, student.totalCreditsEarned, calculatedGpa),
      },
      performance: {
        totalExamsAttempted: student.examResults.filter(r => r.releasedAt).length,
        totalExamsPassed: passedExams.length,
        totalExamsFailed: failedExams.length,
        passRate: student.examResults.filter(r => r.releasedAt).length > 0
          ? (passedExams.length / student.examResults.filter(r => r.releasedAt).length) * 100
          : 0,
      },
      recentActivity: {
        recentEnrolments: student.enrolments.map(enrolment => ({
          courseCode: enrolment.courseOffering?.course?.code || 'Unknown',
          courseName: enrolment.courseOffering?.course?.name || 'Unknown',
          semester: enrolment.courseOffering?.semester?.label || 'Unknown',
          enrolledAt: enrolment.enrolledAt,
        })),
        recentExamResults: student.examResults.map(exam => ({
          courseCode: exam.courseOffering?.course?.code || 'Unknown',
          courseName: exam.courseOffering?.course?.name || 'Unknown',
          semester: exam.courseOffering?.semester?.label || 'Unknown',
          grade: exam.grade || 'N/A',
          gradePoint: exam.gradePoint || null,
          releasedAt: exam.releasedAt,
        })),
      },
      academicPlan: student.academicPlan ? {
        id: student.academicPlan.id,
        originalGraduation: student.academicPlan.originalGraduation,
        projectedGraduation: student.academicPlan.projectedGraduation,
        hasExtension: student.academicPlan.hasExtension,
        lastRevisedAt: student.academicPlan.lastRevisedAt,
        semesterCount: student.academicPlan.semesters.length,
        totalPlannedCredits: student.academicPlan.semesters.reduce(
          (sum, semester) => sum + semester.totalCredits, 0
        ),
      } : null,
    };
  }

  findAll() {
    return { module: 'M02 — Student Academic Profile', status: 'ready' };
  }
}
