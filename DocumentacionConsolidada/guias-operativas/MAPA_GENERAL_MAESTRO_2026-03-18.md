# Mapa General Maestro

Fecha de corte: 2026-03-18

## 1. Proposito de este documento

Este documento intenta describir TODO el sistema Capataz tal como existe hoy en el repositorio y en la demo unificada actual.

No reemplaza la documentacion historica de `raiz/`, `marketing/`, `original/` o `fintech-stack/`.
Su funcion es servir como punto de partida unico para:

- entender como esta conformado el proyecto ahora mismo
- ubicar cada modulo real del repositorio
- saber que si esta funcionando hoy y que sigue siendo deuda
- preparar un documento maestro posterior con ChatGPT u otro flujo editorial

## 2. Resumen ejecutivo del estado actual

Capataz ya no esta organizado como demos aisladas. Hoy el proyecto opera como un sistema unificado con cuatro superficies principales:

- dashboard web en Next.js
- simulador de WhatsApp dentro del dashboard
- capa fintech laboral integrada al runtime operativo
- app movil Expo para Android consumiendo el mismo backend compartido

La idea central actual es esta:

1. Existe un runtime compartido con usuarios, tareas, alertas, pipeline, score, reportes, broadcasts y fintech.
2. Ese runtime se lee y escribe desde web, APIs internas, WhatsApp demo y app movil.
3. La persistencia puede vivir en archivo local o en Supabase, dependiendo del entorno.
4. La IA esta integrada como capa conversacional y de sugerencias, pero el sistema sigue siendo funcional aun sin depender completamente de ella.

## 3. Estado operativo real hoy

### 3.1 Lo que si existe y ya esta integrado

- Login demo por usuarios y roles.
- Dashboard ejecutivo con vistas operativas.
- Modulos de tareas, kanban, juntas, pipeline, campanas, postventa, equipo, score, reportes y settings.
- Simulador de WhatsApp para ejecutar interacciones de operacion y fintech.
- Capa fintech con cuentas, movimientos, solicitudes, score e insights.
- App Expo conectada a APIs reales del sistema central.
- Persistencia del runtime en archivo local o Supabase.
- Endpoints de healthcheck, cron, runtime, chat, WhatsApp y mobile.
- Deploy compatible con Vercel.

### 3.2 Lo que sigue siendo demo o semi-demo

- La autenticacion sigue siendo de demostracion, no identidad productiva real.
- La persistencia principal sigue siendo snapshot compartido, no un modelo totalmente normalizado por tablas de negocio.
- WhatsApp puede operar en modo `mock` o quedar cloud-ready, pero la integracion productiva completa depende de credenciales y operacion externa.
- La IA conversacional depende de configuracion de Gemini y no reemplaza procesos empresariales reales.
- La app Expo esta orientada a demostracion funcional, no a distribucion final por stores.

## 4. Arquitectura actual resumida

## 4.1 Principio de diseno actual

El sistema se unifico alrededor de la aplicacion Next.js de la raiz. Esa app hace tres papeles al mismo tiempo:

- frontend web del dashboard
- backend HTTP para APIs internas y mobiles
- orquestador del runtime compartido

La app Expo no tiene backend propio. Consume el backend de la raiz.
El simulador de WhatsApp tampoco tiene backend aparte. Usa las rutas y logica del mismo sistema.

## 4.2 Flujo tecnico de alto nivel

1. El usuario entra por web, WhatsApp demo o mobile.
2. La accion dispara lectura o mutacion del runtime compartido.
3. El runtime se hidrata desde persistencia.
4. El sistema responde usando reglas operativas, permisos, semillas, metricas e IA opcional.
5. Los cambios quedan disponibles para todas las superficies.

## 4.3 Fuentes de verdad

Fuente de verdad funcional actual:

- `RuntimeSyncPayload` definido en `lib/types.ts`
- logica de runtime en `lib/capataz-operativo.ts`
- sincronizacion de estado cliente en `lib/store.ts`

Persistencia actual:

- archivo local en `data/` para desarrollo y pruebas simples
- Supabase cuando existen variables de entorno server-side

## 5. Estructura real del repositorio

## 5.1 Carpetas raiz mas importantes

