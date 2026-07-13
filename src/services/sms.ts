/**
 * SMS Service — pluggable provider adapter.
 *
 * The owner provides:
 *   SMS_API_URL   — the HTTP endpoint of the SMS gateway
 *   SMS_API_KEY   — authentication key
 *   SMS_SENDER_ID — sender alias (e.g. "APPIBRIUM")
 *
 * The service sends a message to a BD mobile number with
 * the public URL of a proposal or invoice.
 */

export interface SMSPayload {
  to: string;         // Recipient phone (will be normalized to BD format)
  message: string;
}

export interface SMSResult {
  success: boolean;
  message_id?: string;
  error?: string;
  raw?: unknown;
}

/**
 * Normalize a phone number to BD international format (+880...).
 */
function normalizeBDPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("880")) return `+${digits}`;
  if (digits.startsWith("0")) return `+880${digits.slice(1)}`;
  return `+880${digits}`;
}

/**
 * Send an SMS via the configured gateway.
 * Set SMS_API_URL, SMS_API_KEY, and SMS_SENDER_ID in your .env.local
 */
export async function sendSMS(payload: SMSPayload): Promise<SMSResult> {
  const apiUrl    = process.env.SMS_API_URL;
  const apiKey    = process.env.SMS_API_KEY;
  const senderId  = process.env.SMS_SENDER_ID ?? "APPIBRIUM";

  if (!apiUrl || !apiKey) {
    console.warn("[SMS] SMS_API_URL or SMS_API_KEY not configured.");
    return { success: false, error: "SMS service not configured." };
  }

  const to = normalizeBDPhone(payload.to);

  try {
    /**
     * Generic HTTP POST format — most BD SMS gateways (e.g. SSL Wireless,
     * Alpha Net, Bulk SMS BD) accept a JSON body like this.
     * Adjust the body shape below to match your provider's API spec.
     */
    const body = {
      api_key:   apiKey,
      sender_id: senderId,
      number:    to,
      message:   payload.message,
    };

    const response = await fetch(apiUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        error:   `Gateway error: ${response.status}`,
        raw:     data,
      };
    }

    return {
      success:    true,
      message_id: data?.message_id ?? data?.id ?? undefined,
      raw:        data,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error };
  }
}

// ─── Templated SMS Senders ────────────────────────────────────────────── //

/**
 * Send proposal link to client.
 */
export async function sendProposalSMS(
  phone: string,
  proposalId: string,
  token: string,
  clientName: string
): Promise<SMSResult> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://studio.appibrium.com";
  const url    = `${appUrl}/public/proposal/${token}`;

  const message =
    `Dear ${clientName}, Appibrium has shared a proposal with you. ` +
    `Please review it here: ${url} ` +
    `Ref: ${proposalId}`;

  return sendSMS({ to: phone, message });
}

/**
 * Send invoice link to client.
 */
export async function sendInvoiceSMS(
  phone: string,
  invoiceId: string,
  token: string,
  clientName: string,
  amount: string
): Promise<SMSResult> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://studio.appibrium.com";
  const url    = `${appUrl}/public/invoice/${token}`;

  const message =
    `Dear ${clientName}, an invoice of ${amount} has been sent by Appibrium. ` +
    `View here: ${url} ` +
    `Ref: ${invoiceId}`;

  return sendSMS({ to: phone, message });
}
