# @jaggle-ai/overflow-nextjs

Official Next.js SDK for [Overflow](https://github.com/Jaggle-AI-HQ/jaggle-overflow) error tracking. Supports both App Router and API routes.

## Installation

```bash
npm install @jaggle-ai/overflow-nextjs @jaggle-ai/overflow-react @jaggle-ai/overflow-browser
```

## Client-Side Setup

### App Router

Add the `OverflowProvider` to your root layout:

```tsx
// app/layout.tsx
import { OverflowProvider } from "@jaggle-ai/overflow-nextjs/client";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <OverflowProvider
          options={{
            dsn: process.env.NEXT_PUBLIC_OVERFLOW_DSN!,
            environment: process.env.NODE_ENV,
            release: process.env.NEXT_PUBLIC_VERSION,
          }}
        >
          {children}
        </OverflowProvider>
      </body>
    </html>
  );
}
```

### Error Boundaries

Use the React error boundary from the client export:

```tsx
"use client";
import { OverflowErrorBoundary } from "@jaggle-ai/overflow-nextjs/client";

export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <OverflowErrorBoundary
      fallback={({ error, resetError }) => (
        <div>
          <h2>Something went wrong</h2>
          <button onClick={resetError}>Retry</button>
        </div>
      )}
    >
      {children}
    </OverflowErrorBoundary>
  );
}
```

## Server-Side Setup

### Initialize Server Client

```typescript
// lib/overflow.ts
import { initServer } from "@jaggle-ai/overflow-nextjs";

export const overflow = initServer({
  dsn: process.env.OVERFLOW_DSN!,
  environment: process.env.NODE_ENV,
  release: process.env.VERSION,
});
```

### API Route Wrapper

Wrap route handlers to auto-capture errors:

```typescript
// app/api/users/route.ts
import { withOverflow } from "@jaggle-ai/overflow-nextjs";

export const GET = withOverflow(async (request) => {
  const users = await db.getUsers();
  return Response.json(users);
});
```

### Manual Server-Side Capture

```typescript
import { getServerClient } from "@jaggle-ai/overflow-nextjs";

export async function generateMetadata() {
  try {
    const data = await fetchData();
    return { title: data.title };
  } catch (error) {
    await getServerClient()?.captureException(error);
    return { title: "Error" };
  }
}
```

## Client-Side Hooks

All `@jaggle-ai/overflow-react` hooks are available from the client export:

```tsx
"use client";
import {
  useOverflow,
  useOverflowUser,
} from "@jaggle-ai/overflow-nextjs/client";
```

## Environment Variables

| Variable                   | Side   | Description                        |
| -------------------------- | ------ | ---------------------------------- |
| `NEXT_PUBLIC_OVERFLOW_DSN` | Client | DSN for browser-side error capture |
| `OVERFLOW_DSN`             | Server | DSN for server-side error capture  |
| `NEXT_PUBLIC_VERSION`      | Both   | Release version                    |

## Version

Current SDK version: `0.1.0`

## License

MIT
