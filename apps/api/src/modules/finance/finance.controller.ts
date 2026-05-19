import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { FinanceService } from './finance.service';

/**
 * M09 — Finance & Fees
 */
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get()
  findAll() {
    return this.financeService.findAll();
  }

  @Get('fees')
  async getFeesWithDetails() {
    return this.financeService.getFeesWithDetails();
  }

  @Get('fees/student/:studentId')
  async getStudentFees(@Param('studentId') studentId: string) {
    return this.financeService.getStudentFees(studentId);
  }

  @Post('fees')
  async createFee(@Body() body: {
    studentId: string;
    feeType: string;
    amount: number;
    description: string;
    semesterId?: string;
    creditHours?: number;
  }) {
    return this.financeService.createFee(body);
  }

  @Post('invoices')
  async createInvoice(@Body() body: {
    studentId: string;
    semesterId: string;
    totalAmount: number;
    dueDate: string;
  }) {
    return this.financeService.createInvoice(body);
  }

  @Post('invoices/:invoiceId/payments')
  async processPayment(
    @Param('invoiceId') invoiceId: string,
    @Body() body: {
      amount: number;
      method: string;
      reference: string;
    }
  ) {
    return this.financeService.processPayment(invoiceId, body.amount, body.method, body.reference);
  }

  @Get('fee-structures')
  async getFeeStructures(
    @Body() filters: {
      programmeId?: string;
      academicYear?: number;
      feeType?: string;
    } = {}
  ) {
    return this.financeService.getFeeStructures(filters);
  }

  @Post('fee-structures')
  async createFeeStructure(@Body() body: {
    programmeId: string;
    academicYear: number;
    feeType: string;
    amount: number;
    description?: string;
    creditHours?: number;
  }) {
    return this.financeService.createFeeStructure(body);
  }

  @Get('budgets')
  async getBudgets(
    @Body() filters: {
      departmentId?: string;
      programmeId?: string;
      academicYear?: number;
      isActive?: boolean;
    } = {}
  ) {
    return this.financeService.getBudgets(filters);
  }

  @Post('budgets')
  async createBudget(@Body() body: {
    departmentId?: string;
    programmeId?: string;
    academicYear: number;
    totalAmount: number;
    description?: string;
  }) {
    return this.financeService.createBudget(body);
  }

  @Get('budgets/:budgetId/lines')
  async getBudgetLines(@Param('budgetId') budgetId: string) {
    return this.financeService.getBudgetLines(budgetId);
  }

  @Post('budgets/:budgetId/lines')
  async upsertBudgetLine(
    @Param('budgetId') budgetId: string,
    @Body() body: {
      description: string;
      amount: number;
    }
  ) {
    return this.financeService.upsertBudgetLine(budgetId, body);
  }

  @Post('budgets/:budgetId/lines/:lineId/expenditure')
  async recordExpenditure(
    @Param('budgetId') budgetId: string,
    @Param('lineId') budgetLineId: string,
    @Body() body: {
      amount: number;
      description?: string;
    }
  ) {
    return this.financeService.recordExpenditure(budgetLineId, body.amount, body.description);
  }

  @Post('reports/generate')
  async generateFinancialReport(@Body() body: {
    reportType: string; // REVENUE, EXPENSES, BALANCE_SHEET, CASH_FLOW
    academicYear: number;
    generatedBy: string;
  }) {
    return this.financeService.generateFinancialReport(body);
  }

  @Get('dashboard')
  async getFinanceDashboard() {
    return this.financeService.getFinanceDashboard();
  }
}
