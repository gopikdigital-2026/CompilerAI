# Guía de Inicio Rápido para Product Owners — CompilerAI

**Audiencia:** Product Owners no técnicos, clientes piloto y responsables de producto.
**Idioma:** Español
**Fecha:** 2026-07-27
**Propósito:** Guiarle, paso a paso, en el primer recorrido completo de CompilerAI para que pueda verificar el estado de la plataforma sin asistencia técnica. Esta guía cubre las 8 secciones de configuración disponibles tras el UX Sprint 1.

---

## Antes de empezar

**Requisitos:**

- Un navegador moderno (Chrome, Firefox, Edge o Safari).
- Una cuenta de CompilerAI (email y contraseña). Si no tiene cuenta, siga el paso 1 para registrarse.
- Conexión a internet.

**Convenión de esta guía:** cada paso indica **dónde hacer clic**, **qué debería ocurrir**, **qué datos necesita**, **cómo saber que funcionó** y **qué hacer si falla**.

---

## Paso 1 — Iniciar sesión (o registrarse)

**Dónde hacer clic:**
- Abra la URL de CompilerAI en su navegador.
- Si ya tiene cuenta: introduzca su email y contraseña y haga clic en **Iniciar sesión**.
- Si no tiene cuenta: haga clic en **Registrarse**, complete email, contraseña y nombre, acepte los términos y haga clic en **Crear cuenta**.

**Qué debería ocurrir:**
- Tras autenticar, la plataforma le redirige automáticamente al Dashboard (página de inicio).

**Qué datos necesita:**
- Email válido y contraseña (mínimo 8 caracteres recomendado).

**Cómo saber que funcionó:**
- Ve la barra lateral con 14 ítems de navegación y el Dashboard con tarjetas de métricas.

**Qué hacer si falla:**
- Si el login muestra "credenciales inválidas": verifique email y contraseña. Si olvidó la contraseña, haga clic en **Olvidé mi contraseña** para recibir un correo de restablecimiento.
- Si no recibe el correo de restablecimiento: revise la carpeta de spam. Si persiste, contacte al equipo de soporte.

---

## Paso 2 — Completar el perfil

**Dónde hacer clic:**
- Haga clic en su **avatar** (esquina superior derecha) y seleccione **Mi perfil**; o haga clic en **Configuración** en la barra lateral y luego en **Profile**.

**Qué debería ocurrir:**
- Se abre un formulario con sus datos personales y preferencias:
  - Nombre completo (full_name)
  - Cargo (job_title)
  - Idioma de la interfaz
  - Zona horaria
  - Preferencias de IA: modelo de IA, temperatura y máximo de tokens (max_tokens)

**Qué datos necesita:**
- Su nombre completo, cargo, idioma preferido, zona horaria y preferencias de IA (modelo, temperatura, max_tokens).

**Cómo saber que funcionó:**
- Modifique un campo (p. ej. el nombre), haga clic en **Guardar** y recargue la página. Sus cambios deben persistir.

**Qué hacer si falla:**
- Si al guardar aparece un error: compruebe su conexión a internet. Si el error persiste, cierre sesión y vuelva a entrar, luego intente guardar de nuevo.

---

## Paso 3 — Revisar la organización

**Dónde hacer clic:**
- Abra el menú de perfil (clic en avatar) y seleccione **Organización**; o en **Configuración** (barra lateral), seleccione **Organization**.

**Qué debería ocurrir:**
- Se muestra el formulario con los datos de su organización:
  - Nombre
  - Sector
  - Tamaño de la empresa
  - País
  - Zona horaria

**Qué datos necesita:**
- El nombre de su organización y sus datos sectoriales (deberían venir pre-cargados).

**Cómo saber que funcionó:**
- Edite el nombre, guarde y recargue. El cambio debe persistir.

**Nota de permisos:**
- Solo **owner** y **admin** pueden editar. Si su rol es **member** o **viewer**, verá los campos en modo solo lectura.

**Qué hacer si falla:**
- Si los campos aparecen vacíos: es posible que la organización no se haya creado al registrarse. Contacte al equipo de soporte para asociar su cuenta a una organización.

---

