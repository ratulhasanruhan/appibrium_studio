import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Appibrium Studio",
    template: "%s · Appibrium Studio",
  },
  description:
    "Appibrium Studio — the internal business operating system for Appibrium Technology Co. Manage clients, projects, proposals, invoices, and more.",
  keywords: ["Appibrium", "Studio", "CRM", "Project Management", "Invoicing"],
  authors: [{ name: "Appibrium Technology Co.", url: "https://appibrium.com" }],
  creator: "Appibrium Technology Co.",
  metadataBase: new URL("https://studio.appibrium.com"),
  // WhatsApp, iMessage and most crawlers ignore SVG favicons, so raster sizes
  // are listed alongside it — without them a shared link falls back to the
  // host's generic icon.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/branding_assets/og/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/branding_assets/og/icon-512.png", type: "image/png", sizes: "512x512" },
      { url: "/branding_assets/logos/icon/icon_night.svg", type: "image/svg+xml" },
    ],
    apple: "/branding_assets/og/apple-touch-icon.png",
    shortcut: "/favicon.ico",
  },
  openGraph: {
    title: "Appibrium Studio",
    description: "Proposals, invoices, projects and documents from Appibrium Technology Co.",
    url: "https://studio.appibrium.com",
    siteName: "Appibrium Studio",
    locale: "en_US",
    type: "website",
    // 1200x630 is what WhatsApp, LinkedIn and Slack expect; metadataBase turns
    // this relative path into the absolute URL crawlers require.
    images: [
      {
        url: "/branding_assets/og/og-default.png",
        width: 1200,
        height: 630,
        alt: "Appibrium Studio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Appibrium Studio",
    description: "Proposals, invoices, projects and documents from Appibrium Technology Co.",
    images: ["/branding_assets/og/og-default.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Noto+Sans+Bengali:wght@400;500;600;700&family=Alex+Brush&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