- `app/`: superficies web y rutas API del sistema central
- `components/`: componentes visuales y operativos compartidos del dashboard
- `lib/`: dominio, store, runtime, semillas, permisos, IA y backend compartido
- `CapatazFintech/`: app Expo para mobile
- `data/`: persistencia local del runtime
- `supabase/`: SQL minimo para la tabla de runtime compartido
- `tests/`: smoke checks tecnicos de despliegue y documentacion base
- `DocumentacionConsolidada/`: documentacion consolidada para trabajo editorial

## 5.2 Carpetas heredadas o auxiliares relevantes

- `Fintech/`: stack legado separado, hoy no forma parte del deploy actual
- `Marketing/`: material comercial historico
- `DocumentacionOriginal/`: insumos previos
- `DocumentacionConsolidada+/`: carpeta adicional existente, pero la referencia principal consolidada hoy es `DocumentacionConsolidada/`
- `.vercel/`: vinculacion local del proyecto con Vercel
- `.github/`: CI

## 6. Sistema web actual

## 6.1 Rutas de pagina en `app/`

Paginas principales detectadas hoy:

- `/`
- `/login`
- `/demo-whatsapp`
- `/dashboard`
- `/alerts`
- `/campana`
- `/checklists`
- `/fintech`
- `/junta`
- `/kanban`
- `/multisucursal`
- `/pipeline`
- `/postventa`
- `/reports`
- `/score`
- `/settings`
- `/tasks`
- `/team`
- `/whatsapp`

## 6.2 Sentido de cada modulo web

- `dashboard`: vista ejecutiva y resumen general
- `alerts`: seguimiento de alertas
- `campana`: vistas relacionadas con ejecucion comercial
- `checklists`: control operativo
- `fintech`: saldos, movimientos, solicitudes, score e insights financieros
- `junta`: rutina operativa diaria
- `kanban`: gestion de tareas por columnas
- `multisucursal`: vista multi-sede
- `pipeline`: embudo comercial y operaciones de venta
- `postventa`: seguimiento posterior a la venta
- `reports`: reportes y narrativa ejecutiva
- `score`: score operativo y seguimiento de desempeno
- `settings`: configuracion, incluidos broadcasts
- `tasks`: tareas
- `team`: equipo, roles y visibilidad
- `whatsapp`: laboratorio conversacional interno

## 6.3 Componentes de interfaz mas relevantes

- `components/dashboard-shell.tsx`: shell principal del dashboard y navegacion
- `components/login-page-client.tsx`: entrada al sistema
- `components/whatsapp-lab.tsx`: simulador / laboratorio de WhatsApp
- `components/kanban-board.tsx`: tablero kanban
- `components/create-task-dialog.tsx`: alta de tareas
- `components/task-detail-sheet.tsx`: detalle de tarea
- `components/module-header.tsx`: encabezados operativos
- `components/tts-play-button.tsx`: apoyo de TTS
- `components/auth-gate.tsx`: control de acceso demo por sesion local

## 7. Backend y APIs actuales

## 7.1 Endpoints disponibles hoy

- `GET|PUT /api/capataz/runtime`
- `GET|POST /api/capataz/chat`
- `POST /api/capataz/broadcasts/:broadcastId/run`
- `POST /api/capataz/broadcasts/team-reminder/run`
- `GET /api/charts/user-summary`
- `GET /api/cron/broadcasts`
- `GET /api/health`
- `POST /api/mobile/auth`
- `GET /api/mobile/session`
- `POST /api/mobile/credit/apply`
- `POST /api/tts`
- `POST /api/whatsapp/outbound`
- `GET|POST /api/whatsapp/webhook`

## 7.2 Rol funcional de las APIs

- `runtime`: sincronizacion del snapshot compartido
- `chat`: canal conversacional de Capataz
- `broadcasts`: disparo de comunicaciones y recordatorios programados
- `charts`: resumen de datos para graficas
- `cron`: tick operativo protegido para automatizaciones
- `health`: verificacion del entorno y del despliegue
- `mobile/*`: autenticacion demo y sesion completa para Expo
- `tts`: texto a voz
- `whatsapp/*`: salida y webhook del canal WhatsApp

## 8. App movil Expo actual

## 8.1 Ubicacion y stack

La app movil vive en `CapatazFintech/` y usa:

- Expo 54
- React 19
- React Native 0.81
- Expo Router

## 8.2 Pantallas moviles activas

- `app/(auth)/login.tsx`
- `app/(tabs)/index.tsx`
- `app/(tabs)/score.tsx`
- `app/(tabs)/credito.tsx`
- `app/(tabs)/ventas.tsx`
- `app/(tabs)/perfil.tsx`

