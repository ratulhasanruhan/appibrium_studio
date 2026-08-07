/**
 * The one place headless Chrome runs.
 *
 * @sparticuz/chromium ships ~66MB of binaries that Vercel only traces into
 * functions listed in outputFileTracingIncludes. Keeping every PDF path behind
 * this single route means that weight is carried once, rather than being
 * duplicated into — or missing from — each page route whose Server Actions
 * happen to need a PDF.
 *
 * Two callers are allowed in: staff from the browser (short-lived Appwrite
 * JWT), and our own server code (a digest of the Appwrite API key, so no raw
 * credential travels and no extra environment variable is required).
 */

import { NextResponse } from "next/server";
import { generatePDF, generatePDFFromURL } from "@/services/pdf";
import { getCaller } from "@/lib/appwrite/server";
import { ADMIN_ROLES } from "@/utils";
import { isInternalPdfCall } from "@/lib/pdf-auth";

export async function POST(request: Request) {
  try {
    // Rendering in headless Chrome is expensive, so this is not open: either an
    // authenticated staff member, or our own server calling itself.
    let allowed = isInternalPdfCall(request);
    if (!allowed) {
      const caller = await getCaller(request);
      allowed = Boolean(caller?.labels.some((l) => ADMIN_ROLES.includes(l.toLowerCase())));
    }
    if (!allowed) {
      return NextResponse.json({ error: "Not authorised." }, { status: 401 });
    }

    const { html, url, filename } = await request.json();
    if (!html && !url) {
      return NextResponse.json({ error: "Either html or url is required." }, { status: 400 });
    }

    const pdfBuffer = url ? await generatePDFFromURL(url) : await generatePDF(html);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename || "document.pdf"}"`,
      },
    });
  } catch (error: unknown) {
    console.error("PDF API endpoint error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate PDF.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
