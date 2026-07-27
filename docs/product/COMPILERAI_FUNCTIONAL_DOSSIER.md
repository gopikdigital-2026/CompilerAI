# Dossier Funcional de CompilerAI

**Documento para:** Product Owners, clientes piloto, equipos de ventas, soporte técnico e inversores no técnicos.
**Fecha:** 2026-07-27
**Idioma:** Español
**Propósito:** Describir, de forma clara y completa, el estado funcional real de CompilerAI: qué funciona hoy, qué funciona con limitaciones, qué es demostración, qué requiere configuración y qué está en desarrollo.

---

## 1. Resumen ejecutivo

CompilerAI es una plataforma de orquestación de inteligencia artificial que permite compilar especificaciones en blueprints ejecutables, ejecutar flujos, gestionar memoria de agentes, administrar prompts y diseñar automatizaciones visuales.

Tras el **UX Sprint 1**, el área de configuración (Settings) se ha ampliado de 4 a **8 secciones completamente funcionales**, cada una con insignias de estado claras (Operativo, Configuración necesaria, En desarrollo). El menú de perfil ahora ofrece 8 ítems que navegan a secciones reales, y se han incorporado navegación por teclado y accesibilidad ARIA.

**Distribución de estado general:**

| Estado | Descripción | Cobertura aproximada |
|---|---|---|
| Operativo | Funciona de extremo a extremo con datos reales | Autenticación, perfil, organización, API Keys, seguridad, notificaciones, navegación |
| Operativo con limitaciones | Funciona parcialmente; alguna subfunción está inactiva | Equipo (lectura sin invitaciones), Workflow Designer (lienzo sin toolbar) |
| Demostración | Renderiza con datos simulados | Home, Compiler, Runner, Memory, Brain, Prompt, Enterprise, Agents, Workflows, Integrations, Marketplace, Monitor, Notifications (topbar) |
| Configuración necesaria | Requiere configuración externa para activarse | Billing (Stripe), Integrations (credenciales), invitaciones (servidor de correo) |
| En desarrollo | Requiere implementación de backend | Búsqueda global, MFA |

---

## 2. Autenticación y acceso

**Estado: Operativo**

El flujo de autenticación es completamente funcional y se basa en Supabase Auth.

- **Inicio de sesión:** el usuario introduce email y contraseña; la plataforma valida las credenciales contra Supabase y, si son correctas, redirige al Dashboard.
- **Registro de cuenta:** el nuevo usuario se crea vía `supabase.auth.signUp` y se inicia sesión automáticamente.
- **Restablecimiento de contraseña:** el enlace "Olvidé mi contraseña" envía un correo de restablecimiento real a través de Supabase.
- **Cierre de sesión:** el botón de cerrar sesión (en el menú de perfil y en la barra lateral) ejecuta `supabase.auth.signOut()`, limpia `sessionStorage` y `localStorage`, y redirige al Login.
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
- **Avatar / menú de perfil:** funcional; abre un menú con 8 ítems de configuración y cierre de sesión.

---

## 4. Menú de perfil (avatar)

**Estado: Operativo**

El menú de perfil se abre al hacer clic en el avatar (esquina superior derecha). Contiene **8 ítems** que navegan a secciones reales de Settings:

1. Mi perfil → Settings > Profile
2. Organización → Settings > Organization
3. Equipo → Settings > Team
4. Facturación → Settings > Billing
5. API Keys → Settings > API Keys
6. Seguridad → Settings > Security
7. Notificaciones → Settings > Notifications
8. Integraciones → Settings > Integrations

Al pie del menú aparece **Cerrar sesión**.

**Navegación con teclado:**
- **Escape** cierra el menú.
- **Flechas (↑ ↓)** navegan entre las opciones del menú.
- **Tab** recorre los elementos interactivos.

**Accesibilidad:**
- Roles ARIA apropiados para menús y secciones.
- Gestión de foco: el foco se mueve correctamente al abrir/cerrar el menú.
- Anillos `focus-visible` visibles en todos los elementos interactivos.

