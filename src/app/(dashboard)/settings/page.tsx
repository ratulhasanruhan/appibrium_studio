"use client";

import { useState } from "react";
import { Topbar } from "@/components/topbar";
import { Save, Building2, CreditCard, MessageSquare, Globe } from "lucide-react";
import { CURRENCIES } from "@/types";

const TABS = [
  { id: "company",  label: "Company",  icon: Building2 },
  { id: "currency", label: "Currency", icon: Globe },
  { id: "bank",     label: "Bank Details", icon: CreditCard },
  { id: "sms",      label: "SMS",      icon: MessageSquare },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("company");

  // Company
  const [companyName, setCompanyName]     = useState("Appibrium Technology Co.");
  const [companyEmail, setCompanyEmail]   = useState("hello@appibrium.com");
  const [companyPhone, setCompanyPhone]   = useState("");
  const [companyAddress, setCompanyAddress] = useState("23/A Shukrabad, Dhaka, Bangladesh, 1207");

  // Currency
  const [selectedCurrency, setSelectedCurrency] = useState("BDT");

  // Bank
  const [bankAccountName, setBankAccountName]     = useState("Appibrium Technology Co.");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankName, setBankName]                   = useState("");
  const [bankBranch, setBankBranch]               = useState("");
  const [bankRouting, setBankRouting]             = useState("");
  const [mobileBankingProvider, setMobileBankingProvider] = useState("bKash");
  const [mobileBankingNumber, setMobileBankingNumber]     = useState("");

  // SMS
  const [smsApiUrl, setSmsApiUrl]       = useState("");
  const [smsApiKey, setSmsApiKey]       = useState("");
  const [smsSenderId, setSmsSenderId]   = useState("APPIBRIUM");
  const [smsTestPhone, setSmsTestPhone] = useState("");

  return (
    <>
      <Topbar title="Settings" subtitle="Workspace configuration and preferences" />
      <div className="page-content">
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 20, maxWidth: 900 }}>

          {/* ─── Sidebar Tabs ─── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                id={`settings-tab-${id}`}
                onClick={() => setActiveTab(id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "9px 12px",
                  borderRadius: "var(--radius-md)",
                  background: activeTab === id ? "var(--accent-subtle)" : "transparent",
                  color: activeTab === id ? "var(--accent)" : "var(--foreground-muted)",
                  border: `1px solid ${activeTab === id ? "rgba(0,184,114,0.2)" : "transparent"}`,
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  fontWeight: activeTab === id ? 600 : 400,
                  textAlign: "left",
                  transition: "all 0.1s",
                }}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {/* ─── Panel ─── */}
          <div className="card">

            {/* Company */}
            {activeTab === "company" && (
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--font-heading)", marginBottom: 4 }}>Company Information</h2>
                <p style={{ fontSize: 12, color: "var(--foreground-muted)", marginBottom: 20 }}>This information appears on all generated documents.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {[
                    { label: "Company Name",  value: companyName,    setter: setCompanyName,    id: "company-name" },
                    { label: "Email",         value: companyEmail,   setter: setCompanyEmail,   id: "company-email" },
                    { label: "Phone",         value: companyPhone,   setter: setCompanyPhone,   id: "company-phone",   placeholder: "+8801..." },
                    { label: "Address",       value: companyAddress, setter: setCompanyAddress, id: "company-address" },
                  ].map(({ label, value, setter, id, placeholder }) => (
                    <div key={id}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--foreground-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
                      <input id={id} className="input-base" value={value} onChange={(e) => setter(e.target.value)} placeholder={placeholder} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Currency */}
            {activeTab === "currency" && (
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--font-heading)", marginBottom: 4 }}>Currency Settings</h2>
                <p style={{ fontSize: 12, color: "var(--foreground-muted)", marginBottom: 20 }}>Select the default currency for invoices, proposals, and transactions.</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                  {CURRENCIES.map((c) => (
                    <button
                      key={c.code}
                      id={`currency-${c.code}`}
                      onClick={() => setSelectedCurrency(c.code)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "14px 16px",
                        borderRadius: "var(--radius-lg)",
                        border: `2px solid ${selectedCurrency === c.code ? "var(--accent)" : "var(--border)"}`,
                        background: selectedCurrency === c.code ? "var(--accent-subtle)" : "var(--background-alt)",
                        cursor: "pointer",
                        transition: "all 0.15s",
                        textAlign: "left",
                      }}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: selectedCurrency === c.code ? "var(--accent)" : "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: selectedCurrency === c.code ? "white" : "var(--foreground-muted)", fontFamily: "var(--font-heading)", flexShrink: 0 }}>
                        {c.symbol}
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", fontFamily: "var(--font-heading)" }}>{c.code}</p>
                        <p style={{ fontSize: 11, color: "var(--foreground-muted)" }}>{c.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: "var(--radius-md)", background: "var(--surface)", border: "1px solid var(--border)", fontSize: 12, color: "var(--foreground-muted)" }}>
                  Selected: <strong style={{ color: "var(--foreground)" }}>{CURRENCIES.find(c => c.code === selectedCurrency)?.name}</strong> — symbol <strong style={{ color: "var(--accent)", fontSize: 14 }}>{CURRENCIES.find(c => c.code === selectedCurrency)?.symbol}</strong>
                </div>
              </div>
            )}

            {/* Bank Details */}
            {activeTab === "bank" && (
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--font-heading)", marginBottom: 4 }}>Bank Details</h2>
                <p style={{ fontSize: 12, color: "var(--foreground-muted)", marginBottom: 20 }}>These details appear on all invoices for manual bank transfers.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[
                    { label: "Account Name",   value: bankAccountName,   setter: setBankAccountName,   id: "bank-acct-name",   placeholder: "Legal company name" },
                    { label: "Account Number", value: bankAccountNumber, setter: setBankAccountNumber, id: "bank-acct-number", placeholder: "e.g. 1234 5678 9012 3456" },
                    { label: "Bank Name",      value: bankName,          setter: setBankName,          id: "bank-name",        placeholder: "e.g. Dutch-Bangla Bank" },
                    { label: "Branch",         value: bankBranch,        setter: setBankBranch,        id: "bank-branch",      placeholder: "Branch name" },
                    { label: "Routing Number", value: bankRouting,       setter: setBankRouting,       id: "bank-routing",     placeholder: "9-digit routing number" },
                  ].map(({ label, value, setter, id, placeholder }) => (
                    <div key={id}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--foreground-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
                      <input id={id} className="input-base" value={value} onChange={(e) => setter(e.target.value)} placeholder={placeholder} />
                    </div>
                  ))}
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "var(--foreground-muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Mobile Banking</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--foreground-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Provider</label>
                        <select id="mobile-banking-provider" className="input-base" value={mobileBankingProvider} onChange={(e) => setMobileBankingProvider(e.target.value)}>
                          {["bKash", "Nagad", "Rocket", "Upay", "SureCash"].map((p) => <option key={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--foreground-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Number</label>
                        <input id="mobile-banking-number" className="input-base" value={mobileBankingNumber} onChange={(e) => setMobileBankingNumber(e.target.value)} placeholder="01XXXXXXXXX" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SMS */}
            {activeTab === "sms" && (
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--font-heading)", marginBottom: 4 }}>SMS Configuration</h2>
                <p style={{ fontSize: 12, color: "var(--foreground-muted)", marginBottom: 20 }}>Connect your SMS gateway to send proposal and invoice links to clients.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--foreground-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>API Endpoint URL</label>
                    <input id="sms-api-url" className="input-base" type="url" value={smsApiUrl} onChange={(e) => setSmsApiUrl(e.target.value)} placeholder="https://api.smsprovider.com/send" />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--foreground-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>API Key</label>
                    <input id="sms-api-key" className="input-base" type="password" value={smsApiKey} onChange={(e) => setSmsApiKey(e.target.value)} placeholder="Your API key" />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--foreground-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Sender ID</label>
                    <input id="sms-sender-id" className="input-base" value={smsSenderId} onChange={(e) => setSmsSenderId(e.target.value)} placeholder="e.g. APPIBRIUM" maxLength={11} />
                    <p style={{ fontSize: 10, color: "var(--foreground-faint)", marginTop: 4 }}>Maximum 11 characters. Must be approved by your provider.</p>
                  </div>
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "var(--foreground-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Test SMS</p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input id="sms-test-phone" className="input-base" value={smsTestPhone} onChange={(e) => setSmsTestPhone(e.target.value)} placeholder="01XXXXXXXXX" style={{ flex: 1 }} />
                      <button className="btn btn-ghost" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                        <MessageSquare size={13} /> Send Test
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
              <button id="settings-save-btn" className="btn btn-primary" style={{ fontSize: 12 }}>
                <Save size={13} /> Save Changes
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
