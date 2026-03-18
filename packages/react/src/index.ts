// Re-export all browser SDK functions for convenience
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
} from "@jaggle-ai/overflow-browser";

export type {
  OverflowOptions,
  OverflowEvent,
  Level,
  Breadcrumb,
  UserContext,
  TransactionContext,
} from "@jaggle-ai/overflow-browser";

// React-specific exports
export {
  OverflowErrorBoundary,
  type OverflowErrorBoundaryProps,
} from "./error-boundary";
export { useOverflow, useOverflowUser, useOverflowBreadcrumb } from "./hooks";
