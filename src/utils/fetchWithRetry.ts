/**
 * Fetch with automatic retry, timeout, and backoff.
 *
 * Designed for external API calls (kie.ai CDN, polling endpoints) that can
 * fail transiently with "fetch failed" / network errors.
 *
 * Extracted to a utility so upstream route.ts updates don't overwrite retry logic.
 */

export interface FetchWithRetryOptions {
  /** Max number of attempts (default: 3) */
  maxRetries?: number;
  /** Timeout per attempt in ms (default: 60000) */
  timeoutMs?: number;
  /** Base backoff delay in ms, multiplied by attempt number (default: 2000) */
  backoffMs?: number;
  /** Log prefix for console output (e.g. "[API:abc123]") */
  logPrefix?: string;
  /** Retry on 5xx server errors (default: true) */
  retryServerErrors?: boolean;
}

/**
 * Fetch a URL with retry + timeout.
 * Returns the Response on success, or null if all attempts fail.
 * Also returns the last error message for logging.
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options?: FetchWithRetryOptions,
): Promise<{ response: Response | null; error?: string }> {
  const maxRetries = options?.maxRetries ?? 3;
  const timeoutMs = options?.timeoutMs ?? 60000;
  const backoffMs = options?.backoffMs ?? 2000;
  const prefix = options?.logPrefix ?? "[fetchWithRetry]";
  const retryServerErrors = options?.retryServerErrors ?? true;

  let lastResponse: Response | null = null;
  let lastError = "";

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const timeoutSignal = AbortSignal.timeout(timeoutMs);
      const signal = init?.signal
        ? AbortSignal.any([init.signal, timeoutSignal])
        : timeoutSignal;
      lastResponse = await fetch(url, {
        ...init,
        signal,
      });

      if (lastResponse.ok) {
        return { response: lastResponse };
      }

      // Retry on 5xx, fail immediately on 4xx
      if (retryServerErrors && lastResponse.status >= 500) {
        lastError = `HTTP ${lastResponse.status}`;
        console.warn(`${prefix} Fetch attempt ${attempt}/${maxRetries} got ${lastError}`);
        await lastResponse.body?.cancel();
      } else {
        // Non-retryable HTTP error
        return { response: lastResponse };
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(`${prefix} Fetch attempt ${attempt}/${maxRetries} failed: ${lastError}`);
      lastResponse = null;
    }

    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, backoffMs * attempt));
    }
  }

  return { response: lastResponse, error: lastError || "fetch failed after retries" };
}
