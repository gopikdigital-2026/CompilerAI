# Intelligence Engine Audit

**Fecha:** 2026-07-27
**Sprint:** UX Sprint 3 — Compiler Intelligence Engine & End-to-End Business Analysis

---

## Resumen

El Intelligence Engine de CompilerAI tenía 10 motores de IA completamente construidos pero nunca invocados. La tabla `brain_decisions` existía pero no se usaba. No existía un flujo de "Analizar mi empresa". Tras este sprint, se ha construido un flujo completo con persistencia real.

## Componentes auditados

| Componente | Propósito | Estado anterior | Estado actual |
|---|---|---|---|
| Compiler Intelligence Engine | Compilar prompts en Blueprints | Operativo con limitaciones (simulación local, sin LLM) | Operativo con limitaciones |
| ContextIntelligenceService | Analizar contexto empresarial | No conectado (construido, no invocado) | Operativo con limitaciones |
| IntentClassifier | Clasificar intenciones | Operativo (regex/heurísticas) | Operativo |
| Analysis Engine | Analizar empresa completa | No existía | Operativo |
| Opportunity Engine | Generar oportunidades | No existía | Operativo |
| AI Brain (decisions) | Visualizar decisiones IA | No conectado (100% mock) | Operativo con limitaciones |
| Copilot Integration | Enviar contexto al Copilot | No existía | Operativo con limitaciones |
| Automation Integration | Enviar a Automation Studio | No existía | Operativo con limitaciones |
| compiler_sessions | Persistir compilaciones | Operativo | Operativo |
| brain_decisions | Persistir decisiones IA | No conectado (tabla sin uso) | Operativo con limitaciones |
| business_analyses | Persistir análisis | No existía | Operativo (nueva tabla) |
| business_opportunities | Persistir oportunidades | No existía | Operativo (nueva tabla) |
| Prompt Intelligence | Optimizar prompts | Operativo con limitaciones (simulación) | Operativo con limitaciones |
| LLM Provider | Conectar IA real | No conectado | No conectado |

## Estado de componentes clave

### Analysis Engine (NUEVO)
- **Entradas:** Datos reales de 7 tablas Supabase (execution_runs, compiler_sessions, prompt_sessions, workflow_designs, brain_decisions, memory_entries, memberships)
- **Salidas:** AnalysisResult con resumen, fortalezas, riesgos, 7 áreas con puntuación, oportunidades priorizadas con evidencia
- **Estado:** Operativo
- **Persistencia:** Tabla `business_analyses` + `business_opportunities` con RLS

### Opportunity Engine (NUEVO)
- **Entradas:** Gaps detectados en datos reales (sin workflows, sin conectores, errores, etc.)
- **Salidas:** Oportunidades con título, descripción, categoría, prioridad, confianza, impacto, esfuerzo, ROI, fuente, evidencia
- **Acciones:** Aprobar, descartar, enviar al Copilot, automatizar, ver detalle
- **Persistencia:** Tabla `business_opportunities` con status persistente
- **Estado:** Operativo

### Copilot Integration (NUEVO)
- **Flujo:** Desde una oportunidad → "Enviar al Copilot" → status actualizado a `sent_to_copilot`
- **Contexto:** El Copilot recibe título, descripción, evidencia, fuente
- **Estado:** Operativo con limitaciones (Copilot aún en simulación)

### Automation Integration (NUEVO)
- **Flujo:** Desde una oportunidad → "Automatizar" → status actualizado a `automated`
- **Contexto:** Automation Studio recibe el contexto de la oportunidad
- **Estado:** Operativo con limitaciones (Automation Studio usa mocks)
