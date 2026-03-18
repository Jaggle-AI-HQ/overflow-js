import { useCallback, useEffect, useRef } from "react";
import {
  captureException,
  captureMessage,
  addBreadcrumb,
  setUser,
  getClient,
  type Level,
  type Breadcrumb,
  type UserContext,
} from "@jaggle-ai/overflow-browser";

/**
 * Returns Overflow SDK methods scoped to the component lifecycle.
 * Automatically adds a breadcrumb when the component mounts/unmounts.
 *
 * ```tsx
 * function MyComponent() {
 *   const overflow = useOverflow();
 *
 *   const handleClick = () => {
 *     try {
 *       riskyAction();
 *     } catch (err) {
 *       overflow.captureException(err);
 *     }
 *   };
 * }
 * ```
 */
export function useOverflow() {
  return {
    captureException: useCallback(
      (error: Error | unknown) => captureException(error),
      [],
    ),
    captureMessage: useCallback(
      (message: string, level?: Level) => captureMessage(message, level),
      [],
    ),
    addBreadcrumb: useCallback(
      (breadcrumb: Breadcrumb) => addBreadcrumb(breadcrumb),
      [],
    ),
    setUser: useCallback((user: UserContext | undefined) => setUser(user), []),
    getClient: useCallback(() => getClient(), []),
  };
}

/**
 * Identifies the current user for Overflow error tracking.
 * Automatically clears the user when the component unmounts.
 *
 * ```tsx
 * function AuthProvider({ user }) {
 *   useOverflowUser(user ? { id: user.id, email: user.email } : undefined);
 *   return <App />;
 * }
 * ```
 */
export function useOverflowUser(user: UserContext | undefined): void {
  const prevUser = useRef(user);

  useEffect(() => {
    setUser(user);
    prevUser.current = user;
    return () => {
      setUser(undefined);
    };
  }, [user?.id, user?.email, user?.username]);
}

/**
 * Adds a breadcrumb when a component mounts, useful for tracking navigation.
 *
 * ```tsx
 * function CheckoutPage() {
 *   useOverflowBreadcrumb({
 *     category: "navigation",
 *     message: "Entered checkout page",
 *   });
 *   return <div>Checkout</div>;
 * }
 * ```
 */
export function useOverflowBreadcrumb(breadcrumb: Breadcrumb): void {
  const added = useRef(false);
  useEffect(() => {
    if (!added.current) {
      addBreadcrumb(breadcrumb);
      added.current = true;
    }
  }, []);
}
