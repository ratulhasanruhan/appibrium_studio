import { NextResponse } from "next/server";
import { INTERNAL_PDF_HEADER, internalPdfKey } from "@/lib/pdf-auth";

// TEMPORARY: exercises the exact path email attachments now use.
export async function GET() {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").trim().replace(/\/$/, "");
  const url = `${appUrl}/public/invoice/inv_0d1wl8k4ew`;
  const t0 = Date.now();
  try {
    const res = await fetch(`${appUrl}/api/pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json", [INTERNAL_PDF_HEADER]: internalPdfKey() },
      body: JSON.stringify({ url }),
    });
    const buf = Buffer.from(await res.arrayBuffer());
    return NextResponse.json({
      status: res.status, ms: Date.now() - t0,
      isPdf: buf.slice(0, 4).toString() === "%PDF", bytes: buf.length,
      preview: buf.slice(0, 4).toString() === "%PDF" ? null : buf.toString().slice(0, 200),
    });
  } catch (e) {
    return NextResponse.json({ threw: String(e), ms: Date.now() - t0 }, { status: 500 });
  }
}
