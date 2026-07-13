import { NextResponse } from "next/server";
import { generatePDF } from "@/services/pdf";

export async function POST(request: Request) {
  try {
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
  } catch (error: any) {
    console.error("PDF API endpoint error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate PDF." }, { status: 500 });
  }
}
