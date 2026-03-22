# Guia Deploy Vercel

## Proyecto actual

- Proyecto Vercel enlazado: `capataz-ia`
- Framework: `Next.js`
- Cron configurado en `vercel.json` para `/api/cron/broadcasts`

## Variables minimas

- `APP_ENV`
- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_BASE_URL`
- `CRON_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `WHATSAPP_PROVIDER`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`

## Runtime recomendado en produccion

Usar Supabase para que:

- web
- WhatsApp
- cron
- app Expo

lean el mismo estado compartido aunque Vercel rote instancias.

## Checklist de salida

1. `npm run build`
2. `npm run test`
3. Healthcheck en `/api/health`
4. Login y dashboard
5. Ruta `/fintech`
6. Ruta `/whatsapp`
7. Solicitud movil via `api/mobile/credit/apply`
8. Sync de runtime entre web y WhatsApp
