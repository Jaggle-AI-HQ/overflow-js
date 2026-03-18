import { parseDSN } from "./dsn";
import { Scope } from "./scope";
import { parseError } from "./stacktrace";
import { Transaction, type TransactionContext } from "./tracing";
import { FetchTransport, type Transport } from "./transport";
import type {
  Breadcrumb,
  OverflowEvent,
  OverflowOptions,
  Level,
  UserContext,
} from "./types";
import { SDK_NAME, SDK_VERSION } from "./version";

let globalClient: OverflowClient | null = null;

/** Initialize the Overflow SDK. Must be called before any other SDK methods. */
export function init(options: OverflowOptions): OverflowClient {
  globalClient = new OverflowClient(options);
  return globalClient;
}

/** Get the current global client, or null if not initialized. */
export function getClient(): OverflowClient | null {
  return globalClient;
}

/** Capture an Error and send it to Overflow Overflow. Returns the event ID. */
export function captureException(error: Error | unknown): string {
  if (!globalClient) return "";
  return globalClient.captureException(error);
}

/** Capture a message and send it to Overflow Overflow. Returns the event ID. */
export function captureMessage(message: string, level: Level = "info"): string {
  if (!globalClient) return "";
  return globalClient.captureMessage(message, level);
}

/** Add a breadcrumb to the current scope. */
export function addBreadcrumb(breadcrumb: Breadcrumb): void {
  globalClient?.addBreadcrumb(breadcrumb);
}

/** Set user context on the current scope. Pass undefined to clear. */
export function setUser(user: UserContext | undefined): void {
  globalClient?.setUser(user);
}

/** Set a tag on the current scope. */
export function setTag(key: string, value: string): void {
  globalClient?.setTag(key, value);
}

/** Set multiple tags on the current scope. */
export function setTags(tags: Record<string, string>): void {
  globalClient?.setTags(tags);
}

/** Set a named context on the current scope. */
export function setContext(key: string, value: unknown): void {
  globalClient?.setContext(key, value);
}

/** Override automatic fingerprinting for issue grouping. */
export function setFingerprint(fingerprint: string[]): void {
  globalClient?.setFingerprint(fingerprint);
}

/** Configure the scope via a callback. */
export function configureScope(callback: (scope: Scope) => void): void {
  globalClient?.configureScope(callback);
}

/** Start a new performance transaction. Call .finish() to send it. */
export function startTransaction(ctx: TransactionContext): Transaction | null {
  if (!globalClient) return null;
  return globalClient.startTransaction(ctx);
}

/** Flush all pending events. */
export async function flush(): Promise<void> {
  await globalClient?.flush();
}

/** Close the SDK and flush pending events. */
export async function close(): Promise<void> {
  await globalClient?.close();
  globalClient = null;
}

export class OverflowClient {
  private options: Required<
    Pick<
      OverflowOptions,
      "sampleRate" | "maxBreadcrumbs" | "debug" | "autoCapture"
    >
  > &
    OverflowOptions;
  private transport: Transport;
  private scope: Scope;
  private installed = false;
  private originalOnError: OnErrorEventHandler | null = null;
  private originalOnUnhandledRejection:
    | ((event: PromiseRejectionEvent) => void)
    | null = null;

  constructor(options: OverflowOptions) {
    this.options = {
      sampleRate: 1.0,
      maxBreadcrumbs: 100,
      debug: false,
      autoCapture: true,
      ...options,
    };
    this.scope = new Scope(this.options.maxBreadcrumbs);

    if (this.options.defaultTags) {
      this.scope.setTags(this.options.defaultTags);
    }

    const { host, publicKey } = parseDSN(options.dsn);
    this.transport = new FetchTransport(host, publicKey);

    if (this.options.autoCapture && typeof window !== "undefined") {
      this.installGlobalHandlers();
    }
  }

  captureException(error: Error | unknown): string {
    const err = error instanceof Error ? error : new Error(String(error));
    const event = this.buildEvent();
    event.level = "error";
    event.message = err.message;
    event.exception = parseError(err);
    return this.sendEvent(event);
  }

  captureMessage(message: string, level: Level = "info"): string {
    const event = this.buildEvent();
    event.level = level;
    event.message = message;
    return this.sendEvent(event);
  }

  addBreadcrumb(breadcrumb: Breadcrumb): void {
    this.scope.addBreadcrumb(breadcrumb);
  }

  setUser(user: UserContext | undefined): void {
    this.scope.setUser(user);
  }

  setTag(key: string, value: string): void {
    this.scope.setTag(key, value);
  }

  setTags(tags: Record<string, string>): void {
    this.scope.setTags(tags);
  }

  setContext(key: string, value: unknown): void {
    this.scope.setContext(key, value);
  }

  setFingerprint(fingerprint: string[]): void {
    this.scope.setFingerprint(fingerprint);
  }

  configureScope(callback: (scope: Scope) => void): void {
    callback(this.scope);
  }

