# Guia Pruebas Demo

## 1. Web

### Login

- URL: `/login?system=automotive`
- Usuario admin: `ricardo@capataz.ai`
- Password: `capataz123`

### Recorrido ejecutivo

1. Abrir `/dashboard`
2. Revisar KPIs, actividad y tarjeta fintech
3. Abrir `/pipeline`
4. Abrir `/fintech`
5. Abrir `/reports`
6. Abrir `/whatsapp`

## 2. WhatsApp demo

En `/whatsapp`, seleccionar un colaborador y probar:

- `mis tareas`
- `reporte general`
- `mi saldo`
- `mis movimientos`
- `mis solicitudes`
- `solicitar adelanto 2500`
- `sugerencias`

Validar que:

- aparezcan respuestas operativas y fintech
- se creen solicitudes en el runtime
- luego se reflejen en `/fintech`

## 3. App Expo

### Local

1. Entrar a `CapatazFintech/`
2. Ejecutar `npx expo start`
3. Abrir Android
4. Login con:
   `diego@capataz.ai`
   `capataz123`

### Recorrido

1. Inicio
2. Score
3. Actividad
4. Credito
5. Perfil

### Validacion clave

- la app muestra las mismas tareas y score que web
- las solicitudes creadas desde mobile aparecen en web y WhatsApp
- el bundle carga desde `api/mobile/session`

## 4. APIs

### Health

- `GET /api/health`

### Runtime

- `GET /api/capataz/runtime?systemMode=automotive`

### Mobile auth

- `POST /api/mobile/auth`

Body:

```json
{
  "email": "diego@capataz.ai",
  "password": "capataz123",
  "systemMode": "automotive"
}
```

### Mobile bundle

- `GET /api/mobile/session?userId=usr-operator-1&systemMode=automotive`

### Credit apply

- `POST /api/mobile/credit/apply`

Body:

```json
{
  "userId": "usr-operator-1",
  "productId": "salary_advance",
  "amount": 2500,
  "rationale": "Prueba de demo",
  "systemMode": "automotive"
}
```

## 5. Coherencia esperada

- WhatsApp crea o consulta sobre el mismo runtime
- `/fintech` refleja cuentas, movimientos y solicitudes
- Expo refleja score, tareas, alertas y fintech del mismo usuario
- reportes y dashboard conservan consistencia con los cambios
