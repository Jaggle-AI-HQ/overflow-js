// Server-side exports for Next.js (API routes, middleware, server components)

import type {
  Breadcrumb,
  OverflowEvent,
  OverflowOptions,
  Level,
  UserContext,
} from "@jaggle-ai/overflow-browser";

export type { OverflowOptions, OverflowEvent, Level };

const SDK_NAME = "overflow-nextjs";
const SDK_VERSION = "0.1.0";

export interface ServerOptions extends OverflowOptions {
  /** Automatically capture errors in API routes. Default: true */
  autoInstrumentApiRoutes?: boolean;
}

class ServerScope {
  private tags: Record<string, string> = {};
  private contexts: Record<string, unknown> = {};
  private user: UserContext | undefined;
  private fingerprint: string[] = [];
  private breadcrumbs: Breadcrumb[] = [];
  private maxBreadcrumbs: number;

  constructor(maxBreadcrumbs = 100) {
    this.maxBreadcrumbs = maxBreadcrumbs;
  }

  setTag(key: string, value: string): void {
    this.tags[key] = value;
  }

  setTags(tags: Record<string, string>): void {
    Object.assign(this.tags, tags);
  }

  setContext(key: string, value: unknown): void {
    this.contexts[key] = value;
  }

  setUser(user: UserContext | undefined): void {
    this.user = user;
  }

  setFingerprint(fingerprint: string[]): void {
    this.fingerprint = fingerprint;
  }

  addBreadcrumb(breadcrumb: Breadcrumb): void {
    this.breadcrumbs.push({
      ...breadcrumb,
      timestamp: breadcrumb.timestamp || new Date().toISOString(),
    });
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
    }
  }

  clear(): void {
    this.tags = {};
    this.contexts = {};
    this.user = undefined;
    this.fingerprint = [];
    this.breadcrumbs = [];
  }

  /** Apply scope data to an event (scope values don't override event values). */
  applyToEvent(event: OverflowEvent): void {
    if (Object.keys(this.tags).length > 0) {
      event.tags = { ...this.tags, ...event.tags };
    }
    if (Object.keys(this.contexts).length > 0) {
      event.contexts = { ...this.contexts, ...event.contexts };
    }
    if (this.user && !event.user) {
      event.user = { ...this.user };
    }
    if (
      this.fingerprint.length > 0 &&
      (!event.fingerprint || event.fingerprint.length === 0)
    ) {
      event.fingerprint = [...this.fingerprint];
    }
    if (this.breadcrumbs.length > 0) {
      event.breadcrumbs = [...this.breadcrumbs, ...(event.breadcrumbs || [])];
    }
  }
}

// ---------------------------------------------------------------------------
// Server-side Transaction / Span interfaces
// ---------------------------------------------------------------------------

interface ServerTransaction {
  name: string;
  op: string;
  traceId: string;
  spanId: string;
  status: string;
  startTime: number;
  spans: ServerSpan[];
  setTag(key: string, value: string): void;
  setData(key: string, value: unknown): void;
  setHttpStatus(code: number): void;
  setStatus(status: string): void;
  startChild(op: string, description?: string): ServerSpan;
  finish(): Promise<void>;
}

interface ServerSpan {
  spanId: string;
  parentSpanId: string;
  op: string;
  description?: string;
  status: string;
  startTime: number;
  setTag(key: string, value: string): void;
  setData(key: string, value: unknown): void;
  setStatus(status: string): void;
  finish(): void;
}

// ---------------------------------------------------------------------------
// Server Client
// ---------------------------------------------------------------------------

interface ServerClient {
  options: ServerOptions;
  scope: ServerScope;
  captureException(error: Error | unknown): Promise<string>;
  captureMessage(message: string, level?: Level): Promise<string>;
  addBreadcrumb(breadcrumb: Breadcrumb): void;
  setTag(key: string, value: string): void;
  setTags(tags: Record<string, string>): void;
  setUser(user: UserContext | undefined): void;
  setContext(key: string, value: unknown): void;
  setFingerprint(fingerprint: string[]): void;
  configureScope(callback: (scope: ServerScope) => void): void;
  startTransaction(name: string, op: string): ServerTransaction | null;
}

let serverClient: ServerClient | null = null;

/** Initialize the Overflow SDK for the Next.js server side. */
export function initServer(options: ServerOptions): ServerClient {
  serverClient = createServerClient(options);
  return serverClient;
}

/** Get the server client instance. */
export function getServerClient(): ServerClient | null {
  return serverClient;
}