## 8.3 Backend mobile compartido

La app consume estas rutas del sistema central:

- `POST /api/mobile/auth`
- `GET /api/mobile/session`
- `POST /api/mobile/credit/apply`

El cliente movil comun esta en:

- `CapatazFintech/lib/mobile-session.ts`

Ese archivo resuelve la URL base remota o local y mantiene la sesion demo movil.

## 8.4 Estado funcional actual de mobile

La app ya no depende solo de mocks para la experiencia principal.
Las pantallas centrales usan el bundle real de sesion entregado por el backend compartido.
Sigue existiendo `CapatazFintech/data/mockData.ts` como residuo o apoyo historico, pero la ruta actual va por backend.

## 9. Capa fintech integrada

## 9.1 Objetivo fintech dentro del sistema

La capa fintech no esta separada como un producto aparte en la demo actual.
Esta integrada al contexto laboral y operativo del colaborador para reforzar:

- coherencia de score
- narrativa de productividad
- incentivo financiero
- profundidad de demo para usuarios internos

## 9.2 Entidades fintech en el modelo actual

En `lib/types.ts` ya existen tipos para:

- `FinanceAccount`
- `FinanceMovement`
- `FinanceApplication`
- `FinanceInsight`
- `ScoreSnapshot`
- `WeeklyPoint`

Ademas, `AppSeed` y `RuntimeSyncPayload` ya cargan:

- cuentas
- movimientos
- solicitudes
- insights
- snapshots de score
- serie semanal

## 9.3 Logica fintech principal

El dominio fintech vive sobre todo en:

- `lib/fintech.ts`
- `lib/mobile-backend.ts`
- `lib/capataz-operativo.ts`
- `lib/store.ts`
- `lib/seed-data.ts`
- `lib/seed-data-hospital.ts`

Funciones principales conocidas:

- catalogo de productos financieros demo
- elegibilidad por score
- seleccion de cuentas, movimientos y solicitudes por usuario
- construccion de tendencia financiera
- snapshot del equipo
- solicitud de adelanto o credito desde mobile o WhatsApp

## 9.4 Superficies fintech

- pagina web `/fintech`
- comandos en `/whatsapp`
- tab de credito y score en mobile
- resumen fintech embebido en dashboard

## 10. WhatsApp actual

## 10.1 Enfoque

Hoy WhatsApp funciona como simulador interno y tambien como capa cloud-ready.
La version mas estable para demo es la simulada dentro del dashboard.

## 10.2 Comandos demo ya conectados

Entre los comandos soportados estan:

- `mis tareas`
- `reporte general`
- `mi saldo`
- `mis movimientos`
- `mis solicitudes`
- `solicitar adelanto 2500`

## 10.3 Valor del canal WhatsApp en la demo

- hace visible la interfaz conversacional
- demuestra operacion sin entrar al dashboard
- comparte estado con tareas, score y fintech
- ayuda a que la demo se sienta menos prototipo aislado

## 11. Capa de IA actual

## 11.1 Donde vive la logica de IA

- `lib/ai/gemini.ts`
- `lib/assistant-personas.ts`
- `app/api/capataz/chat/route.ts`

## 11.2 Rol actual de la IA

La IA hoy se usa como apoyo de:

- respuestas conversacionales
- narrativa operativa
- tono de asistente Capataz
- generacion de sugerencias e interpretaciones

## 11.3 Limite actual

La IA mejora la experiencia, pero el sistema no depende completamente de ella para funcionar.
La demo sigue apoyandose en reglas, semillas, estructura de runtime y datos deterministas.

## 12. Dominio y modelo de datos

## 12.1 Tipos principales del sistema en `lib/types.ts`

Tipos de base y control:

- roles
- modos de sistema
- departamentos
- prioridades
- severidades
- tendencias

Entidades operativas:

- `Workspace`
- `User`
- `Column`
- `Task`
- `ChecklistItem`
- `ChecklistInstance`
- `Alert`
- `ActivityEntry`
- `Prospect`
- `TestDrive`
- `SalesOperation`
- `CreditFile`
- `BellIncident`
- `PostSaleFollowUp`
- `GeneratedReport`
- `OperationalNote`
- `OperationalSuggestion`
- `ScheduledBroadcast`
- `ScoreSnapshot`
- `WeeklyPoint`

