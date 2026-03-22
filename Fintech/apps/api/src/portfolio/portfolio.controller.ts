import { Body, Controller, Get, Post } from '@nestjs/common';
import { Roles } from '../auth/auth.decorators';
import { DemoDataService } from '../common/demo-data.service';

interface CreateOrderIntentBody {
  portfolioId: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  rationale: string;
}

@Controller()
export class PortfolioController {
  constructor(private readonly demoData: DemoDataService) {}

  @Get('portfolio/summary')
  getSummary() {
    return this.demoData.getPortfolioSummary();
  }

  @Get('portfolio/positions')
  getPositions() {
    return this.demoData.getPortfolioPositions();
  }

  @Get('risk-profile')
  getRiskProfile() {
    return this.demoData.getRiskProfile();
  }

  @Roles('Owner', 'Admin')
  @Post('orders/intents')
  createIntent(@Body() body: CreateOrderIntentBody) {
    return this.demoData.createOrderIntent(body);
  }
}
