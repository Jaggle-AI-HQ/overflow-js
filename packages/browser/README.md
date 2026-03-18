# @jaggle-ai/overflow-browser

Official browser SDK for [Overflow](https://github.com/Jaggle-AI-HQ/jaggle-overflow) error tracking.

## Installation

```bash
npm install @jaggle-ai/overflow-browser
```

## Quick Start

```typescript
import * as Overflow from "@jaggle-ai/overflow-browser";

Overflow.init({
  dsn: "https://<public-key>@your-host.com/api/ingest",
  environment: "production",
  release: "myapp@1.0.0",
});

// Errors are automatically captured from window.onerror and unhandledrejection
```

## Manual Capture

```typescript
import { captureException, captureMessage } from "@jaggle-ai/overflow-browser";

try {
  riskyOperation();
} catch (err) {
  captureException(err);
}

captureMessage("User completed checkout", "info");
```

## Configuration

| Option           | Type                       | Default  | Description                     |
| ---------------- | -------------------------- | -------- | ------------------------------- |
| `dsn`            | `string`                   | required | Project DSN from Overflow       |
| `environment`    | `string`                   | -        | Environment name                |
| `release`        | `string`                   | -        | Release version                 |
| `sampleRate`     | `number`                   | `1.0`    | Event sampling rate (0.0 - 1.0) |
| `maxBreadcrumbs` | `number`                   | `100`    | Max breadcrumbs to retain       |
| `beforeSend`     | `(event) => event \| null` | -        | Hook to modify/drop events      |
| `autoCapture`    | `boolean`                  | `true`   | Auto-capture unhandled errors   |
| `debug`          | `boolean`                  | `false`  | Enable debug logging            |
| `defaultTags`    | `Record<string, string>`   | -        | Tags added to all events        |

## Context & Breadcrumbs

```typescript
import { setUser, setTag, addBreadcrumb } from "@jaggle-ai/overflow-browser";

setUser({ id: "user-123", email: "user@example.com" });
setTag("component", "payments");

addBreadcrumb({
  category: "ui.click",
  message: "User clicked submit",
  level: "info",
});
```

## Custom Fingerprinting

```typescript
import { setFingerprint } from "@jaggle-ai/overflow-browser";

setFingerprint(["payment-failed", "stripe"]);
```

## Cleanup

```typescript
import { close } from "@jaggle-ai/overflow-browser";

// Flush pending events and tear down
await close();
```

## Version

Current SDK version: `0.1.0`

## License

MIT
