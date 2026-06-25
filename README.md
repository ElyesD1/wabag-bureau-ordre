# WABAG · Bureau d'Ordre

Desktop mail-registry (bureau d'ordre) application for **VA Tech WABAG Tunisie** — registers
incoming (Entrée) and outgoing (Sortie) correspondence with auto-numbering, status tracking,
PDF scans, search, exports, monitoring, and an in-app assistant.

## Stack

- **Client** — Electron + React + TypeScript (Vite). Brand language: *"Le Sillage"*.
- **Server** — FastAPI (Python), hosted on **Render**.
- **Database** — **MongoDB Atlas** (shared, cloud, persistent). PDFs in GridFS.
- **Assistant** — local rule-based copilot (no cloud inference); chat sessions stored in Atlas.

The desktop app connects to the cloud API — staff just install it and sign in. No local server,
no LAN setup, no configuration.

## Layout

```
apps/
  server/   FastAPI + PyMongo API  (deploys to Render — see docs/DEPLOY.md)
  desktop/  Electron + React client
docs/       specs, plans, DEPLOY.md, guide
```

## Quick start (dev)

```bash
# API
cd apps/server && python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --port 8099        # http://localhost:8099/docs
pytest                                   # tests run against bureau_ordre_test on Atlas

# Client
cd apps/desktop && npm install
npm run dev:web                          # http://localhost:5173  (or `npm run dev` for Electron)
```

## Deployment

See **[docs/DEPLOY.md](docs/DEPLOY.md)** — one-click Render Blueprint + MongoDB Atlas.
