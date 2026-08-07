/**
 * The activity feed.
 *
 * Derived from the records themselves rather than written to a parallel log
 * table. Two reasons: a log table can drift from what actually happened if a
 * write is ever missed, and it would start empty today — this reads back
 * across everything already on file, because the timestamps it reports are the
 * same ones the documents are keyed on.
 *
 * Anything the app cannot date is left out entirely. A feed that quietly
 * invents times is worse than a shorter one.
 */

import type {
  Client, Project, Proposal, Invoice, Letter, Transaction, Engagement, Person,
} from "@/types";
import { formatCurrency } from "@/utils";

export type ActivityTone = "money-in" | "money-out" | "agreement" | "neutral";

export interface ActivityEvent {
  at: string;
  /** Grouping used by the filter chips. */
  kind: "client" | "project" | "proposal" | "invoice" | "document" | "money" | "team";
  title: string;
  detail: string;
  tone: ActivityTone;
  href?: string;
}

export interface ActivitySources {
  clients: Client[];
  projects: Project[];
  proposals: Proposal[];
  invoices: Invoice[];
  letters: Letter[];
  transactions: Transaction[];
  engagements: Engagement[];
  people: Person[];
}

export function buildActivityFeed(s: ActivitySources): ActivityEvent[] {
  const clientName = new Map(s.clients.map((c) => [c.$id, c.name]));
  const personName = new Map(s.people.map((p) => [p.$id, p.name]));
  const projectName = new Map(s.projects.map((p) => [p.$id, p.name]));
  const events: ActivityEvent[] = [];

  const push = (
    at: string | undefined,
    kind: ActivityEvent["kind"],
    title: string,
    detail: string,
    tone: ActivityTone = "neutral",
    href?: string
  ) => {
    if (at) events.push({ at, kind, title, detail, tone, href });
  };

  s.clients.forEach((c) =>
    push(c.$createdAt, "client", "Client added", c.name, "neutral", "/crm")
  );

  s.projects.forEach((p) =>
    push(p.$createdAt, "project", "Project opened",
      `${p.name} · ${clientName.get(p.client_id) ?? "Unknown client"}`,
      "neutral", `/projects/${p.$id}`)
  );

  s.proposals.forEach((p) => {
    const who = clientName.get(p.client_id) ?? "Unknown client";
    const link = `/proposals/${p.$id}/edit`;
    push(p.sent_at, "proposal", "Proposal sent", `${p.title} · ${who}`, "neutral", link);
    push(p.viewed_at, "proposal", "Proposal opened by client", `${p.title} · ${who}`, "neutral", link);
    push(p.accepted_at, "proposal", "Proposal accepted",
      `${p.title} · ${p.accepted_by || who}`, "agreement", link);
    // Declines carry no timestamp of their own, so the last write stands in.
    if (p.status === "rejected") {
      push(p.$updatedAt, "proposal", "Proposal declined", `${p.title} · ${who}`, "neutral", link);
    }
  });

  s.invoices.forEach((i) => {
    const who = clientName.get(i.client_id) ?? "Unknown client";
    const link = `/invoices/${i.$id}`;
    const amount = formatCurrency(i.total, i.currency);
    push(i.sent_at, "invoice", "Invoice sent", `${i.title} · ${who} · ${amount}`, "neutral", link);
    push(i.paid_at, "invoice", "Invoice paid", `${i.title} · ${who} · ${amount}`, "money-in", link);
  });

  s.letters.forEach((l) => {
    const who = l.recipient_name || (l.client_id ? clientName.get(l.client_id) : "") || "—";
    const link = `/letters/${l.$id}/edit`;
    push(l.sent_at, "document", "Document sent", `${l.title} · ${who}`, "neutral", link);
    push(l.viewed_at, "document", "Document opened", `${l.title} · ${who}`, "neutral", link);
    push(l.signed_at, "document", "Document signed",
      `${l.title} · ${l.signed_by_name || who}`, "agreement", link);
  });

  s.engagements.forEach((e) => {
    const person = personName.get(e.person_id) ?? "Someone";
    const on = e.project_id ? projectName.get(e.project_id) : undefined;
    push(e.$createdAt, "team", "Team member engaged",
      `${person} · ${e.title}${on ? ` · ${on}` : ""} · ${formatCurrency(e.agreed_amount, e.currency)}`,
      "neutral", e.project_id ? `/projects/${e.project_id}` : "/people");
  });

  s.transactions.forEach((t) => {
    // Invoice income is already reported as "Invoice paid" above; repeating it
    // here would show the same money twice.
    if (t.invoice_id) return;
    const out = t.type !== "income";
    const person = t.person_id ? personName.get(t.person_id) : undefined;
    push(t.transaction_date || t.$createdAt, "money",
      out ? (person ? "Team member paid" : "Expense recorded") : "Income recorded",
      `${t.description} · ${formatCurrency(t.amount, t.currency)}`,
      out ? "money-out" : "money-in", "/transactions");
  });

  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}
