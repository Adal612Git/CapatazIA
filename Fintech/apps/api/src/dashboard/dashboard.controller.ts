import { Controller, Get } from '@nestjs/common';
import { DemoDataService } from '../common/demo-data.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly demoData: DemoDataService) {}

  @Get('overview')
  getOverview() {
    return this.demoData.getOverview();
  }
}
