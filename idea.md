# Appibrium Studio
Version: 1.0

> Internal Business Operating System for Appibrium

---

# Vision

Appibrium Studio is the internal business platform of Appibrium.

It is **not a traditional CRM**.

Studio is designed to become the central operating system of the company, managing clients, projects, finance, documents, AI-assisted workflows, and future business operations from a single platform.

The system must be scalable, modular, maintainable, and enterprise-ready.

Future modules such as Research, Labs, HR, Assets, Knowledge Base, Recruitment, and Inventory must be easily integrated without major architectural changes.

---

# Design Philosophy

The application should feel closer to:

- Vercel Dashboard
- Stripe Dashboard
- Linear
- GitHub
- Notion
- Raycast

and NOT like traditional CRM software.

Design Principles:

- Minimal
- Modern
- Fast
- Engineering-first
- Professional
- Accessible
- Keyboard Friendly
- Beautiful Typography
- White Space
- Responsive

Avoid:

- Bootstrap style layouts
- Old ERP interfaces
- Heavy gradients
- Glassmorphism
- Over-designed UI

---

# Branding

Company

Appibrium Technology Co.

Website

https://appibrium.com

Primary Brand

Appibrium Studio

Brand Colors

Primary Accent

#00E090

Dark

#0A1A10

Surface

#F2FFF9

Typography

Headings

Jost

Body

Plus Jakarta Sans

---

# Technology Stack

Frontend

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui
- Framer Motion
- Lucide Icons

Forms

- React Hook Form
- Zod

Tables

- TanStack Table

Charts

- Tremor
- Recharts

Backend

- Next.js Server Actions
- Route Handlers

Authentication

- Appwrite Auth

Database

- Appwrite Database

Storage

- Appwrite Storage

Deployment

- Vercel

Version Control

- GitHub

Email

Business Mailbox

Zoho Mail

System Email

Resend

AI

Alibaba Cloud Model Studio

Primary Model

Qwen Coder

PDF

Generate server-side HTML

Render PDF from HTML

Never use browser print.

---

# High Level Architecture

Presentation Layer

↓

Application Layer

↓

Domain Layer

↓

Infrastructure Layer

↓

External Services

The codebase must follow modular architecture.

Never place all business logic inside pages.

---

# Modules

Dashboard

CRM

Clients

Projects

Proposals

Invoices

Transactions

Files

Analytics

Notifications

AI Assistant

Settings

Future

Research

Labs

HR

Assets

Recruitment

Knowledge Base

Inventory

---

# Dashboard

Widgets

Revenue

Outstanding Payments

Pending Proposal

Pending Invoice

Recent Activity

Monthly Revenue

Top Clients

Project Status

Tasks

Storage Usage

---

# CRM

Manage

Leads

Clients

Companies

Contacts

Tags

Timeline

Notes

---

# Client

Every Client contains

Projects

Proposals

Invoices

Transactions

Files

Timeline

Activity

Notes

Emails

---

# Proposal Builder

This is one of the core features.

Workflow

Create

↓

Generate with AI

↓

Edit

↓

Generate HTML

↓

Generate PDF

↓

Generate Public URL

↓

Email Client

↓

Accept

↓

Convert to Invoice

Features

Professional Templates

Version History

Comments

Status

Draft

Review

Sent

Viewed

Accepted

Rejected

Proposal Number

APP-PROP-YYYY-0001

---

# Invoice Builder

Invoice Number

APP-INV-YYYY-0001

Workflow

Generate

↓

PDF

↓

Public URL

↓

Email

↓

Payment

↓

Completed

Status

Draft

Sent

Paid

Cancelled

Overdue

---

# Files

Storage

Contracts

Proposal

Invoices

Design

Assets

Documents

Source Files

Version History

Preview

---

# Transactions

Income

Expense

Advance

Refund

Outstanding

Client Balance

---

# Analytics

Revenue

Monthly

Yearly

Outstanding

Proposal Conversion

Average Project Value

Top Clients

Export CSV

---

# AI Assistant

Purpose

Generate Proposal

Improve Proposal

Generate Scope

Generate Deliverables

Generate Timeline

Generate Contract

Generate Invoice Description

Rewrite Email

Summarize Meeting

Professional Writing

Translate

Grammar

AI should always assist the user.

Never automatically send emails.

---

# Email System

Mailbox

Zoho Mail

System Sending

Resend

Sender

hello@appibrium.com

Support future senders

accounts@appibrium.com

support@appibrium.com

projects@appibrium.com

Email Templates

Proposal

Invoice

Reminder

Welcome

Completion

Password Reset

---

# Document Engine

One document engine must generate

Proposal

Invoice

Quotation

Contract

Completion Certificate

Offer Letter

Every document supports

HTML

PDF

Public URL

Email

Version

---

# Public Links

Examples

studio.appibrium.com/proposal/{token}

studio.appibrium.com/invoice/{token}

Public links must not require login.

---

# Authentication

Roles

Owner

Administrator

Manager

Finance

Engineer

Researcher

Client

Role Based Access Control is required.

---

# Notifications

Proposal Viewed

Proposal Accepted

Invoice Paid

Invoice Overdue

File Uploaded

Client Login

Project Updated

---

# Search

Global Search

Support

Clients

Projects

Proposal

Invoice

Files

Transactions

Notes

---

# Security

HTTPS

Protected Routes

Audit Logs

Signed URLs

Role Based Access

Rate Limiting

Secure Storage Access

---

# Folder Structure

src/

app/

components/

modules/

lib/

hooks/

services/

types/

utils/

styles/

emails/

documents/

Each module must be isolated.

No business logic inside UI components.

---

# Future Roadmap

Research Module

Labs Module

Knowledge Base

Internal Wiki

HR

Recruitment

Assets

Inventory

Calendar

Meetings

AI Copilot

Public API

Webhook System

Digital Signature

---

# Development Rules

Use TypeScript everywhere.

Use reusable components.

Keep modules independent.

Separate UI from business logic.

Never hardcode templates.

Everything should be configurable.

Write clean, maintainable code.

Optimize for scalability.

Build as if this product will eventually become a commercial SaaS.

---

# Final Goal

Build Appibrium Studio as a premium business operating system with an enterprise-quality user experience.

Every interaction should communicate professionalism, speed, simplicity, and engineering excellence.

The product should feel comparable to modern SaaS platforms such as Stripe Dashboard, Vercel, Linear, and Notion.