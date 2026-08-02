import { databases, DB_ID, COLLECTIONS, Query } from "@/lib/appwrite/client";
import { COMPANY } from "@/lib/company-profile";
import type { BankDetails } from "@/types";

export interface CompanyDetails {
  name: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  logo_url: string;
}

/**
 * Company identity for letterheads and documents.
 *
 * Reads the workspace_settings collection so details are editable from
 * Settings rather than hardcoded; the constants in company-profile.ts are only
 * a fallback for when a field is blank or the record has not been created yet.
 */
export async function getCompanyDetails(): Promise<CompanyDetails> {
  const fallback: CompanyDetails = {
    name: COMPANY.name,
    address: COMPANY.address,
    email: COMPANY.email,
    phone: COMPANY.phone,
    website: COMPANY.website,
    logo_url: "",
  };

  try {
    const res = await databases.listDocuments(DB_ID, COLLECTIONS.WORKSPACE_SETTINGS, [Query.limit(1)]);
    if (res.documents.length === 0) return fallback;
    const doc = res.documents[0] as unknown as Record<string, string>;
    return {
      name: doc.company_name?.trim() || fallback.name,
      address: doc.company_address?.trim() || fallback.address,
      email: doc.company_email?.trim() || fallback.email,
      phone: doc.company_phone?.trim() || fallback.phone,
      website: doc.company_website?.trim() || fallback.website,
      logo_url: doc.company_logo_url?.trim() || fallback.logo_url,
    };
  } catch (error) {
    console.error("[Settings] getCompanyDetails error:", error);
    return fallback;
  }
}

/**
 * Bank / mobile-banking details for invoices and payment instructions.
 * Stored as a JSON string on the workspace settings record.
 */
export async function getBankDetails(): Promise<BankDetails | null> {
  try {
    const res = await databases.listDocuments(DB_ID, COLLECTIONS.WORKSPACE_SETTINGS, [Query.limit(1)]);
    if (res.documents.length === 0) return null;
    const raw = (res.documents[0] as unknown as Record<string, unknown>).bank_details;
    if (!raw) return null;
    return (typeof raw === "string" ? JSON.parse(raw) : raw) as BankDetails;
  } catch (error) {
    console.error("[Settings] getBankDetails error:", error);
    return null;
  }
}
