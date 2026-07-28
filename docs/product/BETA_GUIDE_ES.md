# Guía de Beta Privada — CompilerAI

## Bienvenido a CompilerAI Beta

Esta guía te ayudará a comenzar con CompilerAI, la plataforma de inteligencia empresarial que analiza tu negocio, detecta oportunidades y las convierte en acciones accionables.

## 1. Crear tu cuenta

1. Ve a la página de registro
2. Introduce tu nombre, email, contraseña y nombre de empresa
3. Tu organización se crea automáticamente al registrarte
4. Ya puedes acceder a la plataforma

## 2. Entender el panel principal (Dashboard)

El dashboard muestra:
- **KPIs principales**: análisis, ejecuciones, oportunidades, acciones
- **Próxima mejor acción**: sugerencia priorizada
- **Oportunidades detectadas**: lista de oportunidades de mejora
- **Alertas**: notificaciones importantes del sistema
- **Actividad reciente**: últimos eventos

## 3. Realizar tu primer análisis

1. Haz clic en "Analizar" en el menú lateral
2. Selecciona el tipo de análisis
3. El motor analizará 7 áreas de tu negocio:
   - Automatización
   - Tecnología
   - Operaciones
   - Finanzas
   - Atención al cliente
   - Marketing
   - Ventas
4. El análisis tarda aproximadamente 10-15 segundos
5. Al completar, verás un resumen ejecutivo con hallazgos

## 4. Revisar el Executive Report

Tras el análisis, puedes generar un Executive Report que incluye:
- Resumen ejecutivo
- Fortalezas y riesgos detectados
- Oportunidades priorizadas por impacto y esfuerzo
- Roadmap recomendado
- Puntuación de confianza del análisis

## 5. Explorar Opportunity Intelligence

La sección de oportunidades muestra:
- Matriz impacto-esfuerzo
- Filtros por categoría, impacto y esfuerzo
- Priorización automática
- Cada oportunidad incluye evidencia y recomendaciones

## 6. Crear acciones desde oportunidades

1. Ve a Opportunity Intelligence
2. Haz clic en "Convertir en acción" en cualquier oportunidad
3. La acción se crea con:
   - Título y descripción
   - Prioridad (crítica, alta, media, baja)
   - Impacto, urgencia, esfuerzo
   - ROI esperado
4. La acción aparece en el Action Center

## 7. Gestionar el Action Center

El Action Center es tu centro de trabajo:
- **Widgets**: acciones abiertas, críticas, completadas, ROI
- **Lista de acciones**: filtra por estado, prioridad, asignado
- **Ciclo de vida**: draft → pending → assigned → in_progress → completed
- **Historial**: cada cambio se registra
- **Comentarios**: colabora con tu equipo
- **Notificaciones**: recibe alertas de cambios

## 8. Monitorizar la plataforma

La página Monitor muestra:
- **Salud de servicios en tiempo real**: API, Base de datos, IA, etc.
- **Estado general**: Operativo, Degradado, Caído
- **Métricas históricas** (etiquetadas como Demo)

## 9. Beta Readiness Dashboard (Admin)

Si eres owner o admin, puedes acceder al panel de Beta Readiness:
- Estado de Supabase, OpenAI, Resend, Stripe, Conectores
- Errores críticos recientes
- Usuarios activos, análisis ejecutados, acciones totales
- Feature Flags: activa o desactiva módulos

## 10. Enviar feedback

En cada página encontrarás un botón "Enviar feedback" en la esquina inferior izquierda. Úsalo para reportar:
- **Bug**: algo no funciona correctamente
- **Idea**: una nueva funcionalidad que te gustaría
- **Mejora**: algo existente que podría ser mejor
- **UX**: problemas de usabilidad
- **Rendimiento**: la plataforma es lenta

Tu feedback se registra con tu usuario, la página donde estabas, y tu navegador.

## 11. Configuración (Settings)

En Settings puedes gestionar:
- **Perfil**: nombre, avatar, idioma
- **Organización**: nombre, plan, miembros
- **API Keys**: claves de acceso (solo owner/admin)
- **Seguridad**: sesiones activas, logout
- **Notificaciones**: preferencias

## Roles

| Rol | Permisos |
|-----|----------|
| Owner | Todo: CRUD, eliminar, gestionar miembros, API keys |
| Admin | CRUD, gestionar miembros, API keys (sin eliminar) |
| Member | CRUD en datos de la organización |
| Viewer | Solo lectura |

## Preguntas frecuentes

**¿Mis datos están seguros?**
Sí. Cada organización tiene sus datos aislados mediante Row Level Security (RLS) en la base de datos. Ningún usuario puede acceder a datos de otra organización.

**¿Los datos demo son reales?**
No. Las páginas con etiqueta "Demo" muestran datos simulados para demostrar la interfaz. Las páginas sin etiqueta muestran datos reales.

**¿Puedo desactivar un módulo?**
Sí, si eres admin puedes usar Feature Flags en el Beta Readiness Dashboard para activar o desactivar módulos sin necesidad de desplegar código nuevo.
