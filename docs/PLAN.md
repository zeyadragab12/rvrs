# RVRS Egypt: Phase 1 audit and plan

## Locked decisions (from the planning board)
Full MVP, delivery and pickup, one branch live (model supports many), cash plus card via provider (card stays sandbox until approved), English and Arabic (RTL), guest checkout plus optional account, drawn delivery zones, Socket.IO, managed app host, real photos supplied, four staff roles, push only.
Design: Smash Street. Home: hero banner and categories. Product: step by step. Checkout: three steps. Tracking: status timeline. Admin orders: Kanban.
Repo layout was left to me: **monorepo** (see below).

## Current state
- Expo SDK 57 (`expo ~57.0.27`), React Native 0.86, React 19.2, Expo Router 57, React Compiler and typed routes on. npm (`package-lock.json`), Node 24, npm 11.
- Source is a stub: `src/app/_layout.tsx` (plain Stack) and `src/app/index.tsx` (shows an icon). No components, theme, API client or state.
- The old starter code is in `example/` and no longer type-checks (`npx tsc --noEmit` fails on missing `@/constants/theme` and `@/hooks/*`). `example/` is not part of the app; it will be excluded or deleted.
- `app.json` still has starter values: name `reactNative-tet`, blue splash, Expo icons. Needs RVRS name, bundle ids, scheme, splash and icon.
- No backend, database, admin app, tests, linting config, `.env.example` or CI. Git has no commits yet (files are staged only).
- No local MongoDB or Docker. Development will use MongoDB Atlas (free tier) or an in-memory Mongo for tests.

## Layout decision
Monorepo with npm workspaces, matching the spec:
```
apps/mobile     <- current Expo project moves here
apps/admin      <- Next.js
services/api    <- Express + TypeScript
packages/shared <- Zod schemas, types, order-state rules
docs/
```
Reason: order states, price rules and validation schemas are used by all three apps, so one shared package avoids drift. Cost: moving the Expo project needs Metro workspace config (monorepo support is built into recent Expo, to be confirmed against SDK 57 docs before changing anything).

## Phases and first actions
2. Foundation: restructure, tokens (RVRS orange `#F15A24`, black, cream, yellow), Archivo Black plus DM Sans, text wordmark, i18n with RTL, lint, format, typecheck, `.env.example`.
3. Models, seed, auth: Mongoose, refresh rotation, roles, rate limits.
4. Ordering core: branches, zones (GeoJSON polygons, `2dsphere`), menu options, server pricing, idempotent orders, status transitions.
5. Mobile: Smash Street screens wired to the API.
6. Admin: Kanban orders, kitchen view, menu and branch tools.
7. Payments (mock adapter plus sandbox provider), push, Socket.IO.
8. Tests, security pass, OpenAPI, deployment docs.

## Needed before or during the next phases
| Item | Needed by | Without it |
|---|---|---|
| MongoDB Atlas connection string | Phase 3 | in-memory DB for tests only |
| Real branch name, address, hours, contact | Phase 4 | demo branch, labelled fictional |
| Delivery zone shapes and fees | Phase 4 | demo zone |
| Menu, prices, option groups, photos | Phase 5 | seed data and placeholders |
| Arabic menu names and copy | Phase 5 | English only strings, Arabic UI strings drafted by me for your review |
| Official logo files | Phase 5 | text wordmark |
| Payment provider and sandbox keys (Paymob needs eligibility check) | Phase 7 | mock adapter, card hidden in production |
| Expo account, Apple and Google developer accounts | Phase 7 to 8 | dev builds only |
| Backend host choice and account | Phase 8 | local only |
| Terms, privacy notice, support contact | Phase 8 | placeholders flagged |

## Risks
- Expo SDK 57 APIs differ from older docs; each Expo API gets checked against the v57 docs before use.
- Arabic RTL needs layout checks on both platforms; it is built in from Phase 2 rather than added later.
- Push notifications and card payment cannot be fully verified without real devices and provider approval.
