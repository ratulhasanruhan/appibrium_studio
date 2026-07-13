"use client";

import { useEffect, useState } from "react";
import { account } from "@/lib/appwrite/client";
import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if Appwrite is initialized and user has an active session
    account
      .get()
      .then(() => {
        setLoading(false);
      })
      .catch((err) => {
        console.warn("[DashboardLayout] Auth check failed, redirecting to login:", err);
        window.location.href = "/login";
      });
  }, []);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          width: "100vw",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--background)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <img
            src="/branding_assets/logos/icon/icon_mint.svg"
            alt="Appibrium"
            style={{ width: 44, height: 44, animation: "pulse 2s infinite" }}
          />
          <span style={{ fontSize: 13, color: "var(--foreground-muted)", fontFamily: "var(--font-body)" }}>
            Loading workspace...
          </span>
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.5; transform: scale(0.96); }
            50% { opacity: 1; transform: scale(1.02); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main className="main-layout">{children}</main>
    </div>
  );
}
