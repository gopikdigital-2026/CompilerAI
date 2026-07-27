# Guía del Intelligence Engine de CompilerAI

**Versión:** UX Sprint 3
**Fecha:** 2026-07-27

---

## Qué es el Intelligence Engine

El Intelligence Engine es el núcleo de CompilerAI. Analiza tu empresa usando datos reales de tu actividad y genera oportunidades priorizadas con evidencia.

## Cómo iniciar un análisis

1. Ve al Dashboard y pulsa "Analizar mi empresa" en Acciones rápidas, o
2. Abre "Analizar" en el menú lateral izquierdo.
3. Pulsa "Iniciar análisis".

## Qué ocurre durante el análisis

El análisis pasa por 6 etapas:

1. **Preparando** — Inicializa el motor de análisis
2. **Validando organización** — Comprueba permisos y configuración
3. **Recopilando datos** — Lee datos de tablas Supabase
4. **Analizando con IA** — Procesa patrones y tendencias
5. **Generando oportunidades** — Identifica áreas de mejora
6. **Finalizando** — Calcula confianza y prioridades

Puedes cancelar en cualquier momento.

## Qué resultados obtienes

### Resumen ejecutivo
Estado general, fortalezas, riesgos y confianza del análisis.

### Áreas analizadas
7 áreas evaluadas con puntuación 0-100:
- Marketing, Ventas, Operaciones, Finanzas, Atención al cliente, Automatización, Tecnología

Cada área incluye puntuación, explicación, evidencia y acciones recomendadas.

### Oportunidades
Cada oportunidad incluye:
- Título y descripción
- Categoría y prioridad (Crítica, Alta, Media, Baja)
- Confianza (0-100%)
- Impacto y esfuerzo
- ROI estimado
- Fuente de datos
- Evidencia (datos utilizados, conector, limitaciones)

## Acciones sobre oportunidades

- **Aprobar** — Marca la oportunidad como aprobada
- **Descartar** — Elimina la oportunidad de la lista activa
- **Enviar al Copilot** — Envía el contexto completo al Copilot para análisis más profundo
- **Automatizar** — Envía la oportunidad a Automation Studio para crear un workflow
- **Ver detalle** — Abre un modal con toda la información

## De dónde sale cada dato

| Dato | Fuente Supabase |
|---|---|
| Sesiones de compilación | `compiler_sessions` |
| Ejecuciones | `execution_runs` |
| Workflows | `workflow_designs` |
| Prompts optimizados | `prompt_sessions` |
| Decisiones IA | `brain_decisions` |
| Memorias cognitivas | `memory_entries` |
| Miembros del equipo | `memberships` |
| Análisis guardados | `business_analyses` |
| Oportunidades | `business_opportunities` |

## Historial de análisis

Cada análisis se persiste en Supabase. Puedes:
- Ver análisis anteriores
- Abrir un análisis completo
- Eliminar análisis (con confirmación)

## Validación previa

Antes de iniciar un análisis, el sistema comprueba:
- Usuario autenticado
- Organización activa
- Permisos (owner o admin)

## Evidencia y transparencia

Cada recomendación incluye:
- Qué datos se utilizaron
- De qué conector provienen
- Fecha del análisis
- Nivel de confianza
- Limitaciones del análisis

No se generan afirmaciones sin respaldo.
