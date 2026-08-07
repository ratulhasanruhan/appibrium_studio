/**
 * Email delivery log.
 *
 * Resend keeps the authoritative record of what happened to each message after
 * we handed it over, so this reads from them rather than mirroring sends into
 * our own table — a mirror can only ever say "we asked for a send", never
 * whether it was delivered or bounced.
 *
 * It proxies rather than letting the browser call Resend directly: the API key
 * is server-only, and it grants full send rights, not just read.
 */

import { NextResponse } from "next/server";
import { getCaller } from "@/lib/appwrite/server";
import { ADMIN_ROLES } from "@/utils";
import type { EmailLog } from "@/types";

/**
 * Resend timestamps look like "2026-08-07 16:40:28.837000+00", which Date
 * cannot parse: a space instead of T, six-digit fractional seconds, and a
 * two-digit offset. Normalised here, at the edge, so nothing downstream has to
 * carry a date that silently becomes Invalid Date.
 */
function toIso(raw: string): string {
  if (!raw) return "";
  const iso = raw
    .replace(" ", "T")
    .replace(/(\.\d{3})\d+/, "$1")
    .replace(/([+-]\d{2})$/, "$1:00");
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

export async function GET(request: Request) {
  try {
    const caller = await getCaller(request);
    const isStaff = caller?.labels.some((l) => ADMIN_ROLES.includes(l.toLowerCase()));
    if (!isStaff) {
      return NextResponse.json({ error: "Not authorised." }, { status: 401 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ emails: [], error: "Email provider not configured." });
    }

    const limit = Math.min(Number(new URL(request.url).searchParams.get("limit")) || 100, 100);
    const res = await fetch(`https://api.resend.com/emails?limit=${limit}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("[api/logs] Resend responded", res.status, (await res.text()).slice(0, 200));
      return NextResponse.json({ emails: [], error: "Could not reach the email provider." });
    }

    const data = await res.json();
    // Only the fields the log actually displays leave the server.
    const emails: EmailLog[] = (data.data ?? []).map((e: Record<string, unknown>) => ({
      id: String(e.id ?? ""),
      to: Array.isArray(e.to) ? (e.to as string[]) : [String(e.to ?? "")],
      from: String(e.from ?? ""),
      subject: String(e.subject ?? ""),
      created_at: toIso(String(e.created_at ?? "")),
      last_event: String(e.last_event ?? "unknown"),
    }));

    return NextResponse.json({ emails });
  } catch (error: unknown) {
    console.error("[api/logs] GET failed:", error);
    return NextResponse.json({ emails: [], error: "Could not load the email log." });
  }
}