  startTransaction(ctx: TransactionContext): Transaction | null {
    const rate = this.options.tracesSampleRate ?? 0;
    if (rate <= 0) return null;
    if (rate < 1.0 && Math.random() > rate) return null;

    return new Transaction(ctx, this.transport, {
      environment: this.options.environment,
      release: this.options.release,
      debug: this.options.debug,
    });
  }

  async flush(): Promise<void> {
    await this.transport.flush();
  }

  async close(): Promise<void> {
    this.uninstallGlobalHandlers();
    await this.flush();
  }

  private buildEvent(): OverflowEvent {
    const event: OverflowEvent = {
      event_id: crypto.randomUUID(),
      platform: "javascript",
      timestamp: new Date().toISOString(),
      sdk: { name: SDK_NAME, version: SDK_VERSION },
    };

    // Auto-collect browser context
    if (typeof window !== "undefined" && typeof navigator !== "undefined") {
      const ua = navigator.userAgent;
      event.request = {
        url: window.location.href,
        headers: {
          "User-Agent": ua,
        },
      };
      event.contexts = {
        browser: parseBrowser(ua),
        os: parseOS(ua),
      };
    }

    return event;
  }

  private sendEvent(event: OverflowEvent): string {
    // Apply client-level options
    if (this.options.environment && !event.environment) {
      event.environment = this.options.environment;
    }
    if (this.options.release && !event.release) {
      event.release = this.options.release;
    }
    if (this.options.serverName && !event.server_name) {
      event.server_name = this.options.serverName;
    }

    // Apply scope
    this.scope.applyToEvent(event);

    // Sample rate
    if (
      this.options.sampleRate < 1.0 &&
      Math.random() > this.options.sampleRate
    ) {
      return "";
    }

    // BeforeSend hook
    if (this.options.beforeSend) {
      const modified = this.options.beforeSend(event);
      if (!modified) return "";
      event = modified;
    }

    if (this.options.debug) {
      console.debug("[overflow] sending event", event.event_id);
    }

    this.transport.send(event);
    return event.event_id || "";
  }

  private installGlobalHandlers(): void {
    if (this.installed) return;
    this.installed = true;

    // window.onerror
    this.originalOnError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      if (error) {
        this.captureException(error);
      } else {
        this.captureMessage(String(message), "error");
      }
      if (this.originalOnError) {
        return this.originalOnError.call(
          window,
          message,
          source,
          lineno,
          colno,
          error,
        );
      }
      return false;
    };

    // unhandledrejection
    this.originalOnUnhandledRejection = window.onunhandledrejection as
      | ((event: PromiseRejectionEvent) => void)
      | null;
    window.onunhandledrejection = (event: PromiseRejectionEvent) => {
      const error =
        event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason));
      this.captureException(error);
      if (this.originalOnUnhandledRejection) {
        this.originalOnUnhandledRejection(event);
      }
    };
  }

  private uninstallGlobalHandlers(): void {
    if (!this.installed) return;
    this.installed = false;

    if (typeof window !== "undefined") {
      window.onerror = this.originalOnError;
      window.onunhandledrejection = this
        .originalOnUnhandledRejection as OnErrorEventHandler;
    }
  }
}

/** Extract browser name and version from a User-Agent string. */
function parseBrowser(ua: string): { name: string; version: string } {
  const browsers: [RegExp, string][] = [
    [/Edg\/(\S+)/, "Edge"],
    [/OPR\/(\S+)/, "Opera"],
    [/Chrome\/(\S+)/, "Chrome"],
    [/Firefox\/(\S+)/, "Firefox"],
    [/Version\/(\S+).*Safari/, "Safari"],
  ];
  for (const [re, name] of browsers) {
    const m = re.exec(ua);
    if (m) return { name, version: m[1] };
  }
  return { name: "Unknown", version: "" };
}

/** Extract OS name and version from a User-Agent string. */
function parseOS(ua: string): { name: string; version: string } {
  if (/Windows NT (\d+\.\d+)/.test(ua)) {
    const v = RegExp.$1;
    const map: Record<string, string> = { "10.0": "10", "6.3": "8.1", "6.2": "8", "6.1": "7" };
    return { name: "Windows", version: map[v] || v };
  }
  if (/Mac OS X ([\d_]+)/.test(ua)) {
    return { name: "macOS", version: RegExp.$1.replace(/_/g, ".") };
  }
  if (/Android ([\d.]+)/.test(ua)) {
    return { name: "Android", version: RegExp.$1 };
  }
  if (/iPhone OS ([\d_]+)/.test(ua) || /iPad.*OS ([\d_]+)/.test(ua)) {
    return { name: "iOS", version: RegExp.$1.replace(/_/g, ".") };
  }
  if (/Linux/.test(ua)) {
    return { name: "Linux", version: "" };
  }
  return { name: "Unknown", version: "" };
}
