import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Response } from 'supertest';
import { AppModule } from '../src/app.module';

describe('TPC API (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableCors();
    app.setGlobalPrefix('api');
    await app.init();

    const server: Parameters<typeof request>[0] =
      app.getHttpServer() as Parameters<typeof request>[0];
    const loginResponse = await request(server)
      .post('/api/auth/login')
      .send({ email: 'rick@tpc.demo', password: 'DemoPass123!' })
      .expect(201);

    accessToken = (loginResponse.body as { accessToken: string }).accessToken;
  });

  it('/api/health (GET)', () => {
    const server: Parameters<typeof request>[0] =
      app.getHttpServer() as Parameters<typeof request>[0];

    return request(server)
      .get('/api/health')
      .expect(200)
      .expect((response: Response) => {
        const body = response.body as { status: string; app: string };
        expect(body.status).toBe('ok');
        expect(body.app).toBe('TPC Fintech API');
      });
  });

  it('/api/dashboard/overview (GET)', () => {
    const server: Parameters<typeof request>[0] =
      app.getHttpServer() as Parameters<typeof request>[0];

    return request(server)
      .get('/api/dashboard/overview')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((response: Response) => {
        const body = response.body as { product: string; roadmap: unknown[] };
        expect(body.product).toBe('TPC Fintech');
        expect(body.roadmap).toHaveLength(3);
      });
  });

  it('/api/shark/chat (POST)', () => {
    const server: Parameters<typeof request>[0] =
      app.getHttpServer() as Parameters<typeof request>[0];

    return request(server)
      .post('/api/shark/chat')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ message: 'Necesito ver mi liquidez' })
      .expect(201)
      .expect((response: Response) => {
        const body = response.body as {
          detectedIntent: string;
          suggestedActions: unknown[];
        };
        expect(body.detectedIntent).toBe('liquidity_check');
        expect(Array.isArray(body.suggestedActions)).toBe(true);
      });
  });

  it('/api/auth/me (GET)', () => {
    const server: Parameters<typeof request>[0] =
      app.getHttpServer() as Parameters<typeof request>[0];

    return request(server)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((response: Response) => {
        const body = response.body as { email: string; role: string };
        expect(body.email).toBe('rick@tpc.demo');
        expect(body.role).toBe('Owner');
      });
  });
});
