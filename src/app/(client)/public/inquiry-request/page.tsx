"use client";

import { useState } from "react";
import { Sparkles, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { databases, DB_ID, COLLECTIONS, ID, account, Query } from "@/lib/appwrite/client";

export default function InquiryRequestPage() {
  // Form fields
  const [companyName, setCompanyName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [budget, setBudget] = useState("");
  const [duration, setDuration] = useState("");

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isNewClientUser, setIsNewClientUser] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Check if client document already exists with this email
      const clientList = await databases.listDocuments(DB_ID, COLLECTIONS.CLIENTS, [
        Query.equal("email", email.trim().toLowerCase()),
        Query.limit(1)
      ]);

      let clientId = "";
      let isNew = false;

      if (clientList.documents.length > 0) {
        clientId = clientList.documents[0].$id;
      } else {
        isNew = true;
        setIsNewClientUser(true);

        // 1. Create client document
        const clientRes = await databases.createDocument(
          DB_ID,
          COLLECTIONS.CLIENTS,
          ID.unique(),
          {
            name: companyName.trim(),
            legal_name: companyName.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
            status: "lead", // Created as lead
          }
        );

        clientId = clientRes.$id;

        // 2. Create contact document
        await databases.createDocument(
          DB_ID,
          COLLECTIONS.CONTACTS,
          ID.unique(),
          {
            client_id: clientId,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
            role: "Contact Person",
            is_primary: true,
          }
        );
      }

      // 3. Create draft proposal based on client's inquiry request
      const publicToken = "tok_" + Math.random().toString(36).substring(2, 10);
      const draftContent = `
        <h2>1. Inquiry Executive Summary</h2>
        <p>Requested by <strong>${firstName} ${lastName}</strong> representing <strong>${companyName}</strong>.</p>
        <p><strong>Project Interest:</strong> ${projectDesc}</p>

        <h2>2. Target Budget & Timeline</h2>
        <ul>
          <li><strong>Estimated Target Budget:</strong> ${budget} BDT</li>
          <li><strong>Estimated Project Duration:</strong> ${duration}</li>
        </ul>

        <h2>3. Next Steps (Action Required)</h2>
        <p>This draft proposal has been auto-generated from the client inquiry submission. The Appibrium engineering team will refine this document, add technical architecture specs, and send the finalized proposal back to the client.</p>
      `;

      await databases.createDocument(
        DB_ID,
        COLLECTIONS.PROPOSALS,
        ID.unique(),
        {
          client_id: clientId,
          title: projectTitle || `${companyName} Project Scope`,
          status: "draft",
          content_html: draftContent.trim(),
          public_token: publicToken,
          version: 1,
          currency: "BDT",
        }
      );

      // 4. Create internal notification for Admin
      await databases.createDocument(
        DB_ID,
        COLLECTIONS.NOTIFICATIONS,
        ID.unique(),
        {
          user_id: "admin",
          title: "New Inquiry Received",
          message: `${companyName} has submitted an inquiry for "${projectTitle}". A draft proposal has been generated.`,
          type: "project_updated",
          is_read: false,
          link: `/inquiries`,
        }
      );

      // 5. Trigger magic URL token client-side if this is a new client
      if (isNew) {
        try {
          const redirectUrl = window.location.origin + "/verify-magic-link";
          await account.createMagicURLToken(ID.unique(), email.trim().toLowerCase(), redirectUrl);
        } catch (authErr: any) {
          console.error("Magic link generation failed:", authErr);
        }
      }

      setSubmitted(true);
    } catch (err: any) {
      console.error("Inquiry submission failed:", err);
      setError(err.message || "Failed to submit request. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div className="card" style={{ maxWidth: 480, width: "100%", textAlign: "center", padding: "40px 30px", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <CheckCircle2 size={48} style={{ color: "var(--accent)" }} />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, fontFamily: "var(--font-heading)" }}>Inquiry Submitted!</h1>
            <p style={{ fontSize: 13, color: "var(--foreground-muted)", marginTop: 8, lineHeight: 1.6 }}>
              Thank you, <strong>{firstName}</strong>. We have received your inquiry for <strong>{companyName}</strong>. 
              Our engineering team is already reviewing your details and will follow up shortly.
            </p>
            {isNewClientUser && (
              <div style={{ marginTop: 16, padding: 14, background: "var(--accent-subtle)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", color: "var(--foreground)", fontSize: 12, display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
                <strong style={{ color: "var(--accent)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Sparkles size={13} /> Access Link Sent
                </strong>
                <span style={{ lineHeight: 1.4 }}>We sent a login Magic Link to <strong>{email}</strong>. Check your inbox to access your client portal.</span>
              </div>
            )}
          </div>
          <div style={{ width: "100%", height: 1, background: "var(--border)" }} />
          <p style={{ fontSize: 11, color: "var(--foreground-faint)" }}>
            © {new Date().getFullYear()} Appibrium Technology Co.
          </p>
        </div>
      </div>
    );
  }


  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", flexDirection: "column", padding: "40px 20px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: 28 }}>
        
        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10 }}>
          <img src="/branding_assets/logos/lockup/lockup_w4_light.svg" alt="Appibrium" style={{ height: 28 }} />
          <h1 style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-heading)", color: "var(--foreground)" }}>
            Submit a Project Inquiry
          </h1>
          <p style={{ fontSize: 13, color: "var(--foreground-muted)", maxWidth: 460 }}>
            Submit your project details. Our interactive system will register your profile and draft a custom technical proposal structure instantly.
          </p>
        </div>

        {/* Form Card */}
        <div className="card" style={{ padding: "32px 30px" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            
            <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent)", borderBottom: "1px solid var(--border)", paddingBottom: 6 }}>
              1. Company & Contact Details
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Company / Client Name *</label>
                <input
                  type="text"
                  className="input-base"
                  placeholder="e.g. Acme Corp"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Contact Phone *</label>
                <input
                  type="tel"
                  className="input-base"
                  placeholder="e.g. +88017..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 6 }}>First Name *</label>
                <input
                  type="text"
                  className="input-base"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Last Name *</label>
                <input
                  type="text"
                  className="input-base"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Email Address *</label>
              <input
                type="email"
                className="input-base"
                placeholder="contact@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent)", borderBottom: "1px solid var(--border)", paddingBottom: 6, marginTop: 10 }}>
              2. Project Description
            </h3>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Project Title / Focus *</label>
              <input
                type="text"
                className="input-base"
                placeholder="e.g. Redesign Corporate Web Platform & Analytics"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Target Budget (BDT) *</label>
                <input
                  type="text"
                  className="input-base"
                  placeholder="e.g. 1,50,000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Desired Duration *</label>
                <input
                  type="text"
                  className="input-base"
                  placeholder="e.g. 2 Months"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Detailed Requirements & Goal *</label>
              <textarea
                className="input-base"
                rows={4}
                placeholder="Please outline the main features, objectives, and integrations you expect for the system..."
                value={projectDesc}
                onChange={(e) => setProjectDesc(e.target.value)}
                required
                style={{ resize: "none" }}
              />
            </div>

            {error && (
              <div style={{ padding: "10px 12px", borderRadius: "var(--radius-md)", background: "#FEF2F2", border: "1px solid #FAC5C5", fontSize: 12, color: "#D14F4F" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: "100%", justifyContent: "center", padding: 12, fontSize: 13, marginTop: 8 }}
            >
              {loading ? (
                <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Submitting Request...</>
              ) : (
                <>Submit Inquiry <ArrowRight size={15} /></>
              )}
            </button>

          </form>
        </div>

        {/* Footer */}
        <p style={{ textAlign: "center", fontSize: 11, color: "var(--foreground-muted)" }}>
          © {new Date().getFullYear()} Appibrium Technology Co. All rights reserved.
        </p>

      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
