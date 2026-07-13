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
  openGraph: {
    title: "Appibrium Studio",
    description: "Internal business operating system for Appibrium.",
    url: "https://studio.appibrium.com",
    siteName: "Appibrium Studio",
    locale: "en_US",
    type: "website",
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
          href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