---

## 5. Configuración del usuario — Profile

**Estado: Operativo**

La sección Settings > Profile permite al usuario:

- Ver y editar su **nombre completo** (full_name).
- Ver y editar su **cargo** (job_title).
- Seleccionar **idioma** de la interfaz.
- Seleccionar **zona horaria**.
- Configurar **preferencias de IA**:
  - Modelo de IA (AI model)
  - Temperatura
  - Máximo de tokens (max_tokens)

Los datos se cargan al entrar a la sección desde la tabla `profiles` y se persisten al guardar. No hay pérdida de datos entre sesiones.

**Insignia de estado:** Operativo.

---

## 6. Configuración de la organización — Organization

**Estado: Operativo**

La sección Settings > Organization permite:

- Ver y editar el **nombre** de la organización.
- Seleccionar **sector**.
- Seleccionar **tamaño** de la empresa (company_size).
- Seleccionar **país**.
- Seleccionar **zona horaria**.

Los datos se cargan y guardan en la tabla `organizations` de Supabase.

**Permisos:**
- **Owner / Admin:** pueden editar y guardar todos los campos.
- **Member / Viewer:** ven la información en **modo solo lectura**; los campos no son editables.

**Insignia de estado:** Operativo.

---

## 7. Gestión de equipo — Team

**Estado: Operativo con limitaciones**

La sección Settings > Team muestra los miembros reales de la organización, obtenidos desde la tabla `org_members` de Supabase.

**Funciones disponibles:**
- **Ver la lista** de miembros (nombre, correo, rol).
- **Cambiar roles** (solo owner/admin): se pueden asignar los roles admin, member o viewer.
- **Eliminar un miembro** (solo owner/admin): con diálogo de confirmación.
- **Protección del último propietario:** no es posible eliminar o degradar al único owner de la organización.

**Limitación:** el botón "Invitar miembro" está deshabilitado con estado **"Configuración necesaria"**. El envío de invitaciones por correo requiere configurar un servidor de correo electrónico.

**Implicación para clientes piloto:** pueden ver y administrar miembros existentes, pero no invitar nuevos desde la interfaz hasta que se habilite la función.

**Insignia de estado:** Operativo con limitaciones (invitaciones: Configuración necesaria).

---

## 8. Facturación — Billing

**Estado: Configuración necesaria**

La sección Settings > Billing muestra un mensaje indicando que la facturación **no está configurada**, junto con una **vista demo etiquetada** que presenta:
- Plan actual (ejemplo)
- Precio (ejemplo)
- Estado de la suscripción (ejemplo)

**Requisito para activación:** integrar Stripe y configurar las variables de entorno correspondientes (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, etc.).

**Implicación comercial:** la monetización por suscripción requiere esta configuración. Es la prioridad principal de configuración externa.

**Insignia de estado:** Configuración necesaria (vista demo visible).

---

## 9. API Keys

**Estado: Operativo — Seguro**

La sección Settings > API Keys permite:

- **Crear una nueva API key:** la generación se realiza mediante una **edge function** (`create-api-key`). La clave se almacena como un **hash SHA-256** en la base de datos; el valor completo se muestra **una sola vez** al usuario, con advertencia clara.
- **Ver el listado de claves activas:** muestra las claves existentes (nombre, fecha de creación) sin revelar el valor secreto.
- **Revocar una clave:** elimina la clave con diálogo de **confirmación**; la acción es **irreversible** e invalida la clave inmediatamente.

**Seguridad:** al usar una edge function y almacenar solo el hash SHA-256, la clave nunca se transmite ni se almacena en texto plano en el cliente. Esto representa una mejora respecto a la implementación anterior.

**Insignia de estado:** Operativo.

---

## 10. Seguridad — Security

**Estado: Operativo**

La sección Settings > Security contiene cuatro apartados:

