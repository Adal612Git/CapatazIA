import { Body, Controller, Get, Post } from '@nestjs/common';
import { Roles } from '../auth/auth.decorators';
import { DemoDataService } from '../common/demo-data.service';

interface ChatBody {
  message: string;
}

@Controller('shark')
export class SharkController {
  constructor(private readonly demoData: DemoDataService) {}

  @Get('commands')
  getCommands() {
    return this.demoData.getCommands();
  }

  @Get('context')
  getContext() {
    return this.demoData.getSharkContext();
  }

  @Roles('Owner', 'Admin', 'Staff')
  @Post('chat')
  chat(@Body() body: ChatBody) {
    return this.demoData.chat(body.message ?? '');
  }
}
