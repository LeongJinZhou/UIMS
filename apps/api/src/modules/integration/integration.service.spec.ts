// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationService } from './integration.service';
import { PrismaService } from '../../database/prisma.service';
import { TimetableService } from '../timetable/timetable.service';
import { ExamService } from '../exam/exam.service';
import { StudentService } from '../student/student.service';
import { ProgrammeService } from '../programme/programme.service';

describe('IntegrationService', () => {
  let service: IntegrationService;
  let prismaService: PrismaService;
  let timetableService: TimetableService;
  let examService: ExamService;
  let studentService: StudentService;
  let programmeService: ProgrammeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationService,
        {
          provide: PrismaService,
          useValue: {
            courseOffering: {
              findUnique: jest.fn(),
            },
            semester: {
              findUnique: jest.fn(),
            },
            enrolment: {
              findUnique: jest.fn(),
            },
            examResult: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: TimetableService,
          useValue: {
            handleCourseOfferingChange: jest.fn(),
            handleSemesterChange: jest.fn(),
          },
        },
        {
          provide: ExamService,
          useValue: {
            handleCourseOfferingChange: jest.fn(),
            handleSemesterChange: jest.fn(),
          },
        },
        {
          provide: StudentService,
          useValue: {
            handleCourseOfferingChange: jest.fn(),
            handleSemesterChange: jest.fn(),
            updateStudentProgress: jest.fn(),
          },
        },
        {
          provide: ProgrammeService,
          useValue: {
          },
        },
      ],
    }).compile();

    service = module.get<IntegrationService>(IntegrationService);
    prismaService = module.get<PrismaService>(PrismaService);
    timetableService = module.get<TimetableService>(TimetableService);
    examService = module.get<ExamService>(ExamService);
    studentService = module.get<StudentService>(StudentService);
    programmeService = module.get<ProgrammeService>(ProgrammeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleCourseOfferingChange', () => {
    it('should propagate course offering changes to all modules', async () => {
      const mockCourseOffering = {
        id: 'course-offering-1',
        course: { id: 'course-1', code: 'CS101' },
        semester: { id: 'semester-1' },
        lecturer: { id: 'lecturer-1' },
      };

      prismaService.courseOffering.findUnique.mockResolvedValue(mockCourseOffering);

      await service.handleCourseOfferingChange('CREATE', 'course-offering-1');

      expect(timetableService.handleCourseOfferingChange).toHaveBeenCalledWith(
        'CREATE',
        mockCourseOffering,
      );
      expect(examService.handleCourseOfferingChange).toHaveBeenCalledWith(
        'CREATE',
        mockCourseOffering,
      );
      expect(studentService.handleCourseOfferingChange).toHaveBeenCalledWith(
        'CREATE',
        mockCourseOffering,
      );
    });
  });

  describe('handleSemesterChange', () => {
    it('should propagate semester changes to all modules', async () => {
      const mockSemester = {
        id: 'semester-1',
        courseOfferings: [
          {
            id: 'course-offering-1',
            course: { id: 'course-1', code: 'CS101' },
            lecturer: { id: 'lecturer-1' },
            sections: [],
          },
        ],
      };

      prismaService.semester.findUnique.mockResolvedValue(mockSemester);

      await service.handleSemesterChange('UPDATE', 'semester-1');

      expect(timetableService.handleSemesterChange).toHaveBeenCalledWith(
        'UPDATE',
        mockSemester,
      );
      expect(examService.handleSemesterChange).toHaveBeenCalledWith(
        'UPDATE',
        mockSemester,
      );
      expect(studentService.handleSemesterChange).toHaveBeenCalledWith(
        'UPDATE',
        mockSemester,
      );
    });
  });

  describe('handleEnrolmentChange', () => {
    it('should update student progress when enrolment changes', async () => {
      const mockEnrolment = {
        id: 'enrolment-1',
        studentId: 'student-1',
        courseOffering: {
          id: 'course-offering-1',
          course: { id: 'course-1', code: 'CS101' },
          semester: { id: 'semester-1' },
        },
        section: { id: 'section-1' },
      };

      prismaService.enrolment.findUnique.mockResolvedValue(mockEnrolment);

      await service.handleEnrolmentChange('CREATE', 'enrolment-1');

      expect(studentService.updateStudentProgress).toHaveBeenCalledWith(
        'student-1',
      );
    });
  });

  describe('handleExamResultsChange', () => {
    it('should update student progress when exam results change', async () => {
      const mockExamResult = {
        id: 'exam-result-1',
        studentId: 'student-1',
        courseOffering: {
          id: 'course-offering-1',
          course: { id: 'course-1', code: 'CS101' },
          semester: { id: 'semester-1' },
        },
      };

      prismaService.examResult.findUnique.mockResolvedValue(mockExamResult);

      await service.handleExamResultsChange('CREATE', 'exam-result-1');

      expect(studentService.updateStudentProgress).toHaveBeenCalledWith(
        'student-1',
      );
    });
  });

  describe('synchronizeModuleData', () => {
    it('should log synchronization completion', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.synchronizeModuleData();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Module data synchronization completed'),
        expect.any(String),
      );
      consoleSpy.mockRestore();
    });
  });
});