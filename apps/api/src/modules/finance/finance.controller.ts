import { Controller, Get } from '@nestjs/common';
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
}
