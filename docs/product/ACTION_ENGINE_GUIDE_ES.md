# Guía del Action Engine

## Visión General

El Action Engine es la primera fase de ejecución de CompilerAI. Transforma cualquier oportunidad detectada por la IA en una acción ejecutable, trazable y medible. Cada acción mantiene el vínculo con la oportunidad original, tiene un historial completo de cambios, permite comentarios colaborativos, asignación de responsables y notificaciones automáticas.

## Flujo Completo

1. **Detección** — El motor de análisis detecta oportunidades a partir de los datos conectados.
2. **Conversión** — El usuario convierte una oportunidad en acción desde la tarjeta de oportunidad (botón "Convertir en acción") o desde el menú de acciones extendidas.
3. **Asignación** — Se asigna un responsable desde el Action Center o desde el modal de detalle.
4. **Ejecución** — El responsable actualiza el progreso (0-100%) y cambia el estado según avanza.
5. **Completación** — Al alcanzar 100% o cambiar el estado a "Completada", se registra la fecha de finalización.
6. **Auditoría** — Cada cambio de estado, asignación, prioridad o progreso queda registrado en el historial.

## Estados de una Acción

| Estado | Descripción | Transiciones permitidas |
|--------|-------------|------------------------|
| Draft | Borrador inicial | → Pending, → Cancelled |
| Pending | Pendiente de asignación | → Assigned, → In Progress, → Cancelled |
| Assigned | Asignada a un responsable | → In Progress, → Blocked, → Cancelled |
| In Progress | En ejecución | → Blocked, → Completed, → Cancelled |
| Blocked | Bloqueada por dependencias | → In Progress, → Cancelled |
| Completed | Completada | (final) |
| Cancelled | Cancelada | (final) |

Cada transición queda auditada en `action_history` con usuario, fecha, estado anterior, estado nuevo y comentario opcional.

## Priorización

La prioridad de una acción se calcula a partir de:
- **Impacto** (high/medium/low) — efecto esperado en el negocio
- **Urgencia** (high/medium/low) — tiempo disponible
- **ROI esperado** — retorno de inversión estimado
- **Esfuerzo** (high/medium/low) — recursos necesarios
- **Riesgo** (high/medium/low) — probabilidad de fracaso
- **Dependencias** — acciones que deben completarse primero

El motor recalcula automáticamente la prioridad cuando cambian el impacto o la urgencia.

## Detección de Bloqueos

El Action Engine detecta automáticamente:
- Dependencias no completadas
- Acciones sin progreso registrado
- Fechas límite vencidas

Los bloqueos se muestran en el dashboard del Action Center como una alerta visible.

## Notificaciones

El sistema genera notificaciones automáticas cuando:
- Se crea una acción
- Cambia la prioridad
- Cambia el responsable
- Se completa una acción
- Se bloquea una acción

Las notificaciones son personales (cada usuario ve solo las suyas) y se pueden marcar como leídas individualmente o en lote.

## Backend

### Tablas

| Tabla | Propósito |
|-------|-----------|
| `action_plans` | Entidad principal de la acción |
| `action_history` | Auditoría completa de cambios |
| `action_comments` | Comentarios colaborativos |
| `action_assignments` | Historial de asignaciones |
| `action_notifications` | Notificaciones in-app |

### Seguridad (RLS)

Todas las tablas tienen RLS habilitado:
- **SELECT**: Cualquier miembro de la organización puede ver las acciones.
- **INSERT**: Miembros con rol owner, admin o member pueden crear acciones.
- **UPDATE**: Cualquier miembro puede actualizar (cambiar estado, progreso, etc.).
- **DELETE**: Solo el owner puede eliminar acciones.
- **Notificaciones**: Cada usuario solo ve y actualiza sus propias notificaciones.

El aislamiento entre organizaciones se garantiza verificando membresía via `memberships`.
