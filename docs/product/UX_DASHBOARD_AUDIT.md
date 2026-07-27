# UX Dashboard Audit

**Fecha:** 2026-07-27
**Sprint:** UX Sprint 2 — Dashboard Activation & Executive Clarity

---

## Resumen

El Dashboard anterior era enteramente mock: métricas hardcodeadas, agentes ficticios, workflows inventados. No había conexión a datos reales. Tras la auditoría, se ha reconstruido para usar datos reales de Supabase.

## Componentes auditados

| Componente | Ubicación | Propósito | Estado anterior | Estado actual | Fuente de datos |
|---|---|---|---|---|---|
| DashboardHeader | `Home.tsx` → `DashboardHeader.tsx` | Saludo, org, periodo, actualización | Hardcodeado ("Buenos días, Ana") | Operativo | `profiles.full_name`, `organizations.name` |
| ExecutiveSummary | Nuevo | Resumen ejecutivo de la situación | No existía | Operativo | Derivado de `execution_runs`, `compiler_sessions`, `prompt_sessions` |
| NextBestAction | Nuevo | Próxima mejor acción recomendada | No existía | Operativo | Derivado de conectores y ejecuciones |
| KpiGrid | `Home.tsx` → `KpiGrid.tsx` | Indicadores principales | Mock (4 métricas fijas) | Operativo | `execution_runs`, `compiler_sessions`, `workflow_designs`, `prompt_sessions`, `brain_decisions`, `memory_entries` |
| OpportunitiesSection | Nuevo | Oportunidades detectadas | No existía | Operativo con limitaciones | `brain_decisions` (tabla existe, uso aún parcial) |
| AlertsSection | Nuevo | Alertas y riesgos | No existía | Operativo | Derivado de `execution_runs` (errores, en curso) + conectores |
| AutomationsSection | `Home.tsx` → `AutomationsSection.tsx` | Automatizaciones | Mock (workflows ficticios) | Operativo con limitaciones | `workflow_designs` (estado, publicado/pausado) |
| ActivitySection | `Home.tsx` → `ActivitySection.tsx` | Actividad reciente | Mock (agentes ficticios) | Operativo | `execution_runs`, `compiler_sessions`, `prompt_sessions` |
| ConnectorsSection | Nuevo | Estado de conexión de datos | No existía | Configuración necesaria | N/A (sin conectores reales) |
| QuickActions | Nuevo | Acciones rápidas | No existía | Operativo | Navegación real |
| RunsChart | `Home.tsx` → `RunsChart.tsx` | Gráfico de ejecuciones | Mock (datos aleatorios) | Operativo | `execution_runs` agrupado por día |

## Clasificación de estado

| Estado | Componentes |
|---|---|
| **Operativo** | DashboardHeader, ExecutiveSummary, NextBestAction, KpiGrid, AlertsSection, ActivitySection, QuickActions, RunsChart |
| **Operativo con limitaciones** | OpportunitiesSection (brain_decisions existe pero uso parcial), AutomationsSection (sin ejecución real de nodos) |
| **Configuración necesaria** | ConnectorsSection (sin conectores reales) |
| **Modo demostración** | Ninguno (todos los datos son reales o derivados de datos reales) |
| **No conectado** | Ninguno |

## Fuentes de datos reales

| Tabla Supabase | Uso en Dashboard |
|---|---|
| `profiles` | Nombre del usuario para saludo |
| `organizations` | Nombre de organización, plan |
| `execution_runs` | KPIs (ejecuciones, éxito, errores), actividad, gráfico semanal, coste |
| `compiler_sessions` | KPI (análisis realizados), actividad |
| `prompt_sessions` | KPI (prompts optimizados), actividad |
| `workflow_designs` | KPI (workflows publicados), automatizaciones |
| `brain_decisions` | KPI (decisiones IA), oportunidades |
| `memory_entries` | KPI (memorias cognitivas) |

## Hallazgos clave

1. **Mock eliminado:** El Dashboard anterior mostraba "2 agentes con alertas" y métricas fijas. Ahora muestra datos reales de 7 tablas Supabase.
2. **Sin datos inventados:** Cada KPI muestra su fuente (`execution_runs`, `compiler_sessions`, etc.) en texto monoespaciado.
3. **Estimaciones etiquetadas:** El coste estimado lleva la etiqueta "Estimate" visible.
4. **Estados completos:** Loading, error, sin organización, primera visita (empty), y dashboard con datos.
5. **Conectores honestos:** 8 conectores listados, todos en estado "Configuración necesaria" — no se inventan conexiones.
