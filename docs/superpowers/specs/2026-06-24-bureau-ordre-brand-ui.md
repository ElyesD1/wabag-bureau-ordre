# Bureau d'Ordre — Brand & UI Design System

- **Client:** VA Tech WABAG Tunisia · **Date:** 2026-06-24 · **Status:** direction for sign-off
- Companion to `2026-06-24-bureau-ordre-design.md`.

## Design thesis — *"Le Sillage"* (the wake)

WABAG engineers water. A Bureau d'Ordre tracks correspondence *flowing* in (**Entrée**) and out (**Sortie**). The design language is built on the **concentric water-ripple arc** from the WABAG logo — the *sillage* (wake) a document leaves as it moves through the registry. The interface is calm, precise, and official, like clean water in an engineered channel.

Deliberately **not** any of the three AI-default looks (cream+serif+terracotta, black+acid-green, stark newsprint). Instead: a cool clean-water palette, engineering-monospace numerals, and the ripple motif.

## Color tokens (derived from the logo — `#075095` exact)

| Token | Hex | Use |
|---|---|---|
| `--wabag-blue` | `#075095` | Primary brand, primary buttons, links, headers |
| `--wabag-navy` | `#08365F` | Sidebar, deep surfaces, the ripple watermark |
| `--wabag-aqua` | `#2FA4DB` | Accent, active/focus, ripple highlights, "en cours" |
| `--wabag-ink` | `#16222E` | Primary text (cool slate, never pure black) |
| `--wabag-gray` | `#7C7B7B` | Secondary text, tagline (exact from logo) |
| `--wabag-line` | `#E2E9F0` | Borders, dividers, table rules |
| `--wabag-paper` | `#F3F7FB` | App background (clean cool white) |
| `--wabag-surface` | `#FFFFFF` | Cards, table, forms |

**Semantic (status chips):** `--ok #1B9E77` (sustainable green — echoes the tagline; *clos/livré*) · `--warn #D98A2B` (*en attente*) · `--info #2FA4DB` (*en cours*) · `--danger #C0392B` (*annulé/urgent*).

**Direction accents:** Entrée = `--wabag-blue #075095` (inbound arrow ↙); Sortie = `#0F7B8A` teal (outbound arrow ↗). Two cool water tones, distinct at a glance.

## Typography

| Role | Face | Why |
|---|---|---|
| Display | **Space Grotesk** (600/700) | Technical, distinctive; screen titles, menu, KPIs, big numerals. Not a default UI serif. |
| Body / UI | **IBM Plex Sans** (400/500/600) | Engineering heritage (fits a water-engineering firm), superb FR/EN legibility for dense forms & tables. |
| Mono / data | **IBM Plex Mono** (500/600) | The "register stamp" voice — `N° d'ordre`, références, dates. Tabular figures so `BOE20260001` reads like an official seal. |

Self-hosted in the Electron app (offline-friendly; the office app must work without internet). Type scale: 12 / 13 / 14 / 16 / 20 / 28 / 40, line-height 1.45 body / 1.15 display.

## Signature elements

1. **Le Sillage (ripple motif):** SVG concentric left-opening arcs (recreated from the logo). Appears as: animated login backdrop, a faint sidebar watermark, empty-state illustration, and the Entrée/Sortie direction glyphs. Spend the boldness here; keep everything else quiet.
2. **The register stamp:** every `N° d'ordre` is a bordered monospace chip with letter-spacing — the most important datum looks officially sealed.

## Layout

App shell: **navy ripple sidebar** (logo white-knockout + nav) · **top bar** (breadcrumb · global search · FR/EN toggle · user) · **content** on cool paper.

```
┌──────────┬───────────────────────────────────────────────┐
│ SIDEBAR  │ TOPBAR  breadcrumb · search · [FR|EN] · user ▾  │
│ navy +   ├───────────────────────────────────────────────┤
│ ripple   │ PAGE HEADER  title · count · [Exporter][+ Saisir]│
│ [logo]   │ FILTER BAR   période · type · objet · statut · q │
│ ─────    │ ┌ JOURNAL ──────────────────────────────────┐  │
│ Tableau  │ │ N°d'ordre Date Type Objet Exp. Statut  ⋯  │  │
│ Entrée ↙ │ │ [BOE20260001] ...                  [chip] │  │
│ Sortie ↗ │ │ ...                                        │  │
│ Utilisat.│ └────────────────────────── pagination ─────┘  │
│ user ▾   │                                                 │
└──────────┴───────────────────────────────────────────────┘
```

- **Journal/Consultation** is the hero: dense, sticky-header data table, status chips, mono stamp numbers, row hover, server-side filter + pagination.
- **Saisie** opens as a right **drawer** (keeps the journal in context): auto fields (`N° d'ordre`, `Date`) shown as read-only stamped chips, then editable fields, then a PDF drop zone.
- **Login**: centered card on the animated ripple backdrop; real WABAG logo on white.

## Quality floor

Responsive to small windows; visible keyboard focus (aqua ring); `prefers-reduced-motion` disables ripple animation; WCAG AA contrast (blue `#075095` on white = 7.0:1). Copy: French default, sentence case, plain verbs, action names consistent through flows ("Enregistrer" → toast "Document enregistré").
