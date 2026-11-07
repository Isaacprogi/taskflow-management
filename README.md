# TaskFlow

Sign up, log in, manage your own tasks. One **React** codebase runs in the browser and as native **Android/iOS** apps (**Capacitor**), all talking to the same **Express** API backed by **Supabase PostgreSQL** through **Drizzle ORM**.

```
Phone/Browser: React (WebView) ──HTTPS+JWT──▶ Express API ──Drizzle──▶ Supabase Postgres
```

**Tested during generation:** backend against a real Postgres (migration, signup, login, validation, task CRUD, per-user isolation, CORS allow/deny) and the Vite production build; Android and iOS projects were generated and configured. **Not tested:** running inside an Android emulator or Xcode. Follow §5 and §7 on your machine and use §10 if something differs.

---

## 1. Concepts
- **React + Vite** builds the UI into static files in `frontend/dist`.
- **Express** is the only thing that touches the database. The frontend never gets DB credentials.
- **Drizzle ORM** turns JS table definitions (`backend/src/db/schema.js`) into SQL and queries. **Drizzle Kit is the only migration tool**: `generate` writes SQL files into `backend/drizzle/`, `migrate` applies them. Don't edit tables in the Supabase dashboard and don't use `drizzle-kit push`.
- **Supabase** is hosted Postgres here. Drizzle connects with a normal Postgres connection string via the `postgres` driver, not Supabase's REST API.
- **Capacitor** copies `frontend/dist` into native projects (`android/`, `ios/`). Each native app is a shell containing a **WebView** (an embedded browser) that loads those files, plus a bridge so JS can call native APIs (plugins).
- **JWT in the `Authorization` header** (not cookies): cookies are unreliable between a native WebView and a separate API domain.
- Native plugins used: **Preferences** (stores the token), **Network** (offline banner), **App** (Android back button).
- Passwords use `bcryptjs` (bcrypt algorithm in pure JS, no native build problems on Windows).

```
backend/   Express + Drizzle  (src/routes.js, src/db/schema.js, drizzle/ = migrations)
frontend/  React + Capacitor  (src/config/api.js = ALL API-URL logic, android/, ios/)
```

## 2. Setup
**Requirements:** Node.js 22+, Git. Mobile: Android Studio (Android); a Mac with Xcode (iOS).

### 2.1 Supabase
1. supabase.com → sign up → **New project**. Pick a region, set a strong **database password** and save it.
2. Click **Connect** → copy the **Session pooler** string:
   `postgresql://postgres.<ref>:<PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres`
   - Session pooler works on IPv4 networks; the direct host is IPv6-only unless you buy the IPv4 add-on.
   - URL-encode special characters in the password (`@` → `%40`).
   - Port `6543` (transaction pooler) also works; the code disables prepared statements for it automatically.
3. Use **Table Editor** later to look at data. Look, don't change the schema.

### 2.2 Install and configure
```bash
git clone <your-repo> taskflow && cd taskflow
npm install                 # root helper (concurrently)
npm run install:all         # backend + frontend dependencies
cp backend/.env.example backend/.env       # fill DATABASE_URL and JWT_SECRET
cp frontend/.env.example frontend/.env
```
JWT secret: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

### 2.3 Create the tables
```bash
npm run db:migrate          # applies backend/drizzle/*.sql to Supabase
```
The first migration is already generated. After changing `schema.js`: `npm run db:generate` (read the new SQL), `npm run db:migrate`, commit both.

## 3. Run on web
```bash
npm run dev                 # API :5000, web :5173
curl http://localhost:5000/api/health     # {"ok":true}
```
Open http://localhost:5173, sign up, add tasks.

## 4. Before mobile: set your app ID
`frontend/capacitor.config.ts` has `appId: 'com.yourcompany.taskflow'`. It becomes your permanent store identity. Easiest way to change it: edit the config, then
```bash
cd frontend && rm -rf android ios && npm run build:dev && npx cap add android && npx cap add ios
```
That regenerates the native projects, so **redo the dev-only edits listed in §6.4** (the debug network config, portrait lock, iOS `Info.plist`). Do this once, early, before you customize native files.

