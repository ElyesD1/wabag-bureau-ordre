# Bureau d'Ordre — Design Spec

- **Client:** VA Tech WABAG Tunisia
- **Developer/Maintainer:** Elyes
- **Date:** 2026-06-24
- **Status:** Approved for planning (stack + deployment locked by owner)
- **Source of requirements:** `Projet Application Bureau d'ordre.xlsx` (client cahier des charges) + owner decisions captured during brainstorming.

---

## 1. Purpose & Scope

A cross-platform (Windows-first) desktop application to run VA Tech WABAG's **Bureau d'Ordre** — the office that registers all incoming (**Entrée**) and outgoing (**Sortie**) correspondence. Every document gets an auto-generated registration number, an auto registration date, descriptive fields, a scanned PDF copy, and a tracked status. The register is consultable, searchable, exportable to Excel, and printable as an official journal.

### In scope (v1)
- Two registers — **Entrée** and **Sortie** — each with: **Saisie** (register a document), **Consultation du Journal** (browse/search), **Modification/Correction Statut** (edit status with history).
- Auto N° d'ordre (`BOE2026####` / `BOS2026####`), concurrency-safe, per-year, gap-free.
- Login + audit trail (who created/modified each record; full status-change history).
- Bilingual **FR/EN** UI, runtime toggle, FR default.
- Outputs: **Excel export**, **printable PDF journal** (WABAG letterhead), **view/print a single scanned PDF**, **search & filter**.
- PDF scan attachment per document.
- Multi-user concurrent access over the office LAN.

### Out of scope (v1, deferred)
- macOS build (`.dmg`) — architecture stays cross-platform; build/sign deferred.
- `viewer` read-only role — enum kept extensible; only `admin` + `clerk` shipped.
- Import of historical Excel data — may be added as a one-time importer later.
- Active Directory / LDAP integration — standalone accounts only.
- Off-site / VPN access — LAN-only; reverse-proxy path noted for the future.

---

## 2. Locked Decisions (owner-approved)

| Decision | Choice | Rationale |
|---|---|---|
| Client shell | **Electron** (React + TypeScript) | Owner's exact renderer stack; pinned Chromium → deterministic printing on every PC; no runtime dependency on a basic-IT fleet. |
| Backend | **FastAPI** (Python) + SQLAlchemy 2.0 + Alembic | Owner's exact backend stack; clean REST, validation, file handling, auth. |
| Database | **PostgreSQL 16** | Real RDBMS → safe concurrent multi-user writes + provable auto-numbering. (A SQLite file on a network share corrupts under concurrent writers — explicitly rejected.) |
| Deployment | Client/server on the LAN; **server packaged as a native Windows-service installer** (no Docker) | Office has a spare Windows PC, no Docker appetite. Friendlier one-time setup. |
| Transport | **HTTPS** with an internal CA cert | JWTs not sniffable on the LAN. |
| Roles | `admin`, `clerk` (v1) | `viewer` deferred; enum extensible. |
| Printable journal PDF | **Client-side** via Electron `webContents.printToPDF` | Avoids WeasyPrint's GTK/Cairo native deps on a no-Docker Windows server; reuses pinned-Chromium determinism. |
| Excel export | **Server-side** openpyxl | Pure-Python, clean on Windows; single source of filter logic. |

---

## 3. Architecture & Topology

```
   ONE always-on Windows machine (server)            Each workstation (×N)
   ┌──────────────────────────────────────┐          ┌──────────────────────┐
   │  Windows services (no Docker):        │          │  WABAG-BureauOrdre    │
   │   • PostgreSQL 16  (service)          │◄─HTTPS───│   client .exe (Electron)│
   │   • FastAPI/Uvicorn API (service via  │   LAN    │   holds only a JWT;    │
   │     WinSW/NSSM wrapper)               │          │   never a DB credential │
   │   • Scheduled Task: nightly backup    │          └──────────────────────┘
   │  PDFs → server folder  D:\BureauOrdre\pdfs\YYYY\ │
   │  Internal-CA HTTPS cert in client trust stores  │
   └──────────────────────────────────────┘
   PostgreSQL 5432 bound to localhost only — clients never reach it.
   Only the API port (e.g. 8443) is opened to the office subnet via Windows Firewall.
```

**Security boundary:** Only FastAPI holds the DB password. Clients authenticate and receive a JWT; all numbering, validation, auth, and audit are enforced server-side. This is what makes the audit trail unforgeable — no insider with a DB tool can rewrite history.

