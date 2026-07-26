# Matriz de Fuentes de Datos — CompilerAI

**Fecha:** 2025-01-20
**Propósito:** Mapear cada módulo de CompilerAI a su fuente de datos real o simulada, indicando tabla/API, disponibilidad de datos reales, mecanismo de fallback, dependencias externas y estado de conexión.

---

## Convenciones de estado de conexión

| Estado | Significado |
|---|---|
| `REAL` | El módulo lee/escribe datos reales en Supabase o un servicio externo configurado. |
| `SIMULATED` | El módulo usa datos mock definidos en archivos `.ts` de fixtures. |
| `NOT CONFIGURED` | El módulo no tiene fuente de datos; requiere configuración externa. |

---

## Matriz principal

| Módulo | Fuente de datos | Tabla / API | Datos reales | Fallback | Dependencia externa | Estado de conexión |
|---|---|---|---|---|---|---|
| Autenticación | Supabase Auth | `auth.users` | Sí | — | Supabase | `REAL` |
| Perfil de usuario | Supabase Postgres | `profiles` | Sí | — | Supabase | `REAL` |
| Organización | Supabase Postgres | `organizations` | Sí | — | Supabase | `REAL` |
| Miembros de equipo | Supabase Postgres | `org_members` | Sí (lectura) | — | Supabase | `REAL` (lectura); invitaciones pendientes |
| API Keys | Supabase Postgres | `api_keys` | Sí | — | Supabase | `REAL` |
| Preferencias de notificación | Supabase Postgres | `profiles` (columnas) | Sí | — | Supabase | `REAL` |
| Notificaciones (dropdown) | Archivo mock | `mockData.ts` | No | `mockData.ts` | Ninguna | `SIMULATED` |
| Home (Dashboard) | Archivo mock | `mockData.ts` | No | `mockData.ts` | Ninguna | `SIMULATED` |
| Compiler | Archivo mock | `blueprintMocks.ts` | No | `blueprintMocks.ts` | Motor de compilación (pendiente) | `SIMULATED` |
| Runner | Archivo mock | `executionMocks.ts` | No | `executionMocks.ts` | Motor de ejecución (pendiente) | `SIMULATED` |
| Memory Center | Archivo mock | `memoryMocks.ts` | No | `memoryMocks.ts` | Almacenamiento de memoria (pendiente) | `SIMULATED` |
| AI Brain | Archivo mock | `brainMocks.ts` | No | `brainMocks.ts` | Servicio Brain (pendiente) | `SIMULATED` |
| Prompt Intelligence | Archivo mock | `promptMocks.ts` | No | `promptMocks.ts` | Motor de análisis (pendiente) | `SIMULATED` |
| Workflow Designer | Archivo mock | `workflowMocks.ts` | No (lienzo funcional) | `workflowMocks.ts` | Backend de workflows (pendiente) | `SIMULATED` |
| Enterprise Center | Archivo mock | `enterpriseMocks.ts` | No | `enterpriseMocks.ts` | Servicio empresarial (pendiente) | `SIMULATED` |
| Agents | Archivo mock | `mockData.ts` | No | `mockData.ts` | Gestión de agentes (pendiente) | `SIMULATED` |
| Workflows | Archivo mock | `mockData.ts` | No | `mockData.ts` | Gestión de flujos (pendiente) | `SIMULATED` |
| Integrations | Archivo mock | `mockData.ts` | No | `mockData.ts` | Catálogo de integraciones (pendiente) | `SIMULATED` |
| Marketplace | Archivo mock | `mockData.ts` | No | `mockData.ts` | Marketplace (pendiente) | `SIMULATED` |
| Monitor | Archivo mock | `mockData.ts` | No | `mockData.ts` | Telemetría (pendiente) | `SIMULATED` |
| Búsqueda global | Ninguna | — | No | — | Servicio de búsqueda (pendiente) | `NOT CONFIGURED` |
| Facturación (Billing) | Ninguna | — | No | — | Stripe (no configurado) | `NOT CONFIGURED` |
| Seguridad (Security) | Ninguna | — | No | — | Backend de seguridad (pendiente) | `NOT CONFIGURED` |
| Integraciones (Settings) | Ninguna | — | No | — | Servicios externos (pendiente) | `NOT CONFIGURED` |

---

## Resumen por tipo de fuente

| Tipo de fuente | Módulos | Cantidad |
|---|---|---|
| **Supabase (real)** | Auth, Profile, Organization, org_members, API Keys, Notification preferences | 6 |
| **Mock (simulado)** | Notifications dropdown, Home, Compiler, Runner, Memory, Brain, Prompt, Workflow Designer, Enterprise, Agents, Workflows, Integrations, Marketplace, Monitor | 14 |
| **Sin fuente (no configurado)** | Búsqueda, Billing, Security, Integrations (Settings) | 4 |

---

## Archivos mock de referencia

| Archivo | Módulos que lo consumen |
|---|---|
| `mockData.ts` | Home, Notifications, Agents, Workflows, Integrations, Marketplace, Monitor |
| `blueprintMocks.ts` | Compiler |
| `executionMocks.ts` | Runner |
| `memoryMocks.ts` | Memory Center |
| `brainMocks.ts` | AI Brain |
| `promptMocks.ts` | Prompt Intelligence |
| `workflowMocks.ts` | Workflow Designer |
| `enterpriseMocks.ts` | Enterprise Center |

---

## Dependencias externas requeridas

| Dependencia | Módulo afectado | Estado |
|---|---|---|
| Supabase (Auth + Postgres) | Auth, Profile, Organization, API Keys, Team, Notifications prefs | Configurado y operativo |
| Stripe | Billing | No configurado — requiere `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` y variables relacionadas |
| Servicio de búsqueda | Search bar | No configurado |
| Backend de seguridad | Security | No implementado |
| Motores de Compiler / Runner / Brain / Prompt | Módulos de producto | No implementados |

---

## Plan de migración de mock a real

| Prioridad | Módulo | Acción requerida |
|---|---|---|
| 1 | Billing | Configurar Stripe y variables de entorno |
| 2 | Notifications dropdown | Crear tabla `notifications` y conectar dropdown |
| 3 | Home (Dashboard) | Crear vistas/consultas agregadas en Supabase |
| 4 | Compiler | Implementar motor de compilación |
| 5 | Runner | Implementar motor de ejecución |
| 6 | Agents / Workflows | Crear tablas `agents`, `workflows` y CRUD |
| 7 | Memory / Brain / Prompt | Implementar servicios correspondientes |
| 8 | Enterprise / Marketplace / Monitor / Integrations | Conectar a servicios backend |
| 9 | Search | Implementar búsqueda global (Postgres FTS o servicio externo) |

---

*Fin de la matriz de fuentes de datos.*
