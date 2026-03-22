import { join } from 'node:path';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/index.js';

process.env.DATABASE_URL ??=
  `file:${join(process.cwd(), 'prisma', 'dev.db').replace(/\\/g, '/')}`;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
