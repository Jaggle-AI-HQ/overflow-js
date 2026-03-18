import { Component, type ErrorInfo, type ReactNode } from "react";
import { captureException, addBreadcrumb } from "@jaggle-ai/overflow-browser";

export interface OverflowErrorBoundaryProps {
  /** React tree to render when an error is caught. Receives the error and a reset function. */
  fallback:
    | ReactNode
    | ((props: { error: Error; resetError: () => void }) => ReactNode);
  /** Called when an error is captured, with the event ID from Overflow. */
  onError?: (error: Error, eventId: string) => void;
  /** Called when the error boundary is reset. */
  onReset?: () => void;
  /** Override the Overflow fingerprint for errors caught by this boundary. */
  fingerprint?: string[];
  children: ReactNode;
}

interface State {
  error: Error | null;
  eventId: string;
}

/**
 * React Error Boundary that automatically captures errors to Overflow Overflow.
 *
 * ```tsx
 * <OverflowErrorBoundary fallback={({ error, resetError }) => (
 *   <div>
 *     <p>Something went wrong: {error.message}</p>
 *     <button onClick={resetError}>Try again</button>
 *   </div>
 * )}>
 *   <App />
 * </OverflowErrorBoundary>
 * ```
 */
export class OverflowErrorBoundary extends Component<
  OverflowErrorBoundaryProps,
  State
> {
  state: State = { error: null, eventId: "" };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    addBreadcrumb({
      category: "react.error_boundary",
      message: error.message,
      level: "error",
      data: {
        componentStack: errorInfo.componentStack,
      },
    });

    const eventId = captureException(error);
    this.setState({ eventId });
    this.props.onError?.(error, eventId);
  }

  resetError = () => {
    this.props.onReset?.();
    this.setState({ error: null, eventId: "" });
  };

  render() {
    if (this.state.error) {
      const { fallback } = this.props;
      if (typeof fallback === "function") {
        return fallback({
          error: this.state.error,
          resetError: this.resetError,
        });
      }
      return fallback;
    }
    return this.props.children;
  }
}
