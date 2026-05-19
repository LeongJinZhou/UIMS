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

  /**
   * Get all fee structures with optional filtering
   */
  async getFeeStructures(filters: {
    programmeId?: string;
    academicYear?: number;
    feeType?: string;
  } = {}): Promise<any> {
    const { programmeId, academicYear, feeType } = filters;

    const whereClause: any = {};
    if (programmeId) whereClause.programmeId = programmeId;
    if (academicYear) whereClause.academicYear = academicYear;
    if (feeType) whereClause.feeType = feeType;

    const feeStructures = await this.prisma.feeStructure.findMany({
      where: whereClause,
      include: {
        programme: true,
      },
      orderBy: [
        { programme: { code: 'asc' } },
        { academicYear: 'desc' },
        { feeType: 'asc' },
      ],
    });

    return feeStructures;
  }

  /**
   * Create a new fee structure
   */
  async createFeeStructure(
    data: {
      programmeId: string;
      academicYear: number;
      feeType: string;
      amount: number;
      description?: string;
      creditHours?: number;
    },
  ): Promise<any> {
    // Validate programme exists
    const programme = await this.prisma.programme.findUnique({
      where: { id: data.programmeId },
    });

    if (!programme) {
      throw new NotFoundException(`Programme not found: ${data.programmeId}`);
    }

    // Check if fee structure already exists for this combination
    const existing = await this.prisma.feeStructure.findFirst({
      where: {
        programmeId: data.programmeId,
        academicYear: data.academicYear,
        feeType: data.feeType as any,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Fee structure already exists for ${programme.name} ${data.academicYear} ${data.feeType}`
      );
    }

    // Create fee structure
    const feeStructure = await this.prisma.feeStructure.create({
      data: {
        programmeId: data.programmeId,
        academicYear: data.academicYear,
        feeType: data.feeType as any,
        amount: data.amount,
        description: data.description,
        creditHours: data.creditHours,
      },
      include: {
        programme: true,
      },
    });

    return feeStructure;
  }

  /**
   * Get all budgets with optional filtering
   */
  async getBudgets(filters: {
    departmentId?: string;
    programmeId?: string;
    academicYear?: number;
    isActive?: boolean;
  } = {}): Promise<any> {
    const { departmentId, programmeId, academicYear, isActive } = filters;

    const whereClause: any = {};
    if (departmentId) whereClause.departmentId = departmentId;
    if (programmeId) whereClause.programmeId = programmeId;
    if (academicYear) whereClause.academicYear = academicYear;
    if (isActive !== undefined) whereClause.isActive = isActive;

    const budgets = await this.prisma.budget.findMany({
      where: whereClause,
      include: {
        department: true,
        programme: true,
      },
      orderBy: [
        { academicYear: 'desc' },
        { department: { name: 'asc' } },
        { programme: { code: 'asc' } },
      ],
    });

    return budgets;
  }

  /**
   * Create a new budget
   */
  async createBudget(
    data: {
      departmentId?: string;
      programmeId?: string;
      academicYear: number;
      totalAmount: number;
      description?: string;
    },
  ): Promise<any> {
    // Validate department if provided
    if (data.departmentId) {
      const department = await this.prisma.department.findUnique({
        where: { id: data.departmentId },
      });

      if (!department) {
        throw new NotFoundException(`Department not found: ${data.departmentId}`);
      }
    }

    // Validate programme if provided
    if (data.programmeId) {
      const programme = await this.prisma.programme.findUnique({
        where: { id: data.programmeId },
      });

      if (!programme) {
        throw new NotFoundException(`Programme not found: ${data.programmeId}`);
      }
    }

    // Create budget
    const budget = await this.prisma.budget.create({
      data: {
        departmentId: data.departmentId,
        programmeId: data.programmeId,
        academicYear: data.academicYear,
        totalAmount: data.totalAmount,
        description: data.description,
      },
      include: {
        department: true,
        programme: true,
      },
    });

    return budget;
  }

  /**
   * Get budget lines for a specific budget
   */
  async getBudgetLines(budgetId: string): Promise<any> {
    // Validate budget exists
    const budget = await this.prisma.budget.findUnique({
      where: { id: budgetId },
      include: {
        department: true,
        programme: true,
      },
    });

    if (!budget) {
      throw new NotFoundException(`Budget not found: ${budgetId}`);
    }

    const budgetLines = await this.prisma.budgetLine.findMany({
      where: { budgetId },
      orderBy: {
        id: 'asc',
      },
    });

    return {
      budget: {
        id: budget.id,
        department: budget.department
          ? {
              id: budget.department.id,
              name: budget.department.name,
            }
          : null,
        programme: budget.programme
          ? {
              id: budget.programme.id,
              name: budget.programme.name,
              code: budget.programme.code,
            }
          : null,
        academicYear: budget.academicYear,
        totalAmount: budget.totalAmount,
        description: budget.description,
        isActive: budget.isActive,
      },
      budgetLines: budgetLines.map((line) => ({
        id: line.id,
        description: line.description,
        amount: line.amount,
        currency: line.currency,
        spentAmount: line.spentAmount,
        remainingAmount: line.amount - line.spentAmount,
        utilizationPercentage:
          line.amount > 0 ? (line.spentAmount / line.amount) * 100 : 0,
        startDate: line.startDate,
        endDate: line.endDate,
      })),
    };
  }

  /**
   * Create or update a budget line
   */
  async upsertBudgetLine(
    budgetId: string,
    data: {
      description: string;
      amount: number;
    },
  ): Promise<any> {
    // Validate budget exists
    const budget = await this.prisma.budget.findUnique({
      where: { id: budgetId },
    });

    if (!budget) {
      throw new NotFoundException(`Budget not found: ${budgetId}`);
    }

    // Check if budget line with this description already exists
    const existingLine = await this.prisma.budgetLine.findFirst({
      where: {
        budgetId,
        description: data.description,
      },
    });

    if (existingLine) {
      // Update existing line
      const updatedLine = await this.prisma.budgetLine.update({
        where: { id: existingLine.id },
        data: {
          amount: data.amount,
        },
      });

      return updatedLine;
    } else {
      // Create new line
      const newLine = await this.prisma.budgetLine.create({
        data: {
          budgetId,
          description: data.description,
          amount: data.amount,
          currency: 'MYR', // Default currency, could be made configurable
        },
      });

      return newLine;
    }
  }

  /**
   * Record expenditure against a budget line
   */
  async recordExpenditure(
    budgetLineId: string,
    amount: number,
    description?: string,
  ): Promise<any> {
    // Validate budget line exists
    const budgetLine = await this.prisma.budgetLine.findUnique({
      where: { id: budgetLineId },
      include: {
        budget: true,
      },
    });

    if (!budgetLine) {
      throw new NotFoundException(`Budget line not found: ${budgetLineId}`);
    }

    // Check if expenditure would exceed budget
    const newSpentAmount = budgetLine.spentAmount + amount;
    if (newSpentAmount > budgetLine.amount) {
      throw new BadRequestException(
        `Expenditure of ${amount} would exceed budget line amount of ${budgetLine.amount}. ` +
          `Remaining: ${budgetLine.amount - budgetLine.spentAmount}`
      );
    }

    // Update budget line with new spent amount
    const updatedLine = await this.prisma.budgetLine.update({
      where: { id: budgetLineId },
      data: {
        spentAmount: newSpentAmount,
      },
    });

    return {
      budgetLine: {
        id: updatedLine.id,
        description: updatedLine.description,
        amount: updatedLine.amount,
        spentAmount: updatedLine.spentAmount,
        remainingAmount: updatedLine.amount - updatedLine.spentAmount,
        utilizationPercentage:
          updatedLine.amount > 0
            ? (updatedLine.spentAmount / updatedLine.amount) * 100
            : 0,
      },
      budget: {
        id: budgetLine.budget.id,
        academicYear: budgetLine.budget.academicYear,
        totalAmount: budgetLine.budget.totalAmount,
      },
      expenditure: {
        amount,
        description,
        recordedAt: new Date(),
      },
    };
  }

  /**
   * Generate financial report
   */
  async generateFinancialReport(
    data: {
      reportType: string; // REVENUE, EXPENSES, BALANCE_SHEET, CASH_FLOW
      academicYear: number;
      generatedBy: string;
    }
  ): Promise<any> {
    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: data.generatedBy },
    });

    if (!user) {
      throw new NotFoundException(`User not found: ${data.generatedBy}`);
    }

    let reportData: any = {};
    let reportTitle = '';

    switch (data.reportType) {
      case 'REVENUE':
        reportData = await this.generateRevenueReport(data.academicYear);
        reportTitle = 'Revenue Report';
        break;
      case 'EXPENSES':
        reportData = await this.generateExpensesReport(data.academicYear);
        reportTitle = 'Expenses Report';
        break;
      case 'BALANCE_SHEET':
        reportData = await this.generateBalanceSheet(data.academicYear);
        reportTitle = 'Balance Sheet';
        break;
      case 'CASH_FLOW':
        reportData = await this.generateCashFlowReport(data.academicYear);
        reportTitle = 'Cash Flow Statement';
        break;
      default:
        throw new BadRequestException(
          `Unsupported report type: ${data.reportType}. Supported types: REVENUE, EXPENSES, BALANCE_SHEET, CASH_FLOW`
        );
    }

    // Create financial report record
    const financialReport = await this.prisma.financialReport.create({
      data: {
        reportType: data.reportType,
        academicYear: data.academicYear,
        generatedBy: data.generatedBy,
        data: reportData,
      },
    });

    return {
      id: financialReport.id,
      reportType: financialReport.reportType,
      academicYear: financialReport.academicYear,
      generatedAt: financialReport.generatedAt,
      generatedBy: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      title: reportTitle,
      data: reportData,
    };
  }

  /**
   * Generate revenue report for an academic year
   */
  private async generateRevenueReport(academicYear: number): Promise<any> {
    // Get all fees for the academic year
    const fees = await this.prisma.fee.findMany({
      where: {
        createdAt: {
          gte: new Date(`${academicYear}-01-01`),
          lt: new Date(`${academicYear + 1}-01-01`),
        },
      },
      include: {
        student: {
          include: {
            user: true,
            programme: true,
          },
        },
      },
    });

    // Group by fee type
    const revenueByFeeType = fees.reduce((acc, fee) => {
      if (!acc[fee.feeType]) {
        acc[fee.feeType] = 0;
      }
      acc[fee.feeType] += fee.amount;
      return acc;
    }, {} as Record<string, number>);

    // Group by programme
    const revenueByProgramme = fees.reduce((acc, fee) => {
      const programmeName =
        fee.student?.programme?.name || 'Unknown Programme';
      if (!acc[programmeName]) {
        acc[programmeName] = 0;
      }
      acc[programmeName] += fee.amount;
      return acc;
    }, {} as Record<string, number>);

    const totalRevenue = fees.reduce((sum, fee) => sum + fee.amount, 0);

    return {
      academicYear,
      totalRevenue,
      revenueByFeeType,
      revenueByProgramme,
      feeCount: fees.length,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate expenses report for an academic year
   * Note: This would require expense tracking to be implemented
   */
  private async generateExpensesReport(academicYear: number): Promise<any> {
    // For now, return placeholder data
    // In a full implementation, this would query actual expense records
    return {
      academicYear,
      totalExpenses: 0,
      expensesByCategory: {},
      message:
        'Expense tracking not yet implemented. This report shows placeholder data.',
      generatedAt: new Date(),
    };
  }

  /**
   * Generate balance sheet for an academic year
   * Note: This would require asset/liability tracking to be implemented
   */
  private async generateBalanceSheet(academicYear: number): Promise<any> {
    // For now, return placeholder data
    // In a full implementation, this would query actual financial position
    return {
      academicYear,
      assets: {},
      liabilities: {},
      equity: {},
      message:
        'Balance sheet tracking not yet implemented. This report shows placeholder data.',
      generatedAt: new Date(),
    };
  }

  /**
   * Generate cash flow statement for an academic year
   * Note: This would require detailed cash transaction tracking
   */
  private async generateCashFlowReport(academicYear: number): Promise<any> {
    // For now, return placeholder data
    // In a full implementation, this would query actual cash flow data
    return {
      academicYear,
      operatingCashFlow: 0,
      investingCashFlow: 0,
      financingCashFlow: 0,
      netCashFlow: 0,
      message:
        'Cash flow tracking not yet implemented. This report shows placeholder data.',
      generatedAt: new Date(),
    };
  }
}
