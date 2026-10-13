# RVRS launch checklist

What is built is listed first. What still needs a person, an account or a business decision follows.

## Built and tested
- Server-side pricing, options, delivery zone, fees, promos and opening hours (`create_order`, database triggers).
- Duplicate-order protection (idempotency key), order rate limits (5 per phone per hour, 20 per network per hour).
- Row-level security on every table. Kitchen staff cannot read customer details. Staff are limited to their branches.
- Audit log for status, price, availability, zone and role changes.
- Push notifications through a database trigger and the `notify-order-status` edge function (secret-protected, deduplicated).
- Sign-in session on the phone is encrypted, with the key in the OS keychain.
- Admin dashboard security headers (no framing, no sniffing, strict referrer, HSTS).

## You must do (cannot be done from code)
1. **Supabase plan.** Free plan has no automatic backups. Upgrade to Pro for daily backups, and enable point-in-time recovery if orders matter to you. Without it there is no recovery from a bad deletion.
2. **Auth settings** (Supabase dashboard, Authentication):
   - Password: minimum length 8, require letters and digits.
   - Leaked password protection: needs the Pro plan. Turn it on there.
   - SMTP: add a real email provider. The built-in sender allows only a few emails per hour.
   - Site URL and redirect URLs: set to the real admin domain and the app scheme.
3. **Real data.** Branch name, address, phone, opening hours and coordinates. Delivery zones with fees and minimum order. Photos, option groups and Arabic names for every product. Support phone number.
4. **Legal.** Terms of service, privacy policy, support contact. Needed for both app stores.
5. **Push.** EAS account, `npx eas-cli init`, FCM v1 key for Android, APNs key for iOS (paid Apple account).
6. **Payments.** Merchant account with the payment provider. Until then card is hidden and cash works.
7. **Store accounts.** Apple Developer, Google Play Console. App name, icon, splash and screenshots.

## Accepted risks (decide whether they are fine)
- **Admin session storage.** The dashboard keeps its session in the browser's local storage, not HttpOnly cookies. Row-level security still protects all data, and security headers block framing. Moving to server-side sessions is a larger change.
- **No CAPTCHA** on guest ordering. Rate limits slow abuse but do not stop a determined attacker rotating phone numbers and networks.
- **Delivery receipts** for push are not checked, so dead tokens are removed only when Expo reports them at send time.
- **Refunds and tax** are not modelled. Reports say so.
- **Account deletion** is a request the owner handles by hand (`deletion_requests`). Delete the user in Authentication, then confirm to the customer by email. Order rows keep a snapshot of name and phone for accounting. Anonymise them if the law requires it.

## Before each release
- Run `npx tsc --noEmit` and `npx expo lint` in the app, and `npx eslint`, `npx tsc --noEmit`, `npx next build` in `admin/`.
- Check the Supabase security advisor. The `SECURITY DEFINER` warnings for `create_order`, `get_guest_order` and the staff functions are intentional: each checks the caller's role inside.
- Place a test order end to end, change its status in the dashboard, and confirm the customer sees it.
