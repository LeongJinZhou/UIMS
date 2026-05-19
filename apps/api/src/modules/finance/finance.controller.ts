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

  @Get('dashboard')
  async getFinanceDashboard() {
    return this.financeService.getFinanceDashboard();
  }
}
