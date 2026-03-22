import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from './auth.types';
import { AuthService } from './auth.service';
import { Public } from './auth.decorators';
import { JwtAuthGuard } from './jwt-auth.guard';

interface LoginBody {
  email: string;
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() body: LoginBody) {
    return this.authService.login(body.email, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Req() request: AuthenticatedRequest) {
    return this.authService.getMe(request.user!.sub);
  }
}
