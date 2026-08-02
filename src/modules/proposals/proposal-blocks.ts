/**
 * Proposal block library.
 *
 * A proposal is assembled from independently selectable blocks. Each block
 * renders to plain HTML that is stored in `proposal.content_html` and styled by
 * the public proposal portal (see the `.pb-*` classes there), so adding a block
 * here needs no schema change and no change to the client-facing renderer.
 */

import { worksByIds } from "@/lib/company-profile";
import { escapeHtml as esc } from "@/utils";

export type BlockId =
  | "intro"
  | "summary"
  | "understanding"
  | "solution"
  | "scope"
  | "stack"
  | "timeline"
  | "work"
  | "whyus"
  | "process"
  | "pricing"
  | "payment"
  | "support"
  | "assumptions"
  | "terms"
  | "faq"
  | "nextsteps";

export type BlockGroup = "Opening" | "Solution" | "Credibility" | "Commercials" | "Closing";

export interface Phase {
  name: string;
  duration: string;
  detail: string;
}

export interface PriceItem {
  label: string;
  detail: string;
  amount: string;
}

export interface ProposalInput {
  clientName: string;
  desc: string;
  tech: string;
  duration: string;
  amount: string;
  currency: string;
  deliverables: string;   // newline separated
  phases: Phase[];
  /** Ids from the shared company portfolio — no per-proposal data entry. */
  featuredWork: string[];
  priceItems: PriceItem[];
  supportMonths: string;
  validDays: string;
  contactEmail: string;
}

export interface BlockDef {
  id: BlockId;
  label: string;
  hint: string;
  group: BlockGroup;
  /** Returns null when the block has nothing meaningful to render. */
  render: (input: ProposalInput) => string | null;
}

// ── helpers ─────────────────────────────────────────────────────────────── //

