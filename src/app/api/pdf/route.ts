import { NextResponse } from "next/server";
import { generatePDF } from "@/services/pdf";
import { getCaller } from "@/lib/appwrite/server";
import { ADMIN_ROLES } from "@/utils";

export async function POST(request: Request) {
  try {
    // Rendering HTML in headless Chrome is expensive, so this is staff only —
    // otherwise anyone could point it at arbitrary markup and burn compute.
    const caller = await getCaller(request);
    if (!caller || !caller.labels.some((l) => ADMIN_ROLES.includes(l.toLowerCase()))) {
      return NextResponse.json({ error: "Not authorised." }, { status: 401 });
    }

    const { html, filename } = await request.json();

    if (!html) {
      return NextResponse.json({ error: "HTML content is required." }, { status: 400 });
    }

    const pdfBuffer = await generatePDF(html);

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
