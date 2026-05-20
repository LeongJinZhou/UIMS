import { Test, TestingModule } from '@nestjs/testing';
import { VenueService } from './venue.service';
import { PrismaService } from '../../database/prisma.service';

describe('VenueService', () => {
  let service: VenueService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VenueService,
        {
          provide: PrismaService,
          useValue: {
            venue: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
            room: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
            roomEquipment: {
              findMany: jest.fn(),
              create: jest.fn(),
            },
            roomBooking: {
              findMany: jest.fn(),
              create: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            maintenanceBlock: {
              findMany: jest.fn(),
              create: jest.fn(),
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<VenueService>(VenueService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getVenuesWithDetails', () => {
    it('should return venues with rooms and equipment', async () => {
      const mockVenues = [
        {
          id: 'venue-1',
          name: 'Building A',
          rooms: [
            {
              id: 'room-1',
              venueId: 'venue-1',
              code: 'A101',
              name: 'Room 101',
              capacity: 50,
              isActive: true,
              equipment: [
                { id: 'equip-1', roomId: 'room-1', type: 'PROJECTOR', quantity: 1 },
              ],
              venue: { id: 'venue-1', name: 'Building A' },
            },
          ],
          isActive: true,
        },
      ];

      prismaService.venue.findMany.mockResolvedValue(mockVenues);

      const result = await service.getVenuesWithDetails();

      expect(result).toEqual(mockVenues);
      expect(prismaService.venue.findMany).toHaveBeenCalledWith({
        include: {
          rooms: {
            include: {
              equipment: true,
            },
            where: { isActive: true },
          },
        },
      });
    });
  });

  describe('bookRoom', () => {
    it('should successfully book a room', async () => {
      const mockRoom = {
        id: 'room-1',
        code: 'A101',
        name: 'Room 101',
        isActive: true,
        venue: {
          id: 'venue-1',
          name: 'Building A',
          building: 'A',
          floor: 1,
        },
      };

      prismaService.room.findUnique.mockResolvedValue(mockRoom);
      prismaService.roomBooking.findFirst.mockResolvedValue(null); // No existing booking
      prismaService.maintenanceBlock.findFirst.mockResolvedValue(null); // No maintenance
      prismaService.roomBooking.create.mockResolvedValue({
        id: 'booking-1',
        roomId: 'room-1',
        date: '2026-05-20',
        startTime: '09:00',
        endTime: '11:00',
        purpose: 'Meeting',
        bookedBy: 'user-1',
        status: 'CONFIRMED',
        createdAt: new Date(),
        room: mockRoom,
      });

      const result = await service.bookRoom(
        'room-1',
        '09:00',
        '11:00',
        '2026-05-20',
        'Meeting',
        'user-1',
      );

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('booking');
      expect(result.booking).toHaveProperty('id', 'booking-1');
      expect(prismaService.roomBooking.create).toHaveBeenCalled();
    });

    it('should throw error when room is already booked', async () => {
      const mockRoom = {
        id: 'room-1',
        code: 'A101',
        name: 'Room 101',
        isActive: true,
        venue: {
          id: 'venue-1',
          name: 'Building A',
          building: 'A',
          floor: 1,
        },
      };

      const existingBooking = {
        id: 'existing-booking',
        roomId: 'room-1',
        date: '2026-05-20',
        startTime: '09:00',
        endTime: '11:00',
      };

      prismaService.room.findUnique.mockResolvedValue(mockRoom);
      prismaService.roomBooking.findFirst.mockResolvedValue(existingBooking); // Existing booking

      await expect(
        service.bookRoom(
          'room-1',
          '09:00',
          '11:00',
          '2026-05-20',
          'Meeting',
          'user-1',
        ),
      ).rejects.toThrow('Room is already booked during this time slot');
    });
  });

  describe('scheduleMaintenance', () => {
    it('should schedule maintenance for a room', async () => {
      const mockRoom = {
        id: 'room-1',
        code: 'A101',
        name: 'Room 101',
        isActive: true,
        venue: {
          id: 'venue-1',
          name: 'Building A',
          building: 'A',
          floor: 1,
        },
      };

      prismaService.room.findUnique.mockResolvedValue(mockRoom);
      prismaService.maintenanceBlock.findFirst.mockResolvedValue(null); // No overlapping maintenance
      prismaService.roomBooking.findMany.mockResolvedValue([]); // No existing bookings
      prismaService.maintenanceBlock.create.mockResolvedValue({
        id: 'maintenance-1',
        roomId: 'room-1',
        startDate: new Date('2026-05-20'),
        endDate: new Date('2026-05-22'),
        reason: 'Repairs',
        scheduledBy: 'user-1',
        room: mockRoom,
      });

      const result = await service.scheduleMaintenance(
        'room-1',
        '2026-05-20',
        '2026-05-22',
        'Repairs',
        'user-1',
      );

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('maintenance');
      expect(result.maintenance).toHaveProperty('id', 'maintenance-1');
      expect(prismaService.maintenanceBlock.create).toHaveBeenCalled();
    });

    it('should throw error when maintenance overlaps with existing booking', async () => {
      const mockRoom = {
        id: 'room-1',
        code: 'A101',
        name: 'Room 101',
        isActive: true,
        venue: {
          id: 'venue-1',
          name: 'Building A',
          building: 'A',
          floor: 1,
        },
      };

      const existingBooking = {
        id: 'existing-booking',
        roomId: 'room-1',
        date: '2026-05-21', // Within maintenance period
        startTime: '09:00',
        endTime: '11:00',
        status: 'CONFIRMED',
      };

      prismaService.room.findUnique.mockResolvedValue(mockRoom);
      prismaService.maintenanceBlock.findFirst.mockResolvedValue(null); // No overlapping maintenance
      prismaService.roomBooking.findMany.mockResolvedValue([existingBooking]); // Existing booking

      await expect(
        service.scheduleMaintenance(
          'room-1',
          '2026-05-20',
          '2026-05-22',
          'Repairs',
          'user-1',
        ),
      ).rejects.toThrow('Cannot schedule maintenance: room has existing bookings during this period');
    });
  });
});