// ─── Route registry — in-memory pattern matching ───────────────────────────────

import type { IRouteRegistry, HttpHandler } from '../interfaces/HttpInterfaces';

interface RegisteredRoute {
  method:   string;
  pattern:  string;       // e.g. "/api/v1/executions/:executionId"
  segments: string[];     // split by "/"
  handler:  HttpHandler;
}

export class RouteRegistry implements IRouteRegistry {
  private readonly routes: RegisteredRoute[] = [];

  register(method: string, path: string, handler: HttpHandler): void {
    const segments = path.split('/').filter(Boolean);
    this.routes.push({ method: method.toUpperCase(), pattern: path, segments, handler });
  }

  match(method: string, path: string): { handler: HttpHandler; params: Record<string, string> } | null {
    const reqSegments = path.split('/').filter(Boolean);
    for (const route of this.routes) {
      if (route.method !== method.toUpperCase()) continue;
      if (route.segments.length !== reqSegments.length) continue;
      const params: Record<string, string> = {};
      let matched = true;
      for (let i = 0; i < route.segments.length; i++) {
        const routeSeg = route.segments[i];
        const reqSeg = reqSegments[i];
        if (routeSeg.startsWith(':')) {
          params[routeSeg.slice(1)] = decodeURIComponent(reqSeg);
        } else if (routeSeg !== reqSeg) {
          matched = false;
          break;
        }
      }
      if (matched) return { handler: route.handler, params };
    }
    return null;
  }

  list(): { method: string; path: string }[] {
    return this.routes.map(r => ({ method: r.method, path: r.pattern }));
  }
}
