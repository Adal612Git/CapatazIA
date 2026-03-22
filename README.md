# Capataz AI

Sistema operativo unificado para demo con dashboard web, simulador de WhatsApp, capa fintech laboral y app movil Expo conectados al mismo runtime.

## Stack actual

- Next.js 16
- React 19
- Zustand
- API routes internas para chat, runtime, health y WhatsApp
- APIs moviles para auth, bundle de sesion y solicitudes fintech
- Gemini opcional
- Runtime persistido en archivo local

## Estado real del proyecto

La app ya corre como sistema funcional de demo operable.
El runtime del asistente y del canal WhatsApp mock se persiste en `data/capataz-runtime.json`.

Esto permite pruebas rápidas en local o en un servidor con volumen persistente.
Si configuras Supabase, el runtime deja de depender del archivo local y se vuelve compatible con Vercel.

## Arquitectura actual

- `app/`: superficies web y rutas API
- `components/`: shell, tableros, laboratorio y vistas operativas
- `lib/`: dominio operativo, permisos, store, semillas y runtime
- `CapatazFintech/`: app Expo consumiendo el backend compartido
- `data/`: persistencia local del runtime
- `tests/`: smoke checks mínimos del entorno técnico
- `DocumentacionConsolidada/`: carpeta única con documentación fuente y guías nuevas

## Variables de entorno

Parte de:

```bash
copy .env.example .env.local
```

Variables principales:

- `APP_ENV`: nombre del entorno
- `NEXT_PUBLIC_BASE_URL`: URL pública de la app
- `CAPATAZ_RUNTIME_FILE`: archivo del runtime persistente
- `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon key del proyecto
- `SUPABASE_SERVICE_ROLE_KEY`: service role para persistencia server-side
- `WHATSAPP_PROVIDER`: `mock` o `cloud`
- `WHATSAPP_VERIFY_TOKEN`: token de verificación para Meta
- `WHATSAPP_ACCESS_TOKEN`: access token de Meta
- `WHATSAPP_PHONE_NUMBER_ID`: phone number id de Meta
- `GEMINI_API_KEY`: llave para respuestas libres
- `GEMINI_MODEL`: modelo Gemini
- `CRON_SECRET`: reserva para jobs programados
- `EXPO_PUBLIC_CAPATAZ_API_BASE_URL`: base URL remota para la app Expo cuando no use host local

También se dejan variables reservadas para la arquitectura objetivo del plan original:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `DIRECT_DATABASE_URL`

## Supabase para runtime compatible con Vercel

Antes del deploy, crea la tabla del runtime en Supabase:

1. Abre el SQL Editor de Supabase.
2. Ejecuta [001_capataz_runtime.sql](C:/Users/Rick/Documents/LotosTechnologies/CapatazAI/supabase/001_capataz_runtime.sql).
3. Carga en Vercel estas variables:
   `NEXT_PUBLIC_SUPABASE_URL`
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   `SUPABASE_SERVICE_ROLE_KEY`
   `CRON_SECRET`

Con eso, la app usará Supabase para leer y escribir el runtime compartido.
Si esas variables no existen, cae automáticamente al archivo local.

## Levantar en local

```bash
npm install
copy .env.example .env.local
npm run dev
```

Abre `http://localhost:3000`.

## Credenciales demo

Contrasena:

```txt
capataz123
```

Usuarios sugeridos:

- `ricardo@capataz.ai` - admin
- `ian@capataz.ai` - owner
- `laura@capataz.ai` - supervisora de ventas
- `diego@capataz.ai` - vendedor

## Superficies incluidas

- login por rol
- dashboard ejecutivo
- fintech laboral con score, saldo, solicitudes e insights
- tareas
- kanban
- junta diaria
- pipeline comercial
- campana
- post-venta
- equipo
- reportes
- score
- laboratorio WhatsApp mock/cloud-ready
- settings con broadcasts programados
- app Expo conectada al mismo backend para demo Android

## Endpoints operativos

- `GET /api/health`: healthcheck para servidor y deploy
- `GET /api/cron/broadcasts`: tick manual/protegido para automatizaciones y broadcasts
- `GET|PUT /api/capataz/runtime`: sync del runtime compartido
- `GET|POST /api/capataz/chat`: laboratorio conversacional
- `POST /api/mobile/auth`: login móvil demo
- `GET /api/mobile/session`: bundle móvil con tareas, score, alertas y fintech
- `POST /api/mobile/credit/apply`: solicitud fintech desde la app Expo
- `POST /api/capataz/broadcasts/:id/run`: disparar broadcast programado
- `GET|POST /api/whatsapp/webhook`: webhook de Meta
- `POST /api/whatsapp/outbound`: salida WhatsApp

## Validación local

```bash
npm run lint
npm run test
npm run build
```

O en una sola corrida:

```bash
npm run verify
```

## Docker

Construir y levantar:

```bash
docker compose up --build
```

La app queda expuesta en `http://localhost:3000`.

Notas:

- `docker-compose.yml` monta `./data` como volumen persistente
- dentro del contenedor el runtime se guarda en `/app/data/capataz-runtime.json`
- usa `.env.local` como fuente de variables

## CI

Se incluye workflow en `.github/workflows/ci.yml` con:

- instalación
- lint
- test
- build

## Despliegue recomendado

Para pruebas reales del sistema actual:

- Vercel + Supabase
- VPS con Docker
- Railway
- Render
- Fly.io

## Vercel

Ahora sí ya hay camino viable para Vercel:

1. Ejecuta el SQL de Supabase.
2. Sube el proyecto a un repo Git.
3. Importa el repo en Vercel.
4. Configura variables de entorno desde `.env.example`.
5. Verifica:
   - `/api/health`
   - `/whatsapp`
   - `/fintech`
   - `/settings`

Notas:

- [vercel.json](C:/Users/Rick/Documents/LotosTechnologies/CapatazAI/vercel.json) ya deja configuradas las functions.
- El endpoint [route.ts](C:/Users/Rick/Documents/LotosTechnologies/CapatazAI/app/api/cron/broadcasts/route.ts) ya está protegido para el flujo estándar de `CRON_SECRET` en Vercel.
- [vercel.json](C:/Users/Rick/Documents/LotosTechnologies/CapatazAI/vercel.json) deja un cron diario a las `14:00 UTC`, útil para el broadcast matutino en México.
- En plan Hobby de Vercel, los cron jobs tienen restricciones; para el broadcast vespertino puedes disparar el endpoint manualmente o usar un plan con cron más flexible.

## Cobertura frente al plan original

Ya cubierto en esta base:

- dashboard operativo
- canal WhatsApp mock
- capa fintech laboral integrada al score operativo
- app movil consumiendo runtime compartido
- webhook cloud-ready
- IA opcional
- broadcasts internos
- visibilidad por jerarquía
- vistas automotrices
- deploy reproducible mínimo

Siguiente capa recomendada para alinearse todavía más al plan maestro:

- normalizar el runtime a tablas reales, no snapshot JSON
- auth/roles centralizados fuera del store local
- jobs programados reales
- integración Meta productiva
- integración de dominio completa sobre Supabase/Postgres
