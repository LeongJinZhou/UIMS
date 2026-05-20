import { Test, TestingModule } from '@nestjs/testing';
import { TimetableService } from './timetable.service';
import { PrismaService } from '../../database/prisma.service';

describe('TimetableService', () => {
  let service: TimetableService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimetableService,
        {
          provide: PrismaService,
          useValue: {
            semester: {
              findUnique: jest.fn(),
            },
            room: {
              findMany: jest.fn(),
            },
            lecturer: {
              findMany: jest.fn(),
            },
            timetable: {
              create: jest.fn(),
            },
            timetableSlot: {
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<TimetableService>(TimetableService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateTimetable', () => {
    it('should generate a timetable with slots', async () => {
      // Mock data
      const mockSemester = {
        id: 'semester-1',
        label: '2026-S1',
        offerings: [
          {
            id: 'course-offering-1',
            course: { id: 'course-1', code: 'CS101', name: 'Intro to CS' },
            lecturerId: 'lecturer-1',
            lecturer: { id: 'lecturer-1' },
            sections: [
              { id: 'section-1', sectionCode: 'A', combinedHeadcount: 30 },
            ],
          },
        ],
      };

      const mockRooms = [
        {
          id: 'room-1',
          code: 'A101',
          name: 'Room 101',
          capacity: 50,
          venue: { id: 'venue-1', name: 'Building A' },
          equipment: [],
        },
      ];

      const mockLecturers = [
        {
          id: 'lecturer-1',
          user: { id: 'user-1', name: 'John Doe' },
          availability: [
            {
              id: 'availability-1',
              lecturerId: 'lecturer-1',
              semesterId: 'semester-1',
              availableDays: [0, 1, 2, 3, 4], // Mon-Fri
              preferredStartTime: '08:00',
              preferredEndTime: '17:00',
            },
          ],
        },
      ];

      const mockTimetable = {
        id: 'timetable-1',
        semesterId: 'semester-1',
        generatedAt: new Date(),
        approvalState: 'DRAFT',
      };

      const mockTimetableSlot = {
        id: 'slot-1',
        timetableId: 'timetable-1',
        courseOfferingId: 'course-offering-1',
        sectionId: 'section-1',
        venueId: 'room-1',
        dayOfWeek: 0,
        startTime: '08:00',
        endTime: '09:00',
        status: 'SCHEDULED',
      };

      // Mock prisma methods
      prismaService.semester.findUnique.mockResolvedValue(mockSemester);
      prismaService.room.findMany.mockResolvedValue(mockRooms);
      prismaService.lecturer.findMany.mockResolvedValue(mockLecturers);
      prismaService.timetable.create.mockResolvedValue(mockTimetable);
      prismaService.timetableSlot.create.mockResolvedValue(mockTimetableSlot);

      // Call the method
      const result = await service.generateTimetable('semester-1');

      // Assertions
      expect(result).toHaveProperty('timetableId');
      expect(result).toHaveProperty('semesterId');
      expect(result).toHaveProperty('slotsGenerated');
      expect(result.slotsGenerated).toBeGreaterThan(0);
      expect(prismaService.timetable.create).toHaveBeenCalled();
      expect(prismaService.timetableSlot.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when semester not found', async () => {
      prismaService.semester.findUnique.mockResolvedValue(null);

      await expect(service.generateTimetable('non-existent')).rejects.toThrow(
        'Semester not found: non-existent',
      );
    });
  });
});