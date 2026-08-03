/**
 * Status presentation.
 *
 * Colour maps for every status pill in the app, defined once so the same status
 * never renders differently on two screens.
 */

export interface StatusStyle {
  bg: string;
  color: string;
}

const NEUTRAL: StatusStyle = { bg: "#F5F5F5", color: "#6B7280" };
const MUTED: StatusStyle   = { bg: "#F5F5F5", color: "#9CA3AF" };
const INFO: StatusStyle    = { bg: "#EEF4FF", color: "#3B72D4" };
const WARN: StatusStyle    = { bg: "#FFFBEB", color: "#B45309" };
const OK: StatusStyle      = { bg: "#E6FAF3", color: "#00965C" };
const DANGER: StatusStyle  = { bg: "#FEF2F2", color: "#D14F4F" };

export const INVOICE_STATUS: Record<string, StatusStyle> = {
  draft: NEUTRAL, sent: INFO, paid: OK, overdue: DANGER, cancelled: MUTED,
};

export const LETTER_STATUS: Record<string, StatusStyle> = {
  draft: NEUTRAL, sent: INFO, viewed: WARN, signed: OK, declined: DANGER,
};

export const ENGAGEMENT_STATUS: Record<string, StatusStyle> = {
  active: INFO, completed: OK, cancelled: MUTED,
};

export const PERSON_STATUS: Record<string, StatusStyle> = {
  active: OK, inactive: MUTED,
};

/** Transaction type accent colours (text only, no pill background). */
export const TRANSACTION_TYPE_COLOR: Record<string, string> = {
  income: "#00965C",
  expense: "#D14F4F",
  advance: "#3B72D4",
  refund: "#B45309",
};

/** Project statuses use the global badge CSS classes rather than inline colour. */
export const PROJECT_STATUS_BADGE: Record<string, string> = {
  planning: "badge-planning",
  active: "badge-active",
  completed: "badge-completed",
  on_hold: "badge-on-hold",
  cancelled: "badge-cancelled",
};

export function statusStyle(map: Record<string, StatusStyle>, status: string): StatusStyle {
  return map[status] ?? NEUTRAL;
}
