"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { account } from "@/lib/appwrite/client";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

function VerifyMagicLinkContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [error, setError] = useState("");

  useEffect(() => {
    const userId = searchParams?.get("userId");
    const secret = searchParams?.get("secret");

    if (!userId || !secret) {
      setStatus("error");
      setError("Invalid magic link URL. Missing parameters.");
      return;
    }

    async function verify() {
      try {
        // Clear any previous session
        try {
          await account.deleteSession("current");
        } catch (_) {}

        // Complete the magic URL session creation
        await account.updateMagicURLSession(userId!, secret!);
        setStatus("success");
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      } catch (err: any) {
        console.error("Magic link verification failed:", err);
        setStatus("error");
        setError(err.message || "Failed to verify magic link session.");
      }
    }

    verify();
  }, [searchParams, router]);

  return (
    <div style={{ width: "100%", maxWidth: 400, textAlign: "center" }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 28 }}>
        <img src="/branding_assets/logos/lockup/lockup_w4_light.svg" alt="Appibrium" style={{ height: 28, width: "auto" }} />
        <div style={{ width: 1, height: 18, background: "var(--border)" }} />
        <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 16, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent)" }}>
          Studio
        </span>
      </div>

      {/* Card */}
      <div style={{ background: "var(--background-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "36px 28px", boxShadow: "var(--shadow-xl)", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        {status === "verifying" && (
          <>
            <Loader2 size={36} style={{ color: "var(--accent)", animation: "spin 1s linear infinite" }} />
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", fontFamily: "var(--font-heading)" }}>Verifying Session</h2>
            <p style={{ fontSize: 12, color: "var(--foreground-muted)" }}>Please wait while we log you into the workspace...</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 size={36} style={{ color: "#00965C" }} />
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", fontFamily: "var(--font-heading)" }}>Welcome Back!</h2>
            <p style={{ fontSize: 12, color: "var(--foreground-muted)" }}>Verification successful. Redirecting to your dashboard...</p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle size={36} style={{ color: "#D14F4F" }} />
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", fontFamily: "var(--font-heading)" }}>Verification Failed</h2>
            <p style={{ fontSize: 12, color: "#D14F4F" }}>{error}</p>
            <button className="btn btn-ghost" onClick={() => router.push("/login")} style={{ marginTop: 8, fontSize: 12, width: "100%", justifyContent: "center" }}>
              Back to Sign In
            </button>
          </>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function VerifyMagicLinkPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 14 }}>
        <Loader2 size={28} style={{ color: "var(--accent)", animation: "spin 1s linear infinite" }} />
        <p style={{ fontSize: 13, color: "var(--foreground-muted)", fontFamily: "system-ui, sans-serif" }}>Loading verification portal...</p>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <VerifyMagicLinkContent />
    </Suspense>
  );
}
