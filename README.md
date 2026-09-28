# AptFindr

AptFindr is a Progressive Web Application for discovering and managing apartment listings in La Paz, Iloilo City. It provides separate Tenant, Landlord, and Admin workflows backed by Supabase.

## Setup

1. Install dependencies with `npm install`.
2. Create `.env` and provide the project-specific public Supabase values (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`).
3. Start development with `npm run dev`.

Never commit `.env`, service-role keys, passwords, or other secrets.

## Commands

- `npm run dev` — start the Vite development server
- `npm run build` — create the production build
- `npm run migrate:supabase -- <folder>` — import supported local JSON data using the database utility script

## Project map

- `src/App.jsx` — public, authentication, tenant, landlord, and admin routes
- `src/landing` and `src/auth` — public pages and shared authentication
- `src/tenant`, `src/landlord`, `src/admin` — flat role folders containing pages and their components
- `src/admin/admin-theme.css` — shared soft-theme layer imported last by every admin entry module; it keeps Notifications, Apartments, Reports, Appeals, Admin Settings, and the review pages on the same palette and flowing layout as the dashboard overview
- `src/components` — shared controls, layouts, and account settings; `ui` contains the common UI primitives
- `src/services` — Supabase client and existing data-access services
- `src/contexts`, `src/data`, `src/utils` — shared state, data-access barrels, and helpers
- `src/styles` — global variables, base styles, shared sidebar styles, and the ordered stylesheet imports

Page-specific CSS lives beside its page or section. Landing and authentication now use semantic classes and plain CSS. Authentication shares one `AuthField` and common styles in `src/auth/auth.css`; its larger pages have adjacent stylesheets. The role pages and shared controls still need their Tailwind-to-CSS pass.

## Supabase

The local `supabase-master-migration.sql` is intentionally ignored and must not be committed. Run the current migration manually in the Supabase SQL Editor when required. Configure production Site URL, allowed `/auth/callback` and `/reset-password` redirects, and custom SMTP in Supabase.

## Signup verification emails

Confirmation mail is delivered by Supabase Auth, not by this app. When someone registers and no email arrives, the cause is a project setting — check them in this order:

1. **Custom SMTP** — Authentication → Emails → SMTP Settings. Supabase's built-in sender refuses every address that is not a member of the project team (*Email address not authorized*), is capped at about two messages per hour, and is not meant for production ([docs](https://supabase.com/docs/guides/auth/auth-smtp)).
2. **Confirm email** — Authentication → Sign In/Providers → Email → `Confirm email` must be ON. With it off, signup returns a session and no mail is sent; the signup screen now says so instead of reporting success.
3. **Redirect URLs** — Authentication → URL Configuration needs the Site URL plus `https://<domain>/auth/callback`, `https://<domain>/reset-password`, `http://localhost:5173/**`, and `https://*-<vercel-slug>.vercel.app/**` for previews ([docs](https://supabase.com/docs/guides/auth/redirect-urls)). Set `VITE_APP_URL` to pin one canonical origin for the links when preview domains should not be used.
4. **Logs** — Authentication → Logs shows `Email address not authorized`, `over_email_send_rate_limit`, and SMTP failures.

Run `scripts/database/diagnose_email_confirmation.sql` in the SQL Editor to see, per account, whether Supabase ever recorded a confirmation email (`auth.users.confirmation_sent_at`). Anyone stuck without mail can request a fresh link from **Didn't receive a verification email?** on the sign-in page, which calls `supabase.auth.resend({ type: 'signup' })`.

## Google sign-in (Continue with Google)

The sign-in view and the **tenant** create-account view show **Continue with Google** (`src/auth/GoogleAuthButton.jsx`), which calls `supabase.auth.signInWithOAuth({ provider: 'google' })`. The landlord create-account view does not: landlords register with email, so their Google journey starts on the sign-in view. Google returns to the same `/auth/callback` page as email verification. That page keeps Google sign-in sessions (email-confirmation links are still signed out, as before), and a first-time Google user selects Tenant or Landlord and accepts the terms there before their AptFindr profile is created. Finishing a Google registration signs the session out and returns to the sign-in page with an "account created" notice, so Google sign-up ends the same way as email sign-up. Google signup rejects an existing AptFindr profile (matched by auth ID or email), signs out the session, and asks the user to sign in instead. Google sign-in requires an existing AptFindr profile; an unregistered user is signed out and prompted to create an account first. Missing or expired signup intent also requires restarting from the sign-in view. Existing accounts can use Google right away: Supabase links the Google identity to the user with the same email ([identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking)).

One-time setup:

1. **Google Cloud** — APIs & Services → OAuth consent screen (app name, support email, your domain). Then Credentials → Create credentials → OAuth client ID → *Web application*:
   - Authorized JavaScript origins: `https://<domain>` and `http://localhost:5173`
   - Authorized redirect URIs: `https://<project-ref>.supabase.co/auth/v1/callback` — copy the exact Callback URL shown in Supabase's Google provider panel
2. **Supabase** — Authentication → Sign In / Providers → Google → enable it and paste the Client ID and Client Secret ([docs](https://supabase.com/docs/guides/auth/social-login/auth-google)).
3. **Redirect URLs** — nothing new: Google uses the `/auth/callback` entries from the list above.
4. **Database** — run `scripts/database/google_oauth_signup.sql` in the SQL Editor after the master migration (and after `repair_signup_profile_setup.sql` if you use it; re-run it whenever either of those is run again). Without it, the signup trigger rejects brand-new Google users and Supabase answers *Database error saving new user*.

While Google is disabled in Supabase, the button says it is unavailable instead of opening Supabase's error page.

## Landlord create account

Landlord registration in `src/auth/Signup.jsx` is a three-step wizard that follows the same stepper pattern as the rest of the create-account flow:

1. **Account Details** — username, recovery email, password and confirm password, with the password rule box (`At least 8 characters, an uppercase and lowercase letter, a number, and a special character (e.g. !@#$%).`). The step does not advance until every rule passes and both passwords match.
2. **Personal Information** — first name, last name, middle initial (optional), mobile number, and an optional business name.
3. **Review** — Account Details and Personal Information cards with per-card **Edit** links that jump back to their step, the Terms of Service and Privacy Policy checkbox, and **Create Account**.

Business permit number, home address, and verification document uploads are no longer collected while signing up. Verification documents are per property (Add Property → verification uploader) and the business name, permits, and expiry are managed later in landlord settings → Business (`src/landlord/BusinessTab.jsx`, stored in `landlord_profiles.business_name`). A business name typed during signup is passed to `signupUser` and written to `landlord_profiles` when a session exists; with email confirmation on, the profile row is created by the signup trigger and the landlord can set the name in settings. **Continue with Google is not offered on the landlord create-account view** — landlords register with email, and a first-time Google user who picks Landlord finishes on `/auth/callback` (`src/auth/CompleteGoogleSignup.jsx`). Tenant registration is unchanged and still allows a 6-character password. `tests/unit/landlordSignupWizard.test.jsx` walks the three steps and asserts the submitted payload.

## Landlord file layout

Keep `src/landlord/` **flat, without feature subfolders**. All landlord JSX, CSS, and shared JS helpers live directly in this one directory so every file is visible together. Each JSX file has its same-named CSS alongside it, such as `LandlordDashboard.jsx` / `LandlordDashboard.css` and `ManageRooms.jsx` / `ManageRooms.css`.

Prefer editing these existing pairs. Do not create duplicate components, forwarding copies, or empty CSS placeholders. Room-only supporting components, constants, validation, formatting, and photo-saving helpers stay together in the existing `ManageRooms.jsx`, with styles in `ManageRooms.css`. Do not create a separate landlord helper file for this workflow.

## Landlord room management

- `/landlord/properties/:id/rooms` contains the empty state, quick-add dialog, and paginated room list. On small screens, the table becomes room cards.
- `/landlord/properties/:id/rooms/:roomId/edit` contains room photos, information, amenities, included utilities, status, and a live preview. Both routes require a landlord session and verify property ownership.
- All room UI lives in the existing **`src/landlord/ManageRooms.jsx` + `ManageRooms.css`** pair, with labeled sections for the list, edit screen, add dialog, shared fields, preview, loading states, and unsaved-change confirmation. `ManageRooms` and `EditRoom` are the two route exports from that same file; their supporting components are defined only once. The local `useManagedProperty` hook handles loading, retry, focus refresh, and realtime updates without replacing active drafts. Room constants and pure validation, formatting, and photo-saving helpers are defined once in the labeled helpers section of that same JSX file. Shared app buttons, dialogs, and the image uploader are reused rather than copied.
- Room amenities/utilities are stored under `apartments.features.roomDetails[roomId]`, using the existing JSON metadata column (no migration required). Updates merge existing metadata and compare/retry concurrent metadata changes. Core room fields, occupancy, and photo URLs remain in `apartment_rooms`; AC/private-bathroom choices stay synchronized with the existing flags. Legacy rooms inherit property utilities until explicitly edited; an empty room utility list means none are included.
- Room photos accept JPG/JPEG, PNG, and WebP, up to 10 photos at 5 MB each. The first photo is the cover. Uploads use the existing Supabase storage service and are reused on save retries. Floor area, room type, and bathroom details remain available under **Additional room details**.

### Landlord regression checks

```sh
npm test                         # Unit, component, and data-service regression tests
npx playwright install chromium  # One-time browser setup
npm run test:e2e                  # Responsive room workflow and landlord navigation
npm run build
```

Room workflows are covered at 320, 390, 768, 1024, and 1440px. Landlord navigation is also checked at 390 and 1280px: dashboard, notifications, all four settings tabs, support, market trends, activity, property listings, rooms, property details, and Add Property.

Browser tests run the real application with mocked Supabase HTTP/storage/realtime responses, so they do not need credentials or modify live data. Test artifacts are kept in `.cache`. For deployment verification, also smoke-test with an actual landlord account: add a room, edit its photos/status/amenities/utilities, reload, verify the tenant-visible details, and confirm/cancel a room deletion. Live Supabase RLS and storage policies are not validated by the mocked suite.
