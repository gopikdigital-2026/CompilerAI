# UX Profile Audit — CompilerAI

**Fecha:** 2026-07-27
**Sprint:** UX Sprint 1 — Perfil, Cuenta y Configuración

---

## Resumen ejecutivo

La base de datos contiene 11 tablas (4 core + 7 IAM) con RLS habilitado, pero el frontend solo utiliza 4 tablas y de forma parcial. El menú de perfil tiene 4 items activos; faltan Organización, Seguridad, Notificaciones e Integraciones. Las notificaciones no se persisten. La seguridad no tiene pantalla. Las invitaciones de equipo existen en DB pero no en UI. La generación de API keys es insegura (client-side, plaintext hash).

---

## 1. Menú de usuario (Topbar.tsx)

| Item menú | Componente | Comportamiento esperado | Comportamiento actual | Backend | Estado | Corrección |
|---|---|---|---|---|---|---|
| Mi perfil | Topbar → SettingsPage | Navegar a /settings/profile | Navega pero Dashboard pierde el argumento `section` | Supabase profiles | **BUG** | Corregir paso de section en Dashboard |
| Organización | — | Navegar a /settings/organization | No existe en menú | Supabase organizations | **FALTA** | Añadir al menú |
| Equipo | Topbar → SettingsPage | Navegar a /settings/team | Navega pero section se pierde | Supabase memberships | **BUG** | Corregir navegación |
| Facturación | Topbar → SettingsPage | Navegar a /settings/billing | Navega pero section se pierde | Ninguno (Stripe no configurado) | **BUG + CONFIG** | Corregir navegación, mantener estado "no configurada" |
| API Keys | Topbar → SettingsPage | Navegar a /settings/api | Navega pero section se pierde | Supabase api_keys | **BUG** | Corregir navegación |
| Seguridad | — | Navegar a /settings/security | No existe en menú | Supabase auth | **FALTA** | Añadir al menú + crear pantalla |
| Notificaciones | — | Navegar a /settings/notifications | No existe en menú | profiles.preferences (jsonb) | **FALTA** | Añadir al menú + persistir preferencias |
| Integraciones | — | Navegar a /settings/integrations | No existe en menú | Ninguno | **FALTA** | Añadir al menú + crear pantalla |
| Cerrar sesión | Topbar | signOut + redirect | Funcional | Supabase auth | **FUNCIONAL** | Limpiar caché adicional |

## 2. Pantalla de Configuración (SettingsPage.tsx)

| Sección | Estado actual | Datos reales | Fallback | Dependencia | Estado | Corrección |
|---|---|---|---|---|---|---|
| Perfil | Carga/guarda full_name, job_title | profiles table | — | Supabase | **PARCIAL** | Añadir avatar, idioma, zona horaria, preferencias IA |
| Organización | Carga/guarda nombre | organizations table | — | Supabase | **PARCIAL** | Añadir sector, tamaño, país, permisos lectura/escritura |
| Equipo | Lista miembros reales | memberships table | — | Supabase | **PARCIAL** | Activar invitaciones, cambio de rol, confirmaciones |
| Facturación | Placeholder "no configurada" | Ninguno | — | Stripe | **CONFIG** | Mantener, añadir vista demo etiquetada |
| API Keys | Crear/revocar | api_keys table | — | Supabase | **INSEGURO** | Mover generación a edge function, hashear clave |
| Seguridad | Placeholder "próximamente" | — | — | Supabase auth | **FALTA** | Crear pantalla cambio contraseña, MFA, sesiones |
| Notificaciones | Toggles locales (no persisten) | — | Estado local | profiles.preferences | **NO CONECTADO** | Persistir en profiles.preferences jsonb |
| Integraciones | Placeholder "config necesaria" | — | — | Externa | **FALTA** | Crear pantalla con estados de integración |

## 3. Servicios