## 5. Run on Android
```bash
cd frontend
npm run android:run          # dev build → cap sync → run on the emulator/device you pick
# or: npm run cap:sync:dev && npm run android:open     (then ▶ in Android Studio)
```
Backend must be running (`npm run dev` from root) and `frontend/.env` needs `VITE_API_URL_ANDROID=http://10.0.2.2:5000/api`.

**Loop after any React change:** `npm run android:run`.

| Command | Does |
|---|---|
| `npm run build:dev` | Vite build in dev mode (local API URLs) |
| `npx cap sync` | Copies `dist/` into native projects and updates plugins |
| `npx cap open android` | Opens Android Studio |

**Live reload** (`npm run android:live` while `npm run dev` runs) loads the app from your Vite server so edits appear instantly. Use it for UI work. It is **not** enough after changing plugins, `capacitor.config.ts`, the manifest, `Info.plist` or icons; those need a normal sync and rebuild. Add `http://<LAN-IP>:5173` to the backend `CORS_ORIGINS` for it. Never ship a live-reload build.

**Debug the real app:** Chrome → `chrome://inspect` → inspect your device/emulator for the real console and Network tab. This is the fastest way to diagnose connectivity.

## 6. Connectivity: how the mobile app reaches the backend

### 6.1 `localhost` means "this device"
| Runs on | API URL |
|---|---|
| Desktop browser | `http://localhost:5000/api` |
| **Android emulator** | `http://10.0.2.2:5000/api` (alias for your computer's loopback; Genymotion: `10.0.3.2`) |
| **Physical Android** (same Wi-Fi) | `http://<LAN-IP>:5000/api` |
| Physical Android over USB | `adb reverse tcp:5000 tcp:5000`, then `http://localhost:5000/api` |
| iOS Simulator (Mac) | `http://localhost:5000/api` |
| Physical iPhone | `http://<Mac-LAN-IP>:5000/api` |
| **Production (all)** | `https://your-api.example.com/api` |

LAN IP: Windows `ipconfig`, macOS `ipconfig getifaddr en0`, Linux `hostname -I`.

These values live in `frontend/.env`. `src/config/api.js` is the only place URLs are chosen, and one Axios instance (`src/api/client.js`) is used everywhere. Vite bakes env values in **at build time**, so after editing `.env` rebuild and sync. Production builds require an `https://` `VITE_API_URL_PROD` and fail otherwise.

### 6.2 The backend must be reachable
- Express listens on `0.0.0.0` (all interfaces), not just `127.0.0.1`.
- Allow inbound TCP 5000 in your firewall (Windows: allow on *Private* networks).
- Phone and computer on the same Wi-Fi (no guest network "client isolation").
- Test first: open `http://<LAN-IP>:5000/api/health` in the phone's browser, or `http://10.0.2.2:5000/api/health` in Chrome inside the emulator. If that fails it's a network problem, not an app problem.

### 6.3 CORS: the app has a virtual origin
A Capacitor WebView isn't served from the internet, so its origin is:
| Platform | Page origin |
|---|---|
| Web dev | `http://localhost:5173` |
| Android | `https://localhost` |
| iOS | `capacitor://localhost` |
| Live reload | `http://<LAN-IP>:5173` |

The API only accepts origins in `CORS_ORIGINS` (the defaults already include these). The browser engine inside the WebView enforces CORS; the server only declares what's allowed. On a CORS error, copy the exact origin from the message into `CORS_ORIGINS` and restart the API.

### 6.4 Android blocks plain `http://` (relaxed for development only)
1. **Cleartext traffic** is blocked by default. `android/app/src/debug/res/xml/network_security_config.xml` allows `10.0.2.2` and `localhost`, wired in by `android/app/src/debug/AndroidManifest.xml`. For a physical phone, add your LAN IP there. Files in `src/debug` are **not part of release builds**, so release stays HTTPS-only.
2. **Mixed content**: the page is `https://localhost` calling `http://…`. `allowMixedContent: isDev` in `capacitor.config.ts` handles it; `npm run cap:sync:prod` sets it to `false`.

Also already applied: portrait lock (`android:screenOrientation="portrait"` on the main activity). iOS `Info.plist` has `NSAllowsLocalNetworking` plus a local-network usage string (allows local HTTP without disabling ATS globally; a physical iPhone shows a one-time "Local Network" prompt). Never use `NSAllowsArbitraryLoads`.

### 6.5 Dev build vs production build
`vite build` (production) bakes in `VITE_API_URL_PROD`; `vite build --mode development` bakes in local URLs. That's why dev scripts use `build:dev` and release scripts use `build`. **A release build must never contain a local URL.** Check:
```bash
grep -r "10.0.2.2" frontend/dist && echo "BAD: dev URL in build"
```
Safe areas are handled with `viewport-fit=cover` plus `env(safe-area-inset-*)` padding in `App.jsx`. Android's back button is handled in `src/native.js`. If you later target a newer Android API level or upgrade Capacitor, recheck that headers aren't drawn under the status bar.

## 7. iOS (requires a Mac)
`frontend/ios/` is already generated. Commit it, then on a Mac:
```bash
cd frontend && npm install && npm run cap:sync:dev && npx cap open ios
```
In Xcode: App target → **Signing & Capabilities** → pick your Team; set a unique Bundle Identifier matching `appId`; choose a simulator → ▶. Physical iPhone: connect, trust, enable Developer Mode, select it, ▶ (set `VITE_API_URL_IOS` to the Mac's LAN IP, then re-sync). If CocoaPods is required by your Capacitor version and fails: `brew install cocoapods`, then `cd ios/App && pod install`.

## 8. Production
Backend and frontend deploy **independently**. They connect only through `VITE_API_URL_PROD` (frontend) and `CORS_ORIGINS` (backend).

**Order:** production Supabase project (separate from dev) → migrate it → deploy API → deploy web → set CORS → build mobile apps.

1. **Migrate production** (a deploy step, not on app boot):
   `DATABASE_URL="<prod session-pooler url>" npm --prefix backend run db:migrate`
2. **Backend** on Render / Railway / Fly.io or any Node host: root dir `backend`, build `npm install`, start `npm start`, health check `/api/health`. Set in the host dashboard (never committed): `NODE_ENV=production`, `DATABASE_URL`, a **new** strong `JWT_SECRET`, and `CORS_ORIGINS=https://app.yourdomain.com,https://localhost,capacitor://localhost`. The host supplies HTTPS and `PORT`. Free tiers sleep when idle, so the first request is slow.
3. **Web** on Vercel / Netlify / Cloudflare Pages: root `frontend`, build `npm run build`, output `dist`, env `VITE_API_URL_PROD=https://your-api.example.com/api`. Add an SPA rewrite so deep links work. Netlify: `frontend/public/_redirects` containing `/* /index.html 200`. Vercel: `vercel.json` with `{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}`.
4. **Connections and backups:** the API keeps a small pool (`max: 10`). For serverless or many instances use Supabase's transaction pooler (port 6543). Enable Supabase backups (paid plans) or run periodic `pg_dump`s, and practice a restore.
5. **Already in the code:** helmet, auth rate limiting, Zod validation on all input, per-user query scoping (users can't read or change each other's tasks), explicit CORS allowlist, generic login errors. Only `VITE_*` values belong in the frontend, and those are public.

## 9. Store release

### Android → Google Play
```bash
cd frontend && npm run cap:sync:prod      # production build, mixed content OFF
```
1. Create an upload keystore **once**; back it up and never commit it:
   `keytool -genkey -v -keystore taskflow-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias taskflow`
2. Android Studio → **Build → Generate Signed Bundle / APK** → Android App Bundle → your keystore → release. Or configure `signingConfigs.release` in `android/app/build.gradle` (credentials from a gitignored `keystore.properties`) and run `cd android && ./gradlew bundleRelease` (`gradlew.bat` on Windows). Output: `app/build/outputs/bundle/release/app-release.aab`.
3. Raise `versionCode` (integer, must always increase) and `versionName` in `android/app/build.gradle` for every release.
4. Play Console: create the app, use Play App Signing, upload the `.aab` to **Internal testing** first, complete the listing, Data safety form, content rating and a privacy-policy URL. Google raises the minimum target API level periodically, so check the current requirement.

### iOS → App Store
1. Join the Apple Developer Program (paid, annual); create the app in App Store Connect with your bundle ID.
2. `npm run cap:sync:prod`, `npx cap open ios`, set version/build number, automatic signing with your team.
3. Destination **Any iOS Device** → **Product → Archive** → **Distribute App → App Store Connect**.
4. Test with **TestFlight**, fill in the listing and App Privacy details, include a demo account in review notes, submit.
5. Apple expects **in-app account deletion** for apps with sign-up: add `DELETE /api/auth/me` (the `tasks.user_id` foreign key already cascades) and a button before submitting. Apps that are only a thin website wrapper can be rejected, so consider adding more native features before a real release.

## 10. Troubleshooting
| Symptom | Cause / fix |
|---|---|
| `Network Error` in the Android app only | `localhost` used in the emulator. Use `http://10.0.2.2:5000/api`, then rebuild and sync (`.env` is baked in at build time) |
| Network Error on a physical phone | Wrong IP, firewall, different Wi-Fi, or LAN IP missing from the debug `network_security_config.xml` |
| `ERR_CLEARTEXT_NOT_PERMITTED` | Host missing from the debug network security config (§6.4) |
| "Mixed Content" blocked | Built with `cap:sync:prod` while pointing at an `http://` API. Use `cap:sync:dev` |
| CORS error in console | Add the exact origin to `CORS_ORIGINS` and restart the API |
| Backend exits at startup with a Zod error | Missing/short `JWT_SECRET` or no `DATABASE_URL` in `backend/.env` |
| `ENOTFOUND` / `ECONNREFUSED` / timeout to DB | Wrong URL, or the direct host is IPv6-only on your network. Use the **Session pooler** string |
| `password authentication failed` | Wrong or un-encoded password. Reset it in Supabase and URL-encode it |
| `prepared statement ... already exists` | Transaction pooler with prepared statements; the code disables them for `:6543` URLs, so check your URL |
| `drizzle-kit migrate`: nothing to apply after editing schema | Run `npm run db:generate` first |
| Build fails: `VITE_API_URL_PROD must be an https:// URL` | Set it in `frontend/.env` (or the host's env) before `npm run build` |
| App shows the old UI | Run `npm run cap:sync:dev` (or use live reload) after React changes |
| Plugin "not implemented" | Not synced (`npx cap sync`), or running in a browser without a web fallback |
| `Could not find the web assets directory: ./dist` | Run a build first |
| Gradle/JDK errors | Open `frontend/android` in Android Studio, let it sync, use its bundled JDK |
| 401 right after login | Token not saved or attached. Check the Network tab in `chrome://inspect` |
| Release app can't connect | Release is HTTPS-only by design. Fix `VITE_API_URL_PROD` and backend `CORS_ORIGINS` |

## API reference
| Endpoint | Body → Response |
|---|---|
| `POST /api/auth/signup` | `{name, email, password(≥8)}` → `{token, user}` |
| `POST /api/auth/login` | `{email, password}` → `{token, user}` |
| `GET /api/auth/me` | Bearer token → `{user}` |
| `GET /api/tasks` | your tasks |
| `POST /api/tasks` | `{title}` |
| `PATCH /api/tasks/:id` | `{done: boolean}` |
| `DELETE /api/tasks/:id` | 204 |

Errors: `{ "error": "...", "details": [...] }` with 400 validation, 401 unauthorized, 403 CORS, 404 not found, 409 duplicate email.
