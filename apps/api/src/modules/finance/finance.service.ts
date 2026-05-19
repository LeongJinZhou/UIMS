import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * M09 — Finance & Fees
 */
@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all fees with student details
   */
  async getFeesWithDetails(): Promise<any> {
    const fees = await this.prisma.fee.findMany({
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

    return fees;
  }

  /**
   * Get fees for a specific student
   */
  async getStudentFees(studentId: string): Promise<any> {
    // Validate student exists
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundException(`Student not found: ${studentId}`);
    }

    const fees = await this.prisma.fee.findMany({
      where: { studentId },
      include: {
        invoice: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return fees;
  }

  /**
   * Create a new fee record
   */
  async createFee(
    data: {
      studentId: string;
      feeType: string;
      amount: number;
      description: string;
      semesterId?: string;
      creditHours?: number;
    },
  ): Promise<any> {
    // Validate student exists
    const student = await this.prisma.student.findUnique({
      where: { id: data.studentId },
    });

    if (!student) {
      throw new NotFoundException(`Student not found: ${data.studentId}`);
    }

    // Validate semester if provided
    if (data.semesterId) {
      const semester = await this.prisma.semester.findUnique({
        where: { id: data.semesterId },
      });

      if (!semester) {
        throw new NotFoundException(`Semester not found: ${data.semesterId}`);
      }
    }

    // Create fee
    const fee = await this.prisma.fee.create({
      data: {
        studentId: data.studentId,
        feeType: data.feeType as any, // Map to enum
        amount: data.amount,
        description: data.description,
        semesterId: data.semesterId,
        creditHours: data.creditHours,
      },
    });

    return fee;
  }

  /**
   * Create an invoice for a student
   */
  async createInvoice(
    data: {
      studentId: string;
      semesterId: string;
      totalAmount: number;
      dueDate: string; // YYYY-MM-DD
    },
  ): Promise<any> {
    // Validate student exists
    const student = await this.prisma.student.findUnique({
      where: { id: data.studentId },
    });

    if (!student) {
      throw new NotFoundException(`Student not found: ${data.studentId}`);
    }

    // Validate semester exists
    const semester = await this.prisma.semester.findUnique({
      where: { id: data.semesterId },
    });

    if (!semester) {
      throw new NotFoundException(`Semester not found: ${data.semesterId}`);
    }

    // Create invoice
    const invoice = await this.prisma.invoice.create({
      data: {
        studentId: data.studentId,
        semesterId: data.semesterId,
        totalAmount: data.totalAmount,
        dueDate: new Date(data.dueDate),
        issuedAt: new Date(),
        status: 'UNPAID',
      },
    });

    return invoice;
  }

  /**
   * Process a payment for an invoice
   */
  async processPayment(
    invoiceId: string,
    amount: number,
    method: string,
    reference: string,
  ): Promise<any> {
    // Validate invoice exists
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        student: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice not found: ${invoiceId}`);
    }

    // Validate payment amount doesn't exceed balance
    if (amount > invoice.balance) {
      throw new BadRequestException(`Payment amount exceeds invoice balance`);
    }

    // Calculate new paid amount and balance
    const newPaidAmount = invoice.paidAmount + amount;
    const newBalance = invoice.totalAmount - newPaidAmount;

    // Determine payment status
    let paymentStatus: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' = 'COMPLETED';
    if (newBalance === 0) {
      paymentStatus = 'COMPLETED';
    } else if (newPaidAmount === 0) {
      paymentStatus = 'PENDING';
    } else {
      paymentStatus = 'PARTIAL';
    }

    // Create payment record
    const payment = await this.prisma.payment.create({
      data: {
        invoiceId,
        amount,
        method: method as any, // Map to enum
        status: paymentStatus,
        paidAt: new Date(),
        reference,
      },
    });

    // Update invoice
    const updatedInvoice = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: newPaidAmount,
        balance: newBalance,
        status:
          newBalance === 0
            ? 'PAID'
            : newPaidAmount === 0
            ? 'UNPAID'
            : 'PARTIAL',
      },
    });

    return {
      payment,
      invoice: updatedInvoice,
    };
  }

  /**
   * Get finance dashboard statistics
   */
  async getFinanceDashboard(): Promise<any> {
    const [
      totalFees,
      totalInvoices,
      totalPaidAmount,
      totalOutstanding,
      overdueInvoices,
    ] = await Promise.all([
      this.prisma.fee.count(),
      this.prisma.invoice.count(),
      this.prisma.invoice.aggregate({
        _sum: {
          paidAmount: true,
        },
      }),
      this.prisma.invoice.aggregate({
        _sum: {
          balance: true,
        },
      }),
      this.prisma.invoice.count({
        where: {
          status: 'OVERDUE',
          dueDate: {
            lt: new Date(),
          },
        },
      }),
    ]);

    return {
      totalFees,
      totalInvoices,
      totalPaidAmount: totalPaidAmount._sum.paidAmount || 0,
      totalOutstanding: totalOutstanding._sum.balance || 0,
      overdueInvoices,
      collectionRate: totalInvoices > 0
        ? ((totalPaidAmount._sum.paidAmount || 0) /
            (totalPaidAmount._sum.paidAmount || 0 +
              totalOutstanding._sum.balance || 0)) *
          100
        : 0,
    };
  }

  findAll() {
    return { module: 'M09 — Finance & Fees', status: 'ready' };
  }
}
