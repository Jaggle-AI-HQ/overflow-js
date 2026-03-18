export type Level = "debug" | "info" | "warning" | "error" | "fatal";

export interface OverflowOptions {
  /** Project DSN from Overflow Overflow. Format: https://<public-key>@<host>/api/ingest */
  dsn: string;
  /** Environment name (e.g. "production", "staging") */
  environment?: string;
  /** Release version (e.g. "myapp@1.0.0") */
  release?: string;
  /** Server name identifier */
  serverName?: string;
  /** Event sampling rate (0.0 to 1.0). Default: 1.0 */
  sampleRate?: number;
  /** Transaction sampling rate (0.0 to 1.0). Default: 0 (disabled) */
  tracesSampleRate?: number;
  /** Maximum breadcrumbs to retain. Default: 100 */
  maxBreadcrumbs?: number;
  /** Hook called before each event is sent. Return null to drop the event. */
  beforeSend?: (event: OverflowEvent) => OverflowEvent | null;
  /** Enable debug logging to console. Default: false */
  debug?: boolean;
  /** Default tags applied to all events */
  defaultTags?: Record<string, string>;
  /** Automatically capture unhandled errors. Default: true */
  autoCapture?: boolean;
  /** Automatically instrument fetch requests. Default: true when tracesSampleRate > 0 */
  traceFetch?: boolean;
}

export interface OverflowEvent {
  event_id?: string;
  message?: string;
  level?: Level;
  platform?: string;
  timestamp?: string;
  fingerprint?: string[];
  exception?: ExceptionData;
  contexts?: Record<string, unknown>;
  tags?: Record<string, string>;
  breadcrumbs?: Breadcrumb[];
  request?: Record<string, unknown>;
  user?: Record<string, unknown>;
  sdk?: { name?: string; version?: string };
  environment?: string;
  release?: string;
  server_name?: string;
}

export interface ExceptionData {
  values: ExceptionValue[];
}

export interface ExceptionValue {
  type: string;
  value: string;
  stacktrace?: Stacktrace;
}

export interface Stacktrace {
  frames: StackFrame[];
}

export interface StackFrame {
  module?: string;
  function?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  abs_path?: string;
  in_app?: boolean;
}

export interface Breadcrumb {
  type?: string;
  category?: string;
  message?: string;
  data?: Record<string, unknown>;
  level?: string;
  timestamp?: string;
}

export interface IngestResult {
  event_id: string;
  issue_id: string;
  is_new: boolean;
}

export interface UserContext {
  id?: string;
  email?: string;
  username?: string;
  [key: string]: unknown;
}

export interface ParsedDSN {
  host: string;
  publicKey: string;
}

/** A span within a transaction. */
export interface SpanData {
  span_id: string;
  parent_span_id?: string;
  op: string;
  description?: string;
  status?: string;
  start_offset_ms: number;
  duration_ms: number;
  tags?: Record<string, string>;
  data?: Record<string, unknown>;
}

/** A performance transaction envelope sent to the ingest endpoint. */
export interface TransactionEnvelope {
  type: "transaction";
  trace_id: string;
  span_id?: string;
  parent_span_id?: string;
  transaction: string;
  op: string;
  description?: string;
  status?: string;
  http_method?: string;
  http_status_code?: number;
  start_timestamp: string;
  timestamp: string;
  environment?: string;
  release?: string;
  platform?: string;
  tags?: Record<string, string>;
  data?: Record<string, unknown>;
  sdk?: { name?: string; version?: string };
  spans: SpanData[];
}
