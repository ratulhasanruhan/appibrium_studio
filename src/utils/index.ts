import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { CurrencyConfig } from "@/types";
import { CURRENCIES, DEFAULT_CURRENCY } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Currency ─────────────────────────────────────────────────────────── //

/**
 * Get the currency config by code (falls back to BDT).
 */
export function getCurrency(code?: string): CurrencyConfig {
  return CURRENCIES.find((c) => c.code === code) ?? DEFAULT_CURRENCY;
}

/**
 * Format a number as currency using the given currency code.
 * Uses the brand ৳ symbol directly instead of Intl for BDT (better rendering).
 */
export function formatCurrency(amount: number, currencyCode: string = "BDT"): string {
  const currency = getCurrency(currencyCode);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return currency.position === "before"
    ? `${currency.symbol}${formatted}`
    : `${formatted} ${currency.symbol}`;
}

/**
 * Shorthand: format with the workspace default (BDT).
 */
export const fmt = (amount: number) => formatCurrency(amount, "BDT");

// ─── Date & Time ──────────────────────────────────────────────────────── //

export function formatDate(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

// ─── Document IDs ─────────────────────────────────────────────────────── //

/**
 * Generate formatted document IDs e.g. APP-PROP-2026-0042
 */
export function generateDocId(prefix: string, sequence: number): string {
  const year = new Date().getFullYear();
  const padded = String(sequence).padStart(4, "0");
  return `${prefix}-${year}-${padded}`;
}

// ─── Text Helpers ─────────────────────────────────────────────────────── //

export function truncate(str: string, length: number): string {
  return str.length > length ? str.slice(0, length) + "…" : str;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-")
    .trim();
}

// ─── Phone ────────────────────────────────────────────────────────────── //

/**
 * Normalize a BD phone number to +880 format.
 */
export function normalizeBDPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("880")) return `+${digits}`;
  if (digits.startsWith("0"))   return `+880${digits.slice(1)}`;
  return `+880${digits}`;
}

// ─── File Size ────────────────────────────────────────────────────────── //

export function formatFileSize(bytes: number): string {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 ** 2)  return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3)  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}
