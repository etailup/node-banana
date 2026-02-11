/**
 * Headless Callback Delivery
 *
 * Fires webhook callbacks with retry and optional HMAC-SHA256 signing.
 */

import { createHmac } from "crypto";
import { fetchWithRetry } from "@/utils/fetchWithRetry";
import type { CallbackPayload } from "./types";
import { updateJobStatus } from "./storage";

/**
 * Deliver a callback payload to the specified URL.
 * Signs the request with HMAC-SHA256 if HEADLESS_WEBHOOK_SECRET is set.
 * Updates the job's callback_delivered flag on success.
 */
export async function deliverCallback(
  jobId: string,
  callbackUrl: string,
  payload: CallbackPayload,
): Promise<void> {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Sign with HMAC if secret is configured
  const secret = process.env.HEADLESS_WEBHOOK_SECRET;
  if (secret) {
    const signature = createHmac("sha256", secret).update(body).digest("hex");
    headers["X-Webhook-Signature"] = `sha256=${signature}`;
  }

  const { response, error } = await fetchWithRetry(callbackUrl, {
    method: "POST",
    headers,
    body,
  }, {
    maxRetries: 3,
    timeoutMs: 30000,
    backoffMs: 2000,
    logPrefix: `[Callback:${jobId}]`,
  });

  if (response?.ok) {
    try {
      await updateJobStatus(jobId, payload.status, { callback_delivered: true });
    } catch (err) {
      console.error(`[Callback:${jobId}] Delivered but failed to update DB:`, err);
    }
    console.log(`[Callback:${jobId}] Delivered to ${callbackUrl}`);
  } else {
    const reason = `Failed to deliver to ${callbackUrl}: ${error || `HTTP ${response?.status}`}`;
    console.error(`[Callback:${jobId}] ${reason}`);
  }
}
