# Deployment — Cloud (MongoDB Atlas + Render)

The server is a FastAPI app backed by **MongoDB Atlas**, hosted on **Render**.
The desktop client just points at the public Render URL — no local server, no LAN.

## 1. MongoDB Atlas (database — already provisioned)

- Cluster: `cluster0` (free M0 tier).
- DB user: `<your-atlas-user>` · Network access: `0.0.0.0/0` (open — required so Render can reach it).
- App database name: `bureau_ordre` (tests use `bureau_ordre_test`).
- PDFs are stored in **GridFS** inside the same database (Render's disk is ephemeral, so files can't live on the server).

> ⚠️ **Rotate the DB password** before real go-live (it was shared during development), then update `MONGODB_URI` in Render. Atlas free tier is 512 MB — fine to start; PDFs in GridFS will be the main consumer, so watch the quota.

## 2. Render (server hosting)

1. Push this repo to GitHub (done: `ElyesD1/wabag-bureau-ordre`).
2. Render → **New ▸ Blueprint** → connect the repo. Render reads [`render.yaml`](../render.yaml) and creates the web service.
3. Set the two **secret** env vars in the dashboard (everything else is auto):
   - `MONGODB_URI` = `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
   - `SEED_ADMIN_PASSWORD` = a strong password for the first admin (username defaults to `admin`).
4. Deploy. On first boot, if the database has no users, the app **auto-creates the admin** from `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD`. No manual seeding.
5. Your API is live at `https://wabag-bureau-ordre-api.onrender.com` (health check: `/health/version`, docs: `/docs`).

### Free-tier note
Render free web services **sleep after ~15 min idle**; the first request then takes ~50 s to wake. Fine for an intermittent office tool — just expect an occasional one-time "loading" lag.

## 3. Desktop client

The Electron client is configured with the Render URL as its API base (`VITE_API_URL`), packaged into the `.exe`/`.msi`. Staff install it and it connects straight to the cloud — nothing to configure.

## Local development

```bash
cd apps/server
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# .env holds MONGODB_URI + JWT_SECRET (gitignored)
uvicorn app.main:app --port 8099       # → http://localhost:8099/docs
pytest                                  # runs against the bureau_ordre_test database
```
