# Desktop Client Implementation Plan (Electron + React)

> **For agentic workers:** the approved design prototype at `design/wabag-bureau-ordre/` and `docs/superpowers/specs/2026-06-24-bureau-ordre-brand-ui.md` ARE the detailed UI spec — port them faithfully. Backend API is live and tested (see `2026-06-24-server-foundation.md`).

**Goal:** A WABAG-branded Electron desktop client implementing the "Le Sillage" design, wired to the FastAPI backend: login, main menu, per-register journal (search/filter/paginate), Saisie drawer, status modification, FR/EN toggle, PDF attach/view, Excel export + client-side PDF journal.

**Architecture:** Vite + React + TS renderer (runs in a browser for dev/verification AND inside Electron). Electron `main.cjs` loads the Vite dev server (dev) or `dist/` (prod); `preload.cjs` exposes a minimal typed bridge (`window.api`) for OS-keychain token storage, native file picker, and `printToPDF`. A browser fallback lets the same renderer run without Electron (localStorage tokens) for fast visual iteration. Server state via TanStack Query; forms via react-hook-form + zod; i18n via react-i18next.

**Tech Stack:** Electron 33 · Vite 5 · React 18 · TypeScript 5 · react-router-dom (HashRouter) · @tanstack/react-query · react-hook-form + zod · react-i18next · electron-builder.

## Task list

1. **Scaffold** — package.json, vite.config.ts, tsconfig, index.html, electron/main.cjs + preload.cjs. `npm install`.
2. **Design tokens** — port `styles.css` tokens + ripple `Sillage` SVG component; global CSS.
3. **API client** — `api/client.ts` (fetch wrapper, base URL, bearer header, 401 handling); `api/hooks.ts` (TanStack Query hooks: login, me, list, create, updateStatus, uploadPdf, exportXlsx, reportData).
4. **Auth store** — context holding user + token; token via `window.api` keychain (Electron) or localStorage (browser); login/logout; protected routes.
5. **App shell** — `Sidebar` (navy + ripple, nav, user chip), `Topbar` (breadcrumb, search, FR/EN toggle), `RippleBackdrop`.
6. **Login page** — ripple backdrop, WABAG logo, form → token.
7. **Journal page** — KPI strip, filter bar (Entrée/Sortie tabs), data table (mono stamp `no_ordre`, status chips), pagination; consume list hook.
8. **Saisie drawer** — auto cards (N° d'ordre/date preview), rhf+zod form, PDF dropzone → create + upload.
9. **Modifier statut** — modal/drawer to change status (append history).
10. **i18n** — fr/en bundles for every label; runtime toggle persisted.
11. **Exports** — Excel download; client-side PDF journal via hidden window `printToPDF` (Electron) / `window.print()` fallback.
12. **Electron polish + packaging** — preload bridge, safeStorage, file dialogs; electron-builder NSIS/MSI/DMG (own plan section).

**Verification:** run `vite` and Playwright-screenshot each screen against the live API; then `electron .` for the native window.
