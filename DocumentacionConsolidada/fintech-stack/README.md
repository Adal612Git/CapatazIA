# TPC Fintech

Base ejecutable del MVP descrito en la documentacion del repositorio.

## Stack actual

- `apps/web`: React + Vite + TypeScript
- `apps/api`: NestJS + Prisma
- Persistencia local: SQLite con semilla en `apps/api/prisma/dev.db`

## Producto implementado

- Dashboard ejecutivo
- Wallet demo con balances, movimientos y transferencias
- Portafolio con summary, posiciones y order intents
- Mr. Shark command center
- Capataz con tasks, reminders y workflows
- Audit trail y roadmap del producto

## Arranque local

```bash
pnpm install
pnpm --dir apps/api db:generate
pnpm --dir apps/api db:push
pnpm --dir apps/api db:seed
pnpm dev
```

## Validacion

```bash
pnpm lint
pnpm test
pnpm build
```

## Notas de arquitectura

- La estructura del schema Prisma sigue la BDD ejecutiva: multi-tenant, audit-first y provider-agnostic.
- Para desarrollo local la persistencia corre en SQLite.
- El siguiente paso natural es migrar el datasource a PostgreSQL y montar auth/RBAC real sobre `organizations`, `roles` y `organization_memberships`.
