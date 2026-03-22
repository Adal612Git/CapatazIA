# TPC API

API NestJS para el MVP ejecutivo de TPC.

## Scripts utiles

```bash
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm start:dev
pnpm test:e2e
```

## Persistencia

- Schema Prisma: `prisma/schema.prisma`
- Seed inicial: `prisma/seed.ts`
- Base local: `prisma/dev.db`

## Dominios expuestos

- `GET /api/health`
- `GET /api/dashboard/overview`
- `GET /api/organizations`
- `GET /api/auth/me`
- `GET /api/roles`
- `GET /api/wallet/*`
- `GET /api/portfolio/*`
- `POST /api/orders/intents`
- `GET|POST /api/shark/*`
- `GET /api/tasks`
- `GET /api/reminders`
- `GET /api/approvals`
- `GET /api/capataz/workflows`
- `GET /api/audit/*`
