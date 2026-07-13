// ─── Entity Enums ────────────────────────────────────────────────────── //

export type ClientStatus = "lead" | "active" | "inactive";
export type ProjectStatus = "planning" | "active" | "completed" | "on_hold" | "cancelled";
export type ProposalStatus = "draft" | "review" | "sent" | "viewed" | "accepted" | "rejected";
export type InvoiceStatus = "draft" | "sent" | "paid" | "cancelled" | "overdue";
export type TransactionType = "income" | "expense" | "advance" | "refund";
export type TransactionStatus = "pending" | "completed" | "failed";
export type FileCategory = "contract" | "proposal" | "invoice" | "design" | "assets" | "document" | "source";
export type NotificationType =
  | "proposal_viewed"
  | "proposal_accepted"
  | "invoice_paid"
  | "invoice_overdue"
  | "file_uploaded"
  | "client_login"
  | "project_updated";

export type UserRole = "owner" | "administrator" | "manager" | "finance" | "engineer" | "researcher" | "client";

// ─── Currency ────────────────────────────────────────────────────────── //

export interface CurrencyConfig {
  code: string;       // e.g. "BDT"
  symbol: string;     // e.g. "৳"
  name: string;       // e.g. "Bangladeshi Taka"
  position: "before" | "after"; // symbol position relative to amount
}

export const CURRENCIES: CurrencyConfig[] = [
  { code: "BDT", symbol: "৳",  name: "Bangladeshi Taka",    position: "before" },
  { code: "USD", symbol: "$",  name: "US Dollar",            position: "before" },
  { code: "EUR", symbol: "€",  name: "Euro",                 position: "before" },
  { code: "GBP", symbol: "£",  name: "British Pound",        position: "before" },
  { code: "INR", symbol: "₹",  name: "Indian Rupee",         position: "before" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar",     position: "before" },
  { code: "AED", symbol: "د.إ",name: "UAE Dirham",           position: "after"  },
];

export const DEFAULT_CURRENCY: CurrencyConfig = CURRENCIES[0]; // BDT

// ─── Bank Details ─────────────────────────────────────────────────────── //

export interface BankDetails {
  account_name: string;
  account_number: string;
  bank_name: string;
  branch: string;
  routing_number?: string;
  swift_code?: string;
  mobile_banking?: {   // bKash, Nagad, Rocket etc.
    provider: string;
    number: string;
  };
}

// ─── SMS Log ─────────────────────────────────────────────────────────── //

export interface SMSLog {
  $id: string;
  to: string;             // phone number
  message: string;
  entity_type: "proposal" | "invoice";
  entity_id: string;
  status: "sent" | "failed" | "pending";
  provider_response?: string;
  $createdAt: string;
}

// ─── Data Models ──────────────────────────────────────────────────────── //

export interface Client {
  $id: string;
  name: string;
  legal_name?: string;
  email: string;
  phone?: string;
  website?: string;
  address?: string;
  logo_url?: string;
  status: ClientStatus;
  $createdAt: string;
  $updatedAt: string;
}

export interface Contact {
  $id: string;
  client_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role?: string;
  is_primary: boolean;
}

export interface Project {
  $id: string;
  client_id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  start_date?: string;
  end_date?: string;
  budget?: number;
  currency: string;
  $createdAt: string;
}

export interface Proposal {
  $id: string;
  client_id: string;
  title: string;
  status: ProposalStatus;
  content_html?: string;
  content_json?: string;
  ai_prompt?: string;
  public_token: string;
  version: number;
  currency: string;
  sent_at?: string;
  viewed_at?: string;
  accepted_at?: string;
  converted_to_invoice_id?: string;
  $createdAt: string;
  $updatedAt: string;
}

export interface Invoice {
  $id: string;
  client_id: string;
  project_id?: string;
  proposal_id?: string;
  title: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
  public_token: string;
  bank_details?: BankDetails;
  notes?: string;
  sent_at?: string;
  paid_at?: string;
  $createdAt: string;
}

export interface InvoiceItem {
  $id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface Transaction {
  $id: string;
  client_id?: string;
  invoice_id?: string;
  type: TransactionType;
  amount: number;
  currency: string;
  status: TransactionStatus;
  category?: string;
  description: string;
  transaction_date: string;
  $createdAt: string;
}

export interface FileMetadata {
  $id: string;
  client_id?: string;
  project_id?: string;
  name: string;
  mime_type: string;
  size_bytes: number;
  category: FileCategory;
  version: number;
  uploaded_by: string;
  $createdAt: string;
}

export interface Note {
  $id: string;
  client_id?: string;
  project_id?: string;
  title: string;
  content: string;
  created_by: string;
  $createdAt: string;
  $updatedAt: string;
}

export interface Notification {
  $id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  link?: string;
  $createdAt: string;
}

export interface AuditLog {
  $id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details?: string;
  $createdAt: string;
}

export interface AppUser {
  $id: string;
  name: string;
  email: string;
  role: UserRole;
  labels: string[];
  $createdAt: string;
}

// ─── Workspace Settings (stored in Appwrite DB) ───────────────────────── //

export interface WorkspaceSettings {
  $id: string;
  company_name: string;
  company_address: string;
  company_email: string;
  company_phone?: string;
  company_website?: string;
  company_logo_url?: string;
  default_currency: string;   // e.g. "BDT"
  bank_details: BankDetails;
  sms_api_url?: string;
  sms_api_key?: string;
  sms_sender_id?: string;
  resend_api_key?: string;
  proposal_prefix: string;    // e.g. "APP-PROP"
  invoice_prefix: string;     // e.g. "APP-INV"
}

// ─── API Response Wrappers ────────────────────────────────────────────── //

export interface PaginatedResponse<T> {
  total: number;
  documents: T[];
}

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}
