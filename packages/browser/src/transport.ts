import type { OverflowEvent } from "./types";
import { SDK_NAME, SDK_VERSION } from "./version";

export interface Transport {
  send(event: OverflowEvent): Promise<void>;
  flush(): Promise<void>;
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

  async flush(): Promise<void> {
    await Promise.allSettled(this.pending);
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
