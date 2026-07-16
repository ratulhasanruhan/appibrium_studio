"use client";

import { useState, useEffect } from "react";
import { Topbar } from "@/components/topbar";
import { Save, Building2, CreditCard, Globe, User, Loader2, Check, AlertCircle, Plus, Trash2 } from "lucide-react";
import { CURRENCIES } from "@/types";
import { account, databases, DB_ID, COLLECTIONS, ID, Query } from "@/lib/appwrite/client";

const TABS = [
  { id: "profile",  label: "Profile",       icon: User },
  { id: "company",  label: "Company",        icon: Building2 },
  { id: "currency", label: "Currency",       icon: Globe },
  { id: "bank",     label: "Bank Details",   icon: CreditCard },
];

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [settingsDocId, setSettingsDocId] = useState<string | null>(null);

  // ── Profile
  const [userName, setUserName]   = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [oldPassword, setOldPassword]   = useState("");
  const [newPassword, setNewPassword]   = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwStatus, setPwStatus] = useState<SaveStatus>("idle");
  const [pwError, setPwError] = useState("");

  // ── Company
  const [companyName, setCompanyName]       = useState("Appibrium Technology Co.");
  const [companyEmail, setCompanyEmail]     = useState("hello@appibrium.com");
  const [companyPhone, setCompanyPhone]     = useState("");
  const [companyAddress, setCompanyAddress] = useState("23/A Shukrabad, Dhaka, Bangladesh, 1207");

  // ── Currency
  const [selectedCurrency, setSelectedCurrency] = useState("BDT");

  // ── Bank
  const [bankAccountName, setBankAccountName]         = useState("Appibrium Technology Co.");
  const [bankAccountNumber, setBankAccountNumber]     = useState("");
  const [bankName, setBankName]                       = useState("");
  const [bankBranch, setBankBranch]                   = useState("");
  const [bankRouting, setBankRouting]                 = useState("");
  const [mobileAccounts, setMobileAccounts]           = useState<Array<{ id: string; provider: string; number: string; type: string }>>([]);
  const [newProvider, setNewProvider]                 = useState("bKash");
  const [newNumber, setNewNumber]                     = useState("");
  const [newType, setNewType]                         = useState("Personal");

  // Load user profile + existing workspace settings
  useEffect(() => {
    async function loadAll() {
      // Load user
      try {
        const user = await account.get();
        setUserName(user.name || "");
        setUserEmail(user.email || "");
      } catch (err) {
        console.error("[Settings] failed to load user:", err);
      }

      // Load workspace settings
      try {
        const res = await databases.listDocuments(DB_ID, COLLECTIONS.WORKSPACE_SETTINGS, [Query.limit(1)]);
        if (res.documents.length > 0) {
          const doc = res.documents[0] as any;
          setSettingsDocId(doc.$id);
          if (doc.company_name)    setCompanyName(doc.company_name);
          if (doc.company_email)   setCompanyEmail(doc.company_email);
          if (doc.company_phone)   setCompanyPhone(doc.company_phone);
          if (doc.company_address) setCompanyAddress(doc.company_address);
          if (doc.default_currency) setSelectedCurrency(doc.default_currency);
          // Bank details stored as JSON string
          if (doc.bank_details) {
            try {
              const bd = typeof doc.bank_details === "string"
                ? JSON.parse(doc.bank_details)
                : doc.bank_details;
              if (bd.account_name)    setBankAccountName(bd.account_name);
              if (bd.account_number)  setBankAccountNumber(bd.account_number);
              if (bd.bank_name)       setBankName(bd.bank_name);
              if (bd.branch)          setBankBranch(bd.branch);
              if (bd.routing_number)  setBankRouting(bd.routing_number);
              const loadedMobile = Array.isArray(bd.mobile_banking)
                ? bd.mobile_banking
                : bd.mobile_banking?.number
                  ? [{ id: "legacy", provider: bd.mobile_banking.provider || "bKash", number: bd.mobile_banking.number, type: bd.mobile_banking.type || "Personal" }]
                  : [];
              setMobileAccounts(loadedMobile);
            } catch (_) {}
          }
        }
      } catch (err) {
        console.error("[Settings] failed to load workspace settings:", err);
      }
    }
    loadAll();
  }, []);

  async function handleSave() {
    setSaveStatus("saving");
    try {
      const bankDetails = JSON.stringify({
        account_name: bankAccountName,
        account_number: bankAccountNumber,
        bank_name: bankName,
        branch: bankBranch,
        routing_number: bankRouting,
        mobile_banking: mobileAccounts,
      });

      const payload: Record<string, any> = {
        company_name:     companyName,
        company_email:    companyEmail,
        company_phone:    companyPhone,
        company_address:  companyAddress,
        default_currency: selectedCurrency,
        bank_details:     bankDetails,
      };

      if (settingsDocId) {
        await databases.updateDocument(DB_ID, COLLECTIONS.WORKSPACE_SETTINGS, settingsDocId, payload);
      } else {
        const doc = await databases.createDocument(DB_ID, COLLECTIONS.WORKSPACE_SETTINGS, ID.unique(), payload);
        setSettingsDocId(doc.$id);
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch (err: any) {
      console.error("[Settings] save settings error:", err);
      setSaveStatus("error");
    }
  }

  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwError("New passwords do not match.");
      setPwStatus("error");
      return;
    }
    setPwStatus("saving");
    setPwError("");
    try {
      await account.updatePassword(newPassword, oldPassword);
      setPwStatus("saved");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwStatus("idle"), 3000);
    } catch (err: any) {
      console.error("[Settings] update password error:", err);
      setPwError(err.message || "Failed to update password.");
      setPwStatus("error");
    }
  }

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    color: "var(--foreground-muted)",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };

  return (
    <>
      <Topbar title="Settings" subtitle="Manage your profile, company details, currencies, and bank details" />
      <div className="page-content">
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20 }}>
          
          {/* Left Navigation */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: "var(--radius-md)",
                    fontSize: 12,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? "var(--accent)" : "var(--foreground-muted)",
                    background: isActive ? "var(--accent-subtle)" : "transparent",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "var(--font-body)",
                    transition: "all 0.12s",
                  }}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Right Workspace Card */}
          <div className="card" style={{ minHeight: 380, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--font-heading)", marginBottom: 4 }}>User Profile</h2>
                <p style={{ fontSize: 12, color: "var(--foreground-muted)", marginBottom: 20 }}>Update your login credentials and personal info.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 460 }}>
                  <div>
                    <label style={labelStyle}>Full Name</label>
                    <input className="input-base" value={userName} readOnly style={{ background: "var(--surface)", cursor: "not-allowed", color: "var(--foreground-muted)" }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Email Address</label>
                    <input className="input-base" value={userEmail} readOnly style={{ background: "var(--surface)", cursor: "not-allowed", color: "var(--foreground-muted)" }} />
                  </div>

                  <form onSubmit={handlePasswordUpdate} style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 6, display: "flex", flexDirection: "column", gap: 12 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "var(--foreground-2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Update Password</p>
                    <div>
                      <label style={labelStyle} htmlFor="old-password">Current Password</label>
                      <input id="old-password" type="password" className="input-base" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required placeholder="••••••••" />
                    </div>
                    <div>
                      <label style={labelStyle} htmlFor="new-password">New Password</label>
                      <input id="new-password" type="password" className="input-base" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required placeholder="••••••••" />
                    </div>
                    <div>
                      <label style={labelStyle} htmlFor="confirm-password">Confirm New Password</label>
                      <input id="confirm-password" type="password" className="input-base" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="••••••••" />
                    </div>

                    {pwStatus === "error" && (
                      <div style={{ padding: "8px 12px", borderRadius: "var(--radius-md)", background: "#FEF2F2", border: "1px solid #FAC5C5", fontSize: 12, color: "#D14F4F" }}>
                        {pwError}
                      </div>
                    )}
                    {pwStatus === "saved" && (
                      <div style={{ padding: "8px 12px", borderRadius: "var(--radius-md)", background: "#E6FAF3", border: "1px solid #B3E8D2", fontSize: 12, color: "#00965C" }}>
                        Password updated successfully!
                      </div>
                    )}

                    <button type="submit" className="btn btn-primary" style={{ width: "fit-content", fontSize: 12, marginTop: 4 }} disabled={pwStatus === "saving"}>
                      {pwStatus === "saving" ? "Updating..." : "Update Password"}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Company Settings */}
            {activeTab === "company" && (
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--font-heading)", marginBottom: 4 }}>Company Workspace Settings</h2>
                <p style={{ fontSize: 12, color: "var(--foreground-muted)", marginBottom: 20 }}>Configure your brand details used on public quotes and templates.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 520 }}>
                  <div>
                    <label style={labelStyle} htmlFor="company-name">Legal Business Name</label>
                    <input id="company-name" className="input-base" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Acme Inc." />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={labelStyle} htmlFor="company-email">Outbound Email</label>
                      <input id="company-email" className="input-base" type="email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} placeholder="finance@company.com" />
                    </div>
                    <div>
                      <label style={labelStyle} htmlFor="company-phone">Phone Number</label>
                      <input id="company-phone" className="input-base" value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} placeholder="+880..." />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor="company-address">Physical Address</label>
                    <input id="company-address" className="input-base" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} placeholder="Street name, City, Zip" />
                  </div>
                </div>
              </div>
            )}

            {/* Currency settings */}
            {activeTab === "currency" && (
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--font-heading)", marginBottom: 4 }}>Workspace Currency</h2>
                <p style={{ fontSize: 12, color: "var(--foreground-muted)", marginBottom: 20 }}>Configure your primary default billing currency.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 320 }}>
                  <div>
                    <label style={labelStyle} htmlFor="default-currency">Default Currency</label>
                    <select id="default-currency" className="input-base" value={selectedCurrency} onChange={(e) => setSelectedCurrency(e.target.value)}>
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} ({c.symbol}) — {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Bank details settings */}
            {activeTab === "bank" && (
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--font-heading)", marginBottom: 4 }}>Bank & Mobile Details</h2>
                <p style={{ fontSize: 12, color: "var(--foreground-muted)", marginBottom: 20 }}>Provide bank accounts shown on public invoices.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  
                  {/* Bank Details */}
                  <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 16, background: "var(--surface)" }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "var(--foreground-2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Bank accounts</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={labelStyle} htmlFor="bank-acc-name">Account Name</label>
                        <input id="bank-acc-name" className="input-base" value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} placeholder="Company legal name" />
                      </div>
                      <div>
                        <label style={labelStyle} htmlFor="bank-acc-num">Account Number</label>
                        <input id="bank-acc-num" className="input-base" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} placeholder="Account digits" />
                      </div>
                      <div>
                        <label style={labelStyle} htmlFor="bank-name-input">Bank Name</label>
                        <input id="bank-name-input" className="input-base" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. Eastern Bank PLC" />
                      </div>
                      <div>
                        <label style={labelStyle} htmlFor="bank-branch">Branch</label>
                        <input id="bank-branch" className="input-base" value={bankBranch} onChange={(e) => setBankBranch(e.target.value)} placeholder="Branch name" />
                      </div>
                      <div style={{ gridColumn: "1/-1" }}>
                        <label style={labelStyle} htmlFor="bank-routing">Routing Number</label>
                        <input id="bank-routing" className="input-base" value={bankRouting} onChange={(e) => setBankRouting(e.target.value)} placeholder="9 digit routing code" />
                      </div>
                    </div>
                  </div>

                  <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 16, background: "var(--surface)" }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "var(--foreground-2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Mobile Banking Payments</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {mobileAccounts.map((acc, idx) => (
                        <div key={acc.id || idx} style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 1fr auto", gap: 10, alignItems: "center", padding: "8px 12px", background: "var(--background)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{acc.provider}</span>
                          <span style={{ fontSize: 13, fontFamily: "monospace", color: "var(--foreground)" }}>{acc.number}</span>
                          <span style={{ fontSize: 11, padding: "2px 6px", background: "var(--accent-subtle)", color: "var(--accent)", borderRadius: 4, fontWeight: 600, textTransform: "uppercase", width: "fit-content" }}>{acc.type}</span>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ padding: 4, color: "#D14F4F", cursor: "pointer" }}
                            onClick={() => setMobileAccounts(prev => prev.filter((_, i) => i !== idx))}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}

                      {/* Add Form Row */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 1fr auto", gap: 10, alignItems: "flex-end", marginTop: 8, borderTop: "1px dashed var(--border)", paddingTop: 12 }}>
                        <div>
                          <label style={labelStyle}>Provider</label>
                          <select className="input-base" value={newProvider} onChange={(e) => setNewProvider(e.target.value)}>
                            <option value="bKash">bKash</option>
                            <option value="Nagad">Nagad</option>
                            <option value="Rocket">Rocket</option>
                            <option value="Upay">Upay</option>
                            <option value="CellFin">CellFin</option>
                          </select>
                        </div>
                        <div>
                          <label style={labelStyle}>Number</label>
                          <input className="input-base" placeholder="01XXXXXXXXX" value={newNumber} onChange={(e) => setNewNumber(e.target.value)} />
                        </div>
                        <div>
                          <label style={labelStyle}>Type</label>
                          <select className="input-base" value={newType} onChange={(e) => setNewType(e.target.value)}>
                            <option value="Personal">Personal</option>
                            <option value="Merchant">Merchant</option>
                            <option value="Agent">Agent</option>
                          </select>
                        </div>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ height: 36, padding: "0 12px", display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}
                          onClick={() => {
                            if (!newNumber) return;
                            setMobileAccounts(prev => [...prev, { id: ID.unique(), provider: newProvider, number: newNumber, type: newType }]);
                            setNewNumber("");
                          }}
                        >
                          <Plus size={14} /> Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button (all tabs except profile) */}
            {activeTab !== "profile" && (
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
                {saveStatus === "error" && (
                  <span style={{ fontSize: 12, color: "#D14F4F", display: "flex", alignItems: "center", gap: 4 }}>
                    <AlertCircle size={13} /> Failed to save.
                  </span>
                )}
                <button
                  id="settings-save-btn"
                  className="btn btn-primary"
                  style={{ fontSize: 12 }}
                  onClick={handleSave}
                  disabled={saveStatus === "saving"}
                >
                  {saveStatus === "saving" ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Saving...</> :
                   saveStatus === "saved"  ? <><Check size={13} /> Saved!</> :
                   <><Save size={13} /> Save Changes</>}
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } @keyframes pulse { 0%,100%{opacity:0.5}50%{opacity:1} }`}</style>
    </>
  );
}