/** Capture an exception on the server. */
export async function captureException(
  error: Error | unknown,
): Promise<string> {
  if (!serverClient) return "";
  return serverClient.captureException(error);
}

/** Capture a message on the server. */
export async function captureMessage(
  message: string,
  level: Level = "info",
): Promise<string> {
  if (!serverClient) return "";
  return serverClient.captureMessage(message, level);
}

/** Add a breadcrumb to the server scope. */
export function addBreadcrumb(breadcrumb: Breadcrumb): void {
  serverClient?.addBreadcrumb(breadcrumb);
}

/** Set a tag on the server scope. */
export function setTag(key: string, value: string): void {
  serverClient?.setTag(key, value);
}

/** Set multiple tags on the server scope. */
export function setTags(tags: Record<string, string>): void {
  serverClient?.setTags(tags);
}

/** Set user context on the server scope. Pass undefined to clear. */
export function setUser(user: UserContext | undefined): void {
  serverClient?.setUser(user);
}

/** Set a named context on the server scope. */
export function setContext(key: string, value: unknown): void {
  serverClient?.setContext(key, value);
}

/** Override automatic fingerprinting for issue grouping. */
export function setFingerprint(fingerprint: string[]): void {
  serverClient?.setFingerprint(fingerprint);
}

/** Configure the server scope via a callback. */
export function configureScope(callback: (scope: ServerScope) => void): void {
  serverClient?.configureScope(callback);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateHexId(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Extract a stack trace from a Node.js Error. */
function extractServerStacktrace(err: Error): OverflowEvent["exception"] {
  const values: Array<{
    type: string;
    value: string;
    stacktrace?: { frames: Array<Record<string, unknown>> };
  }> = [];

  const frames: Array<Record<string, unknown>> = [];
  if (err.stack) {
    const lines = err.stack.split("\n").slice(1); // skip first line (message)
    for (const line of lines) {
      const match = line.match(/^\s+at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?$/);
      if (match) {
        const fnName = match[1] || "<anonymous>";
        const filename = match[2];
        const lineno = parseInt(match[3], 10);
        const colno = parseInt(match[4], 10);

        let moduleName: string | undefined;
        let funcName = fnName;
        const dotIdx = fnName.lastIndexOf(".");
        if (dotIdx !== -1) {
          moduleName = fnName.slice(0, dotIdx);
          funcName = fnName.slice(dotIdx + 1);
        }

        frames.push({
          module: moduleName,
          function: funcName,
          filename,
          lineno,
          colno,
          abs_path: filename,
          in_app: !filename.includes("node_modules"),
        });
      }
    }
  }

  frames.reverse();

  values.push({
    type: err.name || "Error",
    value: err.message,
    stacktrace: frames.length > 0 ? { frames } : undefined,
  });

  return { values };
}

function createServerSpan(
  op: string,
  parentSpanId: string,
  description?: string,
): ServerSpan {
  const tags: Record<string, string> = {};
  const data: Record<string, unknown> = {};
  const span: ServerSpan = {
    spanId: generateHexId(8),
    parentSpanId,
    op,
    description,
    status: "ok",
    startTime: performance.now(),
    setTag(key: string, value: string) {
      tags[key] = value;
    },
    setData(key: string, value: unknown) {
      data[key] = value;
    },
    setStatus(status: string) {
      span.status = status;
    },
    finish() {
      (span as any)._endTime = performance.now();
    },
  };
  (span as any)._tags = tags;
  (span as any)._data = data;
  return span;
}

function createServerClient(options: ServerOptions): ServerClient {
  const isNoop = !options.dsn;
  const dsn = isNoop ? null : parseDSNServer(options.dsn);
  const scope = new ServerScope(options.maxBreadcrumbs ?? 100);
  const sampleRate = options.sampleRate ?? 1.0;

  if (isNoop && options.debug) {
    console.debug(
      "[overflow] DSN is empty, server client will operate in no-op mode",
    );
  }

  if (options.defaultTags) {
    scope.setTags(options.defaultTags);
  }

  async function sendEvent(event: OverflowEvent): Promise<string> {
    if (isNoop || !dsn) return event.event_id || "";

    // Apply scope
    scope.applyToEvent(event);

    // Apply client options
    if (options.environment && !event.environment) {
      event.environment = options.environment;
    }
    if (options.release && !event.release) {
      event.release = options.release;
    }
    if (options.serverName && !event.server_name) {
      event.server_name = options.serverName;
    }

    // Sample rate
    if (sampleRate < 1.0 && Math.random() > sampleRate) {
      return "";
    }

    // BeforeSend hook
    if (options.beforeSend) {
      const modified = options.beforeSend(event);
      if (!modified) return "";
      event = modified;
    }

    if (options.debug) {
      console.debug("[overflow] sending server event", event.event_id);
    }

    return sendServerEvent(dsn, event, options.debug);
  }

  return {
    options,
    scope,

    async captureException(error: Error | unknown): Promise<string> {
      const err = error instanceof Error ? error : new Error(String(error));
      const event = buildServerEvent(options);
      event.level = "error";
      event.message = err.message;
      event.exception = extractServerStacktrace(err);
      return sendEvent(event);
    },

    async captureMessage(
      message: string,
      level: Level = "info",
    ): Promise<string> {
      const event = buildServerEvent(options);
      event.level = level;
      event.message = message;
      return sendEvent(event);
    },

    addBreadcrumb(breadcrumb: Breadcrumb): void {
      scope.addBreadcrumb(breadcrumb);
    },

    setTag(key: string, value: string): void {
      scope.setTag(key, value);
    },

    setTags(tags: Record<string, string>): void {
      scope.setTags(tags);
    },

    setUser(user: UserContext | undefined): void {
      scope.setUser(user);
    },

    setContext(key: string, value: unknown): void {
      scope.setContext(key, value);
    },

    setFingerprint(fingerprint: string[]): void {
      scope.setFingerprint(fingerprint);
    },

    configureScope(callback: (scope: ServerScope) => void): void {
      callback(scope);
    },

    startTransaction(name: string, op: string): ServerTransaction | null {
      if (isNoop) return null;
      const rate = options.tracesSampleRate ?? 0;
      if (rate <= 0) return null;
      if (rate < 1.0 && Math.random() > rate) return null;

      const tags: Record<string, string> = {};
      const data: Record<string, unknown> = {};
      const spans: ServerSpan[] = [];
      const traceId = generateHexId(16);
      const spanId = generateHexId(8);
      const startTime = performance.now();
      const startDate = new Date();

      const txn: ServerTransaction = {
        name,
        op,
        traceId,
        spanId,
        status: "ok",
        startTime,
        spans,
        setTag(key: string, value: string) {
          tags[key] = value;
        },
        setData(key: string, value: unknown) {
          data[key] = value;
        },
        setHttpStatus(code: number) {
          (txn as any)._httpStatusCode = code;
          if (code >= 500) txn.status = "error";
        },
        setStatus(status: string) {
          txn.status = status;
        },
        startChild(childOp: string, description?: string): ServerSpan {
          const span = createServerSpan(childOp, spanId, description);
          spans.push(span);
          return span;
        },
        async finish(): Promise<void> {
          const endDate = new Date();

          // Auto-finish unfinished spans
          for (const s of spans) {
            if (!(s as any)._endTime) s.finish();
          }

          const envelope = {
            type: "transaction",
            trace_id: traceId,
            span_id: spanId,
            transaction: name,
            op,
            status: txn.status,
            http_method: (txn as any)._httpMethod,
            http_status_code: (txn as any)._httpStatusCode,
            start_timestamp: startDate.toISOString(),
            timestamp: endDate.toISOString(),
            environment: options.environment,
            release: options.release,
            server_name: options.serverName,
            platform: "node",
            tags: Object.keys(tags).length > 0 ? tags : undefined,
            data: Object.keys(data).length > 0 ? data : undefined,
            sdk: { name: SDK_NAME, version: SDK_VERSION },
            spans: spans.map((s) => ({
              span_id: s.spanId,
              parent_span_id: s.parentSpanId,
              op: s.op,
              description: s.description,
              status: s.status,
              start_offset_ms: s.startTime - startTime,
              duration_ms:
                ((s as any)._endTime || performance.now()) - s.startTime,
              tags:
                Object.keys((s as any)._tags || {}).length > 0
                  ? (s as any)._tags
                  : undefined,
              data:
                Object.keys((s as any)._data || {}).length > 0
                  ? (s as any)._data
                  : undefined,
            })),
          };

          if (dsn) {
            if (options.debug) {
              console.debug("[overflow] sending transaction", traceId, name);
            }
            await sendServerRaw(dsn, envelope, options.debug);
          }
        },
      };

      return txn;
    },
  };
}

function buildServerEvent(options: ServerOptions): OverflowEvent {
  return {
    event_id: crypto.randomUUID(),
    platform: "node",
    timestamp: new Date().toISOString(),
    sdk: { name: SDK_NAME, version: SDK_VERSION },
  };
}

interface ParsedDSN {
  endpoint: string;
}

function parseDSNServer(dsn: string): ParsedDSN {
  const url = new URL(dsn);
  const publicKey = url.username;
  if (!publicKey) {
    throw new Error("[overflow] DSN missing public key");
  }
  url.username = "";
  url.password = "";
  const host = url.toString().replace(/\/$/, "");
  return { endpoint: `${host}/${publicKey}/store` };
}

async function sendServerEvent(
  dsn: ParsedDSN,
  event: OverflowEvent,
  debug?: boolean,
): Promise<string> {
  try {
    await fetch(dsn.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": `${SDK_NAME}/${SDK_VERSION}`,
      },
      body: JSON.stringify(event),
    });
  } catch (err) {
    if (debug) {
      console.debug("[overflow] failed to send server event", err);
    }
  }
  return event.event_id || "";
}

