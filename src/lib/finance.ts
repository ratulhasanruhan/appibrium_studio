/**
 * Money calculations.
 *
 * Pure functions with no IO, so every screen that reports on the same figures
 * derives them the same way. Rules live here once rather than being re-derived
 * inside each component.
 *
 * Two directions of money:
 *   receivable — what clients owe us  (projects, invoices)
 *   payable    — what we owe people   (engagements, payouts)
 */

import type { Invoice, Transaction, Engagement } from "@/types";

/** Transaction types that move money out of the business. */
export const OUTFLOW_TYPES: ReadonlyArray<Transaction["type"]> = ["expense", "refund"];

export function isOutflow(t: Transaction): boolean {
  return OUTFLOW_TYPES.includes(t.type);
}

/**
 * True when an unpaid invoice is past its due date.
 *
 * Derived rather than stored: relying on someone manually switching the status
 * to "overdue" means the dashboard silently understates what is late.
 */
export function isOverdue(invoice: Invoice, asOf: Date = new Date()): boolean {
  if (invoice.status === "paid" || invoice.status === "cancelled" || invoice.status === "draft") return false;
  if (!invoice.due_date) return false;
  const due = new Date(invoice.due_date);
  due.setHours(23, 59, 59, 999);
  return due < asOf;
}

/** Status to show for an invoice, upgrading "sent" to "overdue" once late. */
export function effectiveInvoiceStatus(invoice: Invoice): Invoice["status"] {
  return isOverdue(invoice) ? "overdue" : invoice.status;
}

/** Invoices that were never issued, or can never be collected. */
function isCollectable(invoice: Invoice): boolean {
  return invoice.status !== "draft" && invoice.status !== "cancelled";
}

function sum<T>(items: T[], pick: (item: T) => number): number {
  return items.reduce((total, item) => total + (pick(item) || 0), 0);
}

// ── Receivable: projects ─────────────────────────────────────────────────── //

export interface ProjectFinancials {
  budget: number;
  /** Issued to the client — excludes drafts and cancelled invoices. */
  billed: number;
  /** Collected against paid invoices. */
  received: number;
  /** Issued but not yet paid. */
  outstanding: number;
  /** Budget not yet turned into an invoice. */
  notYetBilled: number;
  /** Everything still to collect against the agreed budget. */
  dueFromClient: number;
  /** Costs booked to the project, including team payouts. */
  expenses: number;
  /** Income logged directly, not already counted via a paid invoice. */
  otherIncome: number;
  /** Received + other income − expenses. */
  net: number;
  /** Received as a percentage of budget, capped at 100. */
  collectedPct: number;
}

export function calcProjectFinancials(
  budget: number,
  invoices: Invoice[],
  transactions: Transaction[]
): ProjectFinancials {
  const billed = sum(invoices.filter(isCollectable), (i) => i.total);
  const received = sum(invoices.filter((i) => i.status === "paid"), (i) => i.total);
  const expenses = sum(transactions.filter(isOutflow), (t) => t.amount);

  // A payment recorded both as a paid invoice and as an income transaction
  // would otherwise be counted twice, so anything tied to an invoice is skipped.
  const otherIncome = sum(
    transactions.filter((t) => !isOutflow(t) && !t.invoice_id),
    (t) => t.amount
  );

  return {
    budget,
    billed,
    received,
    outstanding: Math.max(billed - received, 0),
    notYetBilled: Math.max(budget - billed, 0),
    dueFromClient: Math.max(budget - received, 0),
    expenses,
    otherIncome,
    net: received + otherIncome - expenses,
    collectedPct: budget > 0 ? Math.min(Math.round((received / budget) * 100), 100) : 0,
  };
}

// ── Payable: people ──────────────────────────────────────────────────────── //

export interface PersonFinancials {
  /** Total committed across engagements that are still live or completed. */
  agreed: number;
  /** Total actually paid out to this person. */
  paid: number;
  /** Still owed — never negative. */
  due: number;
  /** Paid as a percentage of agreed, capped at 100. */
  settledPct: number;
  activeEngagements: number;
}

/**
 * Cancelled engagements are excluded from `agreed` — they represent commitments
 * that no longer stand — but payouts already made against them still count as
 * paid, so money that genuinely left the business is never hidden.
 */
