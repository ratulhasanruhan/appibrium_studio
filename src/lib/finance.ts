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