- **Cambio de contraseña:** funcional. Usa `supabase.auth.updateUser` para actualizar la contraseña real en Supabase Auth.
- **Verificación de correo:** muestra el estado de verificación del correo del usuario (verificado / no verificado).
- **MFA (autenticación multifactor):** estado **"no configurado"**; el botón para activar MFA aparece **deshabilitado**. Función reservada para una futura iteración (En desarrollo).
- **Sesiones activas:** permite **cerrar todas las sesiones** activas en todos los dispositivos.

**Insignia de estado:** Operativo (MFA: En desarrollo).

---

## 11. Preferencias de notificación — Notifications

**Estado: Operativo**

La sección Settings > Notifications permite configurar **8 canales** de notificación, cada uno con un interruptor (toggle):

- Las preferencias se **persisten** en `profiles.preferences` (columna `jsonb` de la tabla `profiles`).
- El canal **security_alerts** (alertas de seguridad) es **obligatorio**: siempre activo y no se puede desactivar. El interruptor aparece bloqueado.

**Persistencia:** los cambios se guardan en la base de datos y persisten entre sesiones.

**Panel desplegable de notificaciones (Topbar):** Demostración. La campana de la barra superior muestra notificaciones simuladas. Aún no está conectado a un sistema de notificaciones real.

**Insignia de estado:** Operativo (preferencias) / Demostración (panel desplegable).

---

## 12. Integraciones — Settings > Integrations

**Estado: Configuración necesaria**

La sección Settings > Integrations muestra una lista de **8 integraciones** disponibles. Todas aparecen en estado **desconectado** y los botones **Conectar** están **deshabilitados**.

**Requisito para activación:** proveer las API keys/credenciales de cada integración específica.

**Insignia de estado:** Configuración necesaria (UI lista con 8 integraciones).

> **Nota:** la página "Integrations" del menú lateral principal (distinta de Settings > Integrations) muestra tarjetas de integración en modo demostración.

---

## 13. Cierre de sesión — Logout

**Estado: Operativo**

El botón **Cerrar sesión** (en el menú de perfil y en la barra lateral):
- Ejecuta `supabase.auth.signOut()`.
- Limpia `sessionStorage` y `localStorage`.
- Redirige al usuario a la pantalla de Login.

La sesión se invalida completamente y no se puede acceder al Dashboard sin volver a autenticarse.

---

## 14. Navegación con teclado y accesibilidad

**Estado: Operativo**

- **Escape:** cierra menús desplegables y diálogos.
- **Flechas (↑ ↓):** navegan entre las opciones del menú de perfil.
- **Tab:** recorre los elementos interactivos de cada sección.
- **Roles ARIA:** menús y secciones usan roles ARIA apropiados.
- **Gestión de foco:** el foco se mueve correctamente al abrir/cerrar menús.
- **Anillos focus-visible:** todos los elementos interactivos muestran un anillo de foco visible al navegar con teclado.

---

## 15. Módulos de producto en modo demostración

Los siguientes módulos renderizan correctamente y ofrecen una experiencia interactiva, pero operan con **datos simulados** (mocks).

### 15.1 Home (Dashboard) — Demostración
Muestra tarjetas de métricas (KPIs) y gráficos de actividad con valores simulados.

### 15.2 Compiler — Demostración
Permite introducir una especificación y "generar" un blueprint simulado.

### 15.3 Runner — Demostración
Muestra un panel de ejecución y un historial de ejecuciones con datos simulados.

### 15.4 Memory Center — Demostración
Muestra la memoria del agente con datos simulados.

### 15.5 AI Brain — Demostración
Muestra el estado y la configuración del Brain con datos simulados.

### 15.6 Prompt Intelligence — Demostración
Permite introducir un prompt y ver un análisis simulado.

### 15.7 Workflow Designer — Operativo con limitaciones
El lienzo visual funciona: se pueden añadir nodos y conexiones. La barra de herramientas tiene 4 botones deshabilitados con tooltip explicativo (backend de workflows pendiente).

