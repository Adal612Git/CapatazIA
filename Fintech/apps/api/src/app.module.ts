import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AuditController } from './audit/audit.controller';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { DemoDataService } from './common/demo-data.service';
import { DashboardController } from './dashboard/dashboard.controller';
import { IdentityController } from './identity/identity.controller';
import { OperationsController } from './operations/operations.controller';
import { PortfolioController } from './portfolio/portfolio.controller';
import { PrismaService } from './prisma/prisma.service';
import { SharkController } from './shark/shark.controller';
import { WalletController } from './wallet/wallet.controller';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? 'tpc-local-jwt-secret',
      signOptions: { expiresIn: '12h' },
    }),
  ],
  controllers: [
    AppController,
    AuthController,
    DashboardController,
    IdentityController,
    WalletController,
    PortfolioController,
    SharkController,
    OperationsController,
    AuditController,
  ],
  providers: [
    DemoDataService,
    PrismaService,
    AuthService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
