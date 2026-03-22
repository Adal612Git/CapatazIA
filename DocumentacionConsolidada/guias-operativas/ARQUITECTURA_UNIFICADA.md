# Arquitectura Unificada

## Objetivo

Dejar dashboard web, WhatsApp demo y app Expo operando sobre la misma fuente de verdad para que la demo parezca producto real y no tres prototipos separados.

## Piezas activas

- `Next.js` en la raiz:
  Dashboard principal, APIs y runtime compartido.
- `WhatsApp mock/cloud-ready`:
  Usa `app/api/capataz/chat` y `lib/capataz-operativo.ts`.
- `Fintech laboral`:
  Vive dentro del runtime central con cuentas, movimientos, solicitudes e insights.
- `Expo` en `CapatazFintech/`:
  Consume `api/mobile/auth`, `api/mobile/session` y `api/mobile/credit/apply`.

## Fuente de verdad

El estado demo compartido viaja en `RuntimeSyncPayload` y se persiste por:

- archivo local en `data/` cuando trabajas local
- Supabase cuando existen `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`

## Flujo de integracion

1. Web modifica estado en Zustand
2. Zustand hace `PUT /api/capataz/runtime`
3. `lib/capataz-operativo.ts` persiste snapshot
4. WhatsApp y mobile leen ese mismo snapshot
5. Reportes, memoria IA y fintech quedan coherentes entre superficies

## Superficies clave

- `/dashboard`: vista ejecutiva
- `/fintech`: capa financiera y demo de capital del equipo
- `/whatsapp`: simulador conversacional
- `/reports`: narrativa ejecutiva y exportacion
- app Expo:
  Inicio, Score, Actividad, Credito y Perfil conectados al backend comun

## Nota tecnica importante

El arbol `Fintech/` legado se excluye del `tsconfig` raiz para que `next build` no falle por decoradores de Nest. Se conserva como referencia documental, no como parte del deploy actual.
