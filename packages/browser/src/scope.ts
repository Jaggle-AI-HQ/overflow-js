import type { Breadcrumb, OverflowEvent, UserContext } from "./types";

/** Scope holds contextual data applied to all captured events. */
export class Scope {
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
    // Merge tags
    if (Object.keys(this.tags).length > 0) {
      event.tags = { ...this.tags, ...event.tags };
    }

    // Merge contexts
    if (Object.keys(this.contexts).length > 0) {
      event.contexts = { ...this.contexts, ...event.contexts };
    }

    // Set user if not already set
    if (this.user && !event.user) {
      event.user = { ...this.user };
    }

    // Set fingerprint if not already set
    if (
      this.fingerprint.length > 0 &&
      (!event.fingerprint || event.fingerprint.length === 0)
    ) {
      event.fingerprint = [...this.fingerprint];
    }

    // Prepend scope breadcrumbs
    if (this.breadcrumbs.length > 0) {
      event.breadcrumbs = [...this.breadcrumbs, ...(event.breadcrumbs || [])];
    }
  }
}
