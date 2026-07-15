"use client";

import React, { useState, useEffect, Suspense } from "react";
import { Download, Check, X, ShieldAlert, Loader2, Printer, Lock, Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import { getProposalByToken, updateProposal } from "@/services/proposals";
import { getClient } from "@/services/crm";
import { createProject } from "@/services/projects";
import type { Proposal, Client } from "@/types";
import { formatDate } from "@/utils";
import { useParams, useSearchParams } from "next/navigation";
import { account } from "@/lib/appwrite/client";

function PublicProposalPortalContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params?.token as string;

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [client, setClient]     = useState<Client | null>(null);
  const [loading, setLoading]   = useState(true);
  const [signing, setSigning]   = useState(false);
  const [status, setStatus]     = useState<"review" | "accepted" | "rejected">("review");

  // Auth States
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authStatus, setAuthStatus]   = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [authError, setAuthError]     = useState("");
  const [verifyingSession, setVerifyingSession] = useState(false);

  useEffect(() => {
    const userId = searchParams?.get("userId");
    const secret = searchParams?.get("secret");

    async function checkAuth() {
      setCheckingAuth(true);
      if (userId && secret) {
        setVerifyingSession(true);
        try {
          // Clear any conflicting active session
          try {
            await account.deleteSession("current");
          } catch (_) {}
          await account.updateMagicURLSession(userId, secret);
          // Clean the query parameters from URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err) {
          console.error("Magic link verification failed:", err);
        } finally {
          setVerifyingSession(false);
        }
      }

      try {
        const user = await account.get();
        setCurrentUser(user);
      } catch (_) {
        setCurrentUser(null);
      } finally {
        setCheckingAuth(false);
      }
    }
    checkAuth();
  }, [searchParams]);

  useEffect(() => {
    async function load() {
      if (!token) return;
      setLoading(true);
      const p = await getProposalByToken(token);
      if (p) {
        setProposal(p);
        setStatus(p.status as any);
        const cl = await getClient(p.client_id);
        setClient(cl);
      }
      setLoading(false);
    }
    load();
  }, [token]);

  async function handleAccept() {
    if (!proposal) return;
    setSigning(true);
    const result = await updateProposal(proposal.$id, {
      status: "accepted",
      accepted_at: new Date().toISOString(),
    });
    if (result.success) {
      setStatus("accepted");
      try {
        // Automatically create corresponding active project
        await createProject({
          name: proposal.title,
          client_id: proposal.client_id,
          description: `Project initialized automatically from accepted proposal "${proposal.title}".`,
          status: "active",
          currency: proposal.currency || "BDT",
        });
      } catch (err) {
        console.error("Failed to automatically create project:", err);
      }
    }
    setSigning(false);
  }

  async function handleReject() {
    if (!proposal) return;
    const reason = window.prompt("Please enter the reason for declining (optional):");
    if (reason === null) return;
    setSigning(true);
    await updateProposal(proposal.$id, { status: "rejected" });
    setStatus("rejected");
    setSigning(false);
  }

  async function handleSendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!client?.email) return;
    setAuthStatus("sending");
    setAuthError("");

    try {
      // 1. Verify client exists in backend database
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: client.email }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send magic link.");
      }

      // 2. Create magic URL token client-side with exact redirect to current proposal page
      const redirectUrl = window.location.href;
      await account.createMagicURLToken("unique()", client.email, redirectUrl);
      setAuthStatus("sent");
    } catch (err: any) {
      console.error("Magic link failed:", err);
      setAuthStatus("error");
      setAuthError(err.message || "Failed to send verification link.");
    }
  }

  function handlePrint() {
    window.print();
  }

  if (loading || verifyingSession) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#F4FBF7", gap: 14 }}>
        <Loader2 size={28} style={{ color: "#00B872", animation: "spin 1s linear infinite" }} />
        <p style={{ fontSize: 13, color: "#6B8F7C", fontFamily: "system-ui, sans-serif" }}>
          {verifyingSession ? "Verifying signature credentials..." : "Loading proposal..."}
        </p>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#F4FBF7", gap: 16 }}>
        <ShieldAlert size={48} style={{ color: "#D14F4F" }} />
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#0D2317", fontFamily: "system-ui, sans-serif" }}>Proposal Not Found</h1>
        <p style={{ fontSize: 13, color: "#6B8F7C", fontFamily: "system-ui, sans-serif" }}>This link may be invalid or the proposal has been removed.</p>
      </div>
    );
  }

  const proposalRef = `APP-PROP-${new Date(proposal.$createdAt).getFullYear()}-${proposal.$id.slice(-4).toUpperCase()}`;

  // Check client authorization status
  const isAuthorized = currentUser && client && (currentUser.email === client.email);

  return (
    <div className="proposal-portal">
      {/* ─── Header Bar ─── */}
      <header className="portal-header no-print">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/branding_assets/logos/lockup/lockup_w4_light.svg" alt="Appibrium" style={{ height: 26, width: "auto" }} />
          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.25)" }} />
          <span style={{ fontFamily: "'Jost', system-ui, sans-serif", fontWeight: 800, fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.9)" }}>
            Studio
          </span>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {status === "accepted" ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 14px", borderRadius: 99, background: "rgba(0,224,144,0.15)", border: "1px solid rgba(0,224,144,0.3)", color: "#00E090", fontSize: 12, fontWeight: 600 }}>
              <Check size={12} /> Accepted
            </span>
          ) : status === "rejected" ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 14px", borderRadius: 99, background: "rgba(209,79,79,0.15)", border: "1px solid rgba(209,79,79,0.3)", color: "#FAA", fontSize: 12, fontWeight: 600 }}>
              <X size={12} /> Declined
            </span>
          ) : !isAuthorized ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgba(255,255,255,0.6)", padding: "4px 10px", background: "rgba(255,255,255,0.05)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)" }}>
              <Lock size={12} style={{ color: "#E0A900" }} /> Authentication Required to Sign
            </span>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleReject}
                disabled={signing}
                style={{ padding: "6px 14px", borderRadius: 6, background: "transparent", border: "1px solid rgba(255,255,255,0.25)", color: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "system-ui, sans-serif" }}
              >
                Decline
              </button>
              <button
                onClick={handleAccept}
                disabled={signing}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 16px", borderRadius: 6, background: "#00E090", border: "none", color: "#0D2317", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Jost', system-ui, sans-serif" }}
              >
                {signing ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={13} />}
                Accept & Sign
              </button>
            </div>
          )}
          <button
            onClick={handlePrint}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 6, background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)", fontSize: 12, cursor: "pointer", fontFamily: "system-ui, sans-serif" }}
          >
            <Printer size={13} /> Download PDF
          </button>
        </div>
      </header>

      {/* ─── Document ─── */}
      <main className="portal-main">
        <div className="proposal-doc">

          {/* PDF-only header */}
          <div className="pdf-header">
            <span>APPIBRIUM TECHNOLOGY CO. · CONFIDENTIAL</span>
            <span>{proposalRef}</span>
          </div>

          {/* Watermark */}
          <div className="pdf-watermark">
            <img src="/branding_assets/logos/icon/icon_mint.svg" alt="" />
          </div>

          {/* Document Header */}
          <div className="doc-header">
            <div>
              <img src="/branding_assets/logos/wordmark/wordmark_dark.svg" alt="Appibrium" className="doc-logo" />
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#0D2317", fontFamily: "'Jost', sans-serif" }}>Appibrium Technology Co.</p>
              <p style={{ fontSize: 11, color: "#6B8F7C", marginTop: 2 }}>23/A Shukrabad, Dhaka, Bangladesh</p>
              <p style={{ fontSize: 11, color: "#6B8F7C" }}>hello@appibrium.com</p>
            </div>
          </div>

          {/* Divider */}
          <div className="doc-accent-line" />

          {/* Meta Strip */}
          <div className="doc-meta-strip">
            <div className="meta-item">
              <span className="meta-label">Proposal For</span>
              <span className="meta-value">{client?.name || "Valued Client"}</span>
              {client?.email && <span className="meta-sub">{client.email}</span>}
            </div>
            <div className="meta-item">
              <span className="meta-label">Reference</span>
              <span className="meta-value" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{proposalRef}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Date Issued</span>
              <span className="meta-value">{formatDate(proposal.$createdAt)}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Status</span>
              <span className={`meta-badge ${status === "accepted" ? "meta-badge-accepted" : status === "rejected" ? "meta-badge-rejected" : "meta-badge-review"}`}>
                {status === "accepted" ? "✓ Accepted" : status === "rejected" ? "✗ Declined" : "Under Review"}
              </span>
            </div>
          </div>

          {/* Title */}
          <div style={{ padding: "32px 40px 0" }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0D2317", fontFamily: "'Jost', sans-serif", lineHeight: 1.2, marginBottom: 6 }}>{proposal.title}</h1>
            <p style={{ fontSize: 12, color: "#6B8F7C" }}>Prepared with care by Appibrium Technology Co. · Version {proposal.version}</p>
          </div>

          {/* Content */}
          <div
            className="proposal-body"
            dangerouslySetInnerHTML={{
              __html: proposal.content_html || `
                <h2>Project Overview</h2>
                <p>Thank you for the opportunity to present this proposal. This document outlines our approach, deliverables, and commercial terms tailored to your specific requirements.</p>
                <p>Please review the details below and feel free to reach out if you have any questions before signing.</p>
              `,
            }}
          />

          {/* Inline Authentication box if not logged in & status is review */}
          {status === "review" && !isAuthorized && (
            <div className="no-print" style={{ margin: "0 40px 28px", padding: 24, background: "#FAF9F5", border: "1px solid #EEDFBE", borderRadius: 8 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#F5ECD5", display: "flex", alignItems: "center", justifyContent: "center", color: "#B37D00", flexShrink: 0 }}>
                  <Lock size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0D2317", fontFamily: "var(--font-heading)" }}>Review and Sign Securely</h3>
                  <p style={{ fontSize: 12, color: "#6B8F7C", lineHeight: 1.5, marginTop: 4 }}>
                    To protect document confidentiality, only the authorized recipient (<strong style={{ color: "#0D2317" }}>{client?.email}</strong>) can sign this proposal.
                    Please log in via the instant Magic Link below to verify your identity.
                  </p>

                  {currentUser ? (
                    <div style={{ marginTop: 12, padding: "8px 12px", background: "#FEF2F2", border: "1px solid #FAC5C5", borderRadius: 6, fontSize: 12, color: "#D14F4F", display: "flex", alignItems: "center", gap: 6 }}>
                      <AlertCircle size={14} /> Currently logged in as: <strong>{currentUser.email}</strong>. Please switch accounts.
                    </div>
                  ) : null}

                  {authStatus === "sent" ? (
                    <div style={{ marginTop: 14, padding: "10px 14px", background: "#E6FAF3", border: "1px solid #B3E8D2", borderRadius: 6, display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#00965C" }}>
                      <CheckCircle2 size={16} /> Magic Link sent! Please check your inbox at <strong>{client?.email}</strong>.
                    </div>
                  ) : (
                    <form onSubmit={handleSendMagicLink} style={{ display: "flex", gap: 10, marginTop: 14, maxWidth: 420 }}>
                      <div style={{ position: "relative", flex: 1 }}>
                        <Mail size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#6B8F7C" }} />
                        <input className="input-base" type="email" value={client?.email || ""} readOnly style={{ paddingLeft: 30, background: "#F0EFEB", color: "#6B8F7C", fontSize: 12, cursor: "not-allowed" }} />
                      </div>
                      <button type="submit" className="btn btn-primary" style={{ fontSize: 12, padding: "0 16px" }} disabled={authStatus === "sending"}>
                        {authStatus === "sending" ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : "Verify Identity"}
                      </button>
                    </form>
                  )}

                  {authStatus === "error" && (
                    <p style={{ color: "#D14F4F", fontSize: 11, marginTop: 6, fontWeight: 500 }}>{authError}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Signature Section (accepted state) */}
          {status === "accepted" && (
            <div className="signature-section">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#6B8F7C", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Accepted By</p>
                  <div style={{ borderBottom: "1px solid #0D2317", paddingBottom: 4, marginBottom: 6, minWidth: 180 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#0D2317" }}>{client?.name || "Client"}</p>
                  </div>
                  <p style={{ fontSize: 11, color: "#6B8F7C" }}>Date: {formatDate(new Date().toISOString())}</p>
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#6B8F7C", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Authorized By</p>
                  <div style={{ borderBottom: "1px solid #0D2317", paddingBottom: 4, marginBottom: 6, minWidth: 180 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#0D2317" }}>Appibrium Technology Co.</p>
                  </div>
                  <p style={{ fontSize: 11, color: "#6B8F7C" }}>Date: {formatDate(proposal.$createdAt)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="doc-footer">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <img src="/branding_assets/logos/icon/icon_mint.svg" alt="Appibrium" style={{ width: 18, height: 18, opacity: 0.6 }} />
              <span>© {new Date().getFullYear()} Appibrium Technology Co. · All rights reserved · appibrium.com</span>
            </div>
            <span>Confidential Business Document</span>
          </div>

          {/* PDF-only footer */}
          <div className="pdf-footer">
            <span>© {new Date().getFullYear()} Appibrium Technology Co. · Confidential</span>
            <span>Page 1 of 1</span>
          </div>
        </div>
      </main>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .proposal-portal {
          min-height: 100vh;
          background: #EEF5F0;
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        }

        /* ─── Header ─── */
        .portal-header {
          position: sticky;
          top: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
          height: 56px;
          background: #0D2317;
          box-shadow: 0 2px 12px rgba(0,0,0,0.15);
        }

        /* ─── Main ─── */
        .portal-main {
          padding: 36px 20px 60px;
        }

        /* ─── Document ─── */
        .proposal-doc {
          position: relative;
          max-width: 860px;
          margin: 0 auto;
          background: #FFFFFF;
          border-radius: 12px;
          box-shadow: 0 8px 40px rgba(13,35,23,0.12), 0 0 0 1px rgba(13,35,23,0.06);
          overflow: hidden;
        }

        .doc-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 32px 40px 24px;
          background: #FAFCFA;
          border-bottom: 1px solid #E8F2EC;
        }
        .doc-logo {
          height: 48px;
          width: auto;
        }
        .doc-accent-line {
          height: 3px;
          background: linear-gradient(90deg, #00B872 0%, #00E090 60%, transparent 100%);
        }

        .doc-meta-strip {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          border-bottom: 1px solid #E8F2EC;
        }
        .meta-item {
          padding: 16px 24px;
          border-right: 1px solid #E8F2EC;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .meta-item:last-child { border-right: none; }

        .meta-label {
          font-size: 10px;
          font-weight: 600;
          color: #6B8F7C;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 3px;
        }
        .meta-value { font-size: 13px; font-weight: 600; color: #0D2317; }
        .meta-sub   { font-size: 11px; color: #6B8F7C; margin-top: 1px; }

        .meta-badge {
          display: inline-block;
          padding: 2px 10px;
          border-radius: 99px;
          font-size: 11px;
          font-weight: 600;
          margin-top: 2px;
        }
        .meta-badge-review   { background: #EEF4FF; color: #3B72D4; }
        .meta-badge-accepted { background: #E6FAF3; color: #00965C; }
        .meta-badge-rejected { background: #FEF2F2; color: #D14F4F; }

        /* ─── Body ─── */
        .proposal-body {
          padding: 28px 40px 32px;
          font-size: 13.5px;
          line-height: 1.75;
          color: #1E3A27;
        }
        .proposal-body h2 {
          font-size: 15px;
          font-weight: 700;
          color: #0D2317;
          font-family: 'Jost', sans-serif;
          margin-top: 28px;
          margin-bottom: 10px;
          padding-bottom: 7px;
          border-bottom: 2px solid #E8F2EC;
          border-left: 3px solid #00B872;
          padding-left: 10px;
        }
        .proposal-body h2:first-child { margin-top: 0; }
        .proposal-body p  { margin-bottom: 12px; }
        .proposal-body ul { margin-bottom: 14px; padding-left: 22px; }
        .proposal-body li { margin-bottom: 5px; }
        .proposal-body strong { color: #0D2317; font-weight: 700; }
        .proposal-body table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        .proposal-body th { background: #F0FAF5; padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 700; color: #6B8F7C; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #D6EDE1; }
        .proposal-body td { padding: 10px 12px; border-bottom: 1px solid #F0FAF5; font-size: 13px; color: #1E3A27; }
        .proposal-body tr:last-child td { border-bottom: none; }

        /* ─── Signature ─── */
        .signature-section {
          margin: 0 40px 28px;
          padding: 20px;
          background: #F0FAF5;
          border: 1px solid #D6EDE1;
          border-radius: 8px;
        }

        /* ─── Footer ─── */
        .doc-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 40px;
          background: #F6FBF8;
          border-top: 1px solid #E8F2EC;
          font-size: 11px;
          color: #6B8F7C;
        }

        /* ─── PDF / Print ─── */
        .pdf-watermark { display: none; }
        .pdf-header    { display: none; }
        .pdf-footer    { display: none; }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        @media print {
          @page { size: A4; margin: 20mm 15mm 20mm 15mm; }

          html, body { background: #fff !important; }

          .no-print { display: none !important; }
          .portal-main { padding: 0 !important; }
          .portal-header { display: none !important; }

          .proposal-doc {
            max-width: 100%;
            border-radius: 0;
            box-shadow: none;
            border: none;
          }

          .doc-footer { display: none; }

          .pdf-watermark {
            display: flex !important;
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: 0;
            opacity: 0.035;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            justify-content: center;
            align-items: center;
          }

          .pdf-watermark img {
            width: 320px;
            height: auto;
          }

          .pdf-header {
            display: flex !important;
            position: fixed;
            top: 0; left: 0; right: 0;
            height: 26px;
            background: #0D2317;
            align-items: center;
            justify-content: space-between;
            padding: 0 16px;
            font-size: 8px;
            color: rgba(255,255,255,0.7);
            font-family: 'Jost', sans-serif;
            letter-spacing: 0.1em;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .pdf-footer {
            display: flex !important;
            position: fixed;
            bottom: 0; left: 0; right: 0;
            height: 24px;
            border-top: 1px solid rgba(0, 184, 114, 0.2);
            align-items: center;
            justify-content: space-between;
            padding: 0 16px;
            font-size: 8px;
            color: #6B8F7C;
            font-family: 'Jost', sans-serif;
            letter-spacing: 0.08em;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          h1, h2, h3, h4 {
            page-break-after: avoid;
          }

          p, ul, ol, table, tr {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}

export default function PublicProposalPortal() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#F4FBF7", gap: 14 }}>
        <Loader2 size={28} style={{ color: "#00B872", animation: "spin 1s linear infinite" }} />
        <p style={{ fontSize: 13, color: "#6B8F7C", fontFamily: "system-ui, sans-serif" }}>Loading secure workspace...</p>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <PublicProposalPortalContent />
    </Suspense>
  );
}