## Paso 4 — Revisar miembros del equipo

**Dónde hacer clic:**
- Abra el menú de perfil y seleccione **Equipo**; o en **Configuración**, seleccione **Team**.

**Qué debería ocurrir:**
- Se muestra la lista real de miembros de su organización con nombre, correo y rol.

**Qué datos necesita:**
- Ninguno (solo lectura para member/viewer).

**Acciones disponibles (solo owner/admin):**
- **Cambiar el rol** de un miembro (admin, member o viewer).
- **Eliminar un miembro** con confirmación. No se puede eliminar al único owner de la organización (protección del último propietario).

**Cómo saber que funcionó:**
- Ve al menos su propio usuario en la lista de miembros.

**Qué hacer si falla:**
- Si la lista está vacía: contacte a soporte para verificar que su usuario está registrado en la tabla de miembros.
- **Importante:** el botón **Invitar miembro** aparece deshabilitado con estado **"Configuración necesaria"**. Esto es esperado; la función de invitación por correo requiere configurar un servidor de correo electrónico.

---

## Paso 5 — Consultar la facturación

**Dónde hacer clic:**
- Abra el menú de perfil y seleccione **Facturación**; o en **Configuración**, seleccione **Billing**.

**Qué debería ocurrir:**
- Se muestra un panel con el estado **"no configurada"**.
- Debajo aparece una **vista demo etiquetada** que muestra plan, precio y estado de suscripción de ejemplo.

**Qué datos necesita:**
- Ninguno (solo lectura).

**Cómo saber que funcionó:**
- Ve el mensaje de "no configurada" y la vista demo con datos de ejemplo.

**Qué hacer si falla:**
- Si la página no carga: recargue el navegador. Si persiste, contacte a soporte.
- **Importante:** la facturación real requiere configurar **Stripe**. La vista demo sirve para visualizar la experiencia objetivo.

---

## Paso 6 — Crear una API Key

**Dónde hacer clic:**
- Abra el menú de perfil y seleccione **API Keys**; o en **Configuración**, seleccione **API Keys**.
- Haga clic en **Crear nueva clave**.

**Qué debería ocurrir:**
- Se genera una nueva API key de forma segura mediante una **edge function** (hash SHA-256).
- La clave se muestra **una sola vez** en pantalla, con una advertencia de que no volverá a mostrarse.

**Qué datos necesita:**
- Un nombre/etiqueta opcional para identificar la clave.

**Cómo saber que funcionó:**
- Ve la clave en pantalla y aparece en la lista de claves activas (sin revelar el valor secreto).

**Qué hacer si falla:**
- **Copie y guarde la clave inmediatamente** en un gestor de contraseñas. Si la pierde, deberá revocarla y crear una nueva.
- Si la creación falla con error: recargue la página e intente de nuevo. Si persiste, contacte a soporte.

> **Para revocar:** haga clic en el botón **Revocar** junto a una clave en la lista. Aparecerá un diálogo de confirmación advirtiendo que la acción es **irreversible**. Confirme para invalidar la clave al instante.

---

## Paso 7 — Revisar la seguridad

**Dónde hacer clic:**
- Abra el menú de perfil y seleccione **Seguridad**; o en **Configuración**, seleccione **Security**.

**Qué debería ocurrir:**
- Se muestran cuatro apartados:
  - **Cambio de contraseña:** introduzca contraseña actual y nueva, y haga clic en **Cambiar contraseña**.
  - **Verificación de correo:** muestra el estado (verificado / no verificado).
  - **MFA:** estado **"no configurado"**; botón **deshabilitado** (en desarrollo).
  - **Sesiones activas:** haga clic en **Cerrar todas las sesiones** para invalidar sesiones en todos los dispositivos.

**Qué datos necesita:**
- Para cambiar la contraseña: contraseña actual y nueva contraseña.

**Cómo saber que funcionó:**
- El cambio de contraseña muestra un mensaje de confirmación.
- El estado de verificación de correo refleja su situación real.
- Al cerrar todas las sesiones, cualquier otra sesión activa se invalida.

