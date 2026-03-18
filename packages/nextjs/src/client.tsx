"use client";

import { useEffect, type ReactNode } from "react";
import { init, type OverflowOptions } from "@jaggle-ai/overflow-browser";

// Re-export all React SDK functions for convenience
export {
  init,
  captureException,
  captureMessage,
  addBreadcrumb,
  setUser,
  setTag,
  setTags,
  setContext,
  setFingerprint,
  configureScope,
  startTransaction,
  flush,
  close,
  getClient,
  OverflowClient,
  Scope,
  Transaction,
  Span,
  SDK_VERSION,
  SDK_NAME,
  OverflowErrorBoundary,
  useOverflow,
  useOverflowUser,
  useOverflowBreadcrumb,
} from "@jaggle-ai/overflow-react";

export type {
  OverflowOptions,
  OverflowEvent,
  Level,
  Breadcrumb,
  UserContext,
  TransactionContext,
  OverflowErrorBoundaryProps,
} from "@jaggle-ai/overflow-react";

export interface OverflowProviderProps {
  /** Overflow SDK options. The DSN is required. */
  options: OverflowOptions;
  children: ReactNode;
}

/**
 * Client component that initializes the Overflow browser SDK.
 * Place this in your root layout to capture client-side errors.
 *
 * ```tsx
 * // app/layout.tsx
 * import { OverflowProvider } from "@jaggle-ai/overflow-nextjs/client";
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <OverflowProvider options={{
 *           dsn: process.env.NEXT_PUBLIC_JAGGLE_DSN!,
 *           environment: process.env.NODE_ENV,
 *         }}>
 *           {children}
 *         </OverflowProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function OverflowProvider({ options, children }: OverflowProviderProps) {
  useEffect(() => {
    init(options);
  }, [options.dsn]);

  return <>{children}</>;
}
