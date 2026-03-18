# @jaggle-ai/overflow-react

Official React SDK for [Overflow](https://github.com/Jaggle-AI-HQ/jaggle-overflow) error tracking. Built on top of `@jaggle-ai/overflow-browser`.

## Installation

```bash
npm install @jaggle-ai/overflow-react @jaggle-ai/overflow-browser
```

## Quick Start

```tsx
import * as Overflow from "@jaggle-ai/overflow-react";

Overflow.init({
  dsn: "https://<public-key>@your-host.com/api/ingest",
  environment: "production",
});
```

## Error Boundary

Wrap your app (or parts of it) to automatically capture React rendering errors:

```tsx
import { OverflowErrorBoundary } from "@jaggle-ai/overflow-react";

function App() {
  return (
    <OverflowErrorBoundary
      fallback={({ error, resetError }) => (
        <div>
          <p>Something went wrong: {error.message}</p>
          <button onClick={resetError}>Try again</button>
        </div>
      )}
      onError={(error, eventId) => {
        console.log("Reported to Overflow:", eventId);
      }}
      onReset={() => {
        console.log("Error boundary reset");
      }}
      fingerprint={["custom-group"]}
    >
      <MyApp />
    </OverflowErrorBoundary>
  );
}
```

## Hooks

### `useOverflow()`

Access Overflow SDK methods from any component:

```tsx
function PaymentForm() {
  const overflow = useOverflow();

  const handleSubmit = async () => {
    try {
      await processPayment();
    } catch (err) {
      overflow.captureException(err);
    }
  };
}
```

### `useOverflowUser(user)`

Track the current user. Automatically clears on unmount:

```tsx
function AuthProvider({ user }) {
  useOverflowUser(user ? { id: user.id, email: user.email } : undefined);
  return <App />;
}
```

### `useOverflowBreadcrumb(breadcrumb)`

Record a breadcrumb when a component mounts:

```tsx
function CheckoutPage() {
  useOverflowBreadcrumb({
    category: "navigation",
    message: "Entered checkout",
  });
  return <div>Checkout</div>;
}
```

## Re-exports

All `@jaggle-ai/overflow-browser` functions are re-exported for convenience:

```tsx
import {
  captureException,
  setTag,
  addBreadcrumb,
} from "@jaggle-ai/overflow-react";
```

## Version

Current SDK version: `0.1.0`

## License

MIT