**Single point of failure (accepted):** if the server machine is off, no client can register/read mail. Mitigations: services set to auto-start + auto-restart; "this machine must stay powered" documented as a hard operational requirement; UPS recommended.

---

## 4. Data Model (PostgreSQL)

Six tables. `objet` is included in `mail_record` per the client's late addition.

### `app_user`
Login accounts; identity for audit attribution.
- `id` UUID PK (`gen_random_uuid()`)
- `username` CITEXT UNIQUE NOT NULL — case-insensitive login
- `full_name` TEXT NOT NULL
- `password_hash` TEXT NOT NULL — Argon2id (argon2-cffi/passlib)
- `role` TEXT NOT NULL DEFAULT `'clerk'` — CHECK in (`'admin'`,`'clerk'`) *(extensible: `'viewer'` later)*
- `preferred_locale` TEXT NOT NULL DEFAULT `'fr'` — CHECK in (`'fr'`,`'en'`)
- `is_active` BOOLEAN NOT NULL DEFAULT true — deactivate, never delete (preserves audit FKs)
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `last_login_at` TIMESTAMPTZ NULL

### `mail_counter`
Authoritative per-register, per-year sequence allocator. One row per `(register, year)`.
- `register` CHAR(1) NOT NULL — CHECK in (`'E'`,`'S'`)
- `year` INT NOT NULL
- `last_seq` INT NOT NULL DEFAULT 0
- PRIMARY KEY `(register, year)` — the row-lock target for atomic allocation

### `mail_record`
Unified register for **both** Entrée and Sortie, discriminated by `register`.
- `id` UUID PK (`gen_random_uuid()`)
- `register` CHAR(1) NOT NULL — CHECK in (`'E'`,`'S'`)
- `year` INT NOT NULL — denormalized for fast per-year filter/reset
- `seq` INT NOT NULL — raw sequence from `mail_counter`
- `no_ordre` TEXT GENERATED ALWAYS AS (`CASE WHEN register='E' THEN 'BOE' ELSE 'BOS' END || year::text || lpad(seq::text,4,'0')`) STORED — e.g. `BOE20260001`; never client-supplied
- `date_enregistrement` DATE NOT NULL DEFAULT CURRENT_DATE — auto registration date
- `type_document` TEXT NOT NULL — free text (Facture, lettre, fax, Bon de Livraison, Dossier…)
- `reference` TEXT NULL — free text
- `objet` TEXT NULL — **subject/purpose of the document** (client addition; first-class search field)
- `expediteur` TEXT NULL — sender
- `projet` TEXT NULL — project
- `destinataire` TEXT NULL — recipient
- `date_remise_destinataire` DATE NULL — date picker
- `dernier_statut` TEXT NULL — current status (history in `status_history`)
- `created_by` UUID NOT NULL REFERENCES `app_user(id)`
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `modified_by` UUID NULL REFERENCES `app_user(id)`
- `modified_at` TIMESTAMPTZ NULL
- UNIQUE `(register, year, seq)` — duplicate physically impossible
- UNIQUE `(no_ordre)` — guards the formatted key

### `status_history`
Append-only audit of every status change (and creation).
- `id` BIGINT PK GENERATED ALWAYS AS IDENTITY
- `mail_record_id` UUID NOT NULL REFERENCES `mail_record(id)` ON DELETE RESTRICT
- `old_status` TEXT NULL — null on initial creation
- `new_status` TEXT NULL
- `changed_by` UUID NOT NULL REFERENCES `app_user(id)`
- `changed_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `note` TEXT NULL — optional correction reason
- DB grant: INSERT only (no UPDATE/DELETE) → tamper-evident at the DB level.

### `attachment`
Metadata for the scanned Copie PDF; blob on the server filesystem.
- `id` UUID PK (`gen_random_uuid()`)
- `mail_record_id` UUID NOT NULL UNIQUE REFERENCES `mail_record(id)` ON DELETE RESTRICT
- `relative_path` TEXT NOT NULL — e.g. `2026/BOE20260001.pdf` (server-computed; no client paths)
- `original_filename` TEXT NULL
- `content_type` TEXT NOT NULL DEFAULT `'application/pdf'`
- `byte_size` BIGINT NOT NULL
- `sha256` CHAR(64) NOT NULL — integrity
- `uploaded_by` UUID NOT NULL REFERENCES `app_user(id)`
- `uploaded_at` TIMESTAMPTZ NOT NULL DEFAULT now()

### `audit_log`
Broad action log for ISO-style traceability.
- `id` BIGINT PK GENERATED ALWAYS AS IDENTITY
- `actor_id` UUID NULL REFERENCES `app_user(id)`
- `action` TEXT NOT NULL — `'login'`,`'export_xlsx'`,`'report_pdf'`,`'create_record'`,`'update_status'`…
- `entity` TEXT NULL — e.g. `'mail_record'`
- `entity_id` TEXT NULL
- `detail` JSONB NULL
- `at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `ip` INET NULL

