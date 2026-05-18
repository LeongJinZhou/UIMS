import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parser';

@Injectable()
export class ProgrammeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Import MQA course structure from CSV file
   * Expected CSV format: programmeCode,version,semesterNumber,courseCode,isElective
   */
  async importMqaCourseStructure(filePath: string): Promise<any> {
    // Validate file exists
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`File not found: ${filePath}`);
    }

    const results = [];

    // Read and parse CSV file
    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
          try {
            await this.processMqaData(results);
            resolve({
              message: 'MQA course structure imported successfully',
              recordsProcessed: results.length
            });
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * Process parsed MQA data and save to database
   */
  private async processMqaData(data: any[]): Promise<void> {
    // Group data by programme and version
    const groupedData = this.groupByProgrammeAndVersion(data);

    for (const [programmeKey, programmeData] of Object.entries(groupedData)) {
      const { programmeCode, version } = programmeKey;

      // Find or create faculty (assuming we need to map from programmeCode or have faculty info)
      // For now, we'll need facultyId - in a real system, this would come from the data or mapping
      const faculty = await this.prisma.faculty.findFirst({
        where: { code: { contains: programmeCode.substring(0, 3).toUpperCase() } }, // Simple mapping
      });

      if (!faculty) {
        throw new BadRequestException(`Faculty not found for programme ${programmeCode}`);
      }

      // Find or create programme
      let programme = await this.prisma.programme.findFirst({
        where: { code: programmeCode },
      });

      if (!programme) {
        programme = await this.prisma.programme.create({
          data: {
            name: `${programmeCode} Programme`, // Default name, should be improved
            code: programmeCode,
            facultyId: faculty.id,
            totalCredits: 0, // Will be calculated from courses
            maxDurationSemesters: 8, // Default
            mqaRefNumber: `MQA-${programmeCode}-${version}`, // Default MQA ref
          },
        });
      }

      // Find or create programme version
      let programmeVersion = await this.prisma.programmeVersion.findFirst({
        where: {
          programmeId: programme.id,
          version,
        },
      });

      if (!programmeVersion) {
        programmeVersion = await this.prisma.programmeVersion.create({
          data: {
            programmeId: programme.id,
            version,
            effectiveFrom: new Date(), // Default to now
          },
        });
      }

      // Process semesters and courses
      const semesters = this.groupBySemester(programmeData);

      for (const [semesterNumber, semesterData] of Object.entries(semesters)) {
        // Find or create MQA semester plan
        let mqaSemesterPlan = await this.prisma.mqaSemesterPlan.findFirst({
          where: {
            programmeVersionId: programmeVersion.id,
            semesterNumber: parseInt(semesterNumber),
          },
        });

        if (!mqaSemesterPlan) {
          mqaSemesterPlan = await this.prisma.mqaSemesterPlan.create({
            data: {
              programmeVersionId: programmeVersion.id,
              semesterNumber: parseInt(semesterNumber),
              totalCredits: 0, // Will be calculated
            },
          });
        }

        // Process courses in this semester
        let totalCredons = 0;

        for (const courseData of semesterData) {
          // Find course by code
          const course = await this.prisma.course.findFirst({
            where: { code: courseData.courseCode },
          });

          if (!course) {
            throw new BadRequestException(`Course not found: ${courseData.courseCode}`);
          }

          // Find or create MQA plan course entry
          await this.prisma.mqaPlanCourse.upsert({
            where: {
              semesterPlanId_courseId: {
                semesterPlanId: mqaSemesterPlan.id,
                courseId: course.id,
              },
            },
            update: {
              isElective: courseData.isElective === 'true' || courseData.isElective === true,
            },
            create: {
              semesterPlanId: mqaSemesterPlan.id,
              courseId: course.id,
              isElective: courseData.isElective === 'true' || courseData.isElective === true,
            },
          });

          totalCredons += course.creditHours;
        }

        // Update semester plan with total credits
        await this.prisma.mqaSemesterPlan.update({
          where: { id: mqaSemesterPlan.id },
          data: { totalCredons },
        });

        // Update programme total credits (sum of all semesters)
        // This is simplified - in reality, you'd calculate based on curriculum rules
      }
    }
  }

  /**
   * Get complete programme structure for viewing by HoP/PC
   */
  async getProgrammeStructure(versionId: string) {
    const programmeVersion = await this.prisma.programmeVersion.findUnique({
      where: { id: versionId },
      include: {
        programme: true,
        semesterPlans: {
          include: {
            mqaPlanCourses: {
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

    if (!programmeVersion) {
      throw new NotFoundException(`Programme version not found: ${versionId}`);
    }

    // Calculate statistics
    let totalCredits = 0;
    let totalCourses = 0;
    let electiveCourses = 0;

    for (const semesterPlan of programmeVersion.semesterPlans) {
      for (const planCourse of semesterPlan.mqaPlanCourses) {
        totalCourses++;
        totalCredits += planCourse.course.creditHours;
        if (planCourse.isElective) {
          electiveCourses++;
        }
      }
    }

    return {
      programme: {
        id: programmeVersion.programme.id,
        code: programmeVersion.programme.code,
        name: programmeVersion.programme.name,
        faculty: {
          id: programmeVersion.programme.faculty.id,
          name: programmeVersion.programme.faculty.name,
          code: programmeVersion.programme.faculty.code,
        },
      },
      version: {
        id: programmeVersion.id,
        version: programmeVersion.version,
        effectiveFrom: programmeVersion.effectiveFrom,
        effectiveTo: programmeVersion.effectiveTo,
        isActive: programmeVersion.isActive,
      },
      structure: {
        totalSemesters: programmeVersion.semesterPlans.length,
        totalCourses,
        totalCredits,
        electiveCourses,
        coreCourses: totalCourses - electiveCourses,
        semesters: programmeVersion.semesterPlans.map((semester) => ({
          semesterNumber: semester.semesterNumber,
          totalCredits: semester.totalCredits,
          courses: semester.mqaPlanCourses.map((planCourse) => ({
            id: planCourse.id,
            course: {
              id: planCourse.course.id,
              code: planCourse.course.code,
              name: planCourse.course.name,
              creditHours: planCourse.course.creditHours,
              courseType: planCourse.course.courseType,
              description: planCourse.course.description,
            },
            isElective: planCourse.isElective,
          })),
        })),
      },
    };
  }

  /**
   * Get detailed information for a specific semester
   */
  async getSemesterDetails(versionId: string, semesterNumber: number) {
    const programmeVersion = await this.prisma.programmeVersion.findUnique({
      where: { id: versionId },
      include: {
        programme: true,
        semesterPlans: {
          where: {
            semesterNumber,
          },
          include: {
            mqaPlanCourses: {
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
        },
      },
    });

    if (!programmeVersion) {
      throw new NotFoundException(`Programme version not found: ${versionId}`);
    }

    const semesterPlan = programmeVersion.semesterPlans[0];
    if (!semesterPlan) {
      throw new NotFoundException(`Semester ${semesterNumber} not found for version ${versionId}`);
    }

    // Calculate semester statistics
    let totalCredits = 0;
    let totalCourses = 0;
    let electiveCourses = 0;

    for (const planCourse of semesterPlan.mqaPlanCourses) {
      totalCourses++;
      totalCredits += planCourse.course.creditHours;
      if (planCourse.isElective) {
        electiveCourses++;
      }
    }

    return {
      programme: {
        id: programmeVersion.programme.id,
        code: programmeVersion.programme.code,
        name: programmeVersion.programme.name,
      },
      version: {
        id: programmeVersion.id,
        version: programmeVersion.version,
      },
      semester: {
        semesterNumber: semesterPlan.semesterNumber,
        totalCredits: semesterPlan.totalCredits,
      },
      courses: semesterPlan.mqaPlanCourses.map((planCourse) => ({
        id: planCourse.id,
        course: {
          id: planCourse.course.id,
          code: planCourse.course.code,
          name: planCourse.course.name,
          creditHours: planCourse.course.creditHours,
          courseType: planCourse.course.courseType,
          description: planCourse.course.description,
        },
        isElective: planCourse.isElective,
      })),
      statistics: {
        totalCourses,
        totalCredits,
        electiveCourses,
        coreCourses: totalCourses - electiveCourses,
      },
    };
  }

  /**
   * Group data by programme code and version
   */
  private groupByProgrammeAndVersion(data: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};

    for (const item of data) {
      const key = `${item.programmeCode}|${item.version}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    }

    return grouped;
  }

  /**
   * Group data by semester number
   */
  private groupBySemester(data: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};

    for (const item of data) {
      const key = item.semesterNumber;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    }

    return grouped;
  }

  findAll() {
    return { module: 'M01 — Programme & MQA Repository', status: 'ready' };
  }
}