| Servicio | Funciones | Estado | Problemas |
|---|---|---|---|
| auth.service.ts | signIn, signUp, signOut, resetPassword | **FUNCIONAL** | — |
| profiles.service.ts | getProfile, upsertProfile | **FUNCIONAL** | No guarda preferences |
| organizations.service.ts | createOrg, getOrgs, updateOrg, getMembers | **FUNCIONAL** | createOrg sin UI, sin org switcher |
| apiKeys.service.ts | getKeys, createKey, deleteKey | **INSEGURO** | key_hash guarda plaintext, generación client-side |

## 4. Hooks

| Hook | Retorna | Estado | Problemas |
|---|---|---|---|
| useAuth | session, user, loading, signOut | **FUNCIONAL** | — |
| useProfile | profile, loading, error, updateProfile | **FUNCIONAL** | No expone preferences |
| useOrganization | orgs, activeOrg, members, saveOrg | **FUNCIONAL** | organizations[] y setActiveOrg sin uso en UI |
| useApiKeys | apiKeys, loading, create, revoke | **FUNCIONAL** | create() genera clave insegura client-side |
| useLanguage | lang, setLang | **FUNCIONAL** | — |

## 5. Base de datos

| Tabla | RLS | Usada por UI | Estado |
|---|---|---|---|
| profiles | ✅ | ✅ full_name, job_title | Falta preferences, avatar_url |
| organizations | ✅ | ✅ name, plan | Falta slug, settings, limits |
| memberships | ✅ | ✅ lista miembros | Falta invitaciones, cambio rol |
| api_keys | ✅ | ✅ crear/revocar | Inseguro: key_hash plaintext |
| roles | ✅ | ❌ | No integrada en frontend |
| permissions | ✅ | ❌ | No integrada en frontend |
| role_permissions | ✅ | ❌ | No integrada en frontend |
| user_roles | ✅ | ❌ | No integrada en frontend |
| sessions | ✅ | ❌ | No integrada en frontend |
| invitations | ✅ | ❌ | No integrada en frontend |
| login_attempts | ✅ | ❌ | No integrada en frontend |

## 6. Tipos (database.ts)

| Tipo | Estado | Problemas |
|---|---|---|
| Organization | **DESACTUALIZADO** | Falta slug, status, settings, limits |
| Profile | **DESACTUALIZADO** | Falta status, preferences, last_login_at |
| ApiKey | **DESACTUALIZADO** | Falta scopes, expires_at, revoked_at |
| Membership | **OK** | — |
| Roles/Permissions/Sessions/Invitations | **FALTAN** | No definidos |

## 7. Problemas críticos

1. **BUG: Navegación de sección perdida** — Dashboard.tsx envuelve `onNavigate` descartando el argumento `section`
2. **INSEGURIDAD: API Keys client-side** — key_hash guarda plaintext, generación en cliente
3. **NO PERSISTIDO: Notificaciones** — toggles son estado local, se pierden al recargar
4. **FALTA: Pantalla de Seguridad** — solo placeholder "próximamente"
5. **FALTA: Invitaciones de Equipo** — tabla existe, UI no la usa
6. **FALTA: 4 items de menú** — Organización, Seguridad, Notificaciones, Integraciones
7. **DEAD CODE: logoutError** — siempre false en Topbar
8. **DEAD CODE: Mark all read** — sin onClick en notificaciones
9. **DEAD CODE: Help button** — sin onClick en Sidebar
10. **DEAD CODE: Change photo** — disabled sin funcionalidad

## 8. Limitaciones pendientes

- **Stripe**: Sin configurar. Facturación mostrará "no configurada" con vista demo etiquetada.
- **MFA**: Supabase no expone MFA en el cliente sin configuración adicional. Se mostrará estado real.
- **Avatar upload**: Requiere Supabase Storage bucket configurado o edge function.
- **Integraciones externas**: Requieren claves API y configuración servidor.
- **Org switcher**: Múltiples organizaciones por usuario no implementado en UI.
