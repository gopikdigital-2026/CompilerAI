# Guía de Experiencia de Usuario — Perfil y Configuración de CompilerAI

**Audiencia:** Usuarios no técnicos (Product Owners, clientes piloto, administradores de organización).
**Idioma:** Español
**Fecha:** 2026-07-27
**Propósito:** Explicar, paso a paso y sin tecnicismos, cómo utilizar el área de perfil y configuración de CompilerAI. Cada sección indica dónde hacer clic, qué debería ocurrir y qué tener en cuenta.

---

## Convences de esta guía

- **Dónde hacer clic:** la acción física que debe realizar en la pantalla.
- **Qué debería ocurrir:** el resultado visible esperado.
- **Nota:** advertencias, limitaciones o estados especiales (demo, deshabilitado, etc.).
- **Configuración externa:** cuando una sección necesita un servicio externo para funcionar al 100%.

---

## 1. Abrir el menú de perfil

**Dónde hacer clic:**
- Haga clic en su **avatar** (círculo con su inicial o foto) en la esquina superior derecha de la barra superior.

**Qué debería ocurrir:**
- Se despliega un menú vertical con 8 opciones:
  1. Mi perfil
  2. Organización
  3. Equipo
  4. Facturación
  5. API Keys
  6. Seguridad
  7. Notificaciones
  8. Integraciones
- Al pie del menú aparece la opción **Cerrar sesión**.

**Nota:** puede cerrar el menú pulsando la tecla **Escape** o haciendo clic fuera de él.

---

## 2. Modificar el perfil

**Dónde hacer clic:**
- Abra el menú de perfil (clic en avatar) y seleccione **Mi perfil**.

**Qué debería ocurrir:**
- Se abre la sección **Profile** con un formulario que contiene:
  - Nombre completo
  - Cargo (job title)
  - Idioma de la interfaz
  - Zona horaria
  - Preferencias de IA: modelo de IA, temperatura y máximo de tokens (max_tokens)

**Cómo guardar:**
- Modifique los campos que desee y haga clic en **Guardar**.
- Los cambios se almacenan en la base de datos y persisten entre sesiones.

**Cómo saber que funcionó:**
- Recargue la página: sus datos modificados deben seguir visibles.

**Nota:** el avatar se muestra en la interfaz, pero la carga de imágenes reales requiere configurar **Supabase Storage** (ver sección 17).

---

## 3. Gestionar la organización

**Dónde hacer clic:**
- Abra el menú de perfil y seleccione **Organización**.

**Qué debería ocurrir:**
- Se abre la sección **Organization** con un formulario que contiene:
  - Nombre de la organización
  - Sector
  - Tamaño de la empresa
  - País
  - Zona horaria

**Permisos — quién puede editar:**
- **Owner (propietario)** y **Admin**: pueden editar y guardar todos los campos.
- **Member (miembro)** y **Viewer (observador)**: ven la información en **modo solo lectura**; los campos no son editables.

**Cómo guardar (solo owner/admin):**
- Modifique los campos y haga clic en **Guardar**.

**Cómo saber que funcionó:**
- Recargue la página: los cambios deben persistir.

---

## 4. Gestionar miembros del equipo

**Dónde hacer clic:**
- Abra el menú de perfil y seleccione **Equipo**.

**Qué debería ocurrir:**
- Se muestra la lista real de miembros de su organización con su nombre, correo y rol actual.

**Acciones disponibles:**
- **Ver la lista:** todos los usuarios pueden verla.
- **Cambiar el rol de un miembro** (solo owner/admin): puede asignar los roles admin, member o viewer.
- **Eliminar un miembro** (solo owner/admin): haga clic en **Eliminar** junto al miembro. Se pedirá confirmación antes de proceder.

**Protección del último propietario:**
- No es posible eliminar o degradar al único **owner** de la organización. Esta protección evita que la organización quede sin administrador.

**Nota sobre invitaciones:**
- El botón **Invitar miembro** aparece con estado **"Configuración necesaria"** y está **deshabilitado**. El envío de invitaciones por correo aún no está activo porque requiere configurar un **servidor de correo electrónico** (ver sección 17).

---

## 5. Consultar la facturación

**Dónde hacer clic:**
- Abra el menú de perfil y seleccione **Facturación**.

**Qué debería ocurrir:**
- Se muestra un panel con el estado **"no configurada"**.
- Debajo se muestra una **vista demo** claramente etiquetada como demostración, que presenta:
  - Plan actual (ejemplo)
  - Precio (ejemplo)
  - Estado de la suscripción (ejemplo)

