"use client";

import { useState, useEffect } from "react";
import { Search, HardDrive, Download, Trash2, Plus, Loader2, FileText, Check, AlertCircle } from "lucide-react";
import type { FileMetadata, Client } from "@/types";
import { formatDate, formatFileSize } from "@/utils";
import { getFilesMetadata, uploadFile, deleteFile, getFileDownloadUrl } from "@/services/files";
import { getClients } from "@/services/crm";
import { account } from "@/lib/appwrite/client";

export function FilesList() {
  const [files, setFiles]         = useState<FileMetadata[]>([]);
  const [clients, setClients]     = useState<Client[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");

  const [uploading, setUploading] = useState(false);
  const [clientId, setClientId]   = useState("");
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const [uploadError, setUploadError]   = useState("");

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin]         = useState(false);
  const [myClientId, setMyClientId]   = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const [fList, cliList] = await Promise.all([getFilesMetadata(), getClients()]);
      setFiles(fList);
      setClients(cliList);

      // Check user role & resolve client ID
      try {
        const user = await account.get();
        setCurrentUser(user);
        const labels = user.labels || [];
        const admin = labels.length > 0 && ["owner", "admin", "administrator", "manager", "finance"].includes(labels[0].toLowerCase());
        setIsAdmin(admin);

        if (!admin) {
          const matchingClient = cliList.find(c => c.email?.toLowerCase() === user.email?.toLowerCase());
          if (matchingClient) {
            setMyClientId(matchingClient.$id);
            setClientId(matchingClient.$id);
          }
        }
      } catch (userErr) {
        console.error("Failed to load account session in files list:", userErr);
      }
    } catch (err) {
      console.error("[FilesList] load error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const clientMap = new Map(clients.map((c) => [c.$id, c.name]));

  const filtered = files.filter((f) => {
    const q = search.toLowerCase();
    const matchesSearch = f.name.toLowerCase().includes(q);
    if (!matchesSearch) return false;

    if (isAdmin) return true;
    return !f.client_id || f.client_id === myClientId;
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadStatus("idle");
    setUploadError("");

    const result = await uploadFile(file, clientId || undefined);
    setUploading(false);

    if (result.success) {
      setUploadStatus("success");
      setTimeout(() => setUploadStatus("idle"), 2500);
      loadData();
    } else {
      setUploadStatus("error");
      setUploadError(result.error || "Failed to upload file.");
      setTimeout(() => setUploadStatus("idle"), 3000);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this file?")) return;
    const result = await deleteFile(id);
    if (result.success) {
      loadData();
    } else {
      alert("Error: " + result.error);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20 }}>
      {/* Left Area: Files List */}
      <div>
        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div style={{ position: "relative", width: "100%", maxWidth: 300 }}>
            <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--foreground-faint)", pointerEvents: "none" }} />
            <input className="input-base" placeholder="Search files..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 30 }} />
          </div>
          <span style={{ fontSize: 12, color: "var(--foreground-muted)", marginLeft: "auto" }}>
            {loading ? "Loading..." : `${filtered.length} file${filtered.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {/* Table */}
        <div style={{ background: "var(--background-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-xs)" }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 20px", gap: 10, color: "var(--foreground-muted)" }}>
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: 13 }}>Loading file list...</span>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Client</th>
                  <th>Size</th>
                  <th>Uploaded At</th>
                  <th style={{ width: 80 }} />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "60px 20px" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                        <HardDrive size={32} style={{ color: "var(--foreground-faint)" }} />
                        <p style={{ color: "var(--foreground-muted)", fontSize: 13, fontWeight: 500 }}>
                          {files.length === 0 ? "No files stored in workspace yet." : "No files match your search."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((f) => (
                    <tr key={f.$id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 30, height: 30, borderRadius: "var(--radius-md)", background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
                            <FileText size={13} />
                          </div>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</p>
                            <p style={{ fontSize: 10, color: "var(--foreground-muted)", textTransform: "uppercase" }}>{f.mime_type.split("/")[1] || "File"}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: 12, color: "var(--foreground-2)" }}>
                          {f.client_id ? clientMap.get(f.client_id) : "General Document"}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: 12, color: "var(--foreground-muted)" }}>{formatFileSize(f.size_bytes)}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: 12, color: "var(--foreground-muted)" }}>{formatDate(f.$createdAt)}</span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 4 }}>
                          <a href={getFileDownloadUrl(f.$id)} download className="btn btn-ghost" style={{ padding: 4 }} title="Download">
                            <Download size={13} />
                          </a>
                          <button onClick={() => handleDelete(f.$id)} className="btn btn-ghost" style={{ padding: 4, color: "#D14F4F" }} title="Delete">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Right Sidebar: File Upload Form */}
      <div className="card" style={{ height: "fit-content" }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)", marginBottom: 14 }}>Upload Document</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {isAdmin && (
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--foreground-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Related Client (Optional)</label>
              <select className="input-base" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">None (General)</option>
                {clients.map((c) => (
                  <option key={c.$id} value={c.$id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                height: 120, border: "2px dashed var(--border)", borderRadius: "var(--radius-lg)",
                cursor: uploading ? "not-allowed" : "pointer", background: "var(--surface)",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--accent)"}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border)"}
            >
              {uploading ? (
                <>
                  <Loader2 size={24} style={{ color: "var(--accent)", animation: "spin 1s linear infinite" }} />
                  <span style={{ fontSize: 11, color: "var(--foreground-muted)", marginTop: 8 }}>Uploading...</span>
                </>
              ) : (
                <>
                  <Plus size={24} style={{ color: "var(--accent)" }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", marginTop: 6 }}>Select File</span>
                  <span style={{ fontSize: 10, color: "var(--foreground-muted)", marginTop: 2 }}>PDF, Images, Zip</span>
                </>
              )}
              <input type="file" onChange={handleUpload} style={{ display: "none" }} disabled={uploading} />
            </label>
          </div>

          {uploadStatus === "success" && (
            <div style={{ padding: "8px 12px", borderRadius: "var(--radius-md)", background: "#E6FAF3", border: "1px solid #B3E8D2", fontSize: 12, color: "#00965C", display: "flex", alignItems: "center", gap: 6 }}>
              <Check size={13} /> Uploaded successfully!
            </div>
          )}

          {uploadStatus === "error" && (
            <div style={{ padding: "8px 12px", borderRadius: "var(--radius-md)", background: "#FEF2F2", border: "1px solid #FAC5C5", fontSize: 12, color: "#D14F4F", display: "flex", alignItems: "center", gap: 6 }}>
              <AlertCircle size={13} /> {uploadError}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
