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
