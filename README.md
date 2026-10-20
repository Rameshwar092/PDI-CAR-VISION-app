# PDI Car Vision — Inspection App

The inspector app for **PDI CarVision**. Inspectors fill in the pre-delivery inspection (PDI)
checklist on a phone or computer, add photos and a signature, and submit. Admins manage users and
reports. Customers open their own reports from **pdicarvision.in** after an OTP check.

| Part | Tech | Folder | Runs on |
|---|---|---|---|
| Web app + Android app | React 18, Vite 5, Capacitor 8 | `frontend/` | Vercel (web) · APK (Android) |
| API | Python FastAPI, MongoDB Atlas | `backend/` | Vercel |

---

## Features

- **Inspector:** 14-step PDI wizard (basic details, 12 checklist sections, photos, final result),
  multi-select answers, *Other (Specify)* notes, section remarks, photo capture with automatic
  compression, signature pad, save as draft, submit.
- **Yellow flags only for real defects.** Tyre brand and OK answers ("All OK", "Normal",
  "Not Applicable", "Both headlights are working"...) are never flagged. See `OK_ANSWERS` in
  `frontend/src/components/PDIForm/sections.js`.
- **Final result** — PASS / PASS WITH OBSERVATIONS / FAIL. The inspector must choose one; the app
  suggests a result from the number of flags.
- **Report** — compact A4 report (2–3 pages): result, totals, vehicle details, issues found,
  tyre table, two-column checklist, photos, signature. **Download PDF** and **Print** work in the
  browser and inside the Android app (saved to *Documents/PDI Reports* + share sheet).
- **Admin:** dashboard, analytics, users, all reports, delete report (and its photos).
- **Customer access:** website login with Firebase phone OTP → list of their reports → view /
  download / print.

---

## Folder structure

```
frontend/
  src/
    components/
      PDIForm/sections.js   ← the checklist: sections, items, dropdown options, flag rules
      PDIForm/index.jsx     ← the inspection wizard
      ReportView.jsx        ← the report page / PDF layout
    pages/                  ← admin/, user/, customer/ (GetReport), Login
    services/               ← api.js, pdiApi.js, reportExport.js (PDF/print), imageCompress.js
    style.css
  android/                  ← Capacitor Android project (app icon in app/src/main/res/mipmap-*)
backend/
  app/
    routers/                ← auth, users, pdi, customer
    services/               ← storage (photos), firebase_auth, sms, rate_limit
    config.py               ← all settings (read from .env)
.github/workflows/build-apk.yml  ← builds the APK on GitHub
```

---

## Run on your computer

### Backend
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then fill in MONGODB_URI and JWT_SECRET
uvicorn app.main:app --reload --port 8000
```
Check: http://localhost:8000/api/health

### Frontend
```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173
```
Without a `.env`, the frontend runs in **demo mode** (fake data stored in the browser).
To use the real backend, create `frontend/.env`:
```
VITE_USE_MOCK=false
VITE_API_URL=http://localhost:8000/api
```

---

## Settings

### `backend/.env`
| Setting | Required | What it is |
|---|---|---|
| `MONGODB_URI` | ✅ | MongoDB Atlas connection string |
| `MONGODB_DB` | | Database name (default `pdi_car_vision`) |
| `JWT_SECRET` | ✅ | Long random text for login tokens (`openssl rand -hex 32`) |
| `CORS_ORIGINS` | ✅ | Allowed websites, comma separated: your web app URL, `https://pdicarvision.in`, and `https://localhost` (the Android app) |
| `FIREBASE_PROJECT_ID` | ✅ for customer login | Same as the website's `VITE_FIREBASE_PROJECT_ID` |
| `PHOTO_STORAGE` | | `auto` (MongoDB on Vercel, disk elsewhere), `mongo` or `disk` |
| `MAX_PHOTO_MB` | | Max photo size (default 8) |
| `SMS_PROVIDER` | | Only for the backup OTP page: `console`, `msg91`, `fast2sms`, `twilio` |

### `frontend/.env`
| Setting | What it is |
|---|---|
| `VITE_USE_MOCK` | `false` to use the real backend |
| `VITE_API_URL` | Backend URL ending in `/api` |

Never commit `.env` files or put secrets in `VITE_*` values (they are visible in the browser).

---

## Deploy

**Backend and web app** are on Vercel, one project each (root directories `backend` and
`frontend`). Add the settings above under *Vercel → Project → Settings → Environment Variables*.
Every push to `main` deploys automatically.

```bash
git add .
git commit -m "Describe your change"
git pull --rebase origin main
git push origin HEAD:main
```

---

## Build the Android APK

### Option A — on GitHub (no setup)
GitHub → **Actions → Build Android APK → Run workflow** → open the finished run → download
**PDI-Car-Vision-APK** from *Artifacts*. The workflow needs `node-version: 22`.

### Option B — on your Mac
One-time: install **Android Studio** (it includes Java 21).
```bash
cd frontend
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
VITE_USE_MOCK=false VITE_API_URL=https://pdi-car-vision-app-lsv1.vercel.app/api npm run build
npx cap sync android
cd android
./gradlew clean assembleDebug
open app/build/outputs/apk/debug/        # app-debug.apk
```
Keep `VITE_USE_MOCK=false VITE_API_URL=...` on the **same line** as `npm run build`, or the APK
opens in demo mode. Uninstall the old app before installing a new APK if the icon doesn't update.

---

## Common changes

| I want to... | Edit |
|---|---|
| Add / rename a checklist item or option | `frontend/src/components/PDIForm/sections.js` (`SECTIONS`) |
| Make an option count as "OK" (no flag) | `OK_ANSWERS` in the same file |
| Change the report / PDF layout | `frontend/src/components/ReportView.jsx` + `.r2-*` styles in `style.css` |
| Change the app icon | `frontend/android/app/src/main/res/mipmap-*` |
| Change the backend URL used by the APK | `VITE_API_URL` when building |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `npm error ENOENT ... package.json` | Run npm commands inside `frontend/` |
| APK build: `jlink` / `JdkImageTransform` error | Wrong Java. `export JAVA_HOME=...` (Java 21) as above |
| APK shows demo data | Rebuild with `VITE_USE_MOCK=false VITE_API_URL=...` on the same line |
| Report "View" gives 404 on Vercel | `frontend/vercel.json` must keep the SPA rewrite to `/index.html` |
| Photos not saving on Vercel | `PHOTO_STORAGE=auto` or `mongo` (Vercel has no permanent disk) |
| Website can't load reports (CORS error) | Add the website URL to `CORS_ORIGINS` in the backend |
| `git push` rejected (non-fast-forward) | `git pull --rebase origin main` then `git push origin HEAD:main` |
