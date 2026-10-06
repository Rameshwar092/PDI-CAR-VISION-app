# PDI Car Vision — Backend (FastAPI + MongoDB Atlas)

## Why photos aren't stored inside MongoDB documents

MongoDB has a hard 16MB-per-document limit. Storing photos as base64 directly
in a report document works fine on a demo but becomes a real risk at scale —
one heavily-photographed report could approach that ceiling, and once it's
hit, saves for that report fail outright.

So this backend splits the two:
- **Checklist data, vehicle info, remarks, signature** → stored in MongoDB.
  One fully-filled report (every checklist item answered) is about **16–20KB**.
- **Photos** → saved as files under `uploads/<report_id>/`, served back at
  `/uploads/...`. Only the URL string (a few dozen bytes) is stored in Mongo.

## What this means for your 200 reports/month, ~10MB/report budget

That 10MB is almost entirely photos. With this split:
- **MongoDB Atlas storage**: 200 reports × ~20KB ≈ **4MB/month**, ~48MB/year.
  Fits comfortably in Atlas's free M0 tier (512MB) for years.
- **Photo storage (disk)**: 200 reports × ~10MB ≈ **2GB/month**, ~24GB/year.
  This lives on the server's disk, not in Atlas. Size your server's disk
  (or switch to S3 — see below) for this, not your Atlas cluster tier.

If you'd rather keep everything inside MongoDB (one database to manage,
no separate file storage), the alternative is **GridFS**, which chunks large
files to get around the 16MB limit. That's a bigger change to
`app/services/storage.py` and typically more expensive on Atlas than disk
or S3 for the same amount of photo data — ask if you want that path instead.

## 1. Create the MongoDB Atlas cluster

1. Sign up / log in at https://cloud.mongodb.com
2. Create a free M0 cluster (enough per the math above) in a region near you.
3. Database Access → add a database user with a password.
4. Network Access → add your server's IP (or 0.0.0.0/0 while testing only).
5. Database → Connect → Drivers → copy the connection string.

## 2. Configure

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
JWT_SECRET=<a long random string>
CORS_ORIGINS=http://localhost:5173
```

## 3. Run locally

```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API docs: http://localhost:8000/docs

A default admin is created on first run:
`admin@pdicarvision.com` / `ChangeMe123!` — change this password immediately
(there's no "change my own password" endpoint yet; update it directly in
Atlas or add one before going live).

## 4. Point the frontend at it

In `frontend/src/services/api.js`, set:
```js
export const USE_MOCK = false
```
and set `VITE_API_URL=http://localhost:8000/api` (or your deployed URL) in
the frontend's `.env`.

## 5. Deploy

`Dockerfile` is included. Any host that runs a container (Render, Railway,
Fly.io, a VM) works — just make sure the `uploads/` directory is on
**persistent** disk, not ephemeral storage, or photos will vanish on
redeploy. For durability across redeploys/scaling, moving `services/storage.py`
to write to S3 (or similar) instead of local disk is the next step.

## Production readiness — what's handled in code vs. what you must configure

### Already handled in code (and tested)
- Photos never stored as base64 inside MongoDB documents (16MB document limit risk) — see top of this file
- Passwords hashed with bcrypt, never stored or logged in plaintext
- JWT-based auth; server refuses to start if `JWT_SECRET` is still the placeholder
- Login rate limiting: 5 failed attempts per IP+email locks out that pair for 15 minutes
- Add/delete users, and setting any password (including the admin's own), are admin-only — enforced server-side, not just hidden in the UI
- An admin can't delete their own account
- Uploaded "photos" are checked against their actual file bytes, not just the filename — a renamed non-image file is rejected
- Free-text fields (remarks, signature, vehicle fields) have length limits, so a buggy or malicious client can't balloon a report document
- `/pdi` and `/users` list endpoints are paginated (`skip`/`limit` query params)
- Unhandled server errors return a generic message and get logged — no stack traces leak to the client
- `/api/health` actually pings MongoDB, not just "the process is running" — point your host's health check / uptime monitor at this

### You must do before deploying
1. **Set a real `JWT_SECRET`** — a long random string, not the placeholder. The app won't start without this.
2. **Set `MONGODB_URI`** to your Atlas cluster's connection string (see setup steps above).
3. **Set `CORS_ORIGINS`** to your actual deployed frontend domain(s) — comma-separated if more than one. If you're shipping the Android APK, include `https://localhost` (see note in `.env.example`).
4. **Change the seeded admin password** (`admin@pdicarvision.com` / `ChangeMe123!`) immediately after your first deploy, via Manage Users → Set Password.
5. **Persistent storage for `uploads/`**: if you deploy to a platform with ephemeral disks (common free tiers on Render/Railway/Fly), photos will vanish on every redeploy or restart. Either pay for a persistent volume, or move `app/services/storage.py` to write to S3/Cloudinary/similar instead of local disk — that file is intentionally isolated so this swap doesn't touch anything else.
6. **MongoDB Atlas backups**: the free M0 tier has no continuous backup. If this data matters, either upgrade to a tier with backups or set up your own periodic export (`mongodump`) before you're relying on this in production.
7. **HTTPS**: terminate TLS at your hosting platform (Render/Railway/Fly all do this automatically on their default domains). Don't run this over plain HTTP in production — the JWT is sent in every request's `Authorization` header and is interceptable over HTTP.
8. **Frontend build**: set `VITE_USE_MOCK=false` and `VITE_API_URL=<your backend URL>` in `frontend/.env` before `npm run build`. A yellow "Demo mode" banner appears at the top of the app if mock mode is still on — if you see that banner after deploying, this step was missed.

### Known limitations, by design, worth knowing about
- The login rate limiter is in-process memory, not Redis — fine for a single backend instance, won't be shared if you later scale to multiple instances behind a load balancer.
- There's no token revocation — a stolen JWT remains valid until it expires (8 hours by default, `ACCESS_TOKEN_EXPIRE_MINUTES`). Logout only clears it client-side.
- There's no self-service "forgot password" — by design, per your earlier requirement that only an admin can change passwords.
- `/docs` and `/redoc` (the interactive API docs) are open to anyone who can reach the API. That's normal for most internal tools, but if you'd rather hide them in production, say so and I'll gate them behind an env flag.