function lines(value: string): string[] {
  return (value || "")
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

function chips(value: string): string[] {
  return (value || "")
    .split(/[,/]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Ensures a user-written fragment ends as a sentence before text is appended after it. */
function sentence(value: string): string {
  const clean = (value || "").trim();
  if (!clean) return "";
  return /[.!?]$/.test(clean) ? clean : `${clean}.`;
}

function money(amount: string, currency: string): string {
  const clean = (amount || "").trim();
  if (!clean) return "—";
  return /[৳$€£₹]/.test(clean) ? clean : `${clean} ${currency}`;
}

function section(title: string, body: string): string {
  return `<h2>${esc(title)}</h2>\n${body}`;
}

// ── blocks ──────────────────────────────────────────────────────────────── //

export const BLOCKS: BlockDef[] = [
  {
    id: "intro",
    label: "Introduction Letter",
    hint: "Warm opening addressed to the client",
    group: "Opening",
    render: (i) =>
      section(
        "Introduction",
        `<p class="pb-lead">Dear ${esc(i.clientName || "Team")},</p>
<p>Thank you for considering Appibrium Technology Co. for this engagement. We have reviewed your requirements carefully and prepared the following proposal outlining our understanding, approach, deliverables, and commercial terms.</p>
<p>Everything in this document is open to discussion — we would rather shape the scope together than hand over a fixed plan. If any section needs adjusting, just reply and we will revise it.</p>`
      ),
  },

  {
    id: "summary",
    label: "Executive Summary",
    hint: "Overview with headline figures",
    group: "Opening",
    render: (i) => {
      const deliverableCount = lines(i.deliverables).length;
      const stats = [
        i.duration && { k: "Timeline", v: i.duration },
        i.amount && { k: "Investment", v: money(i.amount, i.currency) },
        deliverableCount > 0 && { k: "Deliverables", v: `${deliverableCount} items` },
        i.supportMonths && { k: "Support", v: `${i.supportMonths} months` },
      ].filter(Boolean) as { k: string; v: string }[];

      const statHtml = stats.length
        ? `<div class="pb-stats">${stats
            .map(
              (s) =>
                `<div class="pb-stat"><span class="pb-stat-k">${esc(s.k)}</span><span class="pb-stat-v">${esc(s.v)}</span></div>`
            )
            .join("")}</div>`
        : "";

      return section(
        "Executive Summary",
        `<p class="pb-lead">${esc(sentence(i.desc) || "A tailored engagement designed around your goals.")}</p>
${statHtml}
<p>The sections that follow break down exactly what will be built, how long each stage takes, what it costs, and what happens after launch.</p>`
      );
    },
  },

  {
    id: "understanding",
    label: "Understanding Your Needs",
    hint: "Shows you listened before pitching",
    group: "Opening",
    render: (i) =>
      section(
        "Understanding Your Requirements",
        `<p>Based on our discussions, we understand that ${esc(i.clientName || "your organisation")} needs the following addressed:</p>
<ul class="pb-checks">
  <li>A solution that fits existing workflows rather than forcing a change in how your team already works.</li>
  <li>A predictable delivery schedule with visible progress at every milestone — no long silences.</li>
  <li>Clean, maintainable foundations so the product can grow without a costly rebuild later.</li>
  <li>Clear ownership of code, data, and assets on completion.</li>
</ul>
<p class="pb-note">If anything here misses the mark, tell us — we will revise this section before moving forward.</p>`
      ),
  },

  {
    id: "solution",
    label: "Proposed Solution",
    hint: "Your approach to solving it",
    group: "Solution",
    render: (i) =>
      section(
        "Proposed Solution",
        `<p>${esc(sentence(i.desc) || "We will deliver a solution purpose-built for your requirements.")} Our approach prioritises clarity, performance, and long-term maintainability.</p>
<div class="pb-cards">
  <div class="pb-card"><h4>Built for your workflow</h4><p>Interfaces modelled on how your team actually operates, not a generic template.</p></div>
  <div class="pb-card"><h4>Fast and reliable</h4><p>Optimised load times, responsive across devices, and resilient under real usage.</p></div>
  <div class="pb-card"><h4>Secure by default</h4><p>Role-based access, protected routes, and safe handling of sensitive data throughout.</p></div>
  <div class="pb-card"><h4>Built to extend</h4><p>Modular architecture so new features slot in without disturbing what already works.</p></div>
</div>`
      ),
  },

  {
    id: "scope",
    label: "Scope & Deliverables",
    hint: "Explicit list of what you receive",
    group: "Solution",
    render: (i) => {
      const items = lines(i.deliverables);
      if (items.length === 0) return null;
      return section(
        "Scope of Work & Deliverables",
        `<p>The following items are included in this engagement:</p>
<ul class="pb-checks">${items.map((d) => `<li>${esc(d)}</li>`).join("")}</ul>`
      );
    },
  },

  {
    id: "stack",
    label: "Technology Stack",
    hint: "Tools and platforms used",
    group: "Solution",
    render: (i) => {
      const items = chips(i.tech);
      if (items.length === 0) return null;
      return section(
        "Technology Stack",
        `<p>We have selected the following technologies for performance, security, and long-term supportability:</p>
<div class="pb-chips">${items.map((t) => `<span class="pb-chip">${esc(t)}</span>`).join("")}</div>`
      );
    },
  },

  {
    id: "timeline",
    label: "Project Timeline",
    hint: "Phase-by-phase schedule",
    group: "Solution",
    render: (i) => {
      const phases = (i.phases || []).filter((p) => p.name?.trim());
      if (phases.length === 0) return null;
      return section(
        "Project Timeline",
        `<p>Delivery is structured into ${phases.length} phases${i.duration ? `, spanning approximately <strong>${esc(i.duration)}</strong>` : ""}. You will receive a working preview at the end of every phase.</p>
<div class="pb-steps">
${phases
  .map(
    (p, idx) => `  <div class="pb-step">
    <div class="pb-step-num">${idx + 1}</div>
    <div class="pb-step-body">
      <div class="pb-step-head"><h4>${esc(p.name)}</h4>${p.duration ? `<span class="pb-step-time">${esc(p.duration)}</span>` : ""}</div>
      ${p.detail ? `<p>${esc(p.detail)}</p>` : ""}
    </div>
  </div>`
  )
  .join("\n")}
</div>`
      );
    },
  },

  {
    id: "work",
    label: "Selected Work",
    hint: "Portfolio from your company profile",
    group: "Credibility",
    render: (i) => {
      const items = worksByIds(i.featuredWork || []);
      if (items.length === 0) return null;
      return section(
        "Selected Work",
        `<p>A few projects we have delivered that share ground with what you are building:</p>
<div class="pb-work">
${items
  .map(
    (w) => `  <div class="pb-work-item">
    <div class="pb-work-media">${w.image ? `<img src="${esc(w.image)}" alt="${esc(w.title)}">` : `<span>${esc(w.title.slice(0, 1))}</span>`}</div>
    <div class="pb-work-body">
      ${w.category ? `<span class="pb-work-cat">${esc(w.category)}</span>` : ""}
      <h4>${esc(w.title)}</h4>
      ${w.summary ? `<p>${esc(w.summary)}</p>` : ""}
      ${w.result ? `<p class="pb-work-result">${esc(w.result)}</p>` : ""}
      ${w.tech ? `<div class="pb-chips pb-chips-sm">${chips(w.tech).map((t) => `<span class="pb-chip">${esc(t)}</span>`).join("")}</div>` : ""}
    </div>
  </div>`
  )
  .join("\n")}
</div>`
      );
    },
  },

  {
    id: "whyus",
    label: "Why Appibrium",
    hint: "Differentiators grid",
    group: "Credibility",
    render: () =>
      section(
        "Why Appibrium",
        `<div class="pb-cards">
  <div class="pb-card"><h4>Engineering-first</h4><p>We are builders, not resellers. Every line of code is written and reviewed in-house.</p></div>
  <div class="pb-card"><h4>Transparent delivery</h4><p>Milestone previews, shared progress, and direct access to the people doing the work.</p></div>
  <div class="pb-card"><h4>You own everything</h4><p>Full ownership of source code, assets, and infrastructure accounts on final handover.</p></div>
  <div class="pb-card"><h4>We stay after launch</h4><p>Post-delivery support included, with clear terms rather than an open-ended invoice.</p></div>
</div>`
      ),
  },

  {
    id: "process",
    label: "How We Work",
    hint: "Your delivery methodology",
    group: "Credibility",
    render: () =>
      section(
        "How We Work",
        `<div class="pb-steps">
  <div class="pb-step"><div class="pb-step-num">1</div><div class="pb-step-body"><div class="pb-step-head"><h4>Discover</h4></div><p>We map requirements, edge cases, and success criteria before any code is written.</p></div></div>
  <div class="pb-step"><div class="pb-step-num">2</div><div class="pb-step-body"><div class="pb-step-head"><h4>Design</h4></div><p>Interface and data models are agreed with you up front, so there are no surprises later.</p></div></div>
  <div class="pb-step"><div class="pb-step-num">3</div><div class="pb-step-body"><div class="pb-step-head"><h4>Build</h4></div><p>Development runs in short cycles with a reviewable preview at the end of each one.</p></div></div>
  <div class="pb-step"><div class="pb-step-num">4</div><div class="pb-step-body"><div class="pb-step-head"><h4>Launch</h4></div><p>Testing, deployment, and a structured handover including documentation and access.</p></div></div>
</div>`
      ),
  },

  {
    id: "pricing",
    label: "Investment",
    hint: "Itemised pricing table",
    group: "Commercials",
    render: (i) => {
      const items = (i.priceItems || []).filter((p) => p.label?.trim());
      if (items.length === 0 && !i.amount) return null;

      const rows = items
        .map(
          (p) =>
            `    <tr><td><strong>${esc(p.label)}</strong>${p.detail ? `<br><span class="pb-muted">${esc(p.detail)}</span>` : ""}</td><td class="pb-right">${esc(money(p.amount, i.currency))}</td></tr>`
        )
        .join("\n");

      const table = items.length
        ? `  <table class="pb-table">
    <thead><tr><th>Item</th><th class="pb-right">Amount</th></tr></thead>
    <tbody>
${rows}
    </tbody>
  </table>`
        : "";

      const total = i.amount
        ? `  <div class="pb-total">
    <div class="pb-total-label">
      <span>Total Investment</span>
      ${i.validDays ? `<span class="pb-total-sub">Quoted in ${esc(i.currency)} · valid ${esc(i.validDays)} days</span>` : ""}
    </div>
    <div class="pb-total-amount">${esc(money(i.amount, i.currency))}</div>
  </div>`
        : "";

      return section(
        "Investment",
        `<div class="pb-invoice">
${table}
${total}
</div>
<p class="pb-muted">Taxes, third-party licences, and hosting fees are billed at cost unless stated otherwise.</p>`
      );
    },
  },

  {
    id: "payment",
    label: "Payment Schedule",
    hint: "Milestone-based payment split",
    group: "Commercials",
    render: () =>
      section(
        "Payment Schedule",
        `<div class="pb-invoice">
  <table class="pb-table">
    <thead><tr><th>Milestone</th><th class="pb-right">Share</th></tr></thead>
    <tbody>
      <tr><td><strong>Project initiation</strong><br><span class="pb-muted">Payable on signing, to schedule the work</span></td><td class="pb-right">20%</td></tr>
      <tr><td><strong>Mid-project delivery</strong><br><span class="pb-muted">On approval of the core build preview</span></td><td class="pb-right">30%</td></tr>
      <tr><td><strong>Final handover</strong><br><span class="pb-muted">On deployment and transfer of ownership</span></td><td class="pb-right">50%</td></tr>
    </tbody>
  </table>
</div>
<p class="pb-muted">Invoices are issued at each milestone and payable within 7 days. Bank transfer and mobile banking details accompany every invoice.</p>`
      ),
  },

  {
    id: "support",
    label: "Support & Warranty",
    hint: "What happens after launch",
    group: "Commercials",
    render: (i) =>
      section(
        "Support & Warranty",
        `<p>Every engagement includes <strong>${esc(i.supportMonths || "3")} months</strong> of post-launch support from the date of final handover, covering:</p>
<ul class="pb-checks">
  <li>Fixes for any defect traced to work delivered under this proposal, at no additional cost.</li>
  <li>Reasonable assistance with deployment, configuration, and environment issues.</li>
  <li>Guidance for your team on operating and maintaining the delivered system.</li>
</ul>
<p class="pb-muted">New features and scope added after handover are quoted separately. Ongoing retainers are available if you would prefer continuous support.</p>`
      ),
  },

  {
    id: "assumptions",
    label: "Assumptions & Exclusions",
    hint: "Protects scope on both sides",
    group: "Commercials",
    render: () =>
      section(
        "Assumptions & Exclusions",
        `<ul class="pb-checks pb-checks-neutral">
  <li>Content, branding assets, and any required third-party account access are provided by the client.</li>
  <li>Feedback on milestone previews is returned within five working days to keep the schedule on track.</li>
  <li>Third-party services (hosting, domains, paid APIs, licences) are billed at cost and not included in the quoted figure.</li>
  <li>Work beyond the deliverables listed above is treated as a change request and quoted before it starts.</li>
</ul>`
      ),
  },

  {
    id: "terms",
    label: "Terms & Conditions",
    hint: "Standard contractual terms",
    group: "Commercials",
    render: (i) =>
      section(
        "Terms & Conditions",
        `<ul class="pb-checks pb-checks-neutral">
  <li><strong>Validity</strong> — This proposal is valid for ${esc(i.validDays || "30")} days from the date of issue.</li>
  <li><strong>Ownership</strong> — Full intellectual property in the delivered work transfers to the client on receipt of final payment.</li>
  <li><strong>Confidentiality</strong> — Both parties agree to keep commercial and technical information shared during this engagement confidential.</li>
  <li><strong>Termination</strong> — Either party may terminate with written notice; work completed to that point is invoiced pro rata.</li>
</ul>`
      ),
  },

  {
    id: "faq",
    label: "FAQ",
    hint: "Answers common client questions",
    group: "Closing",
    render: () =>
      section(
        "Frequently Asked Questions",
        `<div class="pb-faq">
  <div class="pb-faq-item"><h4>What happens if requirements change mid-project?</h4><p>Small adjustments are absorbed as part of normal delivery. Anything that materially changes scope is quoted first, and no extra work is billed without written approval.</p></div>
  <div class="pb-faq-item"><h4>How will we track progress?</h4><p>You receive a working preview at every milestone plus a short written summary of what changed, so progress is always visible.</p></div>
  <div class="pb-faq-item"><h4>Who owns the final product?</h4><p>You do — completely. Source code, assets, and infrastructure accounts transfer to you on final payment.</p></div>
</div>`
      ),
  },

  {
    id: "nextsteps",
    label: "Next Steps",
    hint: "Clear closing call to action",
    group: "Closing",
    render: (i) =>
      section(
        "Next Steps",
        `<div class="pb-cta">
  <h4>Ready to begin?</h4>
  <p>Accept this proposal using the button at the top of this page and we will follow up within one business day with a kickoff schedule and the initiation invoice.</p>
  <p class="pb-muted">Questions before signing? Reply to this proposal or write to ${esc(i.contactEmail || "hello@appibrium.com")} — we are happy to walk through any section with you.</p>
</div>`
      ),
  },
];

export const BLOCK_GROUPS: BlockGroup[] = ["Opening", "Solution", "Credibility", "Commercials", "Closing"];

// ── presets ─────────────────────────────────────────────────────────────── //

export interface Preset {
  id: string;
  label: string;
  desc: string;
  blocks: BlockId[];
  phases: Phase[];
  deliverables: string;
}

const FULL: BlockId[] = [
  "intro", "summary", "understanding", "solution", "scope", "stack",
  "timeline", "work", "whyus", "process", "pricing", "payment",
  "support", "assumptions", "terms", "nextsteps",
];

export const PRESETS: Preset[] = [
  {
    id: "web",
    label: "Web Application",
    desc: "Full-stack web platform build",
    blocks: FULL,
    phases: [
      { name: "Discovery & Architecture", duration: "Week 1–2", detail: "Requirement mapping, data modelling, wireframes, and environment setup." },
      { name: "Core Development", duration: "Week 3–6", detail: "Interface build, business logic, integrations, and authentication." },
      { name: "Testing & Launch", duration: "Week 7–8", detail: "Quality assurance, security review, deployment, and handover." },
    ],
    deliverables:
      "Responsive web application across desktop, tablet, and mobile\nSecure user authentication and role-based access control\nAdmin dashboard for managing content and users\nDatabase design, setup, and configuration\nDeployment to production with domain and SSL\nSource code repository and technical documentation",
  },
  {
    id: "app",
    label: "Mobile Application",
    desc: "iOS and Android app delivery",
    blocks: FULL,
    phases: [
      { name: "UX Design & Setup", duration: "Week 1–2", detail: "Screen flows, interface design, and project scaffolding." },
      { name: "Feature Development", duration: "Week 3–7", detail: "Core screens, offline sync, push notifications, and integrations." },
      { name: "Store Release", duration: "Week 8–9", detail: "Device testing, store assets, submission, and publication." },
    ],
    deliverables:
      "Native-quality application for both iOS and Android\nOffline support with background data synchronisation\nPush notification integration\nApp Store and Google Play submission and publication\nSource code repository and build documentation",
  },
  {
    id: "design",
    label: "UI/UX Design",
    desc: "Product design engagement",
    blocks: ["intro", "summary", "understanding", "solution", "scope", "timeline", "work", "whyus", "process", "pricing", "payment", "assumptions", "terms", "nextsteps"],
    phases: [
      { name: "Research & Discovery", duration: "Week 1", detail: "User research, competitive review, and requirement synthesis." },
      { name: "Wireframes & Flows", duration: "Week 2–3", detail: "Information architecture, low-fidelity layouts, and user journeys." },
      { name: "Visual Design & Handoff", duration: "Week 4–5", detail: "High-fidelity screens, design system, and developer handover." },
    ],
    deliverables:
      "User research findings and design brief\nComplete wireframes for all key screens\nHigh-fidelity visual designs in light and dark themes\nReusable design system with components and tokens\nDeveloper handoff files with specifications",
  },
  {
    id: "retainer",
    label: "Retainer / Support",
    desc: "Ongoing monthly engagement",
    blocks: ["intro", "summary", "understanding", "scope", "process", "work", "whyus", "pricing", "support", "assumptions", "terms", "nextsteps"],
    phases: [],
    deliverables:
      "Agreed monthly allocation of engineering hours\nPriority response for critical issues\nRoutine maintenance, dependency updates, and security patches\nMonthly written summary of work completed",
  },
  {
    id: "minimal",
    label: "Lean Proposal",
    desc: "Short and direct — for quick quotes",
    blocks: ["summary", "scope", "timeline", "pricing", "payment", "nextsteps"],
    phases: [
      { name: "Build", duration: "Week 1–3", detail: "Design and development of the agreed scope." },
      { name: "Launch", duration: "Week 4", detail: "Testing, deployment, and handover." },
    ],
    deliverables: "",
  },
];

// ── assembly ────────────────────────────────────────────────────────────── //

export function buildProposalHtml(selected: BlockId[], input: ProposalInput): string {
  const order = BLOCKS.map((b) => b.id);
  return order
    .filter((id) => selected.includes(id))
    .map((id) => BLOCKS.find((b) => b.id === id)!.render(input))
    .filter(Boolean)
    .join("\n\n");
}
