// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { HrService } from './hr.service';
import { PrismaService } from '../../database/prisma.service';

describe('HrService', () => {
  let service: HrService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HrService,
        {
          provide: PrismaService,
          useValue: {
            lecturer: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            leaveRecord: {
              findMany: jest.fn(),
              create: jest.fn(),
              count: jest.fn(),
            },
            course: {
              count: jest.fn(),
            },
            lecturerAvailability: {
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<HrService>(HrService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getLecturersWithDetails', () => {
    it('should return lecturers with details', async () => {
      const mockLecturers = [
        {
          id: 'lecturer-1',
          user: { id: 'user-1', name: 'John Doe' },
          faculty: { id: 'faculty-1', name: 'Faculty of Science' },
          availability: [],
          leaveRecords: [],
          offerings: [],
        },
      ];

      prismaService.lecturer.findMany.mockResolvedValue(mockLecturers);

      const result = await service.getLecturersWithDetails();

      expect(result).toEqual(mockLecturers);
      expect(prismaService.lecturer.findMany).toHaveBeenCalledWith({
        include: {
          user: true,
          faculty: true,
          availability: true,
          leaveRecords: true,
          offerings: true,
        },
        where: { isActive: true },
      });
    });
  });

  describe('getLecturer', () => {
    it('should return a lecturer with details', async () => {
      const mockLecturer = {
        id: 'lecturer-1',
        user: { id: 'user-1', name: 'John Doe' },
        faculty: { id: 'faculty-1', name: 'Faculty of Science' },
        availability: [],
        leaveRecords: [],
        offerings: [],
      };

      prismaService.lecturer.findUnique.mockResolvedValue(mockLecturer);

      const result = await service.getLecturer('lecturer-1');

      expect(result).toEqual(mockLecturer);
      expect(prismaService.lecturer.findUnique).toHaveBeenCalledWith({
        where: { id: 'lecturer-1' },
        include: {
          user: true,
          faculty: true,
          availability: true,
          leaveRecords: true,
          offerings: {
            include: {
              course: true,
              semester: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException when lecturer not found', async () => {
      prismaService.lecturer.findUnique.mockResolvedValue(null);

      await expect(service.getLecturer('non-existent')).rejects.toThrow(
        'Lecturer not found: non-existent',
      );
    });
  });

  describe('getLecturerWorkload', () => {
    it('should calculate lecturer workload correctly', async () => {
      const mockLecturer = {
        id: 'lectorer-1',
        user: { name: 'John Doe' },
        department: 'Computer Science',
        contractType: 'FULL_TIME',
        maxTeachingLoad: 20,
        offerings: [
          {
            course: { creditHours: 3 },
            semester: { isActive: true },
          },
          {
            course: { creditHours: 4 },
            semester: { isActive: true },
          },
          {
            course: { creditHours: 3 },
            semester: { isActive: false }, // Should not be counted
          },
        ],
      };

      prismaService.lecturer.findUnique.mockResolvedValue(mockLecturer);

      const result = await service.getLecturerWorkload('lecture-1');

      expect(result).toEqual({
        lecturerId: 'lecture-1',
        lecturerName: 'John Doe',
        department: 'Computer Science',
        contractType: 'FULL_TIME',
        maxTeachingLoad: 20,
        currentCreditHours: 7, // 3 + 4
        currentSemesterOfferings: 2,
        workloadPercentage: 35, // (7/20)*100
        isOverloaded: false,
      });
    });

    it('should handle zero max teaching load', async () => {
      const mockLecturer = {
        id: 'lecture-1',
        user: { name: 'John Doe' },
        department: 'Computer Science',
        contractType: 'FULL_TIME',
        maxTeachingLoad: 0,
        offerings: [
          {
            course: { creditHours: 3 },
            semester: { isActive: true },
          },
        ],
      };

      prismaService.lecturer.findUnique.mockResolvedValue(mockLecturer);

      const result = await service.getLecturerWorkload('lecture-1');

      expect(result.workloadPercentage).toBe(0);
      expect(result.isOverloaded).toBe(false);
    });
  });

  describe('createLeaveRecord', () => {
    it('should create a leave record', async () => {
      const mockLecturer = {
        id: 'lecture-1',
      };

      const mockLeaveRecord = {
        id: 'leave-1',
        lecturerId: 'lecture-1',
        leaveDate: new Date('2026-06-01'),
        returnDate: new Date('2026-06-07'),
        leaveType: 'ANNUAL',
        status: 'PENDING',
        replacementLecturerId: 'lecture-2',
      };

      prismaService.lecturer.findUnique.mockResolvedValue(mockLecturer);
      prismaService.leaveRecord.create.mockResolvedValue(mockLeaveRecord);

      const result = await service.createLeaveRecord('lecture-1', {
        leaveType: 'ANNUAL',
        startDate: '2026-06-01',
        endDate: '2026-06-07',
        replacementLecturerId: 'lecture-2',
      });

      expect(result).toEqual(mockLeaveRecord);
      expect(prismaService.leaveRecord.create).toHaveBeenCalledWith({
        data: {
          lecturerId: 'lecture-1',
          leaveDate: new Date('2026-06-01'),
          returnDate: new Date('2026-06-07'),
          leaveType: 'ANNUAL',
          status: 'PENDING',
          replacementLecturerId: 'lecture-2',
        },
      });
    });

    it('should throw NotFoundException when lecturer not found', async () => {
      prismaService.lecturer.findUnique.mockResolvedValue(null);

      await expect(
        service.createLeaveRecord('non-existent', {
          leaveType: 'ANNUAL',
          startDate: '2026-06-01',
          endDate: '2026-06-07',
        }),
      ).rejects.toThrow('Lecturer not found: non-existent');
    });

    it('should throw NotFoundException when replacement lecturer not found', async () => {
      const mockLecturer = {
        id: 'lecture-1',
      };

      prismaService.lecturer.findUnique.mockResolvedValue(mockLecturer);
      prismaService.lecturer.findUnique.mockResolvedValueOnce(mockLecturer); // For lecturer
      prismaService.lecturer.findUnique.mockResolvedValueOnce(null); // For replacement lecturer

      await expect(
        service.createLeaveRecord('lecture-1', {
          leaveType: 'ANNUAL',
          startDate: '2026-06-01',
          endDate: '2026-06-07',
          replacementLecturerId: 'non-existent',
        }),
      ).rejects.toThrow('Replacement lecturer not found: non-existent');
    });
  });

  describe('getHrDashboard', () => {
    it('should return HR dashboard statistics', async () => {
      prismaService.lecturer.count.mockResolvedValueOnce(10); // total
      prismaService.lecturer.count.mockResolvedValueOnce(8); // active
      prismaService.leaveRecord.count.mockResolvedValueOnce(2); // on leave
      prismaService.course.count.mockResolvedValueOnce(50);
      prismaService.lecturerAvailability.count.mockResolvedValueOnce(5); // availability count

      const result = await service.getHrDashboard();

      expect(result).toEqual({
        totalLecturers: 10,
        activeLecturers: 8,
        onLeaveLecturers: 2,
        totalCourses: 50,
        lecturerUtilizationRate: 80, // (8/10)*100
        availabilityCoverageRate: 50, // (5/10)*100
      });
    });
  });

});