# Beta Launch Checklist

## Pre-Launch (Must Pass)

### Build & Tests
- [ ] Build limpia: `npm run build` sin errores
- [ ] Typecheck: `npx tsc --noEmit` sin errores
- [ ] Lint: `npm run lint` sin errores
- [ ] Tests unitarios: `npx vitest run` — todos pasan
- [ ] Playwright E2E: `npx playwright test tests/e2e/beta-readiness.spec.ts tests/e2e/beta-ready.spec.ts` — todos pasan
- [ ] Auditoría funcional: `npm run audit:functional-ui` — 0 findings
- [ ] Sin TODO críticos en código
- [ ] Sin FIXME críticos en código

### Datos Demo
- [ ] Todas las páginas con datos simulados muestran etiqueta "Demo"
- [ ] Ningún dato demo se presenta como real
- [ ] Dashboard usa datos reales de Supabase
- [ ] Analysis usa datos reales de Supabase
- [ ] Action Center usa datos reales de Supabase
- [ ] Beta Readiness Dashboard usa datos reales de Supabase

### Seguridad
- [ ] RLS habilitado en todas las tablas (54+ tablas)
- [ ] Ningún usuario puede acceder a datos de otra organización
- [ ] Roles verificados: Owner, Admin, Member, Viewer
- [ ] JWT sessions funcionan correctamente
- [ ] Accesos directos por URL redirigen a login si no autenticado
- [ ] Sanitización de entradas activa (XSS prevention)
- [ ] Rate limiting activo en operaciones sensibles
- [ ] No se registra información sensible en logs

### Base de Datos
- [ ] Backup verificado antes del lanzamiento
- [ ] Migraciones aplicadas correctamente
- [ ] feature_flags table sembrada con defaults
- [ ] feedback table con RLS habilitado

### Variables de Entorno
- [ ] SUPABASE_URL configurado
- [ ] SUPABASE_ANON_KEY configurado
- [ ] SUPABASE_SERVICE_ROLE_KEY configurado (solo servidor)
- [ ] No hay secrets en código fuente
- [ ] No hay secrets en .env.production

### Feature Flags
- [ ] executive_report: enabled
- [ ] copilot: enabled
- [ ] opportunity_engine: enabled
- [ ] action_center: enabled
- [ ] connectors: enabled
- [ ] marketplace: disabled (no implementado para beta)

### Performance
- [ ] Dashboard carga en < 2s
- [ ] Executive Report genera en < 3s
- [ ] Action Center carga en < 2s
- [ ] Lazy loading en todas las rutas
- [ ] Code splitting activo
- [ ] Sin renders innecesarios

### UX
- [ ] Responsive en mobile (375px)
- [ ] Responsive en tablet (768px)
- [ ] Responsive en desktop (1440px)
- [ ] Sin scroll horizontal
- [ ] Skeletons en estados de carga
- [ ] Empty states con guía
- [ ] Mensajes de error visibles
- [ ] Mensajes de éxito visibles (toasts)
- [ ] Botón de feedback visible en todas las páginas

### Documentación
- [ ] BETA_LAUNCH_CHECKLIST.md (este documento)
- [ ] BETA_GUIDE_ES.md
- [ ] OPERATIONS_RUNBOOK.md
- [ ] INCIDENT_RESPONSE.md
- [ ] RELEASE_NOTES_BETA.md
- [ ] COMPILERAI_FUNCTIONAL_DOSSIER.md actualizado

## Post-Launch

### Monitor
- [ ] Beta Readiness Dashboard accesible y funcionando
- [ ] Platform Health en Monitor funcionando
- [ ] Observability capturando errores JS
- [ ] Logs estructurados registrando eventos
- [ ] Feedback llegando a la base de datos

### Primeras 24h
- [ ] Revisar errores críticos en dashboard
- [ ] Revisar feedback recibido
- [ ] Verificar que los usuarios pueden registrarse
- [ ] Verificar que los usuarios pueden crear análisis
- [ ] Verificar que el Action Center funciona

## Comando de Validación

```
npm run validate:beta-ready
```

Ejecuta: lint → typecheck → build → unit tests → Playwright → functional audit → security audit

## Criterio de Aceptación Final

✅ Todos los checkboxes anteriores marcados
✅ `npm run validate:beta-ready` pasa sin errores
✅ CI/CD beta-release.yml pasa sin errores
✅ La plataforma está lista para recibir usuarios reales