**Nota:** la vista demo sirve para visualizar cómo se verá la facturación una vez configurada. No refleja datos reales de pago.

**Configuración externa necesaria:**
- Para activar la facturación real es necesario configurar **Stripe** (ver sección 17).

---

## 6. Crear API Keys

**Dónde hacer clic:**
- Abra el menú de perfil y seleccione **API Keys**.
- Haga clic en **Crear nueva clave**.

**Qué debería ocurrir:**
- Se genera una nueva API key de forma segura (mediante una función de servidor/edge function).
- La clave se muestra **una sola vez** en pantalla, con una advertencia clara: no volverá a mostrarse.

**Qué hacer inmediatamente:**
- **Copie la clave** haciendo clic en el botón **Copiar** o seleccionando el texto.
- Guárdela en un **gestor de contraseñas** o en un lugar seguro.

**Cómo saber que funcionó:**
- La clave aparece en la lista de claves activas (sin revelar el valor secreto, solo su nombre y fecha de creación).

**Nota de seguridad:** la clave se almacena mediante un hash SHA-256; el valor completo solo se muestra en el momento de la creación. Si la pierde, deberá revocarla y crear una nueva.

---

## 7. Revocar API Keys

**Dónde hacer clic:**
- En la sección **API Keys**, localice la clave que desea revocar en la lista.
- Haga clic en **Revocar** junto a esa clave.

**Qué debería ocurrir:**
- Aparece un diálogo de **confirmación** advirtiendo que la acción es **irreversible**.
- Confirme haciendo clic en **Revocar** (o cancele si lo prefiere).

**Cómo saber que funcionó:**
- La clave desaparece de la lista de claves activas.
- Cualquier servicio que use esa clave dejará de funcionar inmediatamente.

**Nota:** esta acción no se puede deshacer. Asegúrese de que ningún servicio crítico depende de la clave antes de revocarla.

---

## 8. Cambiar la contraseña

**Dónde hacer clic:**
- Abra el menú de perfil y seleccione **Seguridad**.
- En el apartado **Contraseña**, introduzca su contraseña actual y la nueva contraseña.
- Haga clic en **Cambiar contraseña**.

**Qué debería ocurrir:**
- La plataforma valida su contraseña actual y actualiza la nueva mediante Supabase Auth.

**Cómo saber que funcionó:**
- Aparece un mensaje de confirmación.
- Puede iniciar sesión con la nueva contraseña.

**Nota:** elija una contraseña robusta (mínimo 8 caracteres, combinando letras, números y símbolos).

---

## 9. Verificación de correo electrónico

**Dónde hacer clic:**
- En la sección **Seguridad**, revise el apartado **Verificación de correo**.

**Qué debería ocurrir:**
- Se muestra el **estado** de verificación de su correo: verificado o no verificado.

**Nota:** si su correo no está verificado, busque el correo de verificación en su bandeja de entrada (o en spam) y siga el enlace. El estado se actualiza automáticamente al verificar.

---

## 10. MFA (autenticación multifactor)

**Dónde hacer clic:**
- En la sección **Seguridad**, revise el apartado **MFA**.

**Qué debería ocurrir:**
- Se muestra el estado **"no configurado"**.
- El botón para activar MFA aparece **deshabilitado**.

**Nota:** la activación de MFA aún no está disponible. Esta función está reservada para una futura iteración.

---

## 11. Sesiones activas

**Dónde hacer clic:**
- En la sección **Seguridad**, revise el apartado **Sesiones activas**.
- Haga clic en **Cerrar todas las sesiones**.

**Qué debería ocurrir:**
- Se cierran todas las sesiones activas en todos los dispositivos.

**Cómo saber que funcionó:**
- Si estaba en otro dispositivo, esa sesión se invalida y debe volver a iniciar sesión.

**Nota:** la sesión actual también puede cerrarse; en ese caso será redirigido a la pantalla de login.

---

## 12. Modificar notificaciones

**Dónde hacer clic:**
- Abra el menú de perfil y seleccione **Notificaciones**.

**Qué debería ocurrir:**
- Se muestra una lista de **8 canales** de notificación, cada uno con un interruptor (toggle) para activarlo o desactivarlo.

**Cómo guardar:**
- Active o desactive los canales que desee y haga clic en **Guardar**.
- Las preferencias se almacenan en su perfil y persisten entre sesiones.

