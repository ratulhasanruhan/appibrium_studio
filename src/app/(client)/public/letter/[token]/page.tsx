"use client";

import React, { useState, useEffect, Suspense } from "react";
import { ShieldAlert, Loader2, Printer, Check, Lock, Mail, AlertCircle, CheckCircle2, X } from "lucide-react";
import type { Letter, Client } from "@/types";
import { formatDate } from "@/utils";
import { COMPANY } from "@/lib/company-profile";
type CompanyDetails = { name: string; address: string; email: string; phone: string; website: string; logo_url: string };
import { useParams, useSearchParams } from "next/navigation";
import { account } from "@/lib/appwrite/client";

function PublicLetterContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params?.token as string;

  const [letter, setLetter] = useState<Letter | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [status, setStatus] = useState<Letter["status"]>("draft");

  const [currentUser, setCurrentUser] = useState<{ email: string; name: string } | null>(null);
  const [authStatus, setAuthStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [authError, setAuthError] = useState("");
  const [verifyingSession, setVerifyingSession] = useState(false);

  useEffect(() => {
    const userId = searchParams?.get("userId");
    const secret = searchParams?.get("secret");

    async function checkAuth() {
      if (userId && secret) {
        setVerifyingSession(true);
        try {
          try { await account.deleteSession("current"); } catch { /* no active session */ }
          await account.updateMagicURLSession(userId, secret);
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err) {
          console.error("Magic link verification failed:", err);
        } finally {
          setVerifyingSession(false);
        }
      }
      try {
        const user = await account.get();
        setCurrentUser({ email: user.email, name: user.name });
      } catch {
        setCurrentUser(null);
      }
    }
    checkAuth();
  }, [searchParams]);

  useEffect(() => {
    async function load() {
      if (!token) return;
      setLoading(true);
      const res = await fetch(`/api/public?type=letter&token=${encodeURIComponent(token)}`);
      if (res.ok) {
        const data = await res.json();
        setLetter(data.letter);
        setStatus(data.letter.status);
        setClient(data.client);
        setCompany({
          name: data.company?.name || COMPANY.name,
          address: data.company?.address || COMPANY.address,
          email: data.company?.email || COMPANY.email,
          phone: data.company?.phone || "",
          website: data.company?.website || COMPANY.website,
          logo_url: data.company?.logo_url || "",
        });
        if (data.letter.status === "sent") {
          fetch("/api/public", { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "letter", token, action: "view" }) }).catch(() => {});
        }
      }
      setLoading(false);
    }
    load();
  }, [token]);

  const isAuthorized = Boolean(currentUser && client && currentUser.email === client.email);

  async function handleSign() {
    if (!letter) return;
    setSigning(true);
    const res = await fetch("/api/public", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "letter", token, action: "sign", name: currentUser?.name || client?.name || "" }),
    });
    setSigning(false);
    if (res.ok) setStatus("signed");
    else alert("Could not record signature.");
  }

  async function handleDecline() {
    if (!letter) return;
    if (!confirm("Decline this document? This cannot be undone.")) return;
    setSigning(true);
    await fetch("/api/public", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "letter", token, action: "decline" }) });
    setSigning(false);
    setStatus("declined");
  }

  async function handleSendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!client?.email) return;
    setAuthStatus("sending");
    setAuthError("");
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: client.email }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to send magic link.");
      await account.createMagicURLToken("unique()", client.email, window.location.href);
      setAuthStatus("sent");
    } catch (err) {
      setAuthStatus("error");
      setAuthError(err instanceof Error ? err.message : "Failed to send verification link.");
    }
  }

  if (loading || verifyingSession) {
    return (
      <div className="lt-state">
        <Loader2 size={28} style={{ color: "#00B872", animation: "spin 1s linear infinite" }} />
        <p>{verifyingSession ? "Verifying your identity..." : "Loading document..."}</p>
        <style>{`.lt-state{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#F4FBF7;gap:14px;font-family:system-ui,sans-serif}.lt-state p{font-size:13px;color:#6B8F7C}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const co = company;

  if (!letter || !co) {
    return (
      <div className="lt-state">
        <ShieldAlert size={48} style={{ color: "#D14F4F" }} />
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#0D2317" }}>Document Not Found</h1>
        <p>This link may be invalid or the document has been removed.</p>
        <style>{`.lt-state{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#F4FBF7;gap:14px;font-family:system-ui,sans-serif}.lt-state p{font-size:13px;color:#6B8F7C}`}</style>
      </div>
    );
  }

  const signed = status === "signed";
  const declined = status === "declined";
  const recipientName = client?.name || letter.recipient_name;

  return (
    <div className="letter-portal">
      {/* ─── Toolbar ─── */}
      <header className="lt-bar no-print">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/branding_assets/logos/lockup/lockup_w4_dark.svg" alt="Appibrium" style={{ height: 26 }} />
          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.25)" }} />
          <span style={{ fontFamily: "'Jost', sans-serif", fontWeight: 800, fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.9)" }}>Studio</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {signed ? (
            <span className="lt-pill lt-pill-ok"><Check size={12} /> Signed</span>
          ) : declined ? (
            <span className="lt-pill lt-pill-no"><X size={12} /> Declined</span>
          ) : letter.requires_signature && !isAuthorized ? (
            <button className="lt-pill lt-pill-warn" onClick={() => document.getElementById("lt-auth")?.scrollIntoView({ behavior: "smooth" })}>
              <Lock size={12} /> Verify to sign
            </button>
          ) : letter.requires_signature ? (
            <>
              <button className="lt-btn-ghost" onClick={handleDecline} disabled={signing}>Decline</button>
              <button className="lt-btn-accent" onClick={handleSign} disabled={signing}>
                {signing ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={13} />} Sign Document
              </button>
            </>
          ) : null}
          <button className="lt-btn-ghost" onClick={() => window.print()}><Printer size={13} /> Download PDF</button>
        </div>
      </header>

      {/* ─── A4 Sheet ─── */}
      <main className="lt-main">
        <div className="lt-sheet">
          <div className="lt-watermark"><img src="/branding_assets/logos/icon/icon_mint.svg" alt="" /></div>

          {/* Letterhead */}
          <header className="lt-head">
            <img src={co.logo_url || "/branding_assets/logos/lockup/appibrium_w4_light.png"} alt={co.name} className="lt-logo" />
            <div className="lt-head-meta">
              <p className="lt-co">{co.name}</p>
              <p>{co.address}</p>
              <p>{[co.email, co.phone, co.website].filter(Boolean).join(" · ")}</p>
            </div>
          </header>
          <div className="lt-rule" />

          {/* Reference strip */}
          <div className="lt-ref">
            <span><strong>Ref:</strong> {letter.reference}</span>
            <span><strong>Date:</strong> {formatDate(letter.issue_date)}</span>
          </div>

          {/* Recipient */}
          {(recipientName || letter.recipient_address) && (
            <div className="lt-to">
              <span className="lt-to-label">To</span>
              {recipientName && <p className="lt-to-name">{recipientName}</p>}
              {letter.recipient_role && <p>{letter.recipient_role}</p>}
              {(client?.address || letter.recipient_address) && <p>{client?.address || letter.recipient_address}</p>}
              {client?.email && <p>{client.email}</p>}
            </div>
          )}

          {/* Subject */}
          <h1 className="lt-subject">{letter.title}</h1>

          {/* Body */}
          <div className="lt-body" dangerouslySetInnerHTML={{ __html: letter.body_html }} />

          {/* Signatures */}
          <div className="lt-signs">
            {letter.show_company_signature && (
              <div className="lt-sign">
                <div className="lt-sign-mark">{letter.signatory_signature || letter.signatory_name}</div>
                <div className="lt-sign-rule" />
                <p className="lt-sign-name">{letter.signatory_name}</p>
                <p className="lt-sign-title">{letter.signatory_title}</p>
                <p className="lt-sign-title">{co.name}</p>
              </div>
            )}
            {letter.requires_signature && (
              <div className="lt-sign">
                {/* Always rendered so both signature rules sit on the same baseline. */}
                <div className="lt-sign-mark">{signed ? letter.signed_by_name || recipientName : ""}</div>
                <div className="lt-sign-rule" />
                <p className="lt-sign-name">{recipientName || "Recipient"}</p>
                <p className="lt-sign-title">
                  {signed && letter.signed_at
                    ? `Signed electronically on ${formatDate(letter.signed_at)}`
                    : "Signature & Date"}
                </p>
              </div>
            )}
          </div>

          {/* Auth box */}
          {letter.requires_signature && !signed && !declined && !isAuthorized && client?.email && (
            <div id="lt-auth" className="lt-auth no-print">
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div className="lt-auth-icon"><Lock size={16} /></div>
                <div style={{ flex: 1 }}>
                  <h3>Verify your identity to sign</h3>
                  <p>Only <strong>{client.email}</strong> can sign this document. We will email you a secure one-time link.</p>
                  {currentUser && (
                    <div className="lt-auth-warn"><AlertCircle size={14} /> Signed in as <strong>{currentUser.email}</strong> — please switch accounts.</div>
                  )}
                  {authStatus === "sent" ? (
                    <div className="lt-auth-ok"><CheckCircle2 size={16} /> Link sent — check your inbox at <strong>{client.email}</strong>.</div>
                  ) : (
                    <form onSubmit={handleSendMagicLink} style={{ display: "flex", gap: 10, marginTop: 14, maxWidth: 420 }}>
                      <div style={{ position: "relative", flex: 1 }}>
                        <Mail size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#6B8F7C" }} />
                        <input value={client.email} readOnly className="lt-auth-input" />
                      </div>
                      <button type="submit" className="lt-btn-accent" disabled={authStatus === "sending"}>
                        {authStatus === "sending" ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : "Send Link"}
                      </button>
                    </form>
                  )}
                  {authStatus === "error" && <p style={{ color: "#D14F4F", fontSize: 11, marginTop: 6 }}>{authError}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <footer className="lt-foot">
            <span>{co.name} · {co.address}</span>
            <span>{letter.reference}</span>
          </footer>
        </div>
      </main>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .letter-portal { min-height: 100vh; background: #EEF5F0; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }

        .lt-bar {
          position: sticky; top: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 32px; height: 56px; background: #0D2317;
          box-shadow: 0 2px 12px rgba(0,0,0,0.15);
        }
        .lt-pill {
          display: inline-flex; align-items: center; gap: 5; gap: 5px;
          padding: 5px 14px; border-radius: 99px; font-size: 12px; font-weight: 600;
          border: 1px solid transparent; cursor: default; font-family: inherit;
        }
        .lt-pill-ok   { background: rgba(0,224,144,0.15); border-color: rgba(0,224,144,0.3); color: #00E090; }
        .lt-pill-no   { background: rgba(209,79,79,0.15); border-color: rgba(209,79,79,0.3); color: #FAA; }
        .lt-pill-warn { background: #08150E; border-color: #E0A900; color: #FFD04D; cursor: pointer; }
        .lt-btn-ghost {
          display: flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 6px;
          background: transparent; border: 1px solid rgba(255,255,255,0.2);
          color: rgba(255,255,255,0.75); font-size: 12px; cursor: pointer; font-family: inherit;
        }
        .lt-btn-accent {
          display: flex; align-items: center; gap: 5px; padding: 6px 16px; border-radius: 6px;
          background: #00E090; border: none; color: #0D2317; font-size: 12px; font-weight: 700;
          cursor: pointer; font-family: 'Jost', sans-serif;
        }

        .lt-main { padding: 36px 20px 60px; }
        .lt-sheet {
          position: relative; max-width: 820px; margin: 0 auto;
          background: #fff; border-radius: 10px;
          box-shadow: 0 8px 40px rgba(13,35,23,0.12), 0 0 0 1px rgba(13,35,23,0.06);
          padding: 46px 56px 32px;
        }

        .lt-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
        .lt-logo { height: 44px; width: auto; }
        .lt-head-meta { text-align: right; font-size: 11px; color: #6B8F7C; line-height: 1.65; }
        .lt-co { font-size: 12.5px; font-weight: 700; color: #0D2317; font-family: 'Jost', sans-serif; }
        .lt-rule { height: 2.5px; margin-top: 14px; background: linear-gradient(90deg, #00B872 0%, #00E090 55%, transparent 100%); }

        .lt-ref {
          display: flex; justify-content: space-between; gap: 16px;
          font-size: 11.5px; color: #4A6B58; padding: 14px 0 0;
        }
        .lt-ref strong { color: #0D2317; font-weight: 700; }

        .lt-to { margin-top: 22px; font-size: 12.5px; color: #4A6B58; line-height: 1.65; }
        .lt-to-label {
          display: block; font-size: 9.5px; font-weight: 700; color: #6B8F7C;
          text-transform: uppercase; letter-spacing: 0.09em; margin-bottom: 4px;
        }
        .lt-to-name { font-size: 13.5px; font-weight: 700; color: #0D2317; font-family: 'Jost', sans-serif; }

        .lt-subject {
          margin: 26px 0 18px; padding-bottom: 10px;
          font-size: 17px; font-weight: 800; color: #0D2317;
          font-family: 'Jost', sans-serif; letter-spacing: -0.01em;
          border-bottom: 1px solid #E8F2EC;
        }

        .lt-body { font-size: 13px; line-height: 1.85; color: #1E3A27; }
        .lt-body p { margin-bottom: 12px; }
        .lt-body strong { color: #0D2317; font-weight: 700; }
        .lt-lead { font-weight: 600; color: #0D2317 !important; }
        .lt-closing { margin-top: 14px; }
        .lt-clause {
          font-size: 13px; font-weight: 700; color: #0D2317; font-family: 'Jost', sans-serif;
          margin: 20px 0 8px; padding-left: 9px; border-left: 3px solid #00B872;
        }
        .lt-list { margin: 0 0 12px; padding-left: 20px; }
        .lt-list li { margin-bottom: 6px; padding-left: 4px; }
        .lt-table { width: 100%; border-collapse: collapse; margin: 6px 0 12px; border: 1px solid #E8F2EC; border-radius: 8px; overflow: hidden; }
        .lt-table td { padding: 9px 14px; border-bottom: 1px solid #F0F7F3; font-size: 12.5px; }
        .lt-table td:first-child { color: #6B8F7C; width: 40%; }
        .lt-table tr:last-child td { border-bottom: none; }

        .lt-signs {
          display: flex; gap: 48px; flex-wrap: wrap;
          margin-top: 46px; padding-top: 4px;
        }
        .lt-sign { min-width: 210px; }
        .lt-sign-mark {
          font-family: 'Alex Brush', cursive; font-size: 34px; line-height: 1.1;
          color: #123A26; height: 40px; display: flex; align-items: flex-end;
          padding-left: 6px;
        }
        .lt-sign-rule { border-bottom: 1px solid #0D2317; margin: 5px 0 7px; }
        .lt-sign-name { font-size: 12.5px; font-weight: 700; color: #0D2317; font-family: 'Jost', sans-serif; }
        .lt-sign-title { font-size: 11px; color: #6B8F7C; line-height: 1.55; }

        .lt-auth {
          margin-top: 32px; padding: 22px;
          background: #FAF9F5; border: 1px solid #EEDFBE; border-radius: 10px;
        }
        .lt-auth-icon {
          width: 36px; height: 36px; border-radius: 50%; background: #F5ECD5;
          display: flex; align-items: center; justify-content: center; color: #B37D00; flex-shrink: 0;
        }
        .lt-auth h3 { font-size: 14px; font-weight: 700; color: #0D2317; font-family: 'Jost', sans-serif; }
        .lt-auth p  { font-size: 12px; color: #6B8F7C; line-height: 1.55; margin-top: 4px; }
        .lt-auth-input {
          width: 100%; padding: 8px 10px 8px 30px; font-size: 12px;
          border: 1px solid #E0DCCF; border-radius: 6px; background: #F0EFEB;
          color: #6B8F7C; font-family: inherit;
        }
        .lt-auth-warn {
          margin-top: 12px; padding: 8px 12px; background: #FEF2F2; border: 1px solid #FAC5C5;
          border-radius: 6px; font-size: 12px; color: #D14F4F; display: flex; align-items: center; gap: 6px;
        }
        .lt-auth-ok {
          margin-top: 14px; padding: 10px 14px; background: #E6FAF3; border: 1px solid #B3E8D2;
          border-radius: 6px; display: flex; align-items: center; gap: 8px; font-size: 12px; color: #00965C;
        }

        .lt-foot {
          display: flex; justify-content: space-between; gap: 16px;
          margin-top: 40px; padding-top: 12px; border-top: 1px solid #E8F2EC;
          font-size: 10px; color: #9CB4A8;
        }

        .lt-watermark { display: none; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        @media print {
          @page { size: A4; margin: 0; }
          html, body { background: #fff !important; }
          .no-print { display: none !important; }
          .lt-main { padding: 0 !important; }
          .lt-sheet {
            max-width: 100%; border-radius: 0; box-shadow: none;
            padding: 18mm 16mm 14mm;
            min-height: 297mm; display: flex; flex-direction: column;
          }
          .lt-foot { margin-top: auto; }
          .lt-watermark {
            display: flex !important; position: fixed; top: 50%; left: 50%;
            transform: translate(-50%, -50%); pointer-events: none; z-index: 0; opacity: 0.03;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
          }
          .lt-watermark img { width: 300px; height: auto; }
          .lt-rule, .lt-clause, .lt-sign-mark { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .lt-clause, .lt-subject { page-break-after: avoid; }
          .lt-signs, .lt-table, .lt-list li { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}

export default function PublicLetterPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#F4FBF7" }}>
        <Loader2 size={28} style={{ color: "#00B872", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <PublicLetterContent />
    </Suspense>
  );
}
