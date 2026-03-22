import { Controller, Get } from '@nestjs/common';
import { DemoDataService } from '../common/demo-data.service';

@Controller()
export class OperationsController {
  constructor(private readonly demoData: DemoDataService) {}

  @Get('tasks')
  getTasks() {
    return this.demoData.getTasks();
  }

  @Get('reminders')
  getReminders() {
    return this.demoData.getReminders();
  }

  @Get('approvals')
  getApprovals() {
    return this.demoData.getApprovals();
  }

  @Get('capataz/workflows')
  getWorkflows() {
    return this.demoData.getWorkflows();
  }
}
