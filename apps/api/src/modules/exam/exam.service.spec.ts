import { Test, TestingModule } from '@nestjs/testing';
import { ExamService } from './exam.service';
import { PrismaService } from '../../database/prisma.service';

describe('ExamService', () => {
  let service: ExamService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamService,
        {
          provide: PrismaService,
          useValue: {
            semester: {
              findUnique: jest.fn(),
            },
            venue: {
              findMany: jest.fn(),
            },
            lecturer: {
              findMany: jest.fn(),
            },
            examTimetable: {
              create: jest.fn(),
            },
            examTimetableSlot: {
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ExamService>(ExamService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('scheduleExaminations', () => {
    it('should schedule examinations with venue allocation', async () => {
      // Mock data
      const mockSemester = {
        id: 'semester-1',
        label: '2026-S1',
        courseOfferings: [
          {
            id: 'course-offering-1',
            course: { id: 'course-1', code: 'CS101', name: 'Intro to CS', creditHours: 3 },
            currentEnrolment: 25,
          },
        ],
      };

      const mockVenues = [
        {
          id: 'venue-1',
          name: 'Building A',
          rooms: [
            {
              id: 'room-1',
              code: 'A101',
              name: 'Room 101',
              capacity: 50,
              venue: { id: 'venue-1', name: 'Building A' },
              equipment: [],
              isActive: true,
            },
          ],
          isActive: true,
        },
      ];

      const mockLecturers = [
        {
          id: 'lecturer-1',
          user: { id: 'user-1', name: 'John Doe' },
          isActive: true,
        },
      ];

      const mockExamTimetable = {
        id: 'exam-timetable-1',
        semesterId: 'semester-1',
        generatedAt: new Date(),
        status: 'DRAFT',
      };

      const mockExamTimetableSlot = {
        id: 'exam-slot-1',
        examTimetableId: 'exam-timetable-1',
        courseOfferingId: 'course-offering-1',
        venueId: 'venue-1',
        invigilatorId: 'lecturer-1',
        date: new Date('2026-06-01'),
        startTime: '09:00',
        endTime: '12:00',
        durationMinutes: 180,
        expectedAttendance: 28,
        status: 'SCHEDULED',
      };

      // Mock prisma methods
      prismaService.semester.findUnique.mockResolvedValue(mockSemester);
      prismaService.venue.findMany.mockResolvedValue(mockVenues);
      prismaService.lecturer.findMany.mockResolvedValue(mockLecturers);
      prismaService.examTimetable.create.mockResolvedValue(mockExamTimetable);
      prismaService.examTimetableSlot.create.mockResolvedValue(mockExamTimetableSlot);

      // Call the method
      const result = await service.scheduleExaminations('semester-1');

      // Assertions
      expect(result).toHaveProperty('examTimetableId');
      expect(result).toHaveProperty('semesterId');
      expect(result).toHaveProperty('examsScheduled');
      expect(result.examsScheduled).toBeGreaterThan(0);
      expect(prismaService.examTimetable.create).toHaveBeenCalled();
      expect(prismaService.examTimetableSlot.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when semester not found', async () => {
      prismaService.semester.findUnique.mockResolvedValue(null);

      await expect(service.scheduleExaminations('non-existent')).rejects.toThrow(
        'Semester not found: non-existent',
      );
    });
  });
});