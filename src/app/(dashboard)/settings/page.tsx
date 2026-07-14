"use client";

import { useState, useEffect } from "react";
import { Topbar } from "@/components/topbar";
import { Save, Building2, CreditCard, MessageSquare, Globe, User, Lock, Loader2, Check, AlertCircle } from "lucide-react";
import { CURRENCIES } from "@/types";
import { account, databases, DB_ID, COLLECTIONS, ID, Query } from "@/lib/appwrite/client";

const TABS = [
  { id: "profile",  label: "Profile",       icon: User },
  { id: "company",  label: "Company",        icon: Building2 },
  { id: "currency", label: "Currency",       icon: Globe },
  { id: "bank",     label: "Bank Details",   icon: CreditCard },
  { id: "sms",      label: "SMS",            icon: MessageSquare },
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
  const [mobileBankingProvider, setMobileBankingProvider] = useState("bKash");
  const [mobileBankingNumber, setMobileBankingNumber]     = useState("");

  // ── SMS
  const [smsApiUrl, setSmsApiUrl]     = useState("");
  const [smsApiKey, setSmsApiKey]     = useState("");
  const [smsSenderId, setSmsSenderId] = useState("APPIBRIUM");
  const [smsTestPhone, setSmsTestPhone] = useState("");

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
              if (bd.mobile_banking?.provider) setMobileBankingProvider(bd.mobile_banking.provider);
              if (bd.mobile_banking?.number)   setMobileBankingNumber(bd.mobile_banking.number);
            } catch (_) {}
          }
          if (doc.sms_api_url)   setSmsApiUrl(doc.sms_api_url);
          if (doc.sms_api_key)   setSmsApiKey(doc.sms_api_key);
          if (doc.sms_sender_id) setSmsSenderId(doc.sms_sender_id);
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
        mobile_banking: {
          provider: mobileBankingProvider,
          number: mobileBankingNumber,
        },
      });

      const payload: Record<string, any> = {
        company_name:     companyName,
        company_email:    companyEmail,
        company_phone:    companyPhone,
        company_address:  companyAddress,
        default_currency: selectedCurrency,
        bank_details:     bankDetails,
        sms_api_url:      smsApiUrl,
        sms_api_key:      smsApiKey,
        sms_sender_id:    smsSenderId,
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
      console.error("[Settings] save error:", err);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    if (newPassword !== confirmPassword) {
      setPwError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setPwError("Password must be at least 8 characters.");
      return;
    }
    setPwStatus("saving");
    try {
      await account.updatePassword(newPassword, oldPassword);
      setPwStatus("saved");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwStatus("idle"), 2500);
    } catch (err: any) {
      setPwError(err.message || "Failed to update password.");
      setPwStatus("error");
      setTimeout(() => setPwStatus("idle"), 3000);
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
      <Topbar title="Settings" subtitle="Workspace configuration and preferences" />
      <div className="page-content">
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 20, maxWidth: 920 }}>

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

            {/* Profile */}
            {activeTab === "profile" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div>
                  <h2 style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--font-heading)", marginBottom: 4 }}>Your Profile</h2>
                  <p style={{ fontSize: 12, color: "var(--foreground-muted)", marginBottom: 20 }}>Manage your Appwrite account details.</p>

                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, padding: "14px 16px", borderRadius: "var(--radius-lg)", background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#fff", fontFamily: "var(--font-heading)", flexShrink: 0 }}>
                      {userName.slice(0, 1).toUpperCase() || "U"}
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", fontFamily: "var(--font-heading)" }}>{userName || "—"}</p>
                      <p style={{ fontSize: 12, color: "var(--foreground-muted)" }}>{userEmail || "—"}</p>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <label style={labelStyle} htmlFor="profile-name">Display Name</label>
                      <input id="profile-name" className="input-base" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Your name" />
                    </div>
                    <div>
                      <label style={labelStyle}>Email</label>
                      <input className="input-base" value={userEmail} disabled style={{ opacity: 0.6, cursor: "not-allowed" }} />
                      <p style={{ fontSize: 10, color: "var(--foreground-faint)", marginTop: 4 }}>Email cannot be changed from here.</p>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)", marginBottom: 4 }}>Change Password</h3>
                  <p style={{ fontSize: 12, color: "var(--foreground-muted)", marginBottom: 16 }}>Enter your current password and choose a new one.</p>
                  <form onSubmit={handlePasswordChange} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {[
                      { label: "Current Password", value: oldPassword,     setter: setOldPassword,     id: "old-password" },
                      { label: "New Password",      value: newPassword,     setter: setNewPassword,     id: "new-password" },
                      { label: "Confirm Password",  value: confirmPassword, setter: setConfirmPassword, id: "confirm-password" },
                    ].map(({ label, value, setter, id }) => (
                      <div key={id}>
                        <label style={labelStyle} htmlFor={id}>{label}</label>
                        <input id={id} type="password" className="input-base" value={value} onChange={(e) => setter(e.target.value)} required />
                      </div>
                    ))}
                    {pwError && (
                      <div style={{ padding: "8px 12px", borderRadius: "var(--radius-md)", background: "#FEF2F2", border: "1px solid #FAC5C5", fontSize: 12, color: "#D14F4F", display: "flex", alignItems: "center", gap: 6 }}>
                        <AlertCircle size={13} /> {pwError}
                      </div>
                    )}
                    <div>
                      <button type="submit" id="password-save-btn" className="btn btn-ghost" style={{ fontSize: 12 }} disabled={pwStatus === "saving"}>
                        {pwStatus === "saving" ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Updating...</> :
                         pwStatus === "saved"  ? <><Check size={13} /> Password Updated!</> :
                         <><Lock size={13} /> Update Password</>}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Profile-level save excluded — password change has its own submit */}
              </div>
            )}

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
                  ].map(({ label, value, setter, id, placeholder }: any) => (
                    <div key={id}>
                      <label style={labelStyle} htmlFor={id}>{label}</label>
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
                      <label style={labelStyle} htmlFor={id}>{label}</label>
                      <input id={id} className="input-base" value={value} onChange={(e) => setter(e.target.value)} placeholder={placeholder} />
                    </div>
                  ))}
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "var(--foreground-muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Mobile Banking</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={labelStyle} htmlFor="mobile-banking-provider">Provider</label>
                        <select id="mobile-banking-provider" className="input-base" value={mobileBankingProvider} onChange={(e) => setMobileBankingProvider(e.target.value)}>
                          {["bKash", "Nagad", "Rocket", "Upay", "SureCash"].map((p) => <option key={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle} htmlFor="mobile-banking-number">Number</label>
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
                    <label style={labelStyle} htmlFor="sms-api-url">API Endpoint URL</label>
                    <input id="sms-api-url" className="input-base" type="url" value={smsApiUrl} onChange={(e) => setSmsApiUrl(e.target.value)} placeholder="https://api.smsprovider.com/send" />
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor="sms-api-key">API Key</label>
                    <input id="sms-api-key" className="input-base" type="password" value={smsApiKey} onChange={(e) => setSmsApiKey(e.target.value)} placeholder="Your API key" />
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor="sms-sender-id">Sender ID</label>
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
