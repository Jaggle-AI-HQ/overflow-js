import type { SpanData, TransactionEnvelope } from "./types";
import type { Transport } from "./transport";
import { SDK_NAME, SDK_VERSION } from "./version";

function generateId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function generateTraceId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** A child span within a transaction. */
export class Span {
  readonly spanId: string;
  readonly parentSpanId: string;
  readonly op: string;
  description?: string;
  status: string = "ok";
  tags: Record<string, string> = {};
  data: Record<string, unknown> = {};

  private startTime: number;
  private endTime?: number;

  constructor(op: string, description?: string, parentSpanId?: string) {
    this.spanId = generateId();
    this.parentSpanId = parentSpanId || "";
    this.op = op;
    this.description = description;
    this.startTime = performance.now();
  }

  setTag(key: string, value: string): this {
    this.tags[key] = value;
    return this;
  }

  setData(key: string, value: unknown): this {
    this.data[key] = value;
    return this;
  }

  setStatus(status: string): this {
    this.status = status;
    return this;
  }

  finish(): void {
    this.endTime = performance.now();
  }

  /** Duration in ms, or 0 if not finished. */
  get durationMs(): number {
    if (this.endTime === undefined) return 0;
    return this.endTime - this.startTime;
  }

  /** Offset from a given start time in ms. */
  offsetFrom(txnStartTime: number): number {
    return this.startTime - txnStartTime;
  }

  toJSON(txnStartTime: number): SpanData {
    return {
      span_id: this.spanId,
      parent_span_id: this.parentSpanId || undefined,
      op: this.op,
      description: this.description,
      status: this.status,
      start_offset_ms: this.offsetFrom(txnStartTime),
      duration_ms: this.durationMs,
      tags: Object.keys(this.tags).length > 0 ? this.tags : undefined,
      data: Object.keys(this.data).length > 0 ? this.data : undefined,
    };
  }
}

export interface TransactionContext {
  name: string;
  op: string;
  description?: string;
  tags?: Record<string, string>;
  data?: Record<string, unknown>;
}

/** A root transaction representing a top-level operation. */
export class Transaction {
  readonly traceId: string;
  readonly spanId: string;
  readonly name: string;
  readonly op: string;
  description?: string;
  status: string = "ok";
  httpMethod?: string;
  httpStatusCode?: number;
  tags: Record<string, string> = {};
  data: Record<string, unknown> = {};

  private startTime: number;
  private startDate: Date;
  private endDate?: Date;
  private spans: Span[] = [];
  private transport: Transport;
  private options: {
    environment?: string;
    release?: string;
    debug?: boolean;
  };

  constructor(
    ctx: TransactionContext,
    transport: Transport,
    options: { environment?: string; release?: string; debug?: boolean },
  ) {
    this.traceId = generateTraceId();
    this.spanId = generateId();
    this.name = ctx.name;
    this.op = ctx.op;
    this.description = ctx.description;
    if (ctx.tags) this.tags = { ...ctx.tags };
    if (ctx.data) this.data = { ...ctx.data };
    this.transport = transport;
    this.options = options;
    this.startTime = performance.now();
    this.startDate = new Date();
  }

  startChild(op: string, description?: string): Span {
    const span = new Span(op, description, this.spanId);
    this.spans.push(span);
    return span;
  }

  setTag(key: string, value: string): this {
    this.tags[key] = value;
    return this;
  }

  setData(key: string, value: unknown): this {
    this.data[key] = value;
    return this;
  }

  setHttpStatus(code: number): this {
    this.httpStatusCode = code;
    if (code >= 500) this.status = "error";
    return this;
  }

  setStatus(status: string): this {
    this.status = status;
    return this;
  }

  finish(): void {
    this.endDate = new Date();

    // Auto-finish any unfinished child spans
    for (const span of this.spans) {
      if (span.durationMs === 0) span.finish();
    }

    const envelope: TransactionEnvelope = {
      type: "transaction",
      trace_id: this.traceId,
      span_id: this.spanId,
      transaction: this.name,
      op: this.op,
      description: this.description,
      status: this.status,
      http_method: this.httpMethod,
      http_status_code: this.httpStatusCode,
      start_timestamp: this.startDate.toISOString(),
      timestamp: this.endDate.toISOString(),
      environment: this.options.environment,
      release: this.options.release,
      platform: "javascript",
      tags: Object.keys(this.tags).length > 0 ? this.tags : undefined,
      data: Object.keys(this.data).length > 0 ? this.data : undefined,
      sdk: { name: SDK_NAME, version: SDK_VERSION },
      spans: this.spans.map((s) => s.toJSON(this.startTime)),
    };

    if (this.options.debug) {
      console.debug("[overflow] sending transaction", this.traceId, this.name);
    }

    this.transport.send(envelope as unknown as import("./types").OverflowEvent);
  }
}