**Importante — security_alerts obligatorio:**
- El canal **security_alerts** (alertas de seguridad) está **siempre activo** y **no se puede desactivar**. El interruptor aparece bloqueado. Esto garantiza que siempre reciba notificaciones críticas de seguridad.

**Nota sobre el panel de notificaciones de la barra superior:**
- La campana de notificaciones del topbar muestra notificaciones **mock** (simuladas). Es una vista demo etiquetada como tal. Aún no está conectada a un sistema real de notificaciones.

---

## 13. Conectar integraciones

**Dónde hacer clic:**
- Abra el menú de perfil y seleccione **Integraciones**.

**Qué debería ocurrir:**
- Se muestra una lista de **8 integraciones** disponibles.
- Todas aparecen en estado **desconectado**.
- Los botones **Conectar** aparecen **deshabilitados**.

**Nota:** las integraciones no se pueden activar desde la interfaz porque requieren configurar **API keys externas** para cada servicio (ver sección 17). Esta sección está preparada visualmente para cuando las credenciales estén disponibles.

---

## 14. Cerrar sesión

**Dónde hacer clic:**
- Abra el menú de perfil (clic en avatar) y seleccione **Cerrar sesión** al pie del menú.

**Qué debería ocurrir:**
- La sesión se cierra de forma segura.
- Se limpia la caché local (sessionStorage y localStorage).
- El navegador le redirige a la pantalla de **Login**.

**Cómo saber que funcionó:**
- Ve la pantalla de login.
- Si intenta volver atrás con el botón del navegador, no accede al Dashboard sin volver a autenticarse.

---

## 15. Funciones en modo demo

Las siguientes funciones se muestran con datos de demostración y están claramente etiquetadas:

| Función | Ubicación | Estado |
|---|---|---|
| Facturación | Settings > Billing | Vista demo etiquetada (plan, precio, estado de ejemplo) |
| Notificaciones del topbar | Campana en la barra superior | Datos mock (simulados) |

**Por qué existen las demos:** permiten visualizar la experiencia objetivo antes de conectar los servicios externos correspondientes. No representan datos reales del usuario.

---

## 16. Navegación con teclado y accesibilidad

- **Escape:** cierra el menú de perfil y los diálogos desplegables.
- **Flechas (↑ ↓):** navegan entre las opciones del menú de perfil cuando está abierto.
- **Tab:** recorre los elementos interactivos de cada sección de configuración.
- **Anillos de foco visibles:** al navegar con Tab, los elementos enfocados muestran un anillo de foco visible.
- **Roles ARIA:** los menús y secciones usan roles ARIA apropiados para lectores de pantalla.

---

## 17. Configuración externa necesaria por sección

Cada sección de configuración puede requerir un servicio externo para funcionar al 100%. Resumen:

| Sección | Servicio externo necesario | Estado actual |
|---|---|---|
| Facturación (Billing) | **Stripe** (procesamiento de pagos) | No configurado — vista demo visible |
| Avatar (Profile) | **Supabase Storage** (almacenamiento de imágenes) | No configurado — avatar se muestra sin carga de imagen real |
| Invitaciones (Team) | **Servidor de correo electrónico** (envío de invitaciones) | No configurado — botón deshabilitado |
| Integraciones | **API keys externas** de cada servicio (8 integraciones) | No configurado — botones de conectar deshabilitados |

**Implicación:** las secciones que no requieren configuración externa (perfil, organización, API keys, seguridad, notificaciones) funcionan completamente hoy. Las que sí la requieren muestran una interfaz lista y un estado claro ("Configuración necesaria" o vista demo) para que se activen en cuanto se provean las credenciales.

---

## Resumen rápido

| Sección | ¿Funciona hoy? | Requiere config. externa |
|---|---|---|
| Mi perfil | Sí | Avatar: Supabase Storage |
| Organización | Sí (editar: owner/admin) | No |
| Equipo | Sí (ver, roles, eliminar) | Invitaciones: servidor de correo |
| Facturación | Vista demo | Sí: Stripe |
| API Keys | Sí (crear y revocar) | No |
| Seguridad | Sí (contraseña, correo, sesiones) | MFA: pendiente de desarrollo |
| Notificaciones | Sí (8 canales, security_alerts obligatorio) | No |
| Integraciones | UI lista, botones deshabilitados | Sí: API keys externas |
| Cerrar sesión | Sí | No |

---

*Fin de la guía de experiencia de usuario.*
