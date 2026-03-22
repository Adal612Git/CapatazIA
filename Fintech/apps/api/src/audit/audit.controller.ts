import { Controller, Get } from '@nestjs/common';
import { DemoDataService } from '../common/demo-data.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly demoData: DemoDataService) {}

  @Get('events')
  getEvents() {
    return this.demoData.getAuditEvents();
  }

  @Get('approvals')
  getApprovals() {
    return this.demoData.getAuditApprovals();
  }

  @Get('money-movements')
  getMoneyMovements() {
    return this.demoData.getAuditMoneyMovements();
  }
}