**Qué hacer si falla:**
- Si el cambio de contraseña falla: verifique que la contraseña actual es correcta. Si persiste, contacte a soporte.
- **Importante:** MFA no se puede activar todavía; el botón está deshabilitado a propósito.

---

## Paso 8 — Configurar notificaciones

**Dónde hacer clic:**
- Abra el menú de perfil y seleccione **Notificaciones**; o en **Configuración**, seleccione **Notifications**.

**Qué debería ocurrir:**
- Se muestra una lista de **8 canales** de notificación, cada uno con un interruptor (toggle).

**Qué datos necesita:**
- Ninguno; solo active o desactive los canales que desee.

**Cómo saber que funcionó:**
- Cambie una preferencia, haga clic en **Guardar** y recargue. El cambio persiste.

**Importante:**
- El canal **security_alerts** (alertas de seguridad) es **obligatorio**: siempre activo y no se puede desactivar. El interruptor aparece bloqueado.

**Qué hacer si falla:**
- Si al guardar aparece un error: compruebe su conexión e intente de nuevo.

---

## Paso 9 — Revisar integraciones

**Dónde hacer clic:**
- Abra el menú de perfil y seleccione **Integraciones**; o en **Configuración**, seleccione **Integrations**.

**Qué debería ocurrir:**
- Se muestra una lista de **8 integraciones** disponibles.
- Todas aparecen en estado **desconectado**.
- Los botones **Conectar** están **deshabilitados**.

**Qué datos necesita:**
- Ninguno (solo lectura).

**Cómo saber que funcionó:**
- Ve las 8 tarjetas de integración con el botón Conectar deshabilitado.

**Qué hacer si falla:**
- Si la página no carga: recargue el navegador. Si persiste, contacte a soporte.
- **Importante:** las integraciones no se pueden activar todavía porque requieren configurar las **API keys externas** de cada servicio. La interfaz está lista para cuando las credenciales estén disponibles.

---

## Paso 10 — Cerrar sesión

**Dónde hacer clic:**
- Haga clic en su **avatar** (esquina superior derecha) y seleccione **Cerrar sesión** al pie del menú; o haga clic en **Cerrar sesión** al pie de la barra lateral.

**Qué debería ocurrir:**
- La sesión se cierra de forma segura.
- Se limpia la caché local (sessionStorage y localStorage).
- El navegador le redirige a la pantalla de **Login**.

**Cómo saber que funcionó:**
- Ve la pantalla de Login y, si intenta navegar atrás, no accede al Dashboard sin volver a autenticarse.

**Qué hacer si falla:**
- Si la sesión no se cierra: borre las cookies del sitio o pruebe en una ventana de incógnito. Reporte el incidente a soporte si persiste.

---

## Resumen rápido de estado

| Paso | Función | Estado |
|---|---|---|
| 1 | Iniciar sesión / Registrarse | ✅ Operativo |
| 2 | Completar perfil (nombre, cargo, idioma, zona horaria, IA) | ✅ Operativo |
| 3 | Revisar organización (nombre, sector, tamaño, país) | ✅ Operativo |
| 4 | Revisar miembros del equipo (roles, permisos) | ✅ Operativo (sin invitaciones) |
| 5 | Consultar facturación (vista demo) | ⚠️ Configuración necesaria (vista demo) |
| 6 | Crear API Key (segura, mostrada una vez) | ✅ Operativo (seguro) |
| 7 | Revisar seguridad (contraseña, correo, sesiones) | ✅ Operativo (MFA pendiente) |
| 8 | Configurar notificaciones (8 canales, security obligatorio) | ✅ Operativo |
| 9 | Revisar integraciones (8, todas desconectadas) | ⚠️ Configuración necesaria |
| 10 | Cerrar sesión | ✅ Operativo |

**Leyenda:** ✅ Operativo · ⚠️ Configuración necesaria / limitación · 🔄 Demostración

---

## Contacto de soporte

Si encuentra un problema no cubierto en esta guía, contacte al equipo de soporte con la siguiente información:

1. Pantalla donde ocurrió el problema.
2. Acción que intentó realizar.
3. Mensaje de error exacto (si lo hay).
4. Navegador y versión utilizados.

---

*Fin de la guía de inicio rápido.*
