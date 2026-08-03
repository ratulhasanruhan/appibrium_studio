"use server";

/**
 * SMS Service — pluggable provider adapter.
 *
 * Runs strictly on the server side ("use server") to protect API keys
 * and execute network requests securely.
 */

import { normalizeBDPhone } from "@/utils";

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
 * Send an SMS via the configured gateway.
 * Set SMS_API_URL, SMS_API_KEY, and SMS_SENDER_ID in your .env.local
 */
export async function sendSMS(payload: SMSPayload): Promise<SMSResult> {
  const apiUrl    = process.env.SMS_API_URL;
  const apiKey    = process.env.SMS_API_KEY;
  const secretKey = process.env.SMS_SECRET_KEY;
  const senderId  = process.env.SMS_SENDER_ID ?? "kilagbe";

  if (!apiUrl || !apiKey || !secretKey) {
    console.warn("[SMS] SMS configuration parameters missing in .env.local.");
    return { success: false, error: "SMS service not configured." };
  }

  const to = normalizeBDPhone(payload.to);

  try {
    // Construct the exact GET request URL provided by the user
    const params = new URLSearchParams({
      apikey: apiKey,
      secretkey: secretKey,
      callerID: senderId,
      toUser: to,
      messageContent: payload.message,
    });

    const url = `${apiUrl}?${params.toString().replace(/\+/g, "%20")}`;

    // Temporarily bypass certificate rejection for IP-based HTTPS endpoints
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    const response = await fetch(url, {
      method: "GET",
    });

    const data = await response.text();

    if (!response.ok) {
      return {
        success: false,
        error: `Gateway error: ${response.status}`,
        raw: data,
      };
    }

    return {
      success: true,
      raw: data,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error };
  } finally {
    // Restore default TLS rejection behaviors
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "1";
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
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://studio.appibrium.com").trim();
  const url    = `${appUrl}/public/proposal/${token}`.trim();

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
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://studio.appibrium.com").trim();
  const url    = `${appUrl}/public/invoice/${token}`.trim();

  const message =
    `Dear ${clientName}, an invoice of ${amount} has been sent by Appibrium. ` +
    `View here: ${url} ` +
    `Ref: ${invoiceId}`;

  return sendSMS({ to: phone, message });
}

/**
 * Confirm a payout to a team member.
 */
export async function sendPayoutSMS(
  phone: string,
  personName: string,
  amount: string,
  reference: string
): Promise<SMSResult> {
  const message =
    `Dear ${personName}, a payment of ${amount} has been released by Appibrium ` +
    `for ${reference}. Please confirm receipt. Thank you.`;

  return sendSMS({ to: phone, message });
}

export async function sendCustomSMS(phone: string, title: string, message: string): Promise<SMSResult> {
  const formattedMsg = `Alert: ${title} - ${message}`;
  return sendSMS({ to: phone, message: formattedMsg });
}
