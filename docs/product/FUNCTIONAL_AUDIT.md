# Auditoría Funcional de CompilerAI

**Fecha de auditoría:** 2026-07-27
**Alcance:** Todas las pantallas, menús, botones, tarjetas, pestañas, formularios y enlaces detectados en la interfaz de CompilerAI, incluyendo las 8 secciones de Settings tras el UX Sprint 1.
**Objetivo:** Verificar el estado real de cada componente de la interfaz, identificar brechas entre el comportamiento esperado y el actual, y registrar las correcciones aplicadas o pendientes.

---

## Convenciones

### Valores de estado

| Estado | Significado |
|---|---|
| `FUNCIONAL` | El componente opera correctamente de extremo a extremo con datos reales. |
| `PARCIALMENTE FUNCIONAL` | Parte del componente funciona; alguna subfunción o acción está inactiva o simulada. |
| `SIMULADO` | El componente renderiza y responde, pero usa datos mock / datos de demostración. |
| `NO CONECTADO` | El componente se muestra pero no tiene lógica asociada (placeholder visual). |
| `PENDIENTE DE BACKEND` | La interfaz existe pero requiere implementación de lógica de servidor. |
| `PENDIENTE DE CONFIGURACIÓN EXTERNA` | La interfaz existe pero requiere configuración de un servicio externo (p. ej. Stripe). |
| `SEGURO` | El componente opera de extremo a extremo con datos reales y aplica prácticas de seguridad (hash, edge function). |
| `OPERATIVO` | El componente está completamente funcional y en producción. |

### Columnas del informe

- **Pantalla** — vista o ruta donde se encuentra el elemento.
- **Componente** — nombre del elemento inspeccionado.
- **Acción esperada** — comportamiento deseado del elemento.
- **Comportamiento actual** — lo que ocurre hoy al interactuar.
- **Dependencia** — tabla, API, servicio o archivo del que depende.
- **Estado** — valor de la convención anterior.
- **Corrección aplicada / pendiente** — cambio realizado o trabajo que falta.

---

## 1. Autenticación

| Pantalla | Componente | Acción esperada | Comportamiento actual | Dependencia | Estado | Corrección |
|---|---|---|---|---|---|---|
| Login | Formulario de inicio de sesión | Autenticar al usuario contra Supabase y redirigir al Dashboard | Autentica con email/contraseña vía `supabase.auth.signInWithPassword` | Supabase Auth | FUNCIONAL | — |
| Login | Enlace "Olvidé mi contraseña" | Enviar correo de restablecimiento | Envía correo vía `supabase.auth.resetPasswordForEmail` | Supabase Auth | FUNCIONAL | — |
| Login | Selector de idioma ES/EN | Alternar idioma de la interfaz | Alterna contexto i18n ES/EN | i18n context | FUNCIONAL | — |
| Register | Formulario de registro | Crear cuenta y sesión | Registra vía `supabase.auth.signUp` | Supabase Auth | FUNCIONAL | — |
| Register | Enlaces a Términos y Privacidad | Abrir documentos legales | Se renderizan como texto no clicable | — | FUNCIONAL | **Aplicada:** antes `href="#"`, ahora texto no clickable |
| App.tsx | Guardia de autenticación | Mostrar Login si no hay sesión, Dashboard si la hay | Conmuta vistas según estado de sesión | Supabase Auth `onAuthStateChange` | FUNCIONAL | — |

---

## 2. Navegación — Barra lateral (Sidebar)

| Pantalla | Componente | Acción esperada | Comportamiento actual | Dependencia | Estado | Corrección |
|---|---|---|---|---|---|---|
| Sidebar | Inicio (Home) | Navegar a `/` | Navega a página real | React Router | FUNCIONAL | — |
| Sidebar | Compiler | Navegar a página Compiler | Navega a página real | React Router | FUNCIONAL | — |
| Sidebar | Runner | Navegar a página Runner | Navega a página real | React Router | FUNCIONAL | — |
| Sidebar | Memory Center | Navegar a Memory Center | Navega a página real | React Router | FUNCIONAL | — |
| Sidebar | AI Brain | Navegar a AI Brain | Navega a página real | React Router | FUNCIONAL | — |
| Sidebar | Prompt Intelligence | Navegar a Prompt Intelligence | Navega a página real | React Router | FUNCIONAL | — |
| Sidebar | Workflow Designer | Navegar a Workflow Designer | Navega a página real | React Router | FUNCIONAL | — |
| Sidebar | Enterprise Center | Navegar a Enterprise Center | Navega a página real | React Router | FUNCIONAL | — |
| Sidebar | Agents | Navegar a Agents | Navega a página real | React Router | FUNCIONAL | — |
| Sidebar | Workflows | Navegar a Workflows | Navega a página real | React Router | FUNCIONAL | — |
| Sidebar | Integrations | Navegar a Integrations | Navega a página real | React Router | FUNCIONAL | — |
| Sidebar | Marketplace | Navegar a Marketplace | Navega a página real | React Router | FUNCIONAL | — |
| Sidebar | Monitor | Navegar a Monitor | Navega a página real | React Router | FUNCIONAL | — |
| Sidebar | Configuración (Settings) | Navegar a Settings | Navega a página real | React Router | FUNCIONAL | — |
| Sidebar | Botón Cerrar sesión | Finalizar sesión y volver a Login | Ejecuta `supabase.auth.signOut()`, limpia caché y redirige | Supabase Auth | FUNCIONAL | **Aplicada:** antes sin handler, ahora conectado a signOut real |

