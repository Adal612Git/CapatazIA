import { Controller, Get } from '@nestjs/common';
import { DemoDataService } from '../common/demo-data.service';

@Controller()
export class IdentityController {
  constructor(private readonly demoData: DemoDataService) {}

  @Get('organizations')
  getOrganizations() {
    return this.demoData.getOrganizations();
  }

  @Get('roles')
  getRoles() {
    return this.demoData.getRoles();
  }
}
