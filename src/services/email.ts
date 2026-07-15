"use server";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("Resend API key is not configured.");
      return { success: false, error: "Email provider not configured." };
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "Appibrium Studio <onboarding@resend.dev>",
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Resend sendEmail error:", errText);
      return { success: false, error: errText };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    console.error("sendEmail exception:", error);
    return { success: false, error: error.message };
  }
}

export async function sendProjectNotification(clientEmail: string, clientName: string, projectName: string) {
  const subject = `New Project Initialized: ${projectName}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0d2317; font-family: sans-serif; font-size: 18px; margin-bottom: 12px;">Hello ${clientName},</h2>
      <p style="font-size: 14px; color: #334155; line-height: 1.5; margin-bottom: 20px;">We are excited to inform you that a new project has been initialized for you at Appibrium Studio.</p>
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
  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/public/invoice/${token}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0d2317; font-family: sans-serif; font-size: 18px; margin-bottom: 12px;">Hello ${clientName},</h2>
      <p style="font-size: 14px; color: #334155; line-height: 1.5; margin-bottom: 20px;">An invoice has been generated for your project at Appibrium Studio.</p>
      <div style="background: #f4fbf7; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #d6ede1;">
        <p style="margin: 0; font-size: 12px; font-weight: 700; color: #6b8f7c; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Invoice details:</p>
        <p style="margin: 4px 0; color: #0d2317; font-size: 14px;">Title: <strong>${invoiceTitle}</strong></p>
        <p style="margin: 4px 0; color: #00b872; font-size: 16px; font-weight: 700; margin-top: 8px;">Amount Due: ${total}</p>
      </div>
      <p style="margin: 24px 0;">
        <a href="${portalUrl}" target="_blank" style="background: #00b872; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 13px;">View & Pay Invoice</a>
      </p>
      <p style="font-size: 14px; color: #334155; line-height: 1.5;">If you have any questions regarding this billing, please reach out to us.</p>
      <p style="margin-top: 30px; font-size: 12px; color: #6b8f7c; border-top: 1px solid #f1f5f9; padding-top: 14px;">Best regards,<br><strong>Appibrium Technology Co.</strong></p>
    </div>
  `;
  return sendEmail({ to: clientEmail, subject, html });
}

export async function sendProposalNotification(clientEmail: string, clientName: string, proposalTitle: string, token: string) {
  const subject = `New Business Proposal: ${proposalTitle}`;
  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/public/proposal/${token}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0d2317; font-family: sans-serif; font-size: 18px; margin-bottom: 12px;">Hello ${clientName},</h2>
      <p style="font-size: 14px; color: #334155; line-height: 1.5; margin-bottom: 20px;">We have prepared a new business proposal for you to review.</p>
      <div style="background: #f4fbf7; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #d6ede1;">
        <p style="margin: 0; font-size: 12px; font-weight: 700; color: #6b8f7c; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Proposal details:</p>
        <p style="margin: 4px 0; color: #0d2317; font-size: 14px;">Title: <strong>${proposalTitle}</strong></p>
      </div>
      <p style="margin: 24px 0;">
        <a href="${portalUrl}" target="_blank" style="background: #00b872; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 13px;">Review & Sign Proposal</a>
      </p>
      <p style="font-size: 14px; color: #334155; line-height: 1.5;">Please review and accept the terms of the proposal online using your secure client portal link.</p>
      <p style="margin-top: 30px; font-size: 12px; color: #6b8f7c; border-top: 1px solid #f1f5f9; padding-top: 14px;">Best regards,<br><strong>Appibrium Technology Co.</strong></p>
    </div>
  `;
  return sendEmail({ to: clientEmail, subject, html });
}