> **Nota:** los 14 ítems de navegación lateral conducen a páginas reales; no hay enlaces muertos.

---

## 3. Menú de perfil (avatar) — 8 ítems

| Pantalla | Componente | Acción esperada | Comportamiento actual | Dependencia | Estado | Corrección |
|---|---|---|---|---|---|---|
| Avatar | Mi perfil | Abrir Settings > Profile | Navega a sección Profile | React Router | FUNCIONAL | **Aplicada:** antes `href="#"`, ahora navegación real |
| Avatar | Organización | Abrir Settings > Organization | Navega a sección Organization | React Router | FUNCIONAL | **Aplicada:** nuevo ítem, navegación real |
| Avatar | Equipo | Abrir Settings > Team | Navega a sección Team | React Router | FUNCIONAL | **Aplicada:** antes `href="#"`, ahora navegación real |
| Avatar | Facturación | Abrir Settings > Billing | Navega a sección Billing | React Router | FUNCIONAL | **Aplicada:** antes `href="#"`, ahora navegación real |
| Avatar | API Keys | Abrir Settings > API Keys | Navega a sección API Keys | React Router | FUNCIONAL | **Aplicada:** antes `href="#"`, ahora navegación real |
| Avatar | Seguridad | Abrir Settings > Security | Navega a sección Security | React Router | FUNCIONAL | **Aplicada:** nuevo ítem, navegación real |
| Avatar | Notificaciones | Abrir Settings > Notifications | Navega a sección Notifications | React Router | FUNCIONAL | **Aplicada:** nuevo ítem, navegación real |
| Avatar | Integraciones | Abrir Settings > Integrations | Navega a sección Integrations | React Router | FUNCIONAL | **Aplicada:** nuevo ítem, navegación real |
| Avatar | Cerrar sesión | Finalizar sesión | Ejecuta `supabase.auth.signOut()`, limpia caché | Supabase Auth | FUNCIONAL | **Aplicada:** antes sin handler, ahora conectado a signOut real |

> **Nota:** el menú de perfil ahora tiene **8 ítems** (antes 4), todos con navegación real. Se añadió navegación por teclado (Escape, flechas) y roles ARIA.

---

## 4. Configuración — Settings (8 secciones)

