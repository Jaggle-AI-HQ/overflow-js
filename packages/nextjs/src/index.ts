// Server-side exports for Next.js (API routes, middleware, server components)

import type {
  OverflowEvent,
  OverflowOptions,
  Level,
} from "@jaggle-ai/overflow-browser";

export type { OverflowOptions, OverflowEvent, Level };

const SDK_NAME = "overflow-nextjs";
const SDK_VERSION = "0.1.0";

export interface ServerOptions extends OverflowOptions {
  /** Automatically capture errors in API routes. Default: true */
  autoInstrumentApiRoutes?: boolean;
}

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

interface ServerClient {
  options: ServerOptions;
  captureException(error: Error | unknown): Promise<string>;
  captureMessage(message: string, level?: Level): Promise<string>;
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

function generateHexId(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
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
  const dsn = parseDSNServer(options.dsn);

  return {
    options,

    async captureException(error: Error | unknown): Promise<string> {
      const err = error instanceof Error ? error : new Error(String(error));
      const event = buildServerEvent(options);
      event.level = "error";
      event.message = err.message;
      event.exception = {
        values: [
          {
            type: err.name || "Error",
            value: err.message,
          },
        ],
      };
      return sendServerEvent(dsn, event);
    },

    async captureMessage(
      message: string,
      level: Level = "info",
    ): Promise<string> {
      const event = buildServerEvent(options);
      event.level = level;
      event.message = message;
      return sendServerEvent(dsn, event);
    },

    startTransaction(name: string, op: string): ServerTransaction | null {
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
          (txn as any)._httpMethod = (txn as any)._httpMethod || undefined;
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

          await sendServerRaw(dsn, envelope);
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
    environment: options.environment,
    release: options.release,
    server_name: options.serverName,
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
): Promise<string> {
  try {
    await fetch(dsn.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
  } catch {
    // Silently drop failed sends on the server
  }
  return event.event_id || "";
}

async function sendServerRaw(dsn: ParsedDSN, payload: unknown): Promise<void> {
  try {
    await fetch(dsn.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Silently drop failed sends on the server
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

/**
 * Wraps a Next.js API route handler to automatically capture errors.
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
    const txn =
      serverClient && req
        ? serverClient.startTransaction(
            `${req.method} ${new URL(req.url).pathname}`,
            "http.server",
          )
        : null;

    try {
      const response = await handler(...args);
      if (txn) {
        txn.setHttpStatus(response.status);
        await txn.finish();
      }
      return response;
    } catch (error) {
      if (serverClient) {
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
