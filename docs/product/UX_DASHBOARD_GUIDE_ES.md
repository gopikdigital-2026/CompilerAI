# Guía del Dashboard de CompilerAI

**Versión:** UX Sprint 2
**Fecha:** 2026-07-27

---

## Qué muestra el Dashboard

El Dashboard es la pantalla principal de CompilerAI. Responde a cinco preguntas:

1. **¿Qué está conectado?** — Sección "Estado de conexión de datos"
2. **¿Qué está ocurriendo?** — KPIs, gráfico de ejecuciones, actividad reciente
3. **¿Qué ha detectado CompilerAI?** — Oportunidades detectadas
4. **¿Qué debería hacer ahora?** — Próxima mejor acción
5. **¿Qué resultados se han conseguido?** — KPIs y resumen ejecutivo

## De dónde sale cada dato

| Sección | Fuente de datos | Tabla Supabase |
|---|---|---|
| Saludo | Nombre del perfil | `profiles.full_name` |
| Nombre de organización | Organización activa | `organizations.name` |
| Análisis realizados | Conteo de sesiones | `compiler_sessions` |
| Ejecuciones | Conteo de runs | `execution_runs` |
| Tasa de éxito | Completadas / Total | `execution_runs.status` |
| Workflows publicados | Conteo | `workflow_designs.is_published` |
| Prompts optimizados | Conteo | `prompt_sessions` |
| Coste estimado | Suma de costes | `execution_runs.summary.totalCostUsd` |
| Decisiones de IA | Conteo | `brain_decisions` |
| Memorias cognitivas | Conteo | `memory_entries` |
| Gráfico semanal | Runs por día | `execution_runs.started_at` |
| Actividad reciente | Eventos ordenados por fecha | `execution_runs` + `compiler_sessions` + `prompt_sessions` |
| Oportunidades | Decisiones de IA | `brain_decisions` |
| Alertas | Errores y ejecuciones en curso | `execution_runs.status` |
| Automatizaciones | Workflows guardados | `workflow_designs` |
| Conectores | Estado de integración | N/A (sin conectores reales) |

## Qué es estimado

- **Coste estimado:** Derivado de `execution_runs.summary.totalCostUsd`. Etiquetado con "Estimate".

## Qué está en demo

- **Nada.** El Dashboard no usa datos demo. Si no hay datos, muestra estados vacíos honestos.

## Cómo iniciar un análisis

1. Pulsa "Analizar mi empresa" en Acciones rápidas.
2. Si no hay fuentes conectadas, se te dirigirá a Configuración → Integraciones.
3. Una vez conectadas las fuentes, CompilerAI generará análisis y oportunidades.

## Cómo revisar oportunidades

1. Ve a la sección "Oportunidades detectadas" en el Dashboard.
2. Cada oportunidad muestra título, descripción, impacto, confianza y prioridad.
3. Puedes ver detalle, aprobar o descartar cada oportunidad.

## Cómo interpretar alertas

- **Crítica (rojo):** Requiere atención inmediata. Visible sin scroll.
- **Alta (naranja):** Importante, revisar pronto.
- **Media (azul):** Informativa con acción recomendada.
- **Informativa (gris):** Solo información.

## Cómo abrir automatizaciones

1. Ve a "Automatizaciones" en el Dashboard.
2. Verás workflows activos y pausados.
3. Pulsa "Abrir Automation Studio" para gestionarlos.

## Cómo conectar datos

1. Ve a "Estado de conexión de datos" en el Dashboard.
2. Todos los conectores muestran "Configuración necesaria".
3. Pulsa "Conectar primera fuente".
4. Serás dirigido a Configuración → Integraciones.

## Cómo resolver errores

- Si el Dashboard muestra un error, pulsa "Reintentar".
- Si persiste, verifica tu conexión a internet y sesión.
- Los errores de ejecución aparecen en la sección de Alertas.