---

## 5. Auto-Numbering (concurrency-safe, provable)

The client never computes a number. One transaction, server-side, at READ COMMITTED:

```sql
-- Step 1: atomic allocate (row-level write lock on exactly that (register,year) row)
INSERT INTO mail_counter (register, year, last_seq)
VALUES (:r, :y, 1)
ON CONFLICT (register, year)
DO UPDATE SET last_seq = mail_counter.last_seq + 1
RETURNING last_seq;

-- Step 2 (same transaction): insert the record with the returned seq.
-- no_ordre is a STORED generated column → BOE20260001 / BOS20260042.

-- Step 3: COMMIT
```

**Why correct:** two concurrent Saisie on the same register block on the single counter row → no duplicates. Counter increment + record insert share one transaction → a rollback un-bumps the counter → no phantom gaps. New year auto-starts at 1 (INSERT branch fires). `UNIQUE(register,year,seq)` + `UNIQUE(no_ordre)` make duplicates physically impossible even under a logic bug; a collision rolls back and the handler retries. Native SEQUENCEs are deliberately not used (gap-prone on rollback, awkward to reset per year).

**Validation:** the numbering phase ships with a concurrency test firing N parallel Saisie and asserting zero duplicates / zero gaps.

---

## 6. Auth & Audit

- **Login:** `POST /auth/login` verifies password with Argon2id; issues a short-lived access JWT (`sub`=user id, `role`) + a longer refresh token; login attempts rate-limited.
- **Token storage:** Electron stores tokens in the OS keychain via `safeStorage`/keytar — never `localStorage`.
- **Identity stamping:** every protected endpoint resolves `get_current_user` from the JWT; the server stamps `created_by`/`modified_by`/`changed_by` — the client cannot spoof identity.
- **Roles:** `admin` (manage users), `clerk` (saisie/consultation/modification). `viewer` deferred.
- **Audit:** `mail_record` created/modified columns; `status_history` append-only (INSERT-only DB grant); `audit_log` for logins/exports/reports. Records never hard-deleted (`ON DELETE RESTRICT`; deactivate users via `is_active`).

---

## 7. Outputs

All share the **same server-side query/filter layer** as Consultation, so an export always matches the screen.

1. **Excel export** — `GET /export/journal.xlsx?register=E&<filters>`: server builds `.xlsx` with openpyxl (one row per record; all cahier fields + `objet` + created/modified; localized FR/EN headers). Electron opens a native Save-As dialog.
2. **Printable PDF journal** — server returns the filtered dataset as JSON via `GET /reports/journal-data`; the **client owns the report template** (a React/HTML+CSS `JournalReport` component) and renders it in a hidden `BrowserWindow`, then calls `webContents.printToPDF` → WABAG letterhead, report title, generation date, active-filter summary, paginated table, page numbers. Deterministic across PCs (pinned Chromium); no server native deps. Client offers Save-As / native print.
3. **View/print a single scanned PDF** — `GET /documents/{id}/pdf` streams the stored scan (auth-checked); client opens it in a native viewer/print window.
4. **Search & filter** — server-side SQL: date range, `type_document`, `objet`, `expediteur`, `projet`, `dernier_statut`, free-text (ILIKE/trigram), plus sort + pagination; reused verbatim by both exporters.

---

## 8. Internationalization (FR/EN)

- **react-i18next** with `locales/fr/common.json` + `locales/en/common.json` covering every cahier label (menus, the 11 record fields incl. `Objet`, actions, validation/toasts).
- **Runtime toggle, no restart:** `changeLanguage('fr'|'en')` re-renders instantly.
- **Persistence layered:** electron-store (per machine) + `app_user.preferred_locale` (per user → language follows the clerk across PCs; server returns it at login).
- **Locale-aware formatting** via `Intl`; FR default. Server outputs (Excel headers, PDF journal titles) accept a locale param.

---

## 9. PDF Storage