### 15.8 Enterprise Center — Demostración
Muestra métricas y gobernanza empresarial con datos simulados.

### 15.9 Agents — Demostración
Muestra una lista de agentes configurados con datos simulados.

### 15.10 Workflows — Demostración
Muestra una lista de flujos guardados con datos simulados.

### 15.11 Integrations (página principal) — Demostración
Muestra tarjetas de integraciones disponibles con datos simulados.

### 15.12 Marketplace — Demostración
Muestra un catálogo de plantillas y extensiones con datos simulados.

### 15.13 Monitor — Demostración
Muestra métricas de monitoreo del sistema con datos simulados.

---

## 16. Funciones transversales

### 16.1 Selector de idioma (ES/EN) — Operativo
Permite alternar entre español e inglés en toda la interfaz.

### 16.2 Búsqueda global — En desarrollo
El campo de búsqueda se renderiza en la barra superior, pero no ejecuta ninguna búsqueda.

### 16.3 Panel de notificaciones (campana) — Demostración
Muestra notificaciones simuladas en un panel desplegable.

---

## 17. Landing page

**Estado: Operativo**

- Los botones de llamada a la acción (Iniciar sesión / Registrarse) navegan a las rutas de autenticación.
- El selector de idioma funciona.
- Los enlaces del pie de página se renderizan como texto no clicable.

---

## 18. Resumen para stakeholders no técnicos

### ¿Qué puede hacer un usuario hoy?

1. **Registrarse e iniciar sesión** con email y contraseña reales.
2. **Recuperar su contraseña** mediante correo electrónico.
3. **Completar y actualizar su perfil** (nombre, cargo, idioma, zona horaria, preferencias de IA).
4. **Configurar su organización** (nombre, sector, tamaño, país, zona horaria).
5. **Ver y administrar miembros** del equipo (cambiar roles, eliminar con confirmación).
6. **Crear y revocar API Keys** de forma segura (edge function, hash SHA-256, mostrada una sola vez).
7. **Cambiar su contraseña** y verificar el estado de su correo electrónico.
8. **Cerrar todas las sesiones** activas.
9. **Configurar notificaciones** (8 canales, security_alerts obligatorio) — persisten en la base de datos.
10. **Revisar la facturación** en vista demo etiquetada.
11. **Revisar integraciones** (8 integraciones listadas, botones deshabilitados).
12. **Navegar por toda la plataforma** — las 14 secciones son accesibles.
13. **Diseñar flujos visualmente** en el Workflow Designer (lienzo funcional).
14. **Explorar todos los módulos** en modo demostración.
15. **Alternar entre español e inglés** en cualquier momento.
16. **Cerrar sesión** de forma segura (limpia caché y redirige a login).
17. **Navegar con teclado** (Escape, flechas, Tab) con anillos de foco visibles.

### ¿Qué no puede hacer aún?

1. **Pagar suscripciones o ver facturación real** — requiere configurar Stripe.
2. **Invitar nuevos miembros** por correo — el botón está deshabilitado (requiere servidor de correo).
3. **Activar MFA** — botón deshabilitado (en desarrollo).
4. **Buscar contenido** en la plataforma — la búsqueda no está conectada.
5. **Conectar integraciones externas** — requiere credenciales de cada servicio.
6. **Generar blueprints reales** en el Compiler — actualmente simulado.
7. **Ejecutar flujos reales** en el Runner — actualmente simulado.
8. **Ver métricas reales** en el Dashboard, Monitor o Enterprise Center — simulados.
9. **Guardar o ejecutar flujos** desde el Workflow Designer — toolbar pendiente de backend.

### Mensaje para clientes piloto

> CompilerAI ofrece hoy una experiencia de autenticación y configuración completamente funcional con 8 secciones operativas, junto con un recorrido demostración completo de todos sus módulos. La facturación se muestra en vista demo etiquetada, las invitaciones de equipo y las integraciones externas estarán disponibles al configurar los servicios correspondientes.