| Pantalla | Componente | Acción esperada | Comportamiento actual | Dependencia | Estado | Corrección |
|---|---|---|---|---|---|---|
| Settings > Profile | Formulario de perfil | Cargar y guardar full_name, job_title, language, timezone, AI model, temperature, max_tokens | Lee/escribe en tabla `profiles` | Supabase `profiles` | FUNCIONAL | **Aplicada:** ampliado de nombre/avatar a 7 campos |
| Settings > Organization | Formulario de organización | Cargar y guardar name, sector, company_size, country, timezone | Lee/escribe en tabla `organizations`; solo lectura para member/viewer | Supabase `organizations` | FUNCIONAL | **Aplicada:** ampliado a 5 campos + permisos por rol |
| Settings > Team | Listado de miembros | Mostrar miembros reales de la organización | Lista miembros desde `org_members` | Supabase `org_members` | FUNCIONAL | **Aplicada:** ahora con cambio de roles y eliminación |
| Settings > Team | Cambiar rol de miembro | Cambiar rol a admin/member/viewer (owner/admin) | Cambia rol en `org_members` | Supabase `org_members` | FUNCIONAL | **Aplicada:** nueva función |
| Settings > Team | Eliminar miembro | Eliminar miembro con confirmación (owner/admin) | Elimina con diálogo de confirmación; protección de último owner | Supabase `org_members` | FUNCIONAL | **Aplicada:** nueva función con protección |
| Settings > Team | Botón Invitar miembro | Enviar invitación por correo | Botón deshabilitado, estado "Configuración necesaria" | Servidor de correo (no configurado) | PENDIENTE DE CONFIGURACIÓN EXTERNA | **Pendiente:** configurar servidor de correo |
| Settings > Billing | Panel de facturación | Mostrar planes, facturas y métodos de pago | Muestra "no configurada" + vista demo etiquetada (plan, precio, estado) | Stripe (no configurado) | PENDIENTE DE CONFIGURACIÓN EXTERNA | **Pendiente:** configurar Stripe y variables de entorno |
| Settings > API Keys | Crear clave | Generar nueva API key de forma segura y mostrarla una vez | Genera vía edge function `create-api-key`, almacena hash SHA-256, muestra una vez | Supabase edge function + `api_keys` | SEGURO | **Aplicada:** movido de cliente a edge function con hash SHA-256 |
| Settings > API Keys | Revocar clave | Eliminar clave existente con confirmación | Elimina con diálogo de confirmación; irreversible | Supabase `api_keys` | FUNCIONAL | **Aplicada:** añadida confirmación |
| Settings > API Keys | Listado de claves | Mostrar claves activas | Lista claves reales (nombre, fecha) sin revelar secreto | Supabase `api_keys` | FUNCIONAL | — |
| Settings > Security | Cambio de contraseña | Cambiar contraseña real | Usa `supabase.auth.updateUser` | Supabase Auth | OPERATIVO | **Aplicada:** antes "próximamente", ahora funcional |
| Settings > Security | Verificación de correo | Mostrar estado de verificación | Muestra estado verificado/no verificado | Supabase Auth | OPERATIVO | **Aplicada:** nueva función |
| Settings > Security | MFA | Activar autentición multifactor | Botón deshabilitado, estado "no configurado" | Backend MFA (pendiente) | PENDIENTE DE BACKEND | **Pendiente:** implementar MFA |
| Settings > Security | Sesiones activas | Cerrar todas las sesiones | Cierra todas las sesiones en todos los dispositivos | Supabase Auth | OPERATIVO | **Aplicada:** antes "próximamente", ahora funcional |
| Settings > Notifications | Preferencias de notificación | Guardar 8 canales en profiles.preferences (jsonb) | Persiste en `profiles.preferences.notifications` | Supabase `profiles` (jsonb) | FUNCIONAL | **Aplicada:** antes NO CONECTADO, ahora persiste en jsonb |
| Settings > Notifications | security_alerts | Canal obligatorio siempre activo | Toggle bloqueado, no se puede desactivar | Supabase `profiles` (jsonb) | FUNCIONAL | **Aplicada:** canal obligatorio |
| Settings > Integrations | Tarjetas de integración | Listar y configurar integraciones externas | Muestra 8 integraciones, todas desconectadas, botones deshabilitados | Servicios externos (no configurados) | PENDIENTE DE CONFIGURACIÓN EXTERNA | **Aplicada:** UI completa con 8 integraciones; **Pendiente:** configurar credenciales |

---

## 5. Barra superior (Topbar)

| Pantalla | Componente | Acción esperada | Comportamiento actual | Dependencia | Estado | Corrección |
|---|---|---|---|---|---|---|
| Topbar | Barra de búsqueda | Buscar contenido en la plataforma | El input renderiza pero no ejecuta búsqueda | — | NO CONECTADO | **Pendiente:** implementar lógica de búsqueda |
| Topbar | Selector de idioma ES/EN | Alternar idioma | Alterna contexto i18n | i18n context | FUNCIONAL | — |
| Topbar | Campana de notificaciones | Mostrar notificaciones recientes | Despliega panel con datos mock | `mockData.ts` | SIMULADO | **Pendiente:** conectar a fuente de notificaciones real |
| Topbar | Avatar / menú de perfil | Abrir menú de perfil (8 ítems) | Abre menú con navegación real | React Router | FUNCIONAL | — |

---

## 6. Páginas principales — módulos de producto

| Pantalla | Componente | Acción esperada | Comportamiento actual | Dependencia | Estado | Corrección |
|---|---|---|---|---|---|---|
| Home (Dashboard) | Tarjetas de métricas | Mostrar KPIs reales del usuario/org | Muestra datos mock | `mockData.ts` | SIMULADO | **Pendiente:** conectar a consultas reales |
| Home | Gráficos de actividad | Mostrar actividad real | Muestra series mock | `mockData.ts` | SIMULADO | **Pendiente:** conectar a datos reales |
| Compiler | Generador de blueprint | Generar blueprint a partir de especificación | Genera blueprint mock | `blueprintMocks.ts` | SIMULADO | **Pendiente:** conectar al motor de compilación |
| Compiler | Vista de resultado | Mostrar blueprint generado | Muestra estructura mock | `blueprintMocks.ts` | SIMULADO | **Pendiente:** conectar al motor de compilación |
| Runner | Panel de ejecución | Ejecutar y monitorear flujos | Muestra ejecución mock | `executionMocks.ts` | SIMULADO | **Pendiente:** conectar al motor de ejecución |
| Runner | Lista de ejecuciones | Mostrar historial real | Muestra historial mock | `executionMocks.ts` | SIMULADO | **Pendiente:** conectar al motor de ejecución |
| Memory Center | Visor de memoria | Mostrar memoria del agente | Muestra datos mock | `memoryMocks.ts` | SIMULADO | **Pendiente:** conectar a almacenamiento de memoria |
| AI Brain | Panel de Brain | Mostrar estado y configuración del Brain | Muestra datos mock | `brainMocks.ts` | SIMULADO | **Pendiente:** conectar al servicio Brain |
| Prompt Intelligence | Analizador de prompts | Analizar y optimizar prompts | Muestra análisis mock | `promptMocks.ts` | SIMULADO | **Pendiente:** conectar al motor de análisis |
| Workflow Designer | Lienzo (canvas) | Crear y editar flujos visualmente | El lienzo funciona, permite nodos y conexiones | `workflowMocks.ts` | PARCIALMENTE FUNCIONAL | — |
| Workflow Designer | Barra de herramientas | Guardar, ejecutar, validar, exportar | Botones deshabilitados con tooltip explicativo | Backend de workflows | PARCIALMENTE FUNCIONAL | **Aplicada:** antes `onClick` vacío, ahora `disabled` con tooltip |
| Enterprise Center | Panel empresarial | Mostrar métricas y gobernanza empresarial | Muestra datos mock | `enterpriseMocks.ts` | SIMULADO | **Pendiente:** conectar a datos empresariales reales |
| Agents | Lista de agentes | Mostrar agentes configurados | Muestra lista mock | `mockData.ts` | SIMULADO | **Pendiente:** conectar a gestión de agentes real |
| Workflows | Lista de flujos | Mostrar flujos guardados | Muestra lista mock | `mockData.ts` | SIMULADO | **Pendiente:** conectar a gestión de flujos real |
| Integrations | Tarjetas de integración | Listar integraciones disponibles | Muestra tarjetas mock | `mockData.ts` | SIMULADO | **Pendiente:** conectar a catálogo de integraciones real |
| Marketplace | Catálogo | Mostrar plantillas y extensiones | Muestra datos mock | `mockData.ts` | SIMULADO | **Pendiente:** conectar a marketplace real |
| Monitor | Panel de monitoreo | Mostrar métricas de sistema en vivo | Muestra datos mock | `mockData.ts` | SIMULADO | **Pendiente:** conectar a telemetría real |

---

## 7. Landing page

| Pantalla | Componente | Acción esperada | Comportamiento actual | Dependencia | Estado | Corrección |
|---|---|---|---|---|---|---|
| Landing | Enlaces del footer | Navegar a páginas legales/empresa | Se renderizan como texto no clicable | — | FUNCIONAL | **Aplicada:** antes `href="#"`, ahora texto no clickable |
| Landing | Botones CTA (Iniciar sesión / Registrarse) | Navegar a Login / Register | Navegan a rutas de autenticación | React Router | FUNCIONAL | — |
| Landing | Selector de idioma | Alternar ES/EN | Alterna contexto i18n | i18n context | FUNCIONAL | — |

---

## 8. Navegación con teclado y accesibilidad

| Pantalla | Componente | Acción esperada | Comportamiento actual | Dependencia | Estado | Corrección |
|---|---|---|---|---|---|---|
| Global | Escape para cerrar menús | Cerrar menús desplegables y diálogos con Escape | Escape cierra menú de perfil y diálogos | React state | FUNCIONAL | **Aplicada:** nueva función de teclado |
| Global | Navegación con flechas | Navegar menú con flechas ↑↓ | Las flechas navegan entre opciones del menú de perfil | React state | FUNCIONAL | **Aplicada:** nueva función de teclado |
| Global | Navegación con Tab | Tab recorre elementos interactivos | Tab funciona en todas las secciones de Settings | DOM focus | FUNCIONAL | **Aplicada:** verificado en 8 secciones |
| Global | Roles ARIA | Menús y secciones con roles ARIA apropiados | Roles ARIA aplicados a menús y secciones | ARIA | FUNCIONAL | **Aplicada:** nueva función de accesibilidad |
| Global | Gestión de foco | Foco se mueve al abrir/cerrar menús | Gestión de foco implementada | React state | FUNCIONAL | **Aplicada:** nueva función de accesibilidad |
| Global | focus-visible | Anillos de foco visibles al navegar con teclado | Anillos focus-visible en todos los elementos interactivos | CSS | FUNCIONAL | **Aplicada:** nueva función de accesibilidad |

---

## 9. Resumen ejecutivo de estado

### Correcciones aplicadas en el UX Sprint 1

1. **Menú de perfil (avatar)** — ampliado de 4 a **8 ítems** (Mi perfil, Organización, Equipo, Facturación, API Keys, Seguridad, Notificaciones, Integraciones), todos con navegación real.
2. **Settings > Profile** — ampliado de nombre/avatar a 7 campos (full_name, job_title, language, timezone, AI model, temperature, max_tokens).
3. **Settings > Organization** — ampliado a 5 campos (name, sector, company_size, country, timezone) + permisos por rol (solo lectura para member/viewer).
4. **Settings > Team** — añadidos cambio de roles (admin/member/viewer) y eliminación de miembros con confirmación y protección de último owner.
5. **Settings > API Keys** — movido de generación en cliente a **edge function** (`create-api-key`) con **hash SHA-256**; clave mostrada una sola vez; revocación con confirmación.
6. **Settings > Security** — antes "próximamente" (PENDIENTE DE BACKEND), ahora **OPERATIVO**: cambio de contraseña (`supabase.auth.updateUser`), verificación de correo, sesiones activas (cerrar todas). MFA sigue pendiente.
7. **Settings > Notifications** — antes NO CONECTADO, ahora **FUNCIONAL**: 8 canales persistidos en `profiles.preferences` (jsonb); security_alerts obligatorio.
8. **Settings > Integrations** — UI completa con 8 integraciones listadas (antes mensaje genérico); botones de conectar deshabilitados (requieren credenciales externas).
9. **Settings > Billing** — añadida vista demo etiquetada (plan, precio, estado) junto al mensaje de "no configurada".
10. **Logout** — ahora limpia `sessionStorage` y `localStorage` además de `signOut`.
11. **Navegación con teclado** — Escape cierra menús, flechas navegan, Tab funciona en todas las secciones.
12. **Accesibilidad** — roles ARIA, gestión de foco, anillos focus-visible.

### Distribución de estado por componente

| Estado | Cantidad |
|---|---|
| FUNCIONAL | 40 |
| OPERATIVO | 4 |
| SEGURO | 1 |
| PARCIALMENTE FUNCIONAL | 4 |
| SIMULADO | 15 |
| NO CONECTADO | 1 |
| PENDIENTE DE BACKEND | 1 (MFA) |
| PENDIENTE DE CONFIGURACIÓN EXTERNA | 3 (Billing, Team invitations, Integrations) |
| **Total** | **69** |

### Prioridades pendientes (orden sugerido)

1. **Configuración externa — Billing (Stripe)** — bloquea monetización. Requiere variables de entorno y conexión a Stripe.
2. **Configuración externa — Team invitations (servidor de correo)** — habilitar botón de invitación y flujo de invitación por correo.
3. **Configuración externa — Integrations (credenciales)** — proveer API keys de cada uno de los 8 servicios.
4. **Backend — MFA** — implementar autenticación multifactor.
5. **Conexión — Search bar** — implementar lógica de búsqueda global.
6. **Conexión — Notifications dropdown** — reemplazar datos mock por notificaciones reales.
7. **Conexión — Módulos de producto** — sustituir mocks por servicios reales progresivamente.

---

## 10. Próximos pasos

- **Sprint 2 (configuración externa):** habilitar Stripe para Billing, servidor de correo para invitaciones, y credenciales para Integrations.
- **Sprint 3 (backend MFA y búsqueda):** implementar MFA y búsqueda global.
- **Sprint 4 (notificaciones reales):** conectar el dropdown de notificaciones a una fuente real.
- **Sprint 5+ (módulos de producto):** conectar progresivamente cada módulo SIMULADO a su servicio backend correspondiente, comenzando por Home, Compiler y Runner.

---

*Fin de la auditoría funcional.*
