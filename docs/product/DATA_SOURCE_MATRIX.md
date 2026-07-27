# Matriz de Fuentes de Datos — CompilerAI

**Fecha:** 2026-07-27
**Propósito:** Mapear cada módulo de CompilerAI a su fuente de datos real o simulada, indicando tabla/API, disponibilidad de datos reales, mecanismo de fallback, dependencias externas y estado de conexión. Actualizada tras el UX Sprint 1.

---

## Convenciones de estado de conexión

| Estado | Significado |
|---|---|
| `REAL` | El módulo lee/escribe datos reales en Supabase o un servicio externo configurado. |
| `REAL + SECURE` | El módulo lee/escribe datos reales y aplica prácticas de seguridad adicionales (edge function, hash criptográfico). |
| `SIMULATED` | El módulo usa datos mock definidos en archivos `.ts` de fixtures. |
| `NOT CONFIGURED` | El módulo no tiene fuente de datos; requiere configuración externa. |

---

## Matriz principal

| Módulo | Fuente de datos | Tabla / API | Datos reales | Fallback | Dependencia externa | Estado de conexión |
|---|---|---|---|---|---|---|
| Autenticación | Supabase Auth | `auth.users` | Sí | — | Supabase | `REAL` |
| Perfil de usuario | Supabase Postgres | `profiles` | Sí | — | Supabase | `REAL` |
| Preferencias de perfil | Supabase Postgres | `profiles.preferences` (jsonb) | Sí | — | Supabase | `REAL` |
| Organización | Supabase Postgres | `organizations` | Sí | — | Supabase | `REAL` |
| Miembros de equipo | Supabase Postgres | `org_members` | Sí (lectura, roles, eliminar) | — | Supabase | `REAL` (lectura/escritura); invitaciones pendientes |
| API Keys | Supabase Edge Function + Postgres | `create-api-key` (edge function) → `api_keys` (hash SHA-256) | Sí (seguro) | — | Supabase Edge Functions | `REAL + SECURE` |
| Preferencias de notificación | Supabase Postgres | `profiles.preferences.notifications` (jsonb) | Sí | — | Supabase | `REAL` |
| Seguridad — contraseña | Supabase Auth | `supabase.auth.updateUser` | Sí | — | Supabase Auth | `REAL` |
| Seguridad — verificación de correo | Supabase Auth | `auth.users` (email_confirmed_at) | Sí | — | Supabase Auth | `REAL` |
| Seguridad — sesiones | Supabase Auth | `supabase.auth.signOut` (all) | Sí | — | Supabase Auth | `REAL` |
| Seguridad — MFA | Ninguna | — | No | — | Backend MFA (pendiente) | `NOT CONFIGURED` |
| Notificaciones (dropdown topbar) | Archivo mock | `mockData.ts` | No | `mockData.ts` | Ninguna | `SIMULATED` |
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
| Integrations (página) | Archivo mock | `mockData.ts` | No | `mockData.ts` | Catálogo de integraciones (pendiente) | `SIMULATED` |
| Marketplace | Archivo mock | `mockData.ts` | No | `mockData.ts` | Marketplace (pendiente) | `SIMULATED` |
| Monitor | Archivo mock | `mockData.ts` | No | `mockData.ts` | Telemetría (pendiente) | `SIMULATED` |
| Búsqueda global | Ninguna | — | No | — | Servicio de búsqueda (pendiente) | `NOT CONFIGURED` |
| Facturación (Billing) | Ninguna (vista demo) | — | No (demo) | — | Stripe (no configurado) | `NOT CONFIGURED` |
| Integraciones (Settings) | Ninguna (UI lista) | — | No | — | Servicios externos (8, pendientes) | `NOT CONFIGURED` |
| Invitaciones de equipo | Ninguna | — | No | — | Servidor de correo (no configurado) | `NOT CONFIGURED` |

---

## Resumen por tipo de fuente

| Tipo de fuente | Módulos | Cantidad |
|---|---|---|
| **Supabase (real)** | Auth, Profile, Profile preferences, Organization, org_members, Notification preferences, Security (contraseña, correo, sesiones) | 8 |
| **Supabase Edge Function (real + segura)** | API Keys | 1 |
| **Mock (simulado)** | Notifications dropdown, Home, Compiler, Runner, Memory, Brain, Prompt, Workflow Designer, Enterprise, Agents, Workflows, Integrations (página), Marketplace, Monitor | 14 |
| **Sin fuente (no configurado)** | Búsqueda, Billing, Security MFA, Integrations (Settings), Team invitations | 5 |

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
| Supabase (Auth + Postgres) | Auth, Profile, Profile preferences, Organization, API Keys, Team, Notifications prefs, Security (contraseña, correo, sesiones) | Configurado y operativo |
| Supabase Edge Functions | API Keys (`create-api-key`) | Configurado y operativo (seguro) |
| Stripe | Billing | No configurado — requiere `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` y variables relacionadas |
| Servidor de correo electrónico | Team invitations | No configurado — requiere configurar servicio de envío de correo |
| API keys externas (8 servicios) | Integrations (Settings) | No configurado — requiere credenciales por integración |
| Servicio de búsqueda | Search bar | No configurado |
| Backend MFA | Security — MFA | No implementado |
| Motores de Compiler / Runner / Brain / Prompt | Módulos de producto | No implementados |

---

## Cambios desde la versión anterior (UX Sprint 1)

| Módulo | Antes | Ahora |
|---|---|---|
| Preferencias de perfil | Columnas individuales en `profiles` | `profiles.preferences` (jsonb) — `REAL` |
| Preferencias de notificación | Columnas individuales en `profiles` | `profiles.preferences.notifications` (jsonb) — `REAL` |
| API Keys | Generación en cliente, `api_keys` (texto plano) | Edge function `create-api-key`, `api_keys` (hash SHA-256) — `REAL + SECURE` |
| Seguridad — contraseña | `NOT CONFIGURED` | `supabase.auth.updateUser` — `REAL` |
| Seguridad — verificación de correo | `NOT CONFIGURED` | `auth.users` (email_confirmed_at) — `REAL` |
| Seguridad — sesiones | `NOT CONFIGURED` | `supabase.auth.signOut` (all) — `REAL` |
| Seguridad — MFA | `NOT CONFIGURED` | `NOT CONFIGURED` (sin cambios, pendiente de backend) |

---

## Plan de migración de mock a real

| Prioridad | Módulo | Acción requerida |
|---|---|---|
| 1 | Billing | Configurar Stripe y variables de entorno |
| 2 | Team invitations | Configurar servidor de correo y flujo de invitaciones |
| 3 | Integrations (Settings) | Proveer credenciales de los 8 servicios externos |
| 4 | Security — MFA | Implementar backend de autenticación multifactor |
| 5 | Notifications dropdown | Crear tabla `notifications` y conectar dropdown |
| 6 | Home (Dashboard) | Crear vistas/consultas agregadas en Supabase |
| 7 | Compiler | Implementar motor de compilación |
| 8 | Runner | Implementar motor de ejecución |
| 9 | Agents / Workflows | Crear tablas `agents`, `workflows` y CRUD |
| 10 | Memory / Brain / Prompt | Implementar servicios correspondientes |
| 11 | Enterprise / Marketplace / Monitor / Integrations (página) | Conectar a servicios backend |
| 12 | Search | Implementar búsqueda global (Postgres FTS o servicio externo) |

---

*Fin de la matriz de fuentes de datos.*
