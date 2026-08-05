/**
 * Financial report document.
 *
 * Produces a complete, self-contained A4 HTML document that is handed to
 * /api/pdf and rendered by headless Chrome — a real PDF file rather than the
 * browser's print dialog, so it downloads identically for everyone and can be
 * attached to an email later without change.
 */

import { escapeHtml as esc, formatCurrency, formatDate } from "@/utils";
import type { CompanyFinancials, MonthPoint, ClientFinancials, TeamMemberFinancials } from "@/lib/finance";

export type ReportSection = "summary" | "months" | "clients" | "team";

export interface ReportInput {
  companyName: string;
  companyAddress: string;
  periodLabel: string;
  totals: CompanyFinancials;
  months: MonthPoint[];
  clients: ClientFinancials[];
  team: TeamMemberFinancials[];
  /** Which sections to include. Defaults to the full report. */
  sections?: ReportSection[];
  /** Overrides the document heading, e.g. "Client Report". */
  heading?: string;
}

const money = (n: number) => esc(formatCurrency(n));

function row(cells: string[], opts: { head?: boolean; strong?: boolean } = {}): string {
  const tag = opts.head ? "th" : "td";
  const cls = opts.strong ? ' class="total"' : "";
  return `<tr${cls}>${cells
    .map((c, i) => `<${tag}${i > 0 ? ' class="r"' : ""}>${c}</${tag}>`)
    .join("")}</tr>`;
}

function table(headers: string[], body: string, empty: string): string {
  if (!body) return `<p class="empty">${esc(empty)}</p>`;
  return `<table><thead>${row(headers, { head: true })}</thead><tbody>${body}</tbody></table>`;
}

