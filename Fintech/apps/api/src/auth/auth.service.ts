import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { scryptSync, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private verifyPassword(password: string, passwordHash: string) {
    const [salt, storedHash] = passwordHash.split(':');
    const derived = scryptSync(password, salt, 64);
    const stored = Buffer.from(storedHash, 'hex');
    return timingSafeEqual(derived, stored);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            organization: true,
            role: true,
          },
          take: 1,
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!user || !this.verifyPassword(password, user.password_hash)) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const membership = user.memberships[0];
    if (!membership) {
      throw new UnauthorizedException('Usuario sin organizacion activa');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: membership.role.name,
      organizationId: membership.organization.id,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: membership.role.name,
        organizationId: membership.organization.id,
        organizationName: membership.organization.name,
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            organization: true,
            role: true,
          },
          take: 1,
          orderBy: { created_at: 'asc' },
        },
      },
    });

    const membership = user.memberships[0];

    return {
      id: user.id,
      fullName: user.full_name,
      title: user.title,
      email: user.email,
      role: membership?.role.name ?? user.role_label,
      organizationId: membership?.organization.id ?? null,
      organizationName: membership?.organization.name ?? null,
      riskProfile: user.risk_profile_label,
    };
  }
}
