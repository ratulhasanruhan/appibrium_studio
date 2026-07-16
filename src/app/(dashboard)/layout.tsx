"use client";

import { useEffect, useState } from "react";
import { account, databases, DB_ID, COLLECTIONS, Query } from "@/lib/appwrite/client";
import { Sidebar } from "@/components/sidebar";
import { ProfileCompleteModal } from "@/components/profile-complete-modal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [clientDoc, setClientDoc] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    // Check if Appwrite is initialized and user has an active session
    account
      .get()
      .then(async (user) => {
        try {
          const labels = (user as any).labels || [];
          const isAdmin = labels.some((l: string) => 
            ["owner", "admin", "administrator", "manager", "finance"].includes(l.toLowerCase())
          );

          if (!isAdmin) {
            // Check if client document exists with their email
            const clientsList = await databases.listDocuments(DB_ID, COLLECTIONS.CLIENTS, [
              Query.equal("email", user.email.trim().toLowerCase()),
              Query.limit(1)
            ]);

            if (clientsList.documents.length > 0) {
              const doc = clientsList.documents[0];
              setClientDoc(doc);

              const hasSkipped = sessionStorage.getItem("hasSkippedProfileComplete");
              const isMissingData = !doc.phone || !doc.name || !doc.legal_name || !doc.website || !doc.address;

              if (isMissingData && hasSkipped !== "true") {
                setShowProfileModal(true);
              }
            }
          }
        } catch (err) {
          console.error("[DashboardLayout] Error checking client profile data:", err);
        } finally {
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn("[DashboardLayout] Auth check failed, redirecting to login:", err);
        window.location.href = "/login";
      });
  }, []);

  function handleProfileUpdate(updated: any) {
    setClientDoc(updated);
    setShowProfileModal(false);
  }

  function handleProfileSkip() {
    sessionStorage.setItem("hasSkippedProfileComplete", "true");
    setShowProfileModal(false);
  }

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

      {showProfileModal && clientDoc && (
        <ProfileCompleteModal
          client={clientDoc}
          onUpdate={handleProfileUpdate}
          onClose={handleProfileSkip}
        />
      )}
    </div>
  );
}