Entidades fintech:

- `FinanceAccount`
- `FinanceMovement`
- `FinanceApplication`
- `FinanceInsight`

Contenedores de runtime:

- `AppSeed`
- `RuntimeSyncPayload`

## 12.2 Forma actual de persistencia

El sistema hoy no persiste cada entidad como tabla de negocio propia dentro del repositorio.
La unidad operativa central sigue siendo un snapshot de runtime.

Ventaja:

- acelera la demo
- permite coherencia rapida entre superficies
- facilita reset y semillas

Costo:

- menos granularidad transaccional
- mayor acoplamiento de estado
- mas deuda tecnica para evolucion a producto enterprise real

## 12.3 Semillas y escenarios

Las semillas principales viven en:

- `lib/seed-data.ts`
- `lib/seed-data-hospital.ts`
- `lib/app-seeds.ts`

Actualmente existen al menos dos modos de sistema:

- `automotive`
- `hospital`

El modo mas trabajado para la demo actual es `automotive`.

## 13. Store, permisos y runtime

## 13.1 Store cliente

El store principal vive en `lib/store.ts` con Zustand.
Ese store concentra gran parte de la logica de lectura, mutacion y sincronizacion de estado del dashboard.

## 13.2 Permisos

La visibilidad por jerarquia y rol se apoya en:

- `lib/permissions.ts`
- `lib/domain-config.ts`

## 13.3 Runtime server

La orquestacion del runtime compartido se reparte entre:

- `lib/capataz-operativo.ts`
- `lib/runtime-hydration.ts`
- `lib/runtime-storage.ts`
- `lib/runtime-config.ts`

Esta capa:

- hidrata el estado
- aplica semillas por modo
- persiste el snapshot
- expone el payload sincronizable
- sirve de base para web, chat, WhatsApp y mobile

## 14. Persistencia e infraestructura

## 14.1 Local

Cuando no hay configuracion externa suficiente, el sistema puede operar con persistencia local en `data/`.

Hoy en el repo aparece:

- `data/.gitkeep`

El runtime real puede generarse ahi en entorno local.

## 14.2 Supabase

La base minima para runtime compatible con Vercel esta en:

- `supabase/001_capataz_runtime.sql`

Supabase es hoy el camino correcto para que el runtime sobreviva bien en despliegues serverless.

## 14.3 Vercel

El proyecto local esta vinculado con Vercel mediante:

- `.vercel/project.json`

Nombre de proyecto vinculado actualmente:

- `capataz-ia`

Segun el trabajo previo de esta sesion, la demo fue desplegada a Vercel y se verificaron rutas remotas del sistema unificado.

## 15. Variables de entorno y configuracion

La referencia publica de variables sigue siendo:

- `.env.example`

Variables importantes del sistema actual:

- `APP_ENV`
- `NEXT_PUBLIC_BASE_URL`
- `CAPATAZ_RUNTIME_FILE`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WHATSAPP_PROVIDER`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `CRON_SECRET`
- `EXPO_PUBLIC_CAPATAZ_API_BASE_URL`

Nota importante:

- `.env.local` existe en el workspace y puede contener secretos reales
- no debe copiarse a documentacion publica
- el documento maestro final debe describir variables, no exponer valores

## 16. Calidad, pruebas y verificacion

## 16.1 Scripts principales del sistema web

En `package.json` de la raiz existen:

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run test`
- `npm run verify`

## 16.2 Scripts principales de Expo

En `CapatazFintech/package.json` existen:

- `npm run start`
- `npm run android`
- `npm run ios`
- `npm run web`

## 16.3 Tests detectados en el repo

En `tests/` hoy existen:

- `deploy-surface.test.mjs`
- `env-example.test.mjs`

El alcance es tecnico y de smoke coverage, no un set amplio de pruebas funcionales end-to-end.

## 16.4 Verificaciones ya ejecutadas en esta etapa de trabajo

Segun la sesion previa de integracion y despliegue, se ejecutaron exitosamente:

- `npm.cmd run build`
- `npm.cmd run test`
- `npx.cmd tsc --noEmit` dentro de `CapatazFintech`
- smoke checks locales y remotos sobre salud, fintech, mobile, chat y demo conversacional

## 17. Decision tecnica importante sobre codigo legado

