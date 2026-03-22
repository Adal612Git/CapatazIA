import { Body, Controller, Get, Post } from '@nestjs/common';
import { Roles } from '../auth/auth.decorators';
import { DemoDataService } from '../common/demo-data.service';

interface CreateTransferBody {
  fromWalletAccountId: string;
  beneficiaryId: string;
  amount: number;
  concept: string;
}

@Controller('wallet')
export class WalletController {
  constructor(private readonly demoData: DemoDataService) {}

  @Get('accounts')
  getAccounts() {
    return this.demoData.getWalletAccounts();
  }

  @Get('balances')
  getBalances() {
    return this.demoData.getWalletBalances();
  }

  @Get('movements')
  getMovements() {
    return this.demoData.getWalletMovements();
  }

  @Get('beneficiaries')
  getBeneficiaries() {
    return this.demoData.getBeneficiaries();
  }

  @Roles('Owner', 'Admin')
  @Post('transfers')
  createTransfer(@Body() body: CreateTransferBody) {
    return this.demoData.createTransfer(body);
  }
}