export function calcPersonFinancials(
  engagements: Engagement[],
  payouts: Transaction[]
): PersonFinancials {
  const standing = engagements.filter((e) => e.status !== "cancelled");
  const agreed = sum(standing, (e) => e.agreed_amount);
  const paid = sum(payouts.filter(isOutflow), (t) => t.amount);

  return {
    agreed,
    paid,
    due: Math.max(agreed - paid, 0),
    settledPct: agreed > 0 ? Math.min(Math.round((paid / agreed) * 100), 100) : 0,
    activeEngagements: engagements.filter((e) => e.status === "active").length,
  };
}

// ── Company-wide position ────────────────────────────────────────────────── //

export interface CompanyFinancials {
  /** Collected against paid invoices. */
  received: number;
  /** Money in that was not booked through an invoice. */
  otherIncome: number;
  totalIncome: number;
  /** Outflows tagged to a team member. */
  teamPaid: number;
  /** Every other outflow — tools, hosting, rent, and so on. */
  otherExpenses: number;
  totalExpenses: number;
  /** Actual cash position: everything in, minus everything out. */
  onHand: number;
  /** Invoiced and awaiting payment. */
  receivable: number;
  /** Sum of budgets across live projects. */
  agreedProjectValue: number;
  /** Agreed work not yet collected. */
  stillToCollect: number;
  /** Committed to the team across standing engagements. */
  teamEngaged: number;
  /** Still to hand over to the team. */
  teamOwed: number;
  /** Where you land once everything owed to you is in and the team is paid. */
  finalStanding: number;
}

/**
 * The whole business in one shape.
 *
 * Team payouts are ordinary expenses tagged with a person, so they are split
 * out rather than counted twice: teamPaid + otherExpenses === totalExpenses.
 */
export function calcCompanyFinancials(
  invoices: Invoice[],
  transactions: Transaction[],
  projects: { budget?: number; status?: string }[],
  engagements: Engagement[]
): CompanyFinancials {
  const received = sum(invoices.filter((i) => i.status === "paid"), (i) => i.total);
  const billed = sum(invoices.filter(isCollectable), (i) => i.total);

  const outflows = transactions.filter(isOutflow);
  const teamPaid = sum(outflows.filter((t) => t.person_id), (t) => t.amount);
  const otherExpenses = sum(outflows.filter((t) => !t.person_id), (t) => t.amount);

  // Income already represented by a paid invoice must not be added again.
  const otherIncome = sum(
    transactions.filter((t) => !isOutflow(t) && !t.invoice_id),
    (t) => t.amount
  );

  const liveProjects = projects.filter((p) => p.status !== "cancelled");
  const agreedProjectValue = sum(liveProjects, (p) => p.budget || 0);

  const teamEngaged = sum(engagements.filter((e) => e.status !== "cancelled"), (e) => e.agreed_amount);

  const totalIncome = received + otherIncome;
  const totalExpenses = teamPaid + otherExpenses;
  const onHand = totalIncome - totalExpenses;
  const receivable = Math.max(billed - received, 0);
  const teamOwed = Math.max(teamEngaged - teamPaid, 0);

  return {
    received, otherIncome, totalIncome,
    teamPaid, otherExpenses, totalExpenses,
    onHand,
    receivable,
    agreedProjectValue,
    stillToCollect: Math.max(agreedProjectValue - received, 0),
    teamEngaged, teamOwed,
    finalStanding: onHand + receivable - teamOwed,
  };
}

// ── Time series ──────────────────────────────────────────────────────────── //

/**
 * When money from an invoice actually landed. paid_at is the truth once set;
 * older records fall back to the issue date.
 */
export function invoiceIncomeDate(invoice: Invoice): string {
  return invoice.paid_at || invoice.issue_date || invoice.$createdAt;
}

export interface MonthPoint {
  /** e.g. "Aug 26" */
  label: string;
  /** e.g. "2026-08" — stable key for sorting and export */
  key: string;
  income: number;
  expenses: number;
  net: number;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Builds a continuous month-by-month series, including months with no activity. */
export function monthlySeries(
  invoices: Invoice[],
  transactions: Transaction[],
  months: number,
  now: Date = new Date()
): MonthPoint[] {
  const buckets = new Map<string, MonthPoint>();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.set(monthKey(d), {
      key: monthKey(d),
      label: d.toLocaleString("default", { month: "short", year: "2-digit" }),
      income: 0, expenses: 0, net: 0,
    });
  }

  for (const inv of invoices) {
    if (inv.status !== "paid") continue;
    const b = buckets.get(monthKey(new Date(invoiceIncomeDate(inv))));
    if (b) b.income += inv.total || 0;
  }
  for (const t of transactions) {
    const b = buckets.get(monthKey(new Date(t.transaction_date || t.$createdAt)));
    if (!b) continue;
    if (isOutflow(t)) b.expenses += t.amount || 0;
    else if (!t.invoice_id) b.income += t.amount || 0; // invoice income already counted
  }

  const out = Array.from(buckets.values());
  out.forEach((b) => { b.net = b.income - b.expenses; });
  return out;
}

/** Keeps only records falling inside the last N months. */
export function withinMonths<T>(items: T[], dateOf: (item: T) => string, months: number, now: Date = new Date()): T[] {
  const from = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1).getTime();
  return items.filter((i) => {
    const t = new Date(dateOf(i)).getTime();
    return !Number.isNaN(t) && t >= from;
  });
}

// ── Per client ───────────────────────────────────────────────────────────── //

export interface ClientFinancials {
  clientId: string;
  name: string;
  projects: number;
  /** Sum of budgets across their live projects. */
  agreed: number;
  /** Issued to them, excluding drafts and cancelled. */
  invoiced: number;
  received: number;
  /** Invoiced but unpaid. */
  outstanding: number;
  /** Agreed work not yet collected. */
  stillToCollect: number;
}

export function clientFinancials(
  clients: { $id: string; name: string }[],
  invoices: Invoice[],
  projects: { $id: string; client_id: string; budget?: number; status?: string }[]
): ClientFinancials[] {
  return clients
    .map((c) => {
      const own = invoices.filter((i) => i.client_id === c.$id);
      const proj = projects.filter((p) => p.client_id === c.$id && p.status !== "cancelled");
      const invoiced = sum(own.filter(isCollectable), (i) => i.total);
      const received = sum(own.filter((i) => i.status === "paid"), (i) => i.total);
      const agreed = sum(proj, (p) => p.budget || 0);
      return {
        clientId: c.$id,
        name: c.name,
        projects: proj.length,
        agreed,
        invoiced,
        received,
        outstanding: Math.max(invoiced - received, 0),
        stillToCollect: Math.max(agreed - received, 0),
      };
    })
    .sort((a, b) => b.received - a.received);
}

// ── Per team member ──────────────────────────────────────────────────────── //

export interface TeamMemberFinancials {
  personId: string;
  name: string;
  role: string;
  type: string;
  /** Engagements that still stand. */
  engagements: number;
  agreed: number;
  paid: number;
  owed: number;
  settledPct: number;
}

export function teamFinancials(
  people: { $id: string; name: string; role?: string; type: string }[],
  engagements: Engagement[],
  payouts: Transaction[]
): TeamMemberFinancials[] {
  return people
    .map((p) => {
      const own = engagements.filter((e) => e.person_id === p.$id);
      const paidTo = payouts.filter((t) => t.person_id === p.$id);
      const fin = calcPersonFinancials(own, paidTo);
      return {
        personId: p.$id,
        name: p.name,
        role: p.role || "—",
        type: p.type,
        engagements: own.filter((e) => e.status !== "cancelled").length,
        agreed: fin.agreed,
        paid: fin.paid,
        owed: fin.due,
        settledPct: fin.settledPct,
      };
    })
    .sort((a, b) => b.agreed - a.agreed);
}

/** Total still owed across everyone — the company's payable position. */
export function totalPayable(
  engagements: Engagement[],
  payouts: Transaction[]
): number {
  const byPerson = new Map<string, { engagements: Engagement[]; payouts: Transaction[] }>();

  for (const e of engagements) {
    if (!byPerson.has(e.person_id)) byPerson.set(e.person_id, { engagements: [], payouts: [] });
    byPerson.get(e.person_id)!.engagements.push(e);
  }
  for (const p of payouts) {
    if (!p.person_id) continue;
    if (!byPerson.has(p.person_id)) byPerson.set(p.person_id, { engagements: [], payouts: [] });
    byPerson.get(p.person_id)!.payouts.push(p);
  }

  let total = 0;
  for (const { engagements: es, payouts: ps } of byPerson.values()) {
    total += calcPersonFinancials(es, ps).due;
  }
  return total;
}
