import { createHash, timingSafeEqual } from "crypto";

/**
 * Server-to-server credential for the PDF route.
 *
 * Email attachments are rendered by calling /api/pdf over HTTP rather than
 * importing the PDF service, so the 66MB Chromium payload lives in one
 * function. That call still has to prove it came from us. Rather than adding
 * another environment variable, both sides derive a digest of the existing
 * server-only Appwrite key — the raw key never travels.
 */
export const INTERNAL_PDF_HEADER = "x-internal-pdf-key";

export function internalPdfKey(): string {
  return createHash("sha256").update(process.env.APPWRITE_API_KEY || "").digest("hex");
}

export function isInternalPdfCall(request: Request): boolean {
  const supplied = request.headers.get(INTERNAL_PDF_HEADER) || "";
  const expected = internalPdfKey();
  if (!process.env.APPWRITE_API_KEY || supplied.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}