async function sendServerRaw(
  dsn: ParsedDSN,
  payload: unknown,
  debug?: boolean,
): Promise<void> {
  try {
    await fetch(dsn.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": `${SDK_NAME}/${SDK_VERSION}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    if (debug) {
      console.debug("[overflow] failed to send server payload", err);
    }
  }
}

/** Start a server-side performance transaction. Call .finish() to send it.
 *  Requires tracesSampleRate > 0 in server options. */
export function startTransaction(
  name: string,
  op: string,
): ServerTransaction | null {
  if (!serverClient) return null;
  return serverClient.startTransaction(name, op);
}

/** Flatten request headers to a simple key-value map. */
function flattenHeaders(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

/**
 * Wraps a Next.js API route handler to automatically capture errors
 * and create performance transactions.
 *
 * ```ts
 * // app/api/users/route.ts
 * import { withOverflow } from "@jaggle-ai/overflow-nextjs";
 *
 * export const GET = withOverflow(async (request) => {
 *   const users = await db.getUsers();
 *   return Response.json(users);
 * });
 * ```
 */
export function withOverflow<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
): T {
  return (async (...args: Parameters<T>): Promise<Response> => {
    const req = args[0] as Request | undefined;

    if (serverClient && req) {
      const url = new URL(req.url);
      serverClient.addBreadcrumb({
        type: "http",
        category: "request",
        message: `${req.method} ${url.pathname}`,
        data: {
          method: req.method,
          url: req.url,
        },
        level: "info",
      });
    }

    const txn =
      serverClient && req
        ? serverClient.startTransaction(
            `${req.method} ${new URL(req.url).pathname}`,
            "http.server",
          )
        : null;

    if (txn && req) {
      txn.setTag("http.method", req.method);
      txn.setTag("http.url", new URL(req.url).pathname);
      (txn as any)._httpMethod = req.method;
    }

    try {
      const response = await handler(...args);
      if (txn) {
        txn.setHttpStatus(response.status);
        await txn.finish();
      }
      return response;
    } catch (error) {
      if (serverClient && req) {
        // Capture exception with request context
        const err = error instanceof Error ? error : new Error(String(error));
        const event = buildServerEvent(serverClient.options);
        event.level = "error";
        event.message = err.message;
        event.exception = extractServerStacktrace(err);
        event.request = {
          method: req.method,
          url: req.url,
          headers: flattenHeaders(req.headers),
        };

        // Apply scope + options + beforeSend + sampleRate via the client
        // We go through the client's captureException-equivalent flow manually
        // since we need to attach request data before scope application
        serverClient.scope.applyToEvent(event);
        if (serverClient.options.environment && !event.environment) {
          event.environment = serverClient.options.environment;
        }
        if (serverClient.options.release && !event.release) {
          event.release = serverClient.options.release;
        }
        if (serverClient.options.serverName && !event.server_name) {
          event.server_name = serverClient.options.serverName;
        }

        const sr = serverClient.options.sampleRate ?? 1.0;
        if (sr >= 1.0 || Math.random() <= sr) {
          let finalEvent: OverflowEvent | null = event;
          if (serverClient.options.beforeSend) {
            finalEvent = serverClient.options.beforeSend(event);
          }
          if (finalEvent) {
            const dsn = parseDSNServer(serverClient.options.dsn);
            await sendServerEvent(dsn, finalEvent, serverClient.options.debug);
          }
        }
      } else if (serverClient) {
        await serverClient.captureException(error);
      }

      if (txn) {
        txn.setStatus("error");
        txn.setHttpStatus(500);
        await txn.finish();
      }
      throw error;
    }
  }) as T;
}