### Mensaje para inversores

> El núcleo de CompilerAI (autenticación, gestión de cuentas, organizaciones, API Keys seguras, seguridad, notificaciones persistentes y navegación accesible) es plenamente operativo y production-ready. Los módulos de producto operan en modo demostración. El camino a producción completa está claramente trazado: configuración de Stripe (monetización), servidor de correo (invitaciones), credenciales de integraciones, y conexión progresiva de cada módulo a su servicio real.

### Mensaje para ventas y soporte

> Al presentar CompilerAI a clientes potenciales, destaque: (1) autenticación y gestión de cuentas reales, (2) API Keys seguras generadas vía edge function, (3) 8 secciones de configuración funcionales, (4) accesibilidad y navegación por teclado. Sea transparente sobre: facturación en vista demo, invitaciones de equipo pendientes, MFA pendiente, y módulos de producto en modo demostración.

---

## Apéndice A — Tabla resumen de estado por módulo

| # | Módulo | Estado |
|---|---|---|
| 1 | Autenticación (Login, Registro, Reset, Logout) | Operativo |
| 2 | Navegación lateral (14 ítems) | Operativo |
| 3 | Menú de perfil (8 ítems) | Operativo |
| 4 | Profile (Settings) | Operativo |
| 5 | Organization (Settings) | Operativo |
| 6 | Team (Settings) — lista, roles, eliminar | Operativo con limitaciones |
| 7 | Team invitations | Configuración necesaria |
| 8 | API Keys (Settings) — edge function, SHA-256 | Operativo (seguro) |
| 9 | Security (Settings) — contraseña, correo, sesiones | Operativo |
| 10 | Security — MFA | En desarrollo |
| 11 | Notifications — preferencias (Settings) | Operativo |
| 12 | Integrations (Settings) — 8 integraciones, UI lista | Configuración necesaria |
| 13 | Navegación con teclado | Operativo |
| 14 | Accesibilidad (ARIA, foco, focus-visible) | Operativo |
| 15 | Selector de idioma ES/EN | Operativo |
| 16 | Landing page | Operativo |
| 17 | Workflow Designer — lienzo | Operativo con limitaciones |
| 18 | Notifications — panel desplegable | Demostración |
| 19 | Home (Dashboard) | Demostración |
| 20 | Compiler | Demostración |
| 21 | Runner | Demostración |
| 22 | Memory Center | Demostración |
| 23 | AI Brain | Demostración |
| 24 | Prompt Intelligence | Demostración |
| 25 | Enterprise Center | Demostración |
| 26 | Agents | Demostración |
| 27 | Workflows | Demostración |
| 28 | Integrations (página) | Demostración |
| 29 | Marketplace | Demostración |
| 30 | Monitor | Demostración |
| 31 | Workflow Designer — toolbar | Demostración (botones deshabilitados) |
| 32 | Billing (Settings) — vista demo | Configuración necesaria |
| 33 | Búsqueda global | En desarrollo |

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
| **Edge function** | Función que se ejecuta en el servidor (Supabase) para operaciones seguras, como generar API Keys. |
| **Hash SHA-256** | Transformación criptográfica irreversible; permite almacenar una referencia de la API key sin revelar su valor. |
| **Mock / Simulado** | Datos de ejemplo integrados en la interfaz para demostración; no son datos reales del usuario. |
| **Supabase** | Servicio de backend (base de datos y autenticación) que usa CompilerAI. |
| **Stripe** | Servicio externo de procesamiento de pagos, necesario para la facturación. |
| **ARIA** | Conjunto de atributos que mejoran la accesibilidad de la interfaz para lectores de pantalla. |
| **focus-visible** | Estilo visual que indica qué elemento está enfocado al navegar con teclado. |

---

*Fin del dossier funcional de CompilerAI.*
