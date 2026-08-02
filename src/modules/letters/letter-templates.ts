/**
 * Letterhead document templates.
 *
 * Each template declares its own fields and renders the document body to HTML.
 * The body is stored in `letter.body_html` and painted onto the A4 letterhead by
 * the public letter page, so adding a template here needs no schema change.
 */

import { escapeHtml as esc } from "@/utils";

export type LetterType =
  | "agreement"
  | "declaration"
  | "appreciation"
  | "offer"
  | "certificate"
  | "general";

export interface LetterField {
  key: string;
  label: string;
  type: "text" | "textarea" | "date";
  placeholder?: string;
  /** Rows for textarea fields. */
  rows?: number;
  full?: boolean;
}

export interface LetterTemplate {
  id: LetterType;
  label: string;
  desc: string;
  /** Reference prefix, e.g. APP-AGR-2026-0001 */
  refPrefix: string;
  defaultTitle: string;
  /** Whether the recipient is normally expected to counter-sign. */
  signByDefault: boolean;
  fields: LetterField[];
  build: (v: Record<string, string>) => string;
}

// ── helpers ─────────────────────────────────────────────────────────────── //

/** Turns free text into paragraphs, preserving blank-line breaks. */
function paragraphs(value: string): string {
  return (value || "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

function listFrom(value: string): string {
  const items = (value || "")
    .split("\n")
    .map((l) => l.replace(/^[-•*\d.)\s]+/, "").trim())
    .filter(Boolean);
  if (items.length === 0) return "";
  return `<ol class="lt-list">${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ol>`;
}

function clause(title: string, body: string): string {
  if (!body.trim()) return "";
  return `<h3 class="lt-clause">${esc(title)}</h3>\n${body}`;
}

// ── templates ───────────────────────────────────────────────────────────── //

export const LETTER_TEMPLATES: LetterTemplate[] = [
  {
    id: "agreement",
    label: "Service Agreement",
    desc: "Binding contract for a scope of work",
    refPrefix: "APP-AGR",
    defaultTitle: "Service Agreement",
    signByDefault: true,
    fields: [
      { key: "party_name", label: "Second Party (Client)", type: "text", placeholder: "GetIndiaTech Ltd." },
      { key: "party_address", label: "Second Party Address", type: "text", placeholder: "City, Country" },
      { key: "effective_date", label: "Effective Date", type: "date" },
      { key: "term", label: "Term / Duration", type: "text", placeholder: "8 weeks from the effective date" },
      { key: "value", label: "Contract Value", type: "text", placeholder: "150,000 BDT" },
      { key: "scope", label: "Scope of Work — one item per line", type: "textarea", rows: 5, full: true, placeholder: "Design and development of a web application\nDeployment to production with SSL\nSource code and documentation handover" },
      { key: "payment_terms", label: "Payment Terms", type: "textarea", rows: 3, full: true, placeholder: "20% on signing, 30% at mid-project delivery, 50% on final handover. Invoices payable within 7 days." },
    ],
    build: (v) => `
<p class="lt-lead">This Service Agreement (the "Agreement") is entered into on <strong>${esc(v.effective_date || "____________")}</strong> between <strong>Appibrium Technology Co.</strong>, of 23/A Shukrabad, Dhaka, Bangladesh (the "First Party" or "Service Provider"), and <strong>${esc(v.party_name || "____________")}</strong>${v.party_address ? `, of ${esc(v.party_address)}` : ""} (the "Second Party" or "Client").</p>
<p>Both parties agree to the terms set out below.</p>

${clause("1. Scope of Work", listFrom(v.scope) || "<p>As mutually agreed in writing between both parties.</p>")}

${clause("2. Term", `<p>This Agreement commences on the effective date stated above and continues for <strong>${esc(v.term || "the agreed duration")}</strong>, unless extended or terminated in accordance with these terms.</p>`)}

${clause("3. Contract Value & Payment", `<p>The total value of this Agreement is <strong>${esc(v.value || "as quoted separately")}</strong>.</p>${paragraphs(v.payment_terms)}`)}

${clause("4. Responsibilities of the Client", `<p>The Client shall provide content, branding assets, and any third-party account access required to complete the work, and shall return feedback on delivered milestones within five (5) working days.</p>`)}

${clause("5. Intellectual Property", `<p>Upon receipt of final payment, all intellectual property rights in the delivered work transfer in full to the Client. The Service Provider retains the right to reference the engagement in its portfolio unless the Client requests otherwise in writing.</p>`)}

${clause("6. Confidentiality", `<p>Both parties shall keep confidential all commercial and technical information disclosed during this engagement, and shall not share it with third parties without prior written consent.</p>`)}

${clause("7. Changes to Scope", `<p>Work beyond the scope listed in Clause 1 shall be treated as a change request, quoted separately, and commenced only after written approval from the Client.</p>`)}

${clause("8. Termination", `<p>Either party may terminate this Agreement by giving written notice. Work completed up to the date of termination shall be invoiced on a pro rata basis and remains payable.</p>`)}

${clause("9. Governing Law", `<p>This Agreement is governed by and construed in accordance with the laws of the People's Republic of Bangladesh.</p>`)}

<p class="lt-closing">By signing below, both parties confirm that they have read, understood, and agreed to the terms of this Agreement.</p>`,
  },

  {
    id: "declaration",
    label: "Declaration",
    desc: "Formal statement of fact",
    refPrefix: "APP-DEC",
    defaultTitle: "Declaration",
    signByDefault: false,
    fields: [
      { key: "subject", label: "Subject of Declaration", type: "text", full: true, placeholder: "Declaration of Software Ownership" },
      { key: "statement", label: "Declaration Statement", type: "textarea", rows: 7, full: true, placeholder: "We hereby declare that…\n\nLeave a blank line between paragraphs." },
      { key: "purpose", label: "Purpose / Issued For", type: "text", full: true, placeholder: "Issued at the request of the client for official purposes" },
    ],
    build: (v) => `
<p class="lt-lead">TO WHOM IT MAY CONCERN</p>
${paragraphs(v.statement) || "<p>_______________________________________</p>"}
${v.purpose ? `<p class="lt-closing">${esc(v.purpose)}.</p>` : ""}
<p>This declaration is made in good faith and is true and correct to the best of our knowledge.</p>`,
  },

  {
    id: "appreciation",
    label: "Appreciation Letter",
    desc: "Recognition of work or contribution",
    refPrefix: "APP-APR",
    defaultTitle: "Letter of Appreciation",
    signByDefault: false,
    fields: [
      { key: "person", label: "Recipient Name", type: "text", placeholder: "Md. Rahim Uddin" },
      { key: "role", label: "Their Role / Relationship", type: "text", placeholder: "Frontend Engineer" },
      { key: "achievement", label: "What They Did", type: "textarea", rows: 5, full: true, placeholder: "Describe the contribution being recognised. Leave a blank line between paragraphs." },
      { key: "occasion", label: "Occasion (optional)", type: "text", full: true, placeholder: "On successful completion of the ZanVerify platform" },
    ],
    build: (v) => `
<p class="lt-lead">Dear ${esc(v.person || "____________")},</p>
<p>On behalf of Appibrium Technology Co., I would like to express our sincere appreciation for your contribution${v.role ? ` as <strong>${esc(v.role)}</strong>` : ""}${v.occasion ? `, ${esc(v.occasion)}` : ""}.</p>
${paragraphs(v.achievement)}
<p>Your dedication and professionalism reflect the standards we value most, and they have made a real difference to the outcome of this work.</p>
<p class="lt-closing">We thank you once again and wish you continued success in all your future endeavours.</p>`,
  },

  {
    id: "offer",
    label: "Offer Letter",
    desc: "Employment or engagement offer",
    refPrefix: "APP-OFR",
    defaultTitle: "Offer of Employment",
    signByDefault: true,
    fields: [
      { key: "candidate", label: "Candidate Name", type: "text", placeholder: "Md. Rahim Uddin" },
      { key: "position", label: "Position", type: "text", placeholder: "Frontend Engineer" },
      { key: "department", label: "Department", type: "text", placeholder: "Engineering" },
      { key: "joining_date", label: "Joining Date", type: "date" },
      { key: "salary", label: "Gross Compensation", type: "text", placeholder: "45,000 BDT per month" },
      { key: "reporting_to", label: "Reporting To", type: "text", placeholder: "Chief Executive Officer" },
      { key: "probation", label: "Probation Period", type: "text", placeholder: "3 months" },
      { key: "notes", label: "Additional Terms (optional)", type: "textarea", rows: 3, full: true, placeholder: "Working hours, remote policy, benefits…" },
    ],
    build: (v) => `
<p class="lt-lead">Dear ${esc(v.candidate || "____________")},</p>
<p>We are pleased to offer you the position of <strong>${esc(v.position || "____________")}</strong>${v.department ? ` in the ${esc(v.department)} department` : ""} at Appibrium Technology Co. We were impressed by your background and believe you will be a valuable addition to our team.</p>

${clause("Terms of Employment", `<table class="lt-table">
  <tbody>
    <tr><td>Position</td><td><strong>${esc(v.position || "—")}</strong></td></tr>
    ${v.department ? `<tr><td>Department</td><td>${esc(v.department)}</td></tr>` : ""}
    ${v.reporting_to ? `<tr><td>Reporting to</td><td>${esc(v.reporting_to)}</td></tr>` : ""}
    ${v.joining_date ? `<tr><td>Joining date</td><td>${esc(v.joining_date)}</td></tr>` : ""}
    ${v.salary ? `<tr><td>Gross compensation</td><td><strong>${esc(v.salary)}</strong></td></tr>` : ""}
    ${v.probation ? `<tr><td>Probation period</td><td>${esc(v.probation)}</td></tr>` : ""}
  </tbody>
</table>`)}

${v.notes ? clause("Additional Terms", paragraphs(v.notes)) : ""}

<p>This offer is made in good faith and is subject to verification of the documents and references you have provided.</p>
<p class="lt-closing">To accept this offer, please sign below. We look forward to welcoming you to the team.</p>`,
  },

  {
    id: "certificate",
    label: "Experience / Completion Certificate",
    desc: "Certifies service or project completion",
    refPrefix: "APP-CRT",
    defaultTitle: "Certificate",
    signByDefault: false,
    fields: [
      { key: "subject_name", label: "Person or Project Name", type: "text", full: true, placeholder: "Md. Rahim Uddin — or — ZanVerify Platform" },
      { key: "role", label: "Role / Scope", type: "text", full: true, placeholder: "Frontend Engineer — or — Identity verification platform" },
      { key: "from_date", label: "From", type: "date" },
      { key: "to_date", label: "To", type: "date" },
      { key: "remarks", label: "Remarks", type: "textarea", rows: 4, full: true, placeholder: "Performance, conduct, or delivery notes. Leave a blank line between paragraphs." },
    ],
    build: (v) => `
<p class="lt-lead">TO WHOM IT MAY CONCERN</p>
<p>This is to certify that <strong>${esc(v.subject_name || "____________")}</strong>${v.role ? ` — ${esc(v.role)}` : ""} was associated with Appibrium Technology Co.${v.from_date || v.to_date ? ` from <strong>${esc(v.from_date || "____")}</strong> to <strong>${esc(v.to_date || "____")}</strong>` : ""}.</p>
${paragraphs(v.remarks)}
<p>We confirm that the engagement was completed satisfactorily and in accordance with the agreed terms.</p>
<p class="lt-closing">This certificate is issued upon request for whatever purpose it may serve.</p>`,
  },

  {
    id: "general",
    label: "General Letter",
    desc: "Blank letterhead for any correspondence",
    refPrefix: "APP-LTR",
    defaultTitle: "Letter",
    signByDefault: false,
    fields: [
      { key: "salutation", label: "Salutation", type: "text", full: true, placeholder: "Dear Sir/Madam," },
      { key: "body", label: "Letter Body", type: "textarea", rows: 12, full: true, placeholder: "Write your letter here.\n\nLeave a blank line between paragraphs." },
      { key: "closing", label: "Closing Line (optional)", type: "text", full: true, placeholder: "We look forward to your response." },
    ],
    build: (v) => `
${v.salutation ? `<p class="lt-lead">${esc(v.salutation)}</p>` : ""}
${paragraphs(v.body)}
${v.closing ? `<p class="lt-closing">${esc(v.closing)}</p>` : ""}`,
  },
];

export function getTemplate(id: LetterType): LetterTemplate {
  return LETTER_TEMPLATES.find((t) => t.id === id) ?? LETTER_TEMPLATES[0];
}

export function buildLetterBody(type: LetterType, values: Record<string, string>): string {
  return getTemplate(type)
    .build(values)
    .split("\n")
    .filter((l) => l.trim())
    .join("\n");
}
