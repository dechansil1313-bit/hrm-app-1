"use client";

import React from "react";

interface PromiseErrorBoundaryProps {
  /**
   * Called when `use()` throws an error.
   * The `reset` function clears the boundary's error state so children
   * re-render. Wire it to whatever action re-runs the data flow (typically
   * the parent's `handleRefresh`), otherwise the same rejected promise
   * will be re-thrown on the next render and the boundary will catch again.
   */
  fallback: (error: Error, reset: () => void) => React.ReactNode;
  children: React.ReactNode;
}

interface PromiseErrorBoundaryState {
  error: Error | null;
}

/**
 * Error boundary for promises passed to React's `use()` hook.
 *
 * `use()` cannot be wrapped in try/catch (React uses both thrown Promises
 * for Suspense and thrown Errors to reach this boundary), so we catch at
 * the boundary level instead.
 *
 * Recovery is intentionally not handled inside `componentDidCatch` — the
 * parent supplies a `reset` callback and decides what action to take
 * (re-fetch, change promise key, etc.).
 */
export class PromiseErrorBoundary extends React.Component<
  PromiseErrorBoundaryProps,
  PromiseErrorBoundaryState
> {
  state: PromiseErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): PromiseErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Aborted fetches are expected (Refresh cancels in-flight requests);
    // skip logging to keep the console clean.
    if (error?.name === "AbortError") return;
    // eslint-disable-next-line no-console
    console.error("[PromiseErrorBoundary] caught:", error);
  }

  private handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (error) {
      return this.props.fallback(error, this.handleReset);
    }
    return this.props.children;
  }
}
