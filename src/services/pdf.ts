/**
 * PDF Service — generates PDFs from HTML using Puppeteer.
 *
 * Uses `puppeteer-core` + `@sparticuz/chromium` for both dev and production
 * to avoid installing the heavy, size-bloating `puppeteer` package.
 */

import puppeteer from "puppeteer-core";

export async function generatePDF(html: string): Promise<Buffer> {
  const chromium = (await import("@sparticuz/chromium")).default;

  const browser = await puppeteer.launch({
    args:            chromium.args,
    defaultViewport: (chromium as any).defaultViewport,
    executablePath:  await chromium.executablePath(),
    headless:        true,
  });

  const page = await browser.newPage();

  // domcontentloaded fires before linked stylesheets and webfonts arrive, so
  // Chrome would rasterise with fallback metrics and silently drop glyphs the
  // default font lacks — the taka sign among them. "load" waits for the
  // stylesheet; fonts.ready then waits for the faces it pulls in.
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => (document as Document & { fonts?: FontFaceSet }).fonts?.ready);

  const pdf = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });

  await browser.close();

  return Buffer.from(pdf);
}

export async function generatePDFFromURL(url: string): Promise<Buffer> {
  const chromium = (await import("@sparticuz/chromium")).default;

  const browser = await puppeteer.launch({
    args:            chromium.args,
    defaultViewport: (chromium as any).defaultViewport,
    executablePath:  await chromium.executablePath(),
    headless:        true,
  });

  const page = await browser.newPage();

  // Navigate to the target page and wait until networks are completely idle
  await page.goto(url, { waitUntil: "networkidle0" });

  const pdf = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });

  await browser.close();

  return Buffer.from(pdf);
}
