# M'Arte Jewellery | Enterprise Full-Stack E-Commerce Platform

This repository contains the source code for **M'Arte**, a premium real-world jewellery brand based in Poland. This is a production-grade, high-performance e-commerce solution designed for the modern web, encompassing both an impressive storefront and a robust administrative dashboard.

---

## 1. Project Overview

A state-of-the-art, full-stack platform engineered to be **extremely performant, scalable, and robust**. The architecture is built on **TanStack Start** deployed natively on **Cloudflare Workers**, leveraging the Cloudflare ecosystem for compute, storage, and edge delivery — eliminating infrastructure overhead while achieving globally distributed, near-zero-latency responses.

The system provides a comprehensive e-commerce suite:

- **Luxury Storefront:** A seamless, high-fidelity customer experience optimized for Core Web Vitals.
- **Admin Command Center:** A secure, enterprise-grade dashboard for managing the entire business lifecycle: inventory, orders, customer relations (CRM), and analytics.
- **Advanced UX:** "Boutique" feel using high-performance smooth scrolling and orchestrated motion.
- **Global Commerce:** Full internationalization (i18n) and multi-currency support.
- **Secure Checkout:** Integrated payment flows (Stripe) and automated logistics.

---

## 2. Architecture & Infrastructure

The application follows a **Cloudflare-native Serverless** philosophy, running entirely within the Cloudflare ecosystem to maximize edge performance while minimizing operational complexity.

- **Compute Layer:** **Cloudflare Workers** — the application runs as a Worker at the edge, powered by the V8 isolate runtime for fast cold starts and global distribution.
- **Database:** **Cloudflare D1** (`DB` binding) — a serverless SQLite database managed at the edge, providing low-latency structured data access with Drizzle ORM.
- **Object Storage:** **Cloudflare R2** (`IMAGES` binding) — handles all high-resolution product imagery and assets with **zero egress fees**, ensuring high-speed global delivery without scaling costs.
- **Key-Value Store:** **Cloudflare KV** (`CACHE` binding) — used for edge caching, session data, and low-latency key lookups.
- **Communications:** **Cloudflare Email Service** (Email Routing + Email Workers) handles all transactional email — order confirmations, customer engagement, and notifications — keeping the communications layer fully within the Cloudflare ecosystem.
- **Smart Placement:** Enabled to automatically co-locate the Worker with upstream data sources, further reducing latency.
- **Observability:** Cloudflare Workers Observability is enabled for request tracing and performance monitoring.

---

## 3. Technology Stack

### **Core Frameworks**

- **TanStack Start:** Full-stack React framework powering both the storefront and admin dashboard, with SSR, streaming, and server functions running directly on Cloudflare Workers.
- **TanStack Router:** Type-safe, file-based routing with first-class search params and data loading.
- **React 19:** The UI rendering foundation.
- **TypeScript:** Strictly typed throughout. The use of `any` or `unknown` is strictly forbidden to ensure architectural integrity.

### **UI & UX Orchestration**

- **Tailwind CSS 4:** Utilizing the latest utility-first styling engine for a minimal CSS footprint.
- **Shadcn UI / Base UI:** High-quality, accessible components customized for a premium aesthetic.
- **GSAP (GreenSock):** For complex, timeline-based animations that reflect the brand's artisanal quality.
- **Lenis:** For decoupled, high-performance smooth scrolling.

### **Data & State Management**

- **TanStack Query (v5):** Robust server-state management, caching, and synchronization.
- **Drizzle ORM:** Type-safe database interactions with D1, including schema migrations.
- **Better Auth:** Authentication and session management.
- **Zod (v4):** Strict schema validation for all user inputs and API payloads.
- **i18next:** Internationalization and multi-language support.

---

## 4. Tooling & Standards

- **Toolchain:** **Vite+** (`vp`) is used exclusively for all development lifecycle operations — `vp dev`, `vp build`, `vp test`, `vp check`, `vp fmt`, `vp lint`. Do not use the underlying package manager directly.
- **Package Manager:** **Bun** (`bun@1.3.13`) is the underlying package manager invoked through `vp`.
- **Deployment:** `wrangler deploy` (via `vp build && wrangler deploy`). The Worker is served at `martebizuteria.pjborowiecki.workers.dev`.
- **Code Quality:** **Oxlint + Oxfmt** (via Vite+) are used exclusively for linting and formatting.
- **Version Control:** Managed manually by the lead architect. The agent/AI should never add commits or push code.
- **Testing:** Vitest (via `vp test`) for unit/integration logic and Playwright for critical E2E paths (Checkout, Auth, Admin).

---

## 5. Cloudflare Bindings Reference

| Binding  | Type   | Purpose                         |
| -------- | ------ | ------------------------------- |
| `DB`     | D1     | Primary relational database     |
| `IMAGES` | R2     | Product imagery & asset storage |
| `CACHE`  | KV     | Edge caching & session data     |
| `ASSETS` | Static | Static asset serving            |
