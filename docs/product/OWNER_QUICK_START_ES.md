# Guía de Inicio Rápido para Product Owners — CompilerAI

**Audiencia:** Product Owners no técnicos, clientes piloto y responsables de producto.
**Idioma:** Español
**Propósito:** Guiarle, paso a paso, en el primer recorrido completo de CompilerAI para que pueda verificar el estado de la plataforma sin asistencia técnica.

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
- Se abre un formulario con sus datos personales (nombre, avatar, etc.).

**Qué datos necesita:**
- Su nombre completo y, opcionalmente, una foto/avatar.

**Cómo saber que funcionó:**
- Modifique un campo (p. ej. el nombre), haga clic en **Guardar** y recargue la página. Sus cambios deben persistir.

**Qué hacer si falla:**
- Si al guardar aparece un error: compruebe su conexión a internet. Si el error persiste, cierre sesión y vuelva a entrar, luego intente guardar de nuevo.

---

## Paso 3 — Revisar la organización

**Dónde hacer clic:**
- En **Configuración** (barra lateral), seleccione **Organization**.

**Qué debería ocurrir:**
- Se muestra el formulario con los datos de su organización (nombre y detalles).

**Qué datos necesita:**
- El nombre de su organización (debería venir pre-cargado).

**Cómo saber que funcionó:**
- Edite el nombre, guarde y recargue. El cambio debe persistir.

**Qué hacer si falla:**
- Si los campos aparecen vacíos: es posible que la organización no se haya creado al registrarse. Contacte al equipo de soporte para asociar su cuenta a una organización.

---

## Paso 4 — Revisar miembros del equipo

**Dónde hacer clic:**
- En **Configuración**, seleccione **Team**.

**Qué debería ocurrir:**
- Se muestra la lista de miembros reales de su organización.

**Qué datos necesita:**
- Ninguno (solo lectura).

**Cómo saber que funcionó:**
- Ve al menos su propio usuario en la lista de miembros.

**Qué hacer si falla:**
- Si la lista está vacía: contacte a soporte para verificar que su usuario está registrado en la tabla de miembros.
- **Importante:** el botón **Invitar miembro** aparece deshabilitado. Esto es esperado; la función de invitación por correo está en desarrollo.

---

## Paso 5 — Crear una API Key

**Dónde hacer clic:**
- En **Configuración**, seleccione **API Keys**.
- Haga clic en **Crear nueva clave** (o botón equivalente).

**Qué debería ocurrir:**
- Se genera una nueva API key y se muestra **una sola vez** en pantalla, con una advertencia de que no volverá a mostrarse.

**Qué datos necesita:**
- Un nombre/etiqueta opcional para identificar la clave.

**Cómo saber que funcionó:**
- Ve la clave en pantalla y aparece en la lista de claves activas.

**Qué hacer si falla:**
- **Copie y guarde la clave inmediatamente** en un gestor de contraseñas. Si la pierde, deberá revocarla y crear una nueva.
- Si la creación falla con error: recargue la página e intente de nuevo. Si persiste, contacte a soporte.

> **Para revocar:** haga clic en el botón **Revocar** junto a una clave en la lista. La clave se invalida al instante.

---

## Paso 6 — Explorar el Workflow Designer (crear una automatización)

**Dónde hacer clic:**
- Haga clic en **Workflow Designer** en la barra lateral.

**Qué debería ocurrir:**
- Se abre un lienzo visual (canvas) donde puede añadir nodos y conectarlos arrastrando.

**Qué datos necesita:**
- Ninguno real; es un prototipo visual.

**Cómo saber que funcionó:**
- Puede arrastrar nodos al lienzo y crear conexiones entre ellos. El diseño se mantiene mientras navega.

**Qué hacer si falla:**
- Si no puede arrastrar nodos: pruebe con otro navegador (Chrome recomendado).
- **Importante:** los botones de la barra de herramientas (Guardar, Ejecutar, Validar, Exportar) están **deshabilitados** con un tooltip explicativo. Esto es esperado; el backend de workflows está en desarrollo. El lienzo sirve para prototipar visualmente.

---

## Paso 7 — Ejecutar una acción de Copilot (Compiler)

**Dónde hacer clic:**
- Haga clic en **Compiler** en la barra lateral.
- Introduzca una especificación o descripción en el campo de entrada y haga clic en **Generar blueprint**.

**Qué debería ocurrir:**
- Se muestra un blueprint generado a partir de su entrada.

**Qué datos necesita:**
- Una descripción textual de lo que desea compilar (p. ej. "flujo de respuesta automática de correo").

**Cómo saber que funcionó:**
- Ve una estructura/blueprint en pantalla tras pulsar generar.

**Qué hacer si falla:**
- Si no aparece resultado: recargue la página e intente con un texto más corto.
- **Nota para Product Owners:** el blueprint mostrado es **simulado** (datos de demostración). La interfaz está lista para conectarse al motor de compilación real. Esto es útil para validar la experiencia con stakeholders.

---

## Paso 8 — Revisar resultados (Home, Runner y Monitor)

**Dónde hacer clic:**
- Haga clic en **Inicio** (Home) en la barra lateral para ver el Dashboard.
- Haga clic en **Runner** para ver el panel de ejecuciones.
- Haga clic en **Monitor** para ver métricas del sistema.

**Qué debería ocurrir:**
- Cada página muestra tarjetas, gráficos y listas con datos.

**Qué datos necesita:**
- Ninguno (solo lectura).

**Cómo saber que funcionó:**
- Las tres páginas cargan sin errores y muestran contenido visual (métricas, tablas, gráficos).

**Qué hacer si falla:**
- Si una página aparece en blanco: recargue el navegador. Si persiste, revise la consola del navegador (F12) o contacte a soporte.
- **Nota:** las métricas que ve son **simuladas** (datos de demostración). No reflejan actividad real todavía. Esto es esperado en la fase actual.

---

## Paso 9 — Revisar actividad, errores y cerrar sesión

### 9a — Revisar notificaciones

**Dónde hacer clic:**
- Haga clic en la **campana** de notificaciones en la barra superior.

**Qué debería ocurrir:**
- Se despliega un panel con notificaciones.

**Cómo saber que funcionó:**
- Ve entradas en el panel desplegable.
- **Nota:** las notificaciones son **simuladas** en esta fase.

### 9b — Configurar preferencias de notificación

**Dónde hacer clic:**
- En **Configuración**, seleccione **Notifications**.

**Qué debería ocurrir:**
- Puede marcar/desmarcar preferencias y guardar.

**Cómo saber que funcionó:**
- Cambie una preferencia, guarde y recargue. El cambio persiste.

### 9c — Cerrar sesión

**Dónde hacer clic:**
- Haga clic en su **avatar** (esquina superior derecha) y seleccione **Cerrar sesión**; o haga clic en **Cerrar sesión** al pie de la barra lateral.

**Qué debería ocurrir:**
- La sesión se cierra y vuelve a la pantalla de Login.

**Cómo saber que funcionó:**
- Ve la pantalla de Login y, si intenta navegar atrás, no accede al Dashboard sin volver a autenticarse.

**Qué hacer si falla:**
- Si la sesión no se cierra: borre las cookies del sitio o pruebe en una ventana de incógnito. Reporte el incidente a soporte si persiste.

---

## Resumen rápido de estado

| Paso | Función | Estado |
|---|---|---|
| 1 | Iniciar sesión / Registrarse | ✅ Operativo |
| 2 | Completar perfil | ✅ Operativo |
| 3 | Revisar organización | ✅ Operativo |
| 4 | Ver miembros del equipo | ✅ Operativo (sin invitaciones) |
| 5 | Crear API Key | ✅ Operativo |
| 6 | Workflow Designer (prototipo) | ⚠️ Lienzo funcional, toolbar pendiente |
| 7 | Compiler (generar blueprint) | 🔄 Demostración (datos simulados) |
| 8 | Home / Runner / Monitor | 🔄 Demostración (datos simulados) |
| 9 | Notificaciones, preferencias y logout | ✅ Operativo (panel simulado) |

**Leyenda:** ✅ Operativo · ⚠️ Operativo con limitaciones · 🔄 Demostración

---

## Contacto de soporte

Si encuentra un problema no cubierto en esta guía, contacte al equipo de soporte con la siguiente información:

1. Pantalla donde ocurrió el problema.
2. Acción que intentó realizar.
3. Mensaje de error exacto (si lo hay).
4. Navegador y versión utilizados.

---

*Fin de la guía de inicio rápido.*
