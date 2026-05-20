import { Test, TestingModule } from '@nestjs/testing';
import { FinanceService } from './finance.service';
import { PrismaService } from '../../database/prisma.service';

describe('FinanceService', () => {
  let service: FinanceService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinanceService,
        {
          provide: PrismaService,
          useValue: {
            fee: {
              findMany: jest.fn(),
              create: jest.fn(),
              count: jest.fn(),
            },
            student: {
              findUnique: jest.fn(),
            },
            semester: {
              findUnique: jest.fn(),
            },
            invoice: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              aggregate: jest.fn(),
              count: jest.fn(),
            },
            payment: {
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<FinanceService>(FinanceService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getFeesWithDetails', () => {
    it('should return fees with student and invoice details', async () => {
      const mockFees = [
        {
          id: 'fee-1',
          studentId: 'student-1',
          amount: 1000,
          student: {
            id: 'student-1',
            user: { name: 'John Doe' },
            programme: { name: 'Computer Science' },
          },
          invoice: { id: 'invoice-1', totalAmount: 1000 },
        },
      ];

      prismaService.fee.findMany.mockResolvedValue(mockFees);

      const result = await service.getFeesWithDetails();

      expect(result).toEqual(mockFees);
      expect(prismaService.fee.findMany).toHaveBeenCalledWith({
        include: {
          student: {
            include: {
              user: true,
              programme: true,
            },
          },
          invoice: true,
        },
        where: {
          student: {
            isActive: true,
          },
        },
      });
    });
  });

  describe('getStudentFees', () => {
    it('should return fees for a specific student', async () => {
      const mockStudent = {
        id: 'student-1',
      };

      const mockFees = [
        {
          id: 'fee-1',
          studentId: 'student-1',
          amount: 1000,
          invoice: { id: 'invoice-1' },
        },
      ];

      prismaService.student.findUnique.mockResolvedValue(mockStudent);
      prismaService.fee.findMany.mockResolvedValue(mockFees);

      const result = await service.getStudentFees('student-1');

      expect(result).toEqual(mockFees);
      expect(prismaService.student.findUnique).toHaveBeenCalledWith({
        where: { id: 'student-1' },
      });
      expect(prismaService.fee.findMany).toHaveBeenCalledWith({
        where: { studentId: 'student-1' },
        include: {
          invoice: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should throw NotFoundException when student not found', async () => {
      prismaService.student.findUnique.mockResolvedValue(null);

      await expect(service.getStudentFees('non-existent')).rejects.toThrow(
        'Student not found: non-existent',
      );
    });
  });

  describe('createFee', () => {
    it('should create a fee record', async () => {
      const mockStudent = {
        id: 'student-1',
      };

      const mockSemester = {
        id: 'semester-1',
      };

      const mockFee = {
        id: 'fee-1',
        studentId: 'student-1',
        feeType: 'TUITION',
        amount: 1000,
        description: 'Tuition Fee',
        semesterId: 'semester-1',
      };

      prismaService.student.findUnique.mockResolvedValue(mockStudent);
      prismaService.semester.findUnique.mockResolvedValue(mockSemester);
      prismaService.fee.create.mockResolvedValue(mockFee);

      const result = await service.createFee({
        studentId: 'student-1',
        feeType: 'TUITION',
        amount: 1000,
        description: 'Tuition Fee',
        semesterId: 'semester-1',
      });

      expect(result).toEqual(mockFee);
      expect(prismaService.fee.create).toHaveBeenCalledWith({
        data: {
          studentId: 'student-1',
          feeType: 'TUITION',
          amount: 1000,
          description: 'Tuition Fee',
          semesterId: 'semester-1',
          creditHours: undefined,
        },
      });
    });

    it('should throw NotFoundException when student not found', async () => {
      prismaService.student.findUnique.mockResolvedValue(null);

      await expect(
        service.createFee({
          studentId: 'non-existent',
          feeType: 'TUITION',
          amount: 1000,
          description: 'Tuition Fee',
        }),
      ).rejects.toThrow('Student not found: non-existent');
    });

    it('should throw NotFoundException when semester not found', async () => {
      const mockStudent = {
        id: 'student-1',
      };

      prismaService.student.findUnique.mockResolvedValue(mockStudent);
      prismaService.semester.findUnique.mockResolvedValue(null);

      await expect(
        service.createFee({
          studentId: 'student-1',
          feeType: 'TUITION',
          amount: 1000,
          description: 'Tuition Fee',
          semesterId: 'non-existent',
        }),
      ).rejects.toThrow('Semester not found: non-existent');
    });
  });

  describe('createInvoice', () => {
    it('should create an invoice', async () => {
      const mockStudent = {
        id: 'student-1',
      };

      const mockSemester = {
        id: 'semester-1',
      };

      const mockInvoice = {
        id: 'invoice-1',
        studentId: 'student-1',
        semesterId: 'semester-1',
        totalAmount: 1000,
        paidAmount: 0,
        balance: 1000,
        status: 'UNPAID',
        dueDate: new Date('2026-06-30'),
        issuedAt: new Date(),
      };

      prismaService.student.findUnique.mockResolvedValue(mockStudent);
      prismaService.semester.findUnique.mockResolvedValue(mockSemester);
      prismaService.invoice.create.mockResolvedValue(mockInvoice);

      const result = await service.createInvoice({
        studentId: 'student-1',
        semesterId: 'semester-1',
        totalAmount: 1000,
        dueDate: '2026-06-30',
      });

      expect(result).toEqual(mockInvoice);
      expect(prismaService.invoice.create).toHaveBeenCalledWith({
        data: {
          studentId: 'student-1',
          semesterId: 'semester-1',
          totalAmount: 1000,
          dueDate: new Date('2026-06-30'),
          issuedAt: expect.any(Date),
          status: 'UNPAID',
        },
      });
    });

    it('should throw NotFoundException when student not found', async () => {
      prismaService.student.findUnique.mockResolvedValue(null);

      await expect(
        service.createInvoice({
          studentId: 'non-existent',
          semesterId: 'semester-1',
          totalAmount: 1000,
          dueDate: '2026-06-30',
        }),
      ).rejects.toThrow('Student not found: non-existent');
    });

    it('should throw NotFoundException when semester not found', async () => {
      const mockStudent = {
        id: 'student-1',
      };

      prismaService.student.findUnique.mockResolvedValue(mockStudent);
      prismaService.semester.findUnique.mockResolvedValue(null);

      await expect(
        service.createInvoice({
          studentId: 'student-1',
          semesterId: 'non-existent',
          totalAmount: 1000,
          dueDate: '2026-06-30',
        }),
      ).rejects.toThrow('Semester not found: non-existent');
    });
  });

  describe('processPayment', () => {
    it('should process a payment successfully', async () => {
      const mockInvoice = {
        id: 'invoice-1',
        studentId: 'student-1',
        totalAmount: 1000,
        paidAmount: 0,
        balance: 1000,
        status: 'UNPAID',
      };

      const mockPayment = {
        id: 'payment-1',
        invoiceId: 'invoice-1',
        amount: 500,
        method: 'ONLINE',
        status: 'COMPLETED',
        paidAt: new Date(),
        reference: 'ref-123',
      };

      const updatedInvoice = {
        id: 'invoice-1',
        studentId: 'student-1',
        totalAmount: 1000,
        paidAmount: 500,
        balance: 500,
        status: 'PARTIAL',
      };

      prismaService.invoice.findUnique.mockResolvedValue(mockInvoice);
      prismaService.payment.create.mockResolvedValue(mockPayment);
      prismaService.invoice.update.mockResolvedValue(updatedInvoice);

      const result = await service.processPayment('invoice-1', 500, 'ONLINE', 'ref-123');

      expect(result).toEqual({
        payment: mockPayment,
        invoice: updatedInvoice,
      });
      expect(prismaService.invoice.findUnique).toHaveBeenCalledWith({
        where: { id: 'invoice-1' },
        include: {
          student: true,
        },
      });
      expect(prismaService.payment.create).toHaveBeenCalledWith({
        data: {
          invoiceId: 'invoice-1',
          amount: 500,
          method: 'ONLINE',
          status: 'PARTIAL',
          paidAt: expect.any(Date),
          reference: 'ref-123',
        },
      });
      expect(prismaService.invoice.update).toHaveBeenCalledWith({
        where: { id: 'invoice-1' },
        data: {
          paidAmount: 500,
          balance: 500,
          status: 'PARTIAL',
        },
      });
    });

    it('should throw NotFoundException when invoice not found', async () => {
      prismaService.invoice.findUnique.mockResolvedValue(null);

      await expect(
        service.processPayment('non-existent', 500, 'ONLINE', 'ref-123'),
      ).rejects.toThrow('Invoice not found: non-existent');
    });

    it('should throw BadRequestException when payment exceeds balance', async () => {
      const mockInvoice = {
        id: 'invoice-1',
        studentId: 'student-1',
        totalAmount: 1000,
        paidAmount: 0,
        balance: 1000,
        status: 'UNPAID',
      };

      prismaService.invoice.findUnique.mockResolvedValue(mockInvoice);

      await expect(
        service.processPayment('invoice-1', 1500, 'ONLINE', 'ref-123'),
      ).rejects.toThrow('Payment amount exceeds invoice balance');
    });

    it('should mark invoice as PAID when fully paid', async () => {
      const mockInvoice = {
        id: 'invoice-1',
        studentId: 'student-1',
        totalAmount: 1000,
        paidAmount: 0,
        balance: 1000,
        status: 'UNPAID',
      };

      const mockPayment = {
        id: 'payment-1',
        invoiceId: 'invoice-1',
        amount: 1000,
        method: 'ONLINE',
        status: 'COMPLETED',
        paidAt: new Date(),
        reference: 'ref-123',
      };

      const updatedInvoice = {
        id: 'invoice-1',
        studentId: 'student-1',
        totalAmount: 1000,
        paidAmount: 1000,
        balance: 0,
        status: 'PAID',
        dueDate: new Date('2026-06-30'),
      };

      prismaService.invoice.findUnique.mockResolvedValue(mockInvoice);
      prismaService.payment.create.mockResolvedValue(mockPayment);
      prismaService.invoice.update.mockResolvedValue(updatedInvoice);

      const result = await service.processPayment('invoice-1', 1000, 'ONLINE', 'ref-123');

      expect(result.invoice.status).toBe('PAID');
      expect(result.invoice.balance).toBe(0);
    });
  });

  describe('getFinanceDashboard', () => {
    it('should return finance dashboard statistics', async () => {
      prismaService.fee.count.mockResolvedValue(150);
      
      prismaService.invoice.count
        .mockResolvedValueOnce(120)
        .mockResolvedValueOnce(10); // overdue
        
      prismaService.invoice.aggregate
        .mockResolvedValueOnce({ _sum: { paidAmount: 80000 } })
        .mockResolvedValueOnce({ _sum: { balance: 20000 } });

      const result = await service.getFinanceDashboard();

      expect(result).toEqual({
        totalFees: 150,
        totalInvoices: 120,
        totalPaidAmount: 80000,
        totalOutstanding: 20000,
        overdueInvoices: 10,
        collectionRate: 80, // (80000/(80000+20000))*100
      });
    });

    it('should handle zero division in collection rate', async () => {
      prismaService.fee.count.mockResolvedValue(0);
      
      prismaService.invoice.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
        
      prismaService.invoice.aggregate
        .mockResolvedValueOnce({ _sum: { paidAmount: 0 } })
        .mockResolvedValueOnce({ _sum: { balance: 0 } });

      const result = await service.getFinanceDashboard();

      expect(result.collectionRate).toBe(0);
    });
  });
});