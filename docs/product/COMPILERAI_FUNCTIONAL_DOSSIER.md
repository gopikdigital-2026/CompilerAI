# Dossier Funcional de CompilerAI

**Documento para:** Product Owners, clientes piloto, equipos de ventas, soporte técnico e inversores no técnicos.
**Fecha:** 2025-01-20
**Idioma:** Español
**Propósito:** Describir, de forma clara y completa, el estado funcional real de CompilerAI: qué funciona hoy, qué funciona con limitaciones, qué es demostración, qué requiere configuración y qué está en desarrollo.

---

## 1. Resumen ejecutivo

CompilerAI es una plataforma de orquestación de inteligencia artificial que permite compilar especificaciones en blueprints ejecutables, ejecutar flujos, gestionar memoria de agentes, administrar prompts y diseñar automatizaciones visuales.

A la fecha de este dossier, la plataforma cuenta con un núcleo funcional sólido en autenticación, gestión de perfiles, organizaciones y API Keys. Los módulos de producto principales (Compiler, Runner, Memory Center, AI Brain, Prompt Intelligence, entre otros) operan en modo demostración con datos simulados, listos para conectarse a los motores de backend correspondientes.

**Distribución de estado general:**

| Estado | Descripción | Cobertura aproximada |
|---|---|---|
| Operativo | Funciona de extremo a extremo con datos reales | Autenticación, perfil, organización, API Keys, navegación |
| Operativo con limitaciones | Funciona parcialmente; alguna subfunción está inactiva | Equipo (lectura sin invitaciones), Workflow Designer (lienzo sin toolbar) |
| Demostración | Renderiza con datos simulados | Home, Compiler, Runner, Memory, Brain, Prompt, Enterprise, Agents, Workflows, Integrations, Marketplace, Monitor, Notifications |
| Configuración necesaria | Requiere configuración externa para activarse | Billing (Stripe), Integrations (credenciales) |
| En desarrollo | Requiere implementación de backend | Security, búsqueda global, Team invitations |

---

## 2. Autenticación y acceso

**Estado: Operativo**

El flujo de autenticación es completamente funcional y se basa en Supabase Auth.

- **Inicio de sesión:** el usuario introduce email y contraseña; la plataforma valida las credenciales contra Supabase y, si son correctas, redirige al Dashboard.
- **Registro de cuenta:** el nuevo usuario se crea vía `supabase.auth.signUp` y se inicia sesión automáticamente.
- **Restablecimiento de contraseña:** el enlace "Olvidé mi contraseña" envía un correo de restablecimiento real a través de Supabase.
- **Cierre de sesión:** el botón de cerrar sesión (tanto en la barra lateral como en el menú de perfil) ejecuta `supabase.auth.signOut()` y devuelve al usuario a la pantalla de login.
- **Guardia de sesión:** la aplicación detecta el estado de autenticación y muestra el Login cuando no hay sesión activa, o el Dashboard cuando la hay.

**Confiabilidad:** alta. No se han detectado fallos en el flujo de autenticación.

---

## 3. Navegación y estructura de la aplicación

**Estado: Operativo**

La barra lateral contiene 14 ítems de navegación, todos funcionales:

1. Inicio (Home / Dashboard)
2. Compiler
3. Runner
4. Memory Center
5. AI Brain
6. Prompt Intelligence
7. Workflow Designer
8. Enterprise Center
9. Agents
10. Workflows
11. Integrations
12. Marketplace
13. Monitor
14. Configuración (Settings)

Cada ítem navega a una página real. No hay enlaces muertos ni rutas rotas en la navegación lateral.

La barra superior (Topbar) incluye:

- **Barra de búsqueda:** renderiza el campo de entrada, pero la funcionalidad de búsqueda no está conectada (En desarrollo).
- **Selector de idioma ES/EN:** funcional; alterna entre español e inglés en toda la interfaz.
- **Campana de notificaciones:** muestra un panel desplegable con notificaciones de demostración (Demostración).
- **Avatar / menú de perfil:** funcional; abre un menú con acceso a secciones de configuración y cierre de sesión.

---

## 4. Configuración del usuario — Profile

**Estado: Operativo**

La sección Settings > Profile permite al usuario:

- Ver y editar su nombre, avatar y datos personales.
- Guardar los cambios en la tabla `profiles` de Supabase.

Los datos se cargan al entrar a la sección y se persisten al guardar. No hay pérdida de datos entre sesiones.

---

## 5. Configuración de la organización — Organization

**Estado: Operativo**

La sección Settings > Organization permite:

- Ver y editar el nombre y los datos de la organización.
- Guardar los cambios en la tabla `organizations` de Supabase.

La organización se asocia al usuario autenticado y persiste entre sesiones.

---

## 6. Gestión de equipo — Team

**Estado: Operativo con limitaciones**

La sección Settings > Team muestra los miembros reales de la organización, obtenidos desde la tabla `org_members` de Supabase. La lista es real y refleja los miembros actuales.

**Limitación:** el botón "Invitar miembro" está deshabilitado. El envío de invitaciones por correo aún no está implementado y requiere desarrollo de backend.

**Implicación para clientes piloto:** pueden ver quién pertenece a su organización, pero no pueden invitar nuevos miembros desde la interfaz. La incorporación de miembros debe realizarse por vía administrativa hasta que se habilite la función.

---

## 7. API Keys

**Estado: Operativo**

La sección Settings > API Keys permite:

- **Crear una nueva API key:** genera una clave única, la almacena en la tabla `api_keys` de Supabase y la muestra una sola vez al usuario. Se advierte claramente que la clave no volverá a mostrarse.
- **Ver el listado de claves activas:** muestra las claves existentes asociadas al usuario/organización (sin revelar el valor secreto).
- **Revocar una clave:** elimina la clave de la base de datos, invalidándola inmediatamente.

Esta función es completamente funcional y segura. Recomendación: almacenar la clave en un gestor de contraseñas en el momento de la creación.

---

## 8. Preferencias de notificación — Notifications

**Estado: Operativo (preferencias) / Demostración (panel desplegable)**

Hay dos aspectos distintos relacionados con notificaciones:

1. **Preferencias de notificación (Settings > Notifications):** Operativo. El usuario configura qué notificaciones desea recibir (email, in-app, etc.) y las preferencias se guardan en la tabla `profiles`.
2. **Panel desplegable de notificaciones (Topbar):** Demostración. La campana de la barra superior muestra un panel con notificaciones simuladas. Aún no está conectado a un sistema de notificaciones real.

---

## 9. Facturación — Billing

**Estado: Configuración necesaria**

La sección Settings > Billing existe en la interfaz, pero muestra un mensaje indicando que la facturación no está configurada, junto con la lista de variables de entorno requeridas.

**Requisito para activación:** integrar Stripe y configurar las variables de entorno correspondientes (p. ej. `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`). Una vez configurado, el panel podrá mostrar planes, facturas y métodos de pago.

**Implicación comercial:** la monetización por suscripción requiere esta configuración. Es la prioridad principal de configuración externa.

---

## 10. Seguridad — Security

**Estado: En desarrollo**

La sección Settings > Security muestra un mensaje de "próximamente". Las funciones planeadas incluyen:

- Autenticación de dos factores (2FA).
- Gestión de sesiones activas.
- Registro de auditoría de accesos.

**Requisito para activación:** implementar la lógica de backend correspondiente. No depende de servicios externos, sino de desarrollo interno.

---

## 11. Integraciones — Settings > Integrations

**Estado: Configuración necesaria**

La sección Settings > Integrations muestra un mensaje de "configuración requerida". Las tarjetas de integración existen visualmente, pero no pueden activarse sin configurar las credenciales de cada servicio externo.

**Requisito para activación:** proveer las credenciales/API keys de cada integración específica.

> **Nota:** la página "Integrations" del menú lateral principal (distinta de Settings > Integrations) muestra tarjetas de integración en modo demostración.

---

## 12. Módulos de producto en modo demostración

Los siguientes módulos renderizan correctamente y ofrecen una experiencia interactiva, pero operan con **datos simulados** (mocks). Son plenamente utilizables para demos, validación de concepto y capacitación, pero no procesan datos reales todavía.

### 12.1 Home (Dashboard)

**Estado: Demostración**

Muestra tarjetas de métricas (KPIs) y gráficos de actividad. Todos los valores son simulados. La disposición y el diseño reflejan la experiencia objetivo, pero las cifras no provienen de datos reales del usuario.

### 12.2 Compiler

**Estado: Demostración**

Permite introducir una especificación y "generar" un blueprint. El blueprint mostrado es simulado. La interfaz está lista para conectarse al motor de compilación real.

### 12.3 Runner

**Estado: Demostración**

Muestra un panel de ejecución y un historial de ejecuciones con datos simulados. Permite explorar la experiencia de monitoreo de flujos.

### 12.4 Memory Center

**Estado: Demostración**

Muestra la memoria del agente (contextos, recuerdos, embeddings) con datos simulados. Permite visualizar cómo se organizará la memoria real.

### 12.5 AI Brain

**Estado: Demostración**

Muestra el estado y la configuración del Brain con datos simulados.

### 12.6 Prompt Intelligence

**Estado: Demostración**

Permite introducir un prompt y ver un análisis simulado (optimización, métricas, sugerencias). La interfaz está lista para el motor de análisis real.

### 12.7 Workflow Designer

**Estado: Operativo con limitaciones**

El lienzo visual (canvas) funciona: se pueden añadir nodos, crear conexiones y diseñar flujos visualmente. Sin embargo, la barra de herramientas tiene 4 botones (guardar, ejecutar, validar, exportar) deshabilitados con un tooltip explicativo, ya que el backend de workflows aún no está implementado.

**Implicación:** el diseñador visual es utilizable para prototipar flujos, pero no se pueden persistir ni ejecutar.

### 12.8 Enterprise Center

**Estado: Demostración**

Muestra métricas y gobernanza empresarial con datos simulados.

### 12.9 Agents

**Estado: Demostración**

Muestra una lista de agentes configurados con datos simulados.

### 12.10 Workflows

**Estado: Demostración**

Muestra una lista de flujos guardados con datos simulados.

### 12.11 Integrations (página principal)

**Estado: Demostración**

Muestra tarjetas de integraciones disponibles con datos simulados.

### 12.12 Marketplace

**Estado: Demostración**

Muestra un catálogo de plantillas y extensiones con datos simulados.

### 12.13 Monitor

**Estado: Demostración**

Muestra métricas de monitoreo del sistema con datos simulados.

---

## 13. Funciones transversales

### 13.1 Selector de idioma (ES/EN)

**Estado: Operativo**

Permite alternar entre español e inglés en toda la interfaz. Disponible en la barra superior y en las pantallas de Login y Landing.

### 13.2 Búsqueda global

**Estado: En desarrollo**

El campo de búsqueda se renderiza en la barra superior, pero no ejecuta ninguna búsqueda. Requiere implementación de lógica de búsqueda.

### 13.3 Panel de notificaciones (campana)

**Estado: Demostración**

Muestra notificaciones simuladas en un panel desplegable.

---

## 14. Landing page

**Estado: Operativo**

La página de inicio pública (Landing) funciona correctamente:

- Los botones de llamada a la acción (Iniciar sesión / Registrarse) navegan a las rutas de autenticación.
- El selector de idioma funciona.
- Los enlaces del pie de página se renderizan como texto no clicable (no llevan a páginas vacías ni a `href="#"`).

---

## 15. Resumen para stakeholders no técnicos

### ¿Qué puede hacer un usuario hoy?

1. **Registrarse e iniciar sesión** con email y contraseña reales.
2. **Recuperar su contraseña** mediante correo electrónico.
3. **Completar y actualizar su perfil** personal.
4. **Configurar su organización** y ver sus datos.
5. **Ver los miembros** de su organización.
6. **Crear y revocar API Keys** para integraciones programáticas.
7. **Configurar sus preferencias** de notificación.
8. **Navegar por toda la plataforma** — las 14 secciones son accesibles.
9. **Diseñar flujos visualmente** en el Workflow Designer (lienzo funcional).
10. **Explorar todos los módulos** en modo demostración para entender la propuesta de valor.
11. **Alternar entre español e inglés** en cualquier momento.
12. **Cerrar sesión** de forma segura.

### ¿Qué no puede hacer aún?

1. **Pagar suscripciones o ver facturación** — requiere configurar Stripe.
2. **Invitar nuevos miembros** a su organización por correo — el botón está deshabilitado.
3. **Activar autenticación de dos factores** o ver sesiones — en desarrollo.
4. **Buscar contenido** en la plataforma — la búsqueda no está conectada.
5. **Generar blueprints reales** en el Compiler — actualmente simulado.
6. **Ejecutar flujos reales** en el Runner — actualmente simulado.
7. **Ver métricas reales** en el Dashboard, Monitor o Enterprise Center — simulados.
8. **Guardar o ejecutar flujos** desde el Workflow Designer — toolbar pendiente de backend.
9. **Configurar integraciones externas** — requiere credenciales.

### Mensaje para clientes piloto

> CompilerAI ofrece hoy una experiencia de autenticación y configuración completamente funcional, junto con una recorrido demostración completo de todos sus módulos. Los datos que ve en los módulos de producto (Compiler, Runner, Memory, etc.) son simulados y sirven para validar la experiencia antes de conectar los motores de backend. La facturación y las invitaciones de equipo estarán disponibles próximamente.

### Mensaje para inversores

> El núcleo de CompilerAI (autenticación, gestión de cuentas, organizaciones, API Keys y navegación) es plenamente operativo y production-ready. Los módulos de producto están construidos a nivel de interfaz y operan en modo demostración, lo que permite validar la propuesta de valor con clientes piloto sin depender del backend completo. El camino a producción completa está claramente trazado: configuración de Stripe (monetización), backend de seguridad y equipo, y conexión progresiva de cada módulo a su servicio real.

### Mensaje para ventas y soporte

> Al presentar CompilerAI a clientes potenciales, destaque: (1) autenticación y gestión de cuentas reales, (2) API Keys funcionales, (3) recorrido completo de demostración de todos los módulos. Sea transparente sobre: facturación pendiente de Stripe, invitaciones de equipo pendientes, y módulos de producto en modo demostración. El Workflow Designer es útil para demos visuales aunque la persistencia esté pendiente.

---

## Apéndice A — Tabla resumen de estado por módulo

| # | Módulo | Estado |
|---|---|---|
| 1 | Autenticación (Login, Registro, Reset, Logout) | Operativo |
| 2 | Navegación lateral (14 ítems) | Operativo |
| 3 | Profile (Settings) | Operativo |
| 4 | Organization (Settings) | Operativo |
| 5 | API Keys (Settings) | Operativo |
| 6 | Notifications — preferencias (Settings) | Operativo |
| 7 | Team (Settings) | Operativo con limitaciones |
| 8 | Workflow Designer — lienzo | Operativo con limitaciones |
| 9 | Selector de idioma ES/EN | Operativo |
| 10 | Landing page | Operativo |
| 11 | Notifications — panel desplegable | Demostración |
| 12 | Home (Dashboard) | Demostración |
| 13 | Compiler | Demostración |
| 14 | Runner | Demostración |
| 15 | Memory Center | Demostración |
| 16 | AI Brain | Demostración |
| 17 | Prompt Intelligence | Demostración |
| 18 | Enterprise Center | Demostración |
| 19 | Agents | Demostración |
| 20 | Workflows | Demostración |
| 21 | Integrations (página) | Demostración |
| 22 | Marketplace | Demostración |
| 23 | Monitor | Demostración |
| 24 | Workflow Designer — toolbar | Demostración (botones deshabilitados) |
| 25 | Billing (Settings) | Configuración necesaria |
| 26 | Integrations (Settings) | Configuración necesaria |
| 27 | Security (Settings) | En desarrollo |
| 28 | Búsqueda global | En desarrollo |
| 29 | Team invitations | En desarrollo |

---

## Apéndice B — Glosario para audiencia no técnica

| Término | Definición |
|---|---|
| **Blueprint** | Estructura generada por el Compiler a partir de una especificación; describe cómo debe ejecutarse un flujo. |
| **Runner** | Motor que ejecuta los flujos y monitorea su progreso. |
| **Memory Center** | Almacén de la memoria de los agentes (contexto, recuerdos, knowledge). |
| **AI Brain** | Núcleo de configuración de la inteligencia del agente. |
| **Prompt Intelligence** | Módulo de análisis y optimización de prompts. |
| **Workflow Designer** | Editor visual para diseñar automatizaciones con nodos y conexiones. |
| **API Key** | Clave secreta que permite a programas externos conectarse a CompilerAI de forma segura. |
| **Mock / Simulado** | Datos de ejemplo integrados en la interfaz para demostración; no son datos reales del usuario. |
| **Supabase** | Servicio de backend (base de datos y autenticación) que usa CompilerAI. |
| **Stripe** | Servicio externo de procesamiento de pagos, necesario para la facturación. |

---

*Fin del dossier funcional de CompilerAI.*
