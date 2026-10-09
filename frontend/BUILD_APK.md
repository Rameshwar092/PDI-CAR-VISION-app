# Building the Android APK

This project is wired up with Capacitor (`capacitor.config.json` and the
`android/` folder are already generated and committed). I couldn't compile
the actual `.apk` in the sandbox I built this in — it has no internet access
to Google's Android/Gradle servers — so this is what to run on your own
machine, which does have that access.

## One-time setup (on your computer, not needed again after this)

1. Install **Android Studio** (includes the Android SDK and Java):
   https://developer.android.com/studio
2. Open Android Studio once, let it finish its first-run setup (it downloads
   the SDK automatically).

## Every time you want a new APK

```bash
cd frontend
npm install
npm run build        # builds the web app into dist/
npx cap sync android  # copies dist/ into the Android project
npx cap open android  # opens the project in Android Studio
```

In Android Studio:
- **Quick, for testing/sideloading** (what you asked for — just sending the
  file, no store): `Build → Build Bundle(s) / APK(s) → Build APK(s)`.
  The file lands at `android/app/build/outputs/apk/debug/app-debug.apk`.
  Send that file directly — the person installs it by opening it on their
  Android phone (they'll need to allow "install from unknown sources" once,
  since it's not from the Play Store).
- **Signed release build** (smaller, slightly faster, and what you'd want
  if you ever do publish it later): `Build → Generate Signed Bundle / APK`,
  choose APK, create a keystore when prompted (keep that file + password
  safe — you'll need the exact same one for every future update).

## Pointing the APK at your real backend

Before building, set your deployed backend URL (not `localhost`, since the
phone isn't your computer) in `frontend/.env`:
```
VITE_API_URL=https://your-backend-domain.com/api
```
And in `frontend/src/services/api.js`, set `USE_MOCK = false`.
Then rebuild (`npm run build && npx cap sync android`) before opening
Android Studio again.

## App identity

- Package name: `com.pdicarvision.app`
- App name: `PDI Car Vision`
Change both in `capacitor.config.json` before your first build if you want
something different — changing it later means reinstalling rather than
updating on any phone that already has it.

## Download & Print inside the APK (how it works)

- **Download PDF** builds the PDF in the app, saves a copy to
  `Documents/PDI Reports/` on the phone, and opens the share sheet
  (Save to Drive / Files, WhatsApp, Gmail…). Code: `src/services/reportExport.js`.
- **Print** uses a small native plugin (`android/app/src/main/java/com/pdicarvision/app/PrinterPlugin.java`,
  registered in `MainActivity.java`) because `window.print()` does nothing in an
  Android WebView. It opens Android's print dialog — pick a printer or "Save as PDF".
- After changing any web code, always run `npm run build && npx cap sync android`
  before building the APK, otherwise the APK keeps the old version.
