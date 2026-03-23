import type { OverflowEvent, Transport } from "./types";
import { SDK_NAME, SDK_VERSION } from "./version";

export type { Transport };

/** No-op transport that silently drops all events. Used when DSN is empty. */
export class NoopTransport implements Transport {
  async send(): Promise<void> {}
  async flush(): Promise<boolean> {
    return true;
  }
}

export class FetchTransport implements Transport {
  private endpoint: string;
  private pending: Promise<void>[] = [];

  constructor(host: string, publicKey: string) {
    this.endpoint = `${host}/${publicKey}/store`;
  }

  async send(event: OverflowEvent): Promise<void> {
    const promise = this.doSend(event);
    this.pending.push(promise);
    promise.finally(() => {
      this.pending = this.pending.filter((p) => p !== promise);
    });
  }

  async flush(timeout?: number): Promise<boolean> {
    if (timeout !== undefined && timeout > 0) {
      const result = await Promise.race([
        Promise.allSettled(this.pending).then(() => true),
        new Promise<false>((resolve) => setTimeout(() => resolve(false), timeout)),
      ]);
      return result;
    }
    await Promise.allSettled(this.pending);
    return true;
  }

  private async doSend(event: OverflowEvent): Promise<void> {
    try {
      await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": `${SDK_NAME}/${SDK_VERSION}`,
        },
        body: JSON.stringify(event),
        keepalive: true,
      });
    } catch {
      // Silently drop failed sends
    }
  }
}
