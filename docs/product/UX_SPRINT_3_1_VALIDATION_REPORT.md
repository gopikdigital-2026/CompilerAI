# UX Sprint 3.1 — AI Executive Report & Opportunity Intelligence

**Fecha:** 2026-07-27
**Sprint:** UX Sprint 3.1 — AI Executive Report & Health Score Engine

---

## Resumen

El resultado de un análisis ya no es una lista de métricas, sino un informe ejecutivo que ayuda a un CEO a decidir qué hacer en menos de 30 segundos. Se ha construido un motor de Health Score con 8 dimensiones ponderadas y un generador de informe ejecutivo que responde 5 preguntas clave.

## Componentes creados

### Health Score Engine (`healthScoreEngine.ts`)
Motor de puntuación que calcula el estado global de la empresa utilizando 8 dimensiones:

| Dimensión | Peso | Fuentes |
|---|---|---|
| Marketing | 12% | prompt_sessions |
| Ventas | 12% | execution_runs, compiler_sessions |
| Finanzas | 12% | organizations.plan, api_keys |
| Operaciones | 16% | execution_runs |
| SEO | 8% | (sin datos — requiere conexión) |
| Automatización | 16% | workflow_designs, execution_runs |
| Datos | 14% | compiler_sessions, execution_runs, prompt_sessions, connectors |
| Calidad de procesos | 10% | execution_runs.errors |

**Nunca usa valores fijos.** Cada puntuación se calcula con datos reales. El resultado incluye:
- Score 0-100
- Estado general (Excelente, Bueno, Regular, Limitado, Sin datos)
- Tendencia (Mejorando, Empeorando, Estable, Sin tendencia)
- Método de cálculo explicado
- Fuentes utilizadas
- Nivel de confianza

### Executive Report Generator
Genera un informe ejecutivo que responde:

1. **¿Qué ocurre?** — Estado general con fortalezas y debilidades
2. **¿Por qué ocurre?** — Explicación basada en dimensiones débiles y riesgos
3. **¿Qué impacto tiene?** — Oportunidades prioritarias con ROI estimado
4. **¿Qué deberíamos hacer?** — Acción inmediata y siguientes
5. **¿Qué pasará si no hacemos nada?** — Consecuencias de inacción

Incluye además:
- **Próxima mejor acción** — La acción más prioritaria
- **Impacto económico** — Estimación del impacto financiero
- **Tiempo de lectura** — ~2 minutos

### Data Quality Assessment
Evalúa la calidad de los datos disponibles:
- **Alta** — 20+ registros de 6+ fuentes
- **Media** — 10+ registros
- **Baja** — 3+ registros
- **Insuficiente** — Menos de 3 registros

Cuando los datos son insuficientes, muestra: "Información insuficiente para emitir una recomendación fiable."

### Executive Report Page (`ExecutiveReport.tsx`)
Página con:

1. **Cabecera ejecutiva** — Health Score con anillo visual, estado, tendencia, fecha, organización, duración, calidad de datos, nivel de confianza
2. **Próxima mejor acción e impacto económico** — Destacados en la cabecera
3. **Resumen ejecutivo IA** — 5 preguntas con respuestas y evidencia
4. **Fortalezas, Debilidades, Riesgos** — 3 columnas
5. **Health Score desglose** — 8 dimensiones expandibles con puntuación, peso, fuentes, confianza, descripción
6. **Oportunidades prioritarias** — Top 5 con prioridad, confianza, ROI y fuente

### Ruta automática
Cuando un análisis finaliza, la aplicación navega automáticamente a la página del informe ejecutivo.

## Evidencias

Cada conclusión muestra:
- **Fuente** — Tabla Supabase de origen
- **Fecha** — Momento del análisis
- **Calidad** — Alta, Media o Baja
- **Confianza** — Porcentaje 0-100%
- **Métrica utilizada** — Descripción del dato

Nunca se inventan evidencias. Si no hay datos suficientes, se muestra el mensaje explícito.

## Pruebas

### Unit Tests (18 tests — todos pasan)
- `healthScore.logic.test.ts` — Score 0-100, 8 dimensiones, pesos, tendencias, cálculo no fijo, fuentes, calidad de datos, informe ejecutivo, evidencia, datos insuficientes

### E2E Tests (9 tests)
- `executive-report.spec.ts` — Auto-navegación, Health Score visible, 5 preguntas, 8 dimensiones, próxima acción, fortalezas/debilidades/riesgos, evidencia, expansión, mobile

## Verificación

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS (~14s) |
| `npm run audit:functional-ui` | PASS (0 findings) |
| `npx vitest run healthScore` | PASS (18/18) |
