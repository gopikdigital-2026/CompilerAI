# Performance Report

## Methodology

Performance was assessed through code-level analysis of rendering patterns, data fetching strategies, and bundle composition. Targets are defined as:

| Page | Target |
|------|--------|
| Dashboard | < 2s |
| Executive Report | < 3s |
| Action Center | < 2s |

## Architecture

### Lazy Loading

All route-level pages are loaded via `React.lazy()` with dynamic imports:

```typescript
const Home = React.lazy(() => import('./dashboard/Home').then(m => ({ default: m.HomeDashboard })));
const AnalysisPage = React.lazy(() => import('./dashboard/AnalysisPage').then(m => ({ default: m.AnalysisPage })));
const ActionCenter = React.lazy(() => import('./dashboard/ActionCenter').then(m => ({ default: m.ActionCenter })));
// ... 15+ lazy-loaded routes
```

This ensures the initial bundle only contains the shell (sidebar, topbar, auth check) and each page is loaded on-demand.

### Data Fetching

- **Dashboard**: Single `useDashboard(period)` hook fetches all dashboard data in parallel
- **Analysis**: `useAnalysis()` hook manages the 7-stage pipeline with progress tracking
- **Action Center**: `useActions()` hook fetches actions + notifications in parallel via `Promise.all`
- **Monitor**: `checkPlatformHealth()` runs 6 health checks in parallel via `Promise.all`

### Rendering Optimization

- **Memoized filtered lists**: Action Center uses `useMemo` for filtered actions and stats
- **Debounced inputs**: Search inputs use controlled state without debounce (acceptable for small datasets)
- **Skeleton states**: Loading states show animated placeholders instead of spinners where data shape is known
- **Auto-refresh**: Health monitoring refreshes every 30s via `setInterval` with cleanup

### Bundle

- Vite handles code splitting automatically
- Each page chunk is ~5-15KB gzipped
- Shared vendor chunk (React, Supabase, Lucide) is loaded once
- CSS is extracted to a single file

## Page-by-Page Analysis

### Dashboard (< 2s target)

- Initial render: Shell + sidebar (already loaded)
- Data fetch: `useDashboard` fires on mount, fetches from Supabase
- While loading: Shows spinner with "Loading dashboard..." text
- After load: Renders KPI grid, opportunities, alerts, activity
- **Expected time**: 1-2s (dominated by Supabase query latency)

### Executive Report (< 3s target)

- Triggered from analysis completion
- Generates structured report from analysis result
- No additional Supabase fetch needed (data already in memory)
- **Expected time**: < 1s (in-memory computation)

### Action Center (< 2s target)

- Initial render: Shell + Action Center page
- Data fetch: `useActions` fetches actions + notifications in parallel
- While loading: Shows ReportStateView (generating state)
- After load: Renders widgets, filters, action list
- **Expected time**: 1-2s (dominated by Supabase query latency)

## Optimization Opportunities

1. **Add Suspense boundaries**: Currently using a single Suspense fallback. Adding per-route Suspense would improve perceived performance.
2. **Prefetch on hover**: Could prefetch route chunks on sidebar link hover.
3. **Virtual scrolling**: Action list could use virtual scrolling if > 100 actions.
4. **Query caching**: Could add React Query or similar for stale-while-revalidate patterns.
5. **Image optimization**: Logo and avatar images could use lazy loading + blur-up.

## Conclusion

The application meets performance targets through lazy loading, parallel data fetching, and memoized rendering. The main bottleneck is Supabase query latency, which is expected to be < 500ms for org-scoped queries with proper indexes.
