"use server";

import { INTERNAL_PDF_HEADER, internalPdfKey } from "@/lib/pdf-auth";

/**
 * Renders a page to PDF through /api/pdf.
 *
 * Importing the PDF service directly here would need the Chromium binaries
 * traced into every page route whose Server Actions send email — 66MB apiece.
 * Going over HTTP keeps that weight in one function. Returns null on failure so
 * a missing attachment never blocks the email itself.
 */
async function renderPdfAttachment(url: string): Promise<string | null> {
  try {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").trim().replace(/\/$/, "");
    const res = await fetch(`${appUrl}/api/pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json", [INTERNAL_PDF_HEADER]: internalPdfKey() },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      console.error("PDF attachment render failed:", res.status, (await res.text()).slice(0, 200));
      return null;
    }
    return Buffer.from(await res.arrayBuffer()).toString("base64");
  } catch (err) {
    console.error("PDF attachment render error:", err);
    return null;
  }
}

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; content: string }>;
}) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("Resend API key is not configured.");
      return { success: false, error: "Email provider not configured." };
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || "Appibrium <hello@appibrium.com>";
    const payload: {
      from: string; to: string[]; subject: string; html: string;
      attachments?: Array<{ filename: string; content: string }>;
    } = {
      from: fromEmail,
      to: [to],
      subject: subject,
      html: html,
    };

    if (attachments && attachments.length > 0) {
      payload.attachments = attachments;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        ...payload,
        from: payload.from.includes("onboarding@resend.dev") ? "Appibrium <onboarding@resend.dev>" : payload.from,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Resend sendEmail error:", errText);
      return { success: false, error: errText };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error: unknown) {
    console.error("sendEmail exception:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to send email." };
  }
}

export async function sendProjectNotification(clientEmail: string, clientName: string, projectName: string) {
  const subject = `New Project Initialized: ${projectName}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0d2317; font-family: sans-serif; font-size: 18px; margin-bottom: 12px;">Hello ${clientName},</h2>
      <p style="font-size: 14px; color: #334155; line-height: 1.5; margin-bottom: 20px;">We are excited to inform you that a new project has been initialized for you at Appibrium.</p>
      <div style="background: #f4fbf7; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #d6ede1;">
        <p style="margin: 0; font-size: 12px; font-weight: 700; color: #6b8f7c; text-transform: uppercase; letter-spacing: 0.05em;">Project Title:</p>
        <p style="margin: 4px 0 0 0; color: #0d2317; font-size: 16px; font-weight: 700;">${projectName}</p>
      </div>
      <p style="font-size: 14px; color: #334155; line-height: 1.5;">Our team will keep you updated on progress. You can access your client portal at any time to review progress.</p>
      <p style="margin-top: 30px; font-size: 12px; color: #6b8f7c; border-top: 1px solid #f1f5f9; padding-top: 14px;">Best regards,<br><strong>Appibrium Technology Co.</strong></p>
    </div>
  `;
  return sendEmail({ to: clientEmail, subject, html });
}

export async function sendInvoiceNotification(clientEmail: string, clientName: string, invoiceTitle: string, total: string, token: string) {
  const subject = `New Invoice Issued: ${invoiceTitle}`;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").trim();
  const portalUrl = `${appUrl}/public/invoice/${token}`;

  const invoicePdf = await renderPdfAttachment(portalUrl);
  const attachments = invoicePdf
    ? [{ filename: `${invoiceTitle.replace(/[^a-zA-Z0-9]/g, "_")}_invoice.pdf`, content: invoicePdf }]
    : undefined;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0d2317; font-family: sans-serif; font-size: 18px; margin-bottom: 12px;">Hello ${clientName},</h2>
      <p style="font-size: 14px; color: #334155; line-height: 1.5; margin-bottom: 20px;">An invoice has been generated for your project at Appibrium. A copy has been attached to this email.</p>
      <div style="background: #f4fbf7; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #d6ede1;">
        <p style="margin: 0; font-size: 12px; font-weight: 700; color: #6b8f7c; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Invoice details:</p>
        <p style="margin: 4px 0; color: #0d2317; font-size: 14px;">Title: <strong>${invoiceTitle}</strong></p>
        <p style="margin: 4px 0; color: #00b872; font-size: 16px; font-weight: 700; margin-top: 8px;">Amount Due: ${total}</p>
      </div>
      <p style="margin: 24px 0;">
        <a href="${portalUrl}" target="_blank" style="background: #00b872; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 13px;">View & Pay Invoice Online</a>
      </p>
      <p style="font-size: 14px; color: #334155; line-height: 1.5;">If you have any questions regarding this billing, please reach out to us.</p>
      <p style="margin-top: 30px; font-size: 12px; color: #6b8f7c; border-top: 1px solid #f1f5f9; padding-top: 14px;">Best regards,<br><strong>Appibrium Technology Co.</strong></p>
    </div>
  `;
  return sendEmail({ to: clientEmail, subject, html, attachments });
}

export async function sendProposalNotification(clientEmail: string, clientName: string, proposalTitle: string, token: string) {
  const subject = `New Business Proposal: ${proposalTitle}`;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").trim();
  const portalUrl = `${appUrl}/public/proposal/${token}`;

  const proposalPdf = await renderPdfAttachment(portalUrl);
  const attachments = proposalPdf
    ? [{ filename: `${proposalTitle.replace(/[^a-zA-Z0-9]/g, "_")}_proposal.pdf`, content: proposalPdf }]
    : undefined;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0d2317; font-family: sans-serif; font-size: 18px; margin-bottom: 12px;">Hello ${clientName},</h2>
      <p style="font-size: 14px; color: #334155; line-height: 1.5; margin-bottom: 20px;">We have prepared a new business proposal for you to review. A copy has been attached to this email.</p>
      <div style="background: #f4fbf7; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #d6ede1;">
        <p style="margin: 0; font-size: 12px; font-weight: 700; color: #6b8f7c; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Proposal details:</p>
        <p style="margin: 4px 0; color: #0d2317; font-size: 14px;">Title: <strong>${proposalTitle}</strong></p>
      </div>
      <p style="margin: 24px 0;">
        <a href="${portalUrl}" target="_blank" style="background: #00b872; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 13px;">Review & Sign Proposal Online</a>
      </p>
      <p style="font-size: 14px; color: #334155; line-height: 1.5;">Please review and accept the terms of the proposal online using your secure client portal link.</p>
      <p style="margin-top: 30px; font-size: 12px; color: #6b8f7c; border-top: 1px solid #f1f5f9; padding-top: 14px;">Best regards,<br><strong>Appibrium Technology Co.</strong></p>
    </div>
  `;
  return sendEmail({ to: clientEmail, subject, html, attachments });
}

export async function sendPayoutNotification(
  personEmail: string,
  personName: string,
  amount: string,
  reference: string,
  paidOn: string,
  projectName?: string,
  outstanding?: string
) {
  const subject = `Payment Released: ${amount}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0d2317; font-family: sans-serif; font-size: 18px; margin-bottom: 12px;">Hello ${personName},</h2>
      <p style="font-size: 14px; color: #334155; line-height: 1.5; margin-bottom: 20px;">This is to confirm that a payment has been released to you by Appibrium Technology Co.</p>
      <div style="background: #f4fbf7; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #d6ede1;">
        <p style="margin: 0; font-size: 12px; font-weight: 700; color: #6b8f7c; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Payment details</p>
        <p style="margin: 4px 0; color: #00b872; font-size: 20px; font-weight: 700;">${amount}</p>
        <p style="margin: 8px 0 0 0; color: #334155; font-size: 13px;">For: <strong>${reference}</strong></p>
        ${projectName ? `<p style="margin: 4px 0 0 0; color: #334155; font-size: 13px;">Project: <strong>${projectName}</strong></p>` : ""}
        <p style="margin: 4px 0 0 0; color: #334155; font-size: 13px;">Date: <strong>${paidOn}</strong></p>
      </div>
      ${outstanding ? `<p style="font-size: 13px; color: #334155; line-height: 1.5;">Remaining balance on your engagements: <strong>${outstanding}</strong></p>` : ""}
      <p style="font-size: 14px; color: #334155; line-height: 1.5;">Please confirm receipt of this payment. If anything looks incorrect, reply to this email and we will review it right away.</p>
      <p style="margin-top: 30px; font-size: 12px; color: #6b8f7c; border-top: 1px solid #f1f5f9; padding-top: 14px;">Thank you for your work,<br><strong>Appibrium Technology Co.</strong></p>
    </div>
  `;
  return sendEmail({ to: personEmail, subject, html });
}

export async function sendCustomNotificationEmail(
  clientEmail: string,
  clientName: string,
  title: string,
  message: string
) {
  const subject = `[Notification] ${title}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0d2317; font-family: sans-serif; font-size: 18px; margin-bottom: 12px;">Hello ${clientName},</h2>
      <p style="font-size: 14px; color: #334155; line-height: 1.5; margin-bottom: 20px;">You have received a new notification alert from Appibrium:</p>
      <div style="background: #f4fbf7; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #d6ede1;">
        <p style="margin: 0; font-size: 14px; font-weight: 700; color: #0d2317; margin-bottom: 6px;">${title}</p>
        <p style="margin: 0; color: #334155; font-size: 13px; line-height: 1.5;">${message}</p>
      </div>
      <p style="font-size: 14px; color: #334155; line-height: 1.5;">Please log in to your dashboard to view more details.</p>
      <p style="margin-top: 30px; font-size: 12px; color: #6b8f7c; border-top: 1px solid #f1f5f9; padding-top: 14px;">Best regards,<br><strong>Appibrium Technology Co.</strong></p>
    </div>
  `;
  return sendEmail({ to: clientEmail, subject, html });
}
