/**
 * ViewState represents the standard UI state pattern for screens and hooks.
 * Contract shared with Screen.tsx and UI components.
 */
export type ViewState<T> =
  | { status: "loading"; data?: undefined; updatedAt?: string }
  | { status: "empty"; message?: string; data?: undefined; updatedAt?: string }
  | {
      status: "error";
      message?: string;
      onRetry?: () => void;
      data?: undefined;
      updatedAt?: string;
    }
  | {
      status: "offline";
      data: T;
      updatedAt?: string;
      onRetry?: () => void;
    }
  | {
      status: "unauthorized";
      message?: string;
      onLogin?: () => void;
      data?: undefined;
      updatedAt?: string;
    }
  | { status: "success"; data: T; updatedAt?: string };

export interface ToViewStateOptions<T> {
  data?: T | null;
  error?: unknown;
  isLoading?: boolean;
  isFetching?: boolean;
  isOffline?: boolean;
  isUnauthorized?: boolean;
  updatedAt?: string;
  isEmpty?: boolean | ((data: T) => boolean);
  emptyMessage?: string;
  errorMessage?: string;
  onRetry?: () => void;
  onLogin?: () => void;
}

function getErrorMessage(error: unknown): string | undefined {
  if (!error) return undefined;
  if (typeof error === "string") return error;
  if (typeof error === "object") {
    const err = error as Record<string, unknown>;
    if (typeof err.message === "string") {
      return err.message;
    }
  }
  return undefined;
}

function isUnauthorizedError(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === "object") {
    const err = error as Record<string, unknown>;
    if (err.status === 401 || err.code === "401" || err.code === "PGRST301") {
      return true;
    }
    if (
      typeof err.message === "string" &&
      /jwt|unauthorized|not authenticated/i.test(err.message)
    ) {
      return true;
    }
  }
  return false;
}

function isNetworkError(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === "object") {
    const err = error as Record<string, unknown>;
    if (
      err.name === "AbortError" &&
      typeof err.message === "string" &&
      err.message.includes("timeout")
    ) {
      return false;
    }
    if (typeof err.message === "string" && /network|offline|failed to fetch/i.test(err.message)) {
      return true;
    }
  }
  return false;
}

/**
 * Pure function mapping query/fetch state to a strongly-typed ViewState<T>.
 */
export function toViewState<T>(options: ToViewStateOptions<T>): ViewState<T> {
  const {
    data,
    error,
    isLoading = false,
    isOffline = false,
    isUnauthorized = false,
    updatedAt,
    isEmpty,
    emptyMessage,
    errorMessage,
    onRetry,
    onLogin,
  } = options;

  // 1. Unauthorized state
  if (isUnauthorized || isUnauthorizedError(error)) {
    return {
      status: "unauthorized",
      message: errorMessage ?? getErrorMessage(error),
      onLogin,
      updatedAt,
    };
  }

  const hasData = data !== undefined && data !== null;
  const offlineDetected = isOffline || isNetworkError(error);

  // 2. Offline state with cached data
  if (offlineDetected && hasData) {
    return {
      status: "offline",
      data: data as T,
      updatedAt,
      onRetry,
    };
  }

  // 3. Offline without cached data and not explicitly loading
  if (offlineDetected && !hasData && !isLoading) {
    return {
      status: "error",
      message: errorMessage ?? getErrorMessage(error),
      onRetry,
      updatedAt,
    };
  }

  // 4. Loading state (explicit loading flag)
  if (isLoading) {
    return {
      status: "loading",
      updatedAt,
    };
  }

  // 5. Error state
  if (error != null) {
    return {
      status: "error",
      message: errorMessage ?? getErrorMessage(error),
      onRetry,
      updatedAt,
    };
  }

  // 6. If no data and no error -> still loading
  if (!hasData) {
    return {
      status: "loading",
      updatedAt,
    };
  }

  // 7. Empty state check
  const emptyCheck =
    typeof isEmpty === "function"
      ? isEmpty(data as T)
      : typeof isEmpty === "boolean"
        ? isEmpty
        : Array.isArray(data) && data.length === 0;

  if (emptyCheck) {
    return {
      status: "empty",
      message: emptyMessage,
      updatedAt,
    };
  }

  // 8. Success state
  return {
    status: "success",
    data: data as T,
    updatedAt,
  };
}
