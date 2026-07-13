"use client";

import React, { useState, useEffect } from "react";
import { Download, Check, X, ShieldAlert, Loader2, Landmark } from "lucide-react";
import { getProposals } from "@/services/proposals";
import { getClient } from "@/services/crm";
import type { Proposal, Client } from "@/types";
import { formatDate } from "@/utils";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function PublicProposalPortal() {
  const params = useParams();
  const token = params?.token as string;

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [status, setStatus] = useState<"review" | "accepted" | "rejected">("review");
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (!proposal) return;
    setDownloading(true);
    try {
      const htmlBody = document.querySelector(".proposal-content")?.innerHTML || "";
      const fullHtml = `
        <html>
          <head>
            <style>
              body { font-family: system-ui, sans-serif; padding: 40px; color: #0D2317; }
              h1 { font-size: 24px; border-bottom: 2px solid #00B872; padding-bottom: 10px; margin-bottom: 20px; }
              h2 { font-size: 16px; margin-top: 24px; border-bottom: 1px solid #D6EDE1; padding-bottom: 6px; }
              p { font-size: 13px; line-height: 1.6; margin-bottom: 12px; }
              ul { margin-bottom: 12px; padding-left: 20px; }
              li { font-size: 13px; margin-bottom: 6px; }
            </style>
          </head>
          <body>
            <h1>${proposal.title}</h1>
            <p>Proposal Reference: PROP-${proposal.$id.toUpperCase()}</p>
            <p>Date: ${formatDate(proposal.$createdAt)}</p>
            <hr style="border: 0; border-top: 1px solid #D6EDE1; margin: 20px 0;" />
            ${htmlBody}
          </body>
        </html>
      `;

      const response = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html: fullHtml,
          filename: `proposal_${proposal.$id}.pdf`,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `proposal_${proposal.$id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error(error);
      alert("Failed to download PDF. Falling back to browser print.");
      window.print();
    } finally {
      setDownloading(false);
    }
  }

  useEffect(() => {
    async function loadProposal() {
      setLoading(true);
      const allProps = await getProposals();
      const found = allProps.find((p) => p.public_token === token) || allProps[0];
      if (found) {
        setProposal(found);
        setStatus(found.status as any);
        const cl = await getClient(found.client_id);
        setClient(cl);
      }
      setLoading(false);
    }
    if (token) {
      loadProposal();
    }
  }, [token]);

  async function handleAccept() {
    setSigning(true);
    await new Promise((r) => setTimeout(r, 1500));
    setStatus("accepted");
    setSigning(false);
    alert("Proposal accepted! Thank you. We will contact you shortly.");
  }

  async function handleReject() {
    const reason = prompt("Please enter the reason for rejection (optional):");
    if (reason === null) return;
    setSigning(true);
    await new Promise((r) => setTimeout(r, 1000));
    setStatus("rejected");
    setSigning(false);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "var(--background)", color: "var(--foreground-muted)" }}>
        <p>Loading proposal portal...</p>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "var(--background)", gap: 14 }}>
        <ShieldAlert size={48} style={{ color: "#D14F4F" }} />
        <p style={{ color: "var(--foreground-muted)" }}>Invalid token or proposal not found.</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", padding: "40px 20px" }}>
      <div style={{ maxWidth: 840, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Header Bar */}
        <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src="/branding_assets/logos/lockup/lockup_w4_light.svg"
              alt="Appibrium"
              style={{ height: 24, width: "auto" }}
            />
            <div style={{ width: 1, height: 16, background: "var(--border)" }} />
            <span className="studio-mark" style={{ fontWeight: 800, textTransform: "uppercase", fontSize: 14, letterSpacing: "0.08em", color: "var(--accent)" }}>
              Studio
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={handleDownload} disabled={downloading}>
              {downloading ? (
                <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Generating...</>
              ) : (
                <><Download size={13} /> Download PDF</>
              )}
            </button>
            {status === "accepted" ? (
              <span className="badge badge-accepted" style={{ fontSize: 12, padding: "5px 12px" }}>
                ✓ Accepted
              </span>
            ) : status === "rejected" ? (
              <span className="badge badge-rejected" style={{ fontSize: 12, padding: "5px 12px" }}>
                ✗ Declined
              </span>
            ) : (
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn btn-danger" style={{ padding: "6px 12px", fontSize: 12 }} onClick={handleReject} disabled={signing}>
                  Decline
                </button>
                <button className="btn btn-primary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={handleAccept} disabled={signing}>
                  {signing ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={13} />}
                  Accept & Sign
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Info Strip */}
        <div className="card" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, padding: "16px 20px" }}>
          <div>
            <span style={{ fontSize: 10, textTransform: "uppercase", color: "var(--foreground-muted)", fontWeight: 600, letterSpacing: "0.05em" }}>Prepared For</span>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", marginTop: 2 }}>{client?.name || "Valued Client"}</p>
          </div>
          <div>
            <span style={{ fontSize: 10, textTransform: "uppercase", color: "var(--foreground-muted)", fontWeight: 600, letterSpacing: "0.05em" }}>Proposal Date</span>
            <p style={{ fontSize: 13, fontWeight: 500, color: "var(--foreground-2)", marginTop: 2 }}>{formatDate(proposal.$createdAt)}</p>
          </div>
          <div>
            <span style={{ fontSize: 10, textTransform: "uppercase", color: "var(--foreground-muted)", fontWeight: 600, letterSpacing: "0.05em" }}>Status</span>
            <p style={{ marginTop: 2 }}>
              <span className={`badge badge-${status === "accepted" ? "accepted" : status === "rejected" ? "rejected" : "planning"}`}>
                {status === "accepted" ? "Accepted" : status === "rejected" ? "Declined" : "Under Review"}
              </span>
            </p>
          </div>
        </div>

        {/* PDF Watermark & Print Headers (hidden in screen, shown in print) */}
        <div className="pdf-watermark">APPIBRIUM</div>
        <div className="pdf-header">
          <span>APPIBRIUM TECHNOLOGY CO.</span>
          <span>PROPOSAL: PROP-{proposal.$id.toUpperCase()}</span>
        </div>
        <div className="pdf-footer">
          <span>Confidential Business Document</span>
          <span>Page 1 of 1</span>
        </div>

        {/* Document Body */}
        <div className="card" style={{ padding: "40px", minHeight: 600 }}>
          <div style={{ borderBottom: "2px solid var(--accent)", paddingBottom: 20, marginBottom: 30, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--font-heading)" }}>{proposal.title}</h1>
              <p style={{ fontSize: 12, color: "var(--foreground-muted)", marginTop: 4 }}>Proposal ID: PROP-{proposal.$id.toUpperCase()}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)" }}>Appibrium Technology Co.</p>
              <p style={{ fontSize: 11, color: "var(--foreground-muted)" }}>Dhaka, Bangladesh</p>
            </div>
          </div>

          <div
            className="proposal-content"
            style={{ fontSize: 13, lineHeight: 1.7, color: "var(--foreground-2)" }}
            dangerouslySetInnerHTML={{
              __html:
                proposal.content_html ||
                `
                <h2>Project Overview</h2>
                <p>Welcome to your project workspace. This proposal details the deliverables, commercials, and specifications tailored to your requirements.</p>
                `,
            }}
          />
        </div>
      </div>
      <style>{`
        .proposal-content h2 { font-size: 16px; font-weight: 700; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid var(--border); padding-bottom: 6px; }
        .proposal-content p { margin-bottom: 14px; }
        .proposal-content ul { margin-bottom: 14px; padding-left: 20px; }
        .proposal-content li { margin-bottom: 6px; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .pdf-watermark { display: none; }
        .pdf-header { display: none; }
        .pdf-footer { display: none; }

        @media print {
          @page {
            size: A4;
            margin: 20mm 15mm 20mm 15mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            padding-top: 30px;
            padding-bottom: 30px;
          }
          .card {
            border: none !important;
            box-shadow: none !important;
            background: none !important;
            padding: 0 !important;
          }
          .pdf-watermark {
            display: block !important;
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 80px;
            color: rgba(0, 184, 114, 0.06) !important;
            font-weight: 900;
            font-family: 'Jost', sans-serif;
            text-transform: uppercase;
            letter-spacing: 0.25em;
            pointer-events: none;
            z-index: -1000;
            white-space: nowrap;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .pdf-header {
            display: flex !important;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 30px;
            border-bottom: 1px solid rgba(0, 184, 114, 0.15);
            align-items: center;
            justify-content: space-between;
            font-size: 8px;
            color: #777777;
            font-family: 'Jost', sans-serif;
            letter-spacing: 0.1em;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .pdf-footer {
            display: flex !important;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 30px;
            border-top: 1px solid rgba(0, 184, 114, 0.15);
            align-items: center;
            justify-content: space-between;
            font-size: 8px;
            color: #777777;
            font-family: 'Jost', sans-serif;
            letter-spacing: 0.1em;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
