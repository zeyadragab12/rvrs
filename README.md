# RVRS Egypt ordering platform

Customer app (Expo, Android and iOS), staff dashboard (Next.js) and a Supabase backend for RVRS Egypt: smash burgers and specialty coffee.

This replaces the original Express and MongoDB plan in the master prompt. Supabase provides the database (Postgres with PostGIS), sign-in, live updates, file storage and the notification function.

## What is in the repo

```
.
├── src/                 Customer app (Expo Router, TypeScript)
│   ├── app/             Screens: tabs (home, menu, orders, profile), product, cart, checkout, order, address
│   ├── components/      UI pieces
│   ├── lib/             Supabase client, cart, orders, push, hours, account
│   ├── i18n/            English and Arabic text
│   └── theme/           Design tokens (Smash Street)
├── admin/               Staff dashboard (Next.js, Tailwind)
├── supabase/
│   ├── migrations/      Database schema, security rules and functions (11 files, in order)
│   ├── functions/       notify-order-status edge function
│   └── tests/           Business rule tests (SQL)
├── tests/               App unit tests
└── docs/                PLAN.md (original plan), LAUNCH-CHECKLIST.md
```

## How it fits together

- **Prices are never trusted from a phone.** The app calls the database function `create_order`, which recalculates prices, options, delivery zone and fee, promo code and opening hours, then creates the order. A repeated idempotency key returns the same order instead of a second one.
- **Access is enforced in the database** with row-level security. Customers see their own orders, staff see their branches, kitchen staff get a limited queue without customer details. The dashboard only hides buttons; the database refuses everything else.
- **Order status changes** go through `update_order_status`, which allows only valid steps, checks role and branch, records history and writes the audit log.
- **Push notifications:** a database trigger calls the `notify-order-status` edge function, which sends through Expo.
- **Guests** can order without an account and follow the order with a secret token kept in the phone's secure storage.

Order status flow: pending, confirmed, preparing, then ready for pickup or out for delivery, then completed. An order can also be rejected (while pending) or cancelled (once accepted). A reason is required for both.

Payment status is separate: unpaid, pending, paid, failed, refund pending, partially refunded, refunded. Card payment is switched off until a provider is configured. Cash on delivery and cash on pickup are settings the owner controls.

## Set up

Requirements: Node 20 or newer, a Supabase project, and for phones an Android emulator, iOS simulator or a development build.

### Customer app
```bash
npm install
cp .env.example .env.local     # then fill in the two values
npx expo start
```
| Variable | Meaning |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Project URL |
| `EXPO_PUBLIC_SUPABASE_KEY` | Publishable key (`sb_publishable_...`). Safe in the app. |

Never put the `service_role` key in any `EXPO_PUBLIC_` variable.

### Staff dashboard
```bash
cd admin
npm install
cp .env.example .env.local     # NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_KEY
npm run dev                    # http://localhost:3000
```
Sign in with a staff account. Roles are given on the Staff page by the owner, or for the very first owner directly in the database:
```sql
update public.profiles set role = 'owner' where id = '<user id from Authentication>';
```

## Scripts

| Where | Command | Does |
|---|---|---|
| app | `npm run typecheck` | TypeScript check |
| app | `npx expo lint` | Lint |
| app | `npm test` | Unit tests (opening hours) |
| admin | `npx tsc --noEmit`, `npx eslint`, `npx next build` | Check and build |
| database | `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rules.sql` | Business rule tests |

`supabase/tests/rules.sql` builds its own branches, menu, promos and staff inside one transaction and rolls everything back. Run it against a development or staging database. It checks pricing, options, delivery zones, promos and usage limits, duplicate orders, opening hours, rate limits, guest access, branch isolation, kitchen privacy, status rules, audit logging, zone and staff management, and reports.

Not covered yet: automated tests of app screens and the dashboard, and payment webhook tests (no provider is connected).

## Deployment

1. **Database.** The full schema is in `supabase/migrations/`. For a new project: `supabase link --project-ref <ref>`, then `supabase db push`. The migration files match what is running in the current project. One thing to change per environment: `private.notify_status_change()` in `20261012163358_push_notification_pipeline.sql` contains this project's function URL, so edit the project ref before pushing to staging or production. The secret that protects the function is generated inside each database and is never in the repo.
2. **Edge function.** `supabase functions deploy notify-order-status` (config in `supabase/config.toml`: `verify_jwt = false`, because callers are authenticated by the Vault secret). Optional secret: `EXPO_ACCESS_TOKEN`.
3. **Dashboard.** Deploy `admin/` to any Next.js host (Vercel, Netlify). Set the two `NEXT_PUBLIC_` variables. Add the domain to Supabase Authentication, URL configuration.
4. **App builds.** `npx eas-cli init`, then `npx eas-cli build --profile development|production --platform android|ios`. Push needs FCM v1 (Android) and an APNs key (iOS). Submit with `npx eas-cli submit`.
5. **Payments.** Not connected. When a provider is approved, add a payment adapter, verify webhook signatures and amounts, and then enable `payments.card_enabled` in `app_settings`.

Keep development, staging and production in separate Supabase projects. Do not run seed or test scripts against production.

## Before launch

Read [docs/LAUNCH-CHECKLIST.md](docs/LAUNCH-CHECKLIST.md). It lists backups, auth settings, real branch and menu data, legal pages, store accounts and the risks accepted so far.

## Known gaps

- The migrations have not been replayed on a fresh project yet. Do a trial `supabase db push` on a new staging project before relying on them.
- Card payments, refunds and tax are not built.
- The dashboard stores its session in browser local storage, not HttpOnly cookies.
- Delivery zones are entered as GeoJSON, not drawn on a map.
- No CAPTCHA on guest ordering. Rate limits slow abuse but do not stop a determined attacker.
- The Arabic text is a first draft and needs review by a native speaker. Right-to-left layout has not been checked on a device.
- No OpenAPI document. The API is Supabase's generated REST interface plus the functions named above.
