import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/auth.decorators';

@Controller()
export class AppController {
  @Public()
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      app: 'TPC Fintech API',
      architecture: 'provider-agnostic / audit-first / multi-tenant',
    };
  }
}
