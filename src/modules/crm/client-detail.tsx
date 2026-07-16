"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  User,
  Plus,
  Trash2,
  FileText,
  FolderKanban,
  Receipt,
  HardDrive,
  StickyNote,
  ArrowLeft,
  Briefcase,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { getClient, getContacts, getNotes, createNote } from "@/services/crm";
import { getProjects } from "@/services/projects";
import { getProposals } from "@/services/proposals";
import { getInvoices } from "@/services/invoices";
import type { Client, Contact, Note, Project, Proposal, Invoice } from "@/types";
import { formatDate, formatCurrency, initials } from "@/utils";
import { EditClientModal } from "@/components/edit-client-modal";

interface ClientDetailProps {
  id: string;
}

export function ClientDetail({ id }: ClientDetailProps) {
  const [client, setClient] = useState<Client | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"projects" | "proposals" | "invoices" | "notes" | "contacts">("projects");
  const [showEditModal, setShowEditModal] = useState(false);

  // New Note State
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [c, cons, nts, projs, props, invs] = await Promise.all([
        getClient(id),
        getContacts(id),
        getNotes(id),
        getProjects(id),
        getProposals(id),
        getInvoices(id),
      ]);
      setClient(c);
      setContacts(cons);
      setNotes(nts);
      setProjects(projs);
      setProposals(props);
      setInvoices(invs);
      setLoading(false);
    }
    loadData();
  }, [id]);

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteTitle || !noteContent) return;
    setNoteSubmitting(true);
    const res = await createNote({
      client_id: id,
      title: noteTitle,
      content: noteContent,
      created_by: "Ratul Hasan",
    });
    if (res.success && res.data) {
      setNotes((prev) => [res.data!, ...prev]);
      setNoteTitle("");
      setNoteContent("");
    }
    setNoteSubmitting(false);
  }

  async function handleDeleteClient() {
    if (!confirm("Are you sure you want to permanently delete this client? This will delete their database documents and their authentication account. This action cannot be undone.")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/crm/delete-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Client deleted successfully!");
        window.location.href = "/crm";
      } else {
        alert(data.error || "Failed to delete client.");
        setLoading(false);
      }
    } catch (err: any) {
      alert("An error occurred: " + err.message);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300, color: "var(--foreground-muted)" }}>
        <p>Loading client workspace...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <p style={{ color: "var(--foreground-muted)" }}>Client not found.</p>
        <Link href="/crm" style={{ color: "var(--accent)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginTop: 12 }}>
          <ArrowLeft size={14} /> Back to CRM
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Back to list */}
      <div>
        <Link href="/crm" style={{ color: "var(--foreground-muted)", textDecoration: "none", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 4 }}>
          <ArrowLeft size={14} /> Back to CRM
        </Link>
      </div>

      {/* ─── Client Profile Hero Card ─── */}
      <div className="card" style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: "var(--radius-lg)",
              background: "var(--surface)",
              border: "1.5px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              fontWeight: 700,
              color: "var(--accent)",
              fontFamily: "var(--font-heading)",
            }}
          >
            {initials(client.name)}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-heading)", margin: 0 }}>{client.name}</h1>
              <span className={`badge badge-${client.status === "active" ? "active" : client.status === "lead" ? "lead" : "inactive"}`}>
                {client.status}
              </span>
            </div>
            <p style={{ fontSize: 13, color: "var(--foreground-muted)", marginTop: 2 }}>{client.legal_name || "No legal name defined"}</p>
          </div>
        </div>

        {/* Quick details */}
        <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {client.email && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Mail size={14} style={{ color: "var(--foreground-faint)" }} />
                <div>
                  <p style={{ fontSize: 10, textTransform: "uppercase", color: "var(--foreground-faint)", fontWeight: 600 }}>Email</p>
                  <a href={`mailto:${client.email}`} style={{ fontSize: 12, color: "var(--foreground-2)", textDecoration: "none", fontWeight: 500 }}>
                    {client.email}
                  </a>
                </div>
              </div>
            )}
            {client.phone && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Phone size={14} style={{ color: "var(--foreground-faint)" }} />
                <div>
                  <p style={{ fontSize: 10, textTransform: "uppercase", color: "var(--foreground-faint)", fontWeight: 600 }}>Phone</p>
                  <span style={{ fontSize: 12, color: "var(--foreground-2)", fontWeight: 500 }}>{client.phone}</span>
                </div>
              </div>
            )}
            {client.website && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Globe size={14} style={{ color: "var(--foreground-faint)" }} />
                <div>
                  <p style={{ fontSize: 10, textTransform: "uppercase", color: "var(--foreground-faint)", fontWeight: 600 }}>Website</p>
                  <a href={`https://${client.website}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", fontWeight: 500, display: "flex", alignItems: "center", gap: 3 }}>
                    {client.website} <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            )}
            {client.address && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <MapPin size={14} style={{ color: "var(--foreground-faint)" }} />
                <div>
                  <p style={{ fontSize: 10, textTransform: "uppercase", color: "var(--foreground-faint)", fontWeight: 600 }}>Address</p>
                  <span style={{ fontSize: 12, color: "var(--foreground-2)", fontWeight: 500 }}>{client.address}</span>
                </div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setShowEditModal(true)}
              className="btn btn-ghost"
              style={{ padding: "6px 12px", fontSize: 11 }}
            >
              Edit Profile
            </button>
            <button
              onClick={handleDeleteClient}
              className="btn btn-danger"
              style={{ padding: "6px 12px", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}
            >
              <Trash2 size={12} /> Delete Client
            </button>
          </div>
        </div>
      </div>

      {/* ─── Tabs Navigation ─── */}
      <div style={{ display: "flex", gap: 6, borderBottom: "1px solid var(--border)", paddingBottom: 1 }}>
        {[
          { id: "projects", label: "Projects", icon: FolderKanban, count: projects.length },
          { id: "proposals", label: "Proposals", icon: FileText, count: proposals.length },
          { id: "invoices", label: "Invoices", icon: Receipt, count: invoices.length },
          { id: "notes", label: "Notes", icon: StickyNote, count: notes.length },
          { id: "contacts", label: "Contacts", icon: User, count: contacts.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                border: "none",
                background: "none",
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "var(--accent)" : "var(--foreground-muted)",
                cursor: "pointer",
                position: "relative",
                borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                marginBottom: -1,
                fontFamily: "var(--font-body)",
              }}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
              <span style={{ fontSize: 10, background: isActive ? "var(--accent-subtle)" : "var(--surface)", color: isActive ? "var(--accent)" : "var(--foreground-muted)", padding: "1px 6px", borderRadius: 99, fontWeight: 600 }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── Tab Contents ─── */}
      <div>
        {/* Projects Tab */}
        {activeTab === "projects" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {projects.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "40px", color: "var(--foreground-muted)" }}>
                No projects found for this client.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {projects.map((proj) => (
                  <div key={proj.$id} className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>{proj.name}</h3>
                        <p style={{ fontSize: 11, color: "var(--foreground-muted)", marginTop: 2 }}>Started: {proj.start_date ? formatDate(proj.start_date) : "N/A"}</p>
                      </div>
                      <span className={`badge badge-${proj.status === "active" ? "active" : proj.status === "completed" ? "completed" : proj.status === "planning" ? "planning" : "on_hold"}`}>
                        {proj.status}
                      </span>
                    </div>
                    {proj.description && (
                      <p style={{ fontSize: 12, color: "var(--foreground-2)", lineHeight: 1.5 }}>{proj.description}</p>
                    )}
                    {proj.budget && (
                      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: "var(--foreground-muted)" }}>Budget</span>
                        <strong style={{ fontSize: 13, color: "var(--foreground)", fontFamily: "var(--font-heading)" }}>
                          {formatCurrency(proj.budget, proj.currency)}
                        </strong>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Proposals Tab */}
        {activeTab === "proposals" && (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {proposals.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--foreground-muted)" }}>
                No proposals created for this client.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Proposal</th>
                    <th>Status</th>
                    <th>Version</th>
                    <th>Last Updated</th>
                    <th style={{ width: 80 }} />
                  </tr>
                </thead>
                <tbody>
                  {proposals.map((prop) => (
                    <tr key={prop.$id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <FileText size={14} style={{ color: "var(--accent)" }} />
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{prop.title}</p>
                            <p style={{ fontSize: 10, color: "var(--foreground-muted)" }}>{prop.$id}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${prop.status}`}>{prop.status}</span>
                      </td>
                      <td>v{prop.version}</td>
                      <td>{formatDate(prop.$updatedAt)}</td>
                      <td>
                        <Link href={`/proposals/${prop.$id}/edit`} className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 8px" }}>
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === "invoices" && (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {invoices.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--foreground-muted)" }}>
                No invoices found for this client.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Issue Date</th>
                    <th>Due Date</th>
                    <th style={{ width: 80 }} />
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.$id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Receipt size={14} style={{ color: "var(--accent)" }} />
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{inv.title}</p>
                            <p style={{ fontSize: 10, color: "var(--foreground-muted)" }}>{inv.$id}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong style={{ fontFamily: "var(--font-heading)" }}>{formatCurrency(inv.total, inv.currency)}</strong>
                      </td>
                      <td>
                        <span className={`badge badge-${inv.status}`}>{inv.status}</span>
                      </td>
                      <td>{formatDate(inv.issue_date)}</td>
                      <td>{formatDate(inv.due_date)}</td>
                      <td>
                        <Link href={`/invoices/${inv.$id}`} className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 8px" }}>
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === "notes" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Add Note Form */}
            <div className="card">
              <h3 style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-heading)", marginBottom: 12 }}>Add internal note</h3>
              <form onSubmit={handleAddNote} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input
                  className="input-base"
                  placeholder="Note Title (e.g. Call summary, meeting minutes...)"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  required
                />
                <textarea
                  className="input-base"
                  placeholder="Type note details here..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={3}
                  required
                  style={{ resize: "vertical" }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button type="submit" className="btn btn-primary" style={{ fontSize: 12 }} disabled={noteSubmitting}>
                    {noteSubmitting ? "Saving..." : "Add Note"}
                  </button>
                </div>
              </form>
            </div>

            {/* Notes List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {notes.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: "30px", color: "var(--foreground-muted)" }}>
                  No notes recorded yet.
                </div>
              ) : (
                notes.map((note) => (
                  <div key={note.$id} className="card" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ fontSize: 13, color: "var(--foreground)" }}>{note.title}</strong>
                      <span style={{ fontSize: 11, color: "var(--foreground-muted)" }}>
                        {formatDate(note.$createdAt)} by {note.created_by}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--foreground-2)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                      {note.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Contacts Tab */}
        {activeTab === "contacts" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {contacts.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "40px", color: "var(--foreground-muted)" }}>
                No secondary contacts defined.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {contacts.map((contact) => (
                  <div key={contact.$id} className="card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "var(--surface)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--accent)",
                        fontFamily: "var(--font-heading)",
                      }}
                    >
                      {initials(`${contact.first_name} ${contact.last_name}`)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <strong style={{ fontSize: 13, color: "var(--foreground)" }}>
                          {contact.first_name} {contact.last_name}
                        </strong>
                        {contact.is_primary && <span className="badge badge-active" style={{ fontSize: 9, padding: "1px 5px" }}>Primary</span>}
                      </div>
                      {contact.role && <p style={{ fontSize: 11, color: "var(--foreground-muted)", marginTop: 1 }}>{contact.role}</p>}
                      <div style={{ display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
                        <a href={`mailto:${contact.email}`} style={{ fontSize: 11, color: "var(--foreground-muted)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                          <Mail size={12} /> {contact.email}
                        </a>
                        {contact.phone && (
                          <a href={`tel:${contact.phone}`} style={{ fontSize: 11, color: "var(--foreground-muted)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                            <Phone size={12} /> {contact.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {showEditModal && client && (
        <EditClientModal
          client={client}
          onUpdate={(updated) => {
            setClient(updated);
            setShowEditModal(false);
          }}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
}