Filesystem-on-server (not bytea). Client streams the PDF multipart to `POST /documents/{id}/pdf`; FastAPI validates it is a real PDF (magic-byte `%PDF` + max-size cap), computes sha256 + size, writes it to a **year-partitioned folder under a server-computed name** (`D:\BureauOrdre\pdfs\2026\BOE20260001.pdf` — no client paths → no traversal). Only metadata goes to `attachment`. Retrieval streams with an auth check; integrity verifiable via sha256. Keeps `pg_dump` lean; PDFs are a flat, browsable, robocopy-friendly backup target.

---

## 10. Module Breakdown

**Frontend (Electron + React/TS)**
- `ui-shell` (Electron main + preload): window/menu, native PDF file-picker, native print + Save-As, `printToPDF` for the journal, OS-keychain token storage, FR/EN persisted via electron-store, `contextIsolation:true` + `nodeIntegration:false` + strict CSP + typed preload bridge, auto-update client.
- `renderer-app` (React + TS + Vite): screens — Login, Main menu (Entrée/Sortie/Quitter), per-register Saisie / Consultation-Journal (server-side filtered/sorted/paginated data grid) / Modification-Statut. Date pickers, react-hook-form + zod, TanStack Query for server state.
- `i18n` (shared): react-i18next bundles + runtime toggle.

**Backend (FastAPI)**
- `api-gateway`: routers — `/auth`, `/registers/{entree|sortie}/documents`, `/documents/{id}`, `/documents/{id}/status`, `/documents/{id}/pdf`, `/export/journal.xlsx`, `/reports/journal-data`, `/health/version`. Pydantic v2 validates every field.
- `numbering-service`: the single transaction that mints a number (ON CONFLICT upsert + same-txn insert). The only place a number is created.
- `persistence`: SQLAlchemy 2.0 models + Alembic migrations; READ COMMITTED; status_history append-only grant.
- `auth-security`: Argon2id, JWT access+refresh, role checks, per-user audit stamping, login rate-limit, TLS config.
- `attachments-service`: validate/sha256/store/stream PDFs.
- `reporting-service`: openpyxl `.xlsx` export honoring filters; serves journal dataset for client-side PDF rendering.

