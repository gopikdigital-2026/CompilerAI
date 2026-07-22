// ─── HTTP adapter interface ─────────────────────────────────────────────────────
// Framework-agnostic HTTP abstraction. Adapters for Express/Fastify/Hono can be built
// without coupling the API domain to any framework.

export interface HttpRequest {
  method:       string;
  path:         string;
  headers:      Record<string, string>;
  body:         unknown;
  query:        Record<string, string>;
  params:       Record<string, string>;
}

export interface HttpResponse {
  status:  number;
  headers: Record<string, string>;
  body:    unknown;
}

export interface HttpHandler {
  (req: HttpRequest, ctx: RequestContext): Promise<HttpResponse>;
}

export interface RequestContext {
  requestId:      string;
  correlationId:  string;
  organizationId: string | null;
  actorId:        string | null;
  roles:          string[];
  permissions:    string[];
  startTime:      number;
}

export interface IRouteRegistry {
  register(method: string, path: string, handler: HttpHandler): void;
  match(method: string, path: string): { handler: HttpHandler; params: Record<string, string> } | null;
  list(): { method: string; path: string }[];
}

export interface IHttpAdapter {
  listen(port: number): Promise<void>;
  close(): Promise<void>;
  handleRequest(req: HttpRequest): Promise<HttpResponse>;
}