El arbol `Fintech/` legado sigue presente como referencia documental o tecnica, pero no participa en el deploy actual del sistema raiz.

En `tsconfig.json` de la raiz se excluye:

- `CapatazFintech/**/*`
- `Fintech/**/*`

Razon principal:

- evitar que `next build` falle por el stack legado y por decoradores de Nest en el arbol antiguo de fintech

Esto significa que:

- la app web de la raiz se construye limpia
- Expo se valida aparte
- el stack `Fintech/` se conserva como antecedente, no como app activa del deploy

## 18. Mapa de documentacion consolidada

## 18.1 Carpeta canonica

La carpeta canonica para consolidar el conocimiento hoy es:

- `DocumentacionConsolidada/`

## 18.2 Subcarpetas y sentido

- `raiz/`: vision, PRD, arquitectura, backlog, roadmap, decks y documentos base de Capataz
- `marketing/`: presentaciones y narrativa comercial por vertical
- `original/`: evidencias e insumos de origen
- `fintech-stack/`: documentacion heredada del stack fintech previo
- `guias-operativas/`: documentacion nueva sobre la version unificada realmente desplegable

## 18.3 Documentos operativos nuevos mas importantes

- `DocumentacionConsolidada/INDICE_GENERAL.md`
- `DocumentacionConsolidada/guias-operativas/ARQUITECTURA_UNIFICADA.md`
- `DocumentacionConsolidada/guias-operativas/GUIA_DEPLOY_VERCEL.md`
- `DocumentacionConsolidada/guias-operativas/GUIA_PRUEBAS_DEMO.md`
- `DocumentacionConsolidada/guias-operativas/MAPA_GENERAL_MAESTRO_2026-03-18.md`

## 19. Usuarios demo y narrativa del sistema

Usuarios demo visibles en la documentacion raiz del proyecto:

- `ricardo@capataz.ai`
- `ian@capataz.ai`
- `laura@capataz.ai`
- `diego@capataz.ai`

Contrasena demo documentada:

- `capataz123`

Los roles centrales del sistema son:

- `admin`
- `owner`
- `supervisor`
- `operator`

## 20. Lo mas importante para entender el proyecto rapido

Si alguien necesita entender el sistema en poco tiempo, el orden mas eficiente hoy es:

1. Leer `README.md` de la raiz.
2. Leer `DocumentacionConsolidada/INDICE_GENERAL.md`.
3. Leer `DocumentacionConsolidada/guias-operativas/ARQUITECTURA_UNIFICADA.md`.
4. Leer este `MAPA_GENERAL_MAESTRO_2026-03-18.md`.
5. Revisar `app/`, `components/`, `lib/` y `CapatazFintech/`.
6. Revisar `supabase/001_capataz_runtime.sql`.

## 21. Gaps, deuda y siguientes capas recomendadas

## 21.1 Deuda tecnica principal

- normalizar datos a modelo relacional real
- separar mejor dominio, transporte y capa de presentacion
- endurecer autenticacion y sesion
- ampliar pruebas funcionales
- convertir broadcast y automatizaciones en jobs productivos reales
- cerrar integracion productiva completa de WhatsApp Cloud
- formalizar trazabilidad y auditoria

## 21.2 Mejoras de producto recomendadas

- panel mas profundo de IA por usuario, equipo y sucursal
- historico mas rico de score, metas y comportamiento
- workflows de credito mas completos
- reportes exportables reales
- onboarding de usuarios y sucursales
- configuracion empresarial multi-tenant de verdad

## 22. Preguntas guia para construir un super mapa con ChatGPT

Si luego quieres convertir toda esta base en un documento aun mas grande, estas preguntas sirven bien:

- Cual es la arquitectura funcional y tecnica completa de Capataz hoy
- Que modulos existen y como se conectan entre si
- Cuales son las entidades de datos, reglas y flujos mas importantes
- Que parte del sistema es demo y que parte ya es operable
- Que diferencias hay entre la vision original y la implementacion actual
- Cual seria el roadmap para pasar de demo unificada a producto real enterprise

## 23. Conclusion corta

Capataz hoy ya es un sistema unificado de demo funcional con una sola base operativa compartida entre web, WhatsApp y mobile.
Todavia no es una plataforma enterprise cerrada de punta a punta, pero ya tiene suficiente estructura real para documentarse como producto coherente, demostrarse como sistema conectado y evolucionar sobre una base tecnica comun.