**Infra**
- `server-installer`: Windows installer bundling PostgreSQL 16 (service) + the FastAPI app (PyInstaller/embedded, run as a service via WinSW/NSSM) + Alembic migrations + seed-admin + internal-CA HTTPS cert + a Scheduled Task for nightly backup (pg_dump + robocopy of `pdfs\`). Firewall/IP/TLS documented.

---

## 11. Workspace Folder Structure

```
bureau-ordre/
├─ README.md                      # office setup + dev quickstart
├─ apps/
│  ├─ desktop/                    # Electron client
│  │  ├─ electron/
│  │  │  ├─ main.ts               # window/menu, file dialogs, print, printToPDF, auto-update
│  │  │  ├─ preload.ts            # typed contextBridge API
│  │  │  └─ store.ts              # electron-store (server URL, locale, tokens via safeStorage)
│  │  ├─ src/                     # React + TS renderer
│  │  │  ├─ pages/                # Login, Menu, Saisie, Journal, ModifierStatut
│  │  │  ├─ components/           # DataGrid, DatePicker, PdfPicker, LangSwitch, JournalReport(html)
│  │  │  ├─ api/                  # TanStack Query hooks → FastAPI
│  │  │  ├─ i18n/                 # i18next init
│  │  │  └─ locales/{fr,en}/common.json
│  │  ├─ electron-builder.yml     # nsis + msi targets (+ dmg later), signing
│  │  ├─ vite.config.ts
│  │  └─ package.json
│  └─ server/                     # FastAPI backend
│     ├─ app/
│     │  ├─ main.py
│     │  ├─ core/                 # config, security (argon2/JWT), deps
│     │  ├─ db/                   # SQLAlchemy session, base
│     │  ├─ models/               # app_user, mail_record, mail_counter, status_history, attachment, audit_log
│     │  ├─ schemas/              # Pydantic v2
│     │  ├─ routers/              # auth, registers, documents, status, export, reports, health
│     │  └─ services/             # numbering, attachments, reporting(xlsx)
│     ├─ alembic/                 # migrations
│     ├─ scripts/                 # seed_admin.py, backup.bat, restore.bat
│     ├─ tests/                   # incl. concurrency test for numbering
│     ├─ pyproject.toml
│     └─ requirements.txt
├─ packages/
│  └─ shared-types/               # TS types mirrored from Pydantic (optional codegen)
├─ deploy/
│  ├─ server-installer/           # Inno Setup / NSIS script bundling PG + API services + cert + backup task
│  ├─ backup-kit/                 # backup.bat (pg_dump + robocopy), restore.bat, scheduled-task import
│  └─ certs/                      # internal-CA / mkcert helper
└─ docs/superpowers/specs/        # this spec
```

---

## 12. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Server PC off → no client works | Services auto-start + auto-restart; "must stay powered" documented; UPS recommended; one-click start script + health check. |
| Electron client large (~100 MB) + Chromium CVEs | electron-builder auto-update feed on the LAN; pin Electron LTS, rebuild on security releases. Tauri downgrade available if WebView2 ever guaranteed. |
| Untested backups silently fail | Ship `backup.bat` + `restore.bat`; perform ONE tested restore at deployment; nightly pg_dump + incremental PDF copy off-machine; alert on failure. |
| Client/server version skew after a migration | Versioned API (`/api/v1`) + `/health/version` check on launch (warn/block stale clients); additive-only migrations; auto-update. |
| SmartScreen warnings on unsigned installer | OV/EV code-signing cert (Windows); sign all artifacts in CI. |
| Orphaned PDF vs DB row | Write PDF first, commit row so an orphan file is harmless; nightly reconcile job; sha256 + size + magic-byte validation. |
| JWT sniffing on the LAN | HTTPS with internal CA (chosen); short-lived access + refresh; isolated VLAN; never expose API to internet without proxy/VPN. |
| Solo-maintainer bus factor | Stack is the owner's exact (and locally most hireable) profile; small, documented, tested codebase. |

---

## 13. Phased Build Plan

| Phase | Deliverable |
|---|---|
| **0 — Foundations** | Repo scaffold (`apps/server` + `apps/desktop`). Postgres 16 + FastAPI up locally. Alembic migration for all 6 tables (incl. `objet` + generated `no_ordre` + UNIQUE constraints). `seed_admin`. `/health/version`. |
| **1 — Numbering + CRUD** | `numbering-service` (ON CONFLICT upsert + same-txn insert) + **concurrency test** (N parallel Saisie → zero dup/zero gap). Saisie + Consultation (server-side filter/sort/pagination) for both registers. Pydantic validation of all fields incl. `objet`. |
| **2 — Auth + Audit** | Argon2id login, JWT access+refresh, role checks, `get_current_user` stamping. Modification/Correction Statut → appends `status_history`. `audit_log`. Login rate-limit. |
| **3 — Electron client + i18n** | Electron shell (main/preload, keychain tokens, strict CSP). React: Login, Menu, Saisie, Consultation grid, Modifier-Statut. react-i18next FR/EN runtime toggle. Native PDF picker. |
| **4 — Attachments + Outputs** | PDF upload/validate/store (year-partitioned, sha256) + view/print single scan. Excel export (openpyxl, filters). Client-side `printToPDF` journal with WABAG letterhead. Shared filter layer. |
| **5 — Packaging + Deployment** | electron-builder NSIS + MSI (signed) with pre-baked server URL. Windows server installer (PostgreSQL + API services via WinSW/NSSM, migrations, seed admin, internal-CA HTTPS, backup Scheduled Task). Auto-update feed. |
| **6 — Pilot + Hardening** | On-site one-time server setup, multi-PC concurrent pilot, ONE tested backup restore, firewall/IP/TLS verification, FR/EN print parity on 2+ PCs, accounts created, handover docs + admin runbook. |

---

## 14. Open Questions for the Client (to confirm, not blocking the build)

1. Confirm the **always-on Windows machine** that will host the server (spec assumes a spare powered-on PC + native service installer).
2. Provide the official **WABAG company header/logo + legal entity name** for the printable journal PDF.
3. Expected **concurrent users** and **documents/day** (confirms single-worker sizing; workload looks small).
4. Numbering when a record is **voided/cancelled**: cancellation as a status (numbers never reused) — confirm acceptable.
5. **Backup destination** (NAS path/share) + expected scanned-PDF volume/size.
6. **Data retention / regulatory** requirement for correspondence registers in Tunisia (retention period, immutability).
7. **Day-one admin user(s)**; whether a future `viewer` read-only role is wanted.
8. Whether **historical mail** should be imported later, and the **starting seq per register for 2026** so numbering continues without collision.