export function buildFinancialReportHtml(input: ReportInput): string {
  const { totals: t } = input;
  const want = (s: ReportSection) => (input.sections ?? ["summary", "months", "clients", "team"]).includes(s);

  const summaryPairs: [string, number, string?][] = [
    ["Invoices paid", t.received],
    ["Other income", t.otherIncome],
    ["Total in", t.totalIncome, "in"],
    ["Paid to team", t.teamPaid],
    ["Other expenses", t.otherExpenses],
    ["Total out", t.totalExpenses, "out"],
  ];

  const monthRows = input.months
    .map((m) => row([esc(m.label), money(m.income), money(m.expenses), money(m.net)]))
    .join("");
  const monthTotals = input.months.reduce(
    (a, m) => ({ i: a.i + m.income, e: a.e + m.expenses, n: a.n + m.net }),
    { i: 0, e: 0, n: 0 }
  );

  const clientRows = input.clients
    .map((c) =>
      row([
        esc(c.name), String(c.projects), money(c.agreed), money(c.invoiced),
        money(c.received), money(c.outstanding), money(c.stillToCollect),
      ])
    )
    .join("");
  const clientTotals = input.clients.reduce(
    (a, c) => ({
      p: a.p + c.projects, ag: a.ag + c.agreed, inv: a.inv + c.invoiced,
      rec: a.rec + c.received, out: a.out + c.outstanding, col: a.col + c.stillToCollect,
    }),
    { p: 0, ag: 0, inv: 0, rec: 0, out: 0, col: 0 }
  );

  const teamRows = input.team
    .map((m) =>
      row([
        `${esc(m.name)}<span class="sub">${esc(m.role)}</span>`,
        esc(m.type), String(m.engagements),
        money(m.agreed), money(m.paid), money(m.owed), `${m.settledPct}%`,
      ])
    )
    .join("");
  const teamTotals = input.team.reduce(
    (a, m) => ({ e: a.e + m.engagements, ag: a.ag + m.agreed, p: a.p + m.paid, o: a.o + m.owed }),
    { e: 0, ag: 0, p: 0, o: 0 }
  );

  return `<!doctype html>
<html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Jost:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #1E3A27; font-size: 11px; }

  .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; }
  .title { font-family: 'Jost', sans-serif; font-size: 22px; font-weight: 800; color: #0D2317; letter-spacing: -0.02em; }
  .eyebrow { font-size: 9px; font-weight: 700; color: #00965C; text-transform: uppercase; letter-spacing: 0.09em; }
  .meta { text-align: right; font-size: 10px; color: #6B8F7C; line-height: 1.7; }
  .meta strong { color: #0D2317; font-family: 'Jost', sans-serif; font-size: 11.5px; }
  .rule { height: 2.5px; margin: 12px 0 18px; background: linear-gradient(90deg,#00B872 0%,#00E090 55%,transparent 100%); }

  h2 { font-family: 'Jost', sans-serif; font-size: 12px; font-weight: 700; color: #0D2317;
       margin: 18px 0 8px; padding-left: 8px; border-left: 3px solid #00B872; page-break-after: avoid; }

  .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .card { border: 1px solid #E3EEE8; border-radius: 8px; padding: 10px 12px; background: #FAFCFA; }
  .card .k { font-size: 8.5px; font-weight: 700; color: #6B8F7C; text-transform: uppercase; letter-spacing: 0.07em; }
  .card .v { font-family: 'Jost', sans-serif; font-size: 15px; font-weight: 800; margin-top: 4px; letter-spacing: -0.02em; }

  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .box { border: 1px solid #E3EEE8; border-radius: 8px; padding: 10px 12px; }
  .box .bk { font-size: 8.5px; font-weight: 700; color: #6B8F7C; text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 6px; }
  .line { display: flex; justify-content: space-between; gap: 10px; padding: 2.5px 0; }
  .line span:last-child { font-weight: 700; }
  .sep { border-top: 1px solid #E8F2EC; margin: 5px 0; }

  table { width: 100%; border-collapse: collapse; border: 1px solid #E3EEE8; border-radius: 8px; overflow: hidden; }
  th { background: #F6FBF8; padding: 7px 9px; text-align: left; font-size: 8.5px; font-weight: 700;
       color: #6B8F7C; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #E3EEE8; }
  td { padding: 7px 9px; border-bottom: 1px solid #F0F7F3; font-size: 10.5px; }
  tr:last-child td { border-bottom: none; }
  .r { text-align: right; }
  .sub { display: block; font-size: 8.5px; color: #9CB4A8; }
  .total td { background: #F6FBF8; font-weight: 800; font-family: 'Jost', sans-serif; }
  .empty { font-size: 10.5px; color: #6B8F7C; padding: 6px 0; }
  table, .cards, .cols { page-break-inside: avoid; }

  .foot { margin-top: 22px; padding-top: 8px; border-top: 1px solid #E8F2EC;
          display: flex; justify-content: space-between; font-size: 8.5px; color: #9CB4A8; }
</style></head>
<body>
  <div class="head">
    <div>
      <p class="eyebrow">${esc(input.heading ?? "Financial Report")}</p>
      <p class="title">${esc(input.companyName)}</p>
    </div>
    <div class="meta">
      <strong>${esc(input.periodLabel)}</strong>
      <div>Generated ${esc(formatDate(new Date()))}</div>
      <div>${esc(input.companyAddress)}</div>
    </div>
  </div>
  <div class="rule"></div>

  ${want("summary") ? `<div class="cards">
    <div class="card"><p class="k">Income</p><p class="v" style="color:#00965C">${money(t.totalIncome)}</p></div>
    <div class="card"><p class="k">Expenses</p><p class="v" style="color:#D14F4F">${money(t.totalExpenses)}</p></div>
    <div class="card"><p class="k">Cash on hand</p><p class="v" style="color:${t.onHand >= 0 ? "#0D2317" : "#D14F4F"}">${money(t.onHand)}</p></div>
    <div class="card"><p class="k">Final standing</p><p class="v" style="color:${t.finalStanding >= 0 ? "#00965C" : "#D14F4F"}">${money(t.finalStanding)}</p></div>
  </div>

  <h2>Money In and Out</h2>
  <div class="cols">
    <div class="box">
      <p class="bk">Cash Movement</p>
      ${summaryPairs
        .map(([k, v, kind]) =>
          kind
            ? `<div class="sep"></div><div class="line"><span>${esc(k)}</span><span style="color:${kind === "in" ? "#00965C" : "#D14F4F"}">${money(v)}</span></div>`
            : `<div class="line"><span style="color:#6B8F7C">${esc(k)}</span><span>${money(v)}</span></div>`
        )
        .join("")}
    </div>
    <div class="box">
      <p class="bk">Commitments</p>
      <div class="line"><span style="color:#6B8F7C">Agreed project value</span><span>${money(t.agreedProjectValue)}</span></div>
      <div class="line"><span style="color:#6B8F7C">Invoiced, awaiting payment</span><span style="color:#B45309">${money(t.receivable)}</span></div>
      <div class="line"><span style="color:#6B8F7C">Still to collect</span><span style="color:#B45309">${money(t.stillToCollect)}</span></div>
      <div class="sep"></div>
      <div class="line"><span style="color:#6B8F7C">Engaged team budget</span><span>${money(t.teamEngaged)}</span></div>
      <div class="line"><span style="color:#6B8F7C">Still to give team</span><span style="color:#D14F4F">${money(t.teamOwed)}</span></div>
    </div>
  </div>` : ""}

  ${want("months") ? `<h2>Month by Month</h2>` : ""}
  ${want("months") ? table(
    ["Month", "Income", "Expenses", "Net"],
    monthRows + row(["Total", money(monthTotals.i), money(monthTotals.e), money(monthTotals.n)], { strong: true }),
    "No activity in this period."
  ) : ""}

  ${want("clients") ? `<h2>By Client</h2>` : ""}
  ${want("clients") ? table(
    ["Client", "Projects", "Agreed", "Invoiced", "Received", "Outstanding", "To Collect"],
    clientRows +
      row(
        ["Total", String(clientTotals.p), money(clientTotals.ag), money(clientTotals.inv),
         money(clientTotals.rec), money(clientTotals.out), money(clientTotals.col)],
        { strong: true }
      ),
    "No clients on record."
  ) : ""}

  ${want("team") ? `<h2>By Team Member</h2>` : ""}
  ${want("team") ? table(
    ["Person", "Type", "Engagements", "Agreed", "Paid", "Still Owed", "Settled"],
    teamRows +
      row(
        ["Total", "", String(teamTotals.e), money(teamTotals.ag), money(teamTotals.p), money(teamTotals.o), ""],
        { strong: true }
      ),
    "No team members on record."
  ) : ""}

  <div class="foot">
    <span>${esc(input.companyName)} · confidential</span>
    <span>${esc(input.periodLabel)}</span>
  </div>
</body></html>`;
}
