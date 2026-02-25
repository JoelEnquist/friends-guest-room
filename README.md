# The Grow Room (V2)

Friends-only guest room booking app.

## What V2 adds
- Product rename across UI + emails to **The Grow Room**.
- Mobile-first clickable calendar selection:
  - first tap = check-in
  - second tap = check-out
  - highlights for today, check-in, check-out, in-range, and unavailable
  - jump-to-today button when current view excludes today
  - strict inline validation for 5-night max and unavailable ranges
- 24-hour door-code safety flow:
  - approval email does **not** include codes
  - guest sees codes only within 24h of check-in
  - arrival details email is sent once in the 24h window
  - admin can manually send arrival email now for testing
- Guidebook improvements:
  - updated cleaning-contribution copy
  - pay-it-forward block
  - photo gallery grid with tap-to-enlarge preview
- Admin QR page: `/admin/qr` with print-friendly guidebook QR.

## Tech
- Next.js App Router + TypeScript
- NextAuth + Prisma Adapter
- Prisma + Postgres (local via Docker, production via managed Postgres)
- Tailwind CSS

## Local run
1. Install dependencies:
```bash
npm install
```

2. Create env file:
```bash
cp .env.example .env
```

3. Set required env vars in `.env`:
- `NEXTAUTH_SECRET`
- `ENCRYPTION_KEY`
- `ADMIN_EMAIL_1`
- `ADMIN_EMAIL_2`
- `CRON_SECRET`
- `DATABASE_URL`

4. Start local Postgres:
```bash
docker compose up -d postgres
```

5. Prepare DB and seed:
```bash
npm run db:generate
npm run db:deploy
npm run db:seed
```

6. Start app:
```bash
npm run dev
```

Or run one command:
```bash
npm run dev:local
```

Notes:
- This repo now uses Postgres for local and production.
- SQLite file databases are not suitable for Vercel production (no persistent writable local DB file on serverless instances).

## Invite-only and admins
- Seed creates admins from `ADMIN_EMAIL_1` and `ADMIN_EMAIL_2`.
- After login as admin, go to `/admin` and use **Invite allowlist** to add/remove allowed emails and assign roles.

## Public vs invite-only routes
Public (no auth required):
- `/` - public landing page for **The Grow Room**
- `/request-invite` - invite request form
- `/faq` - FAQ page (direct linkable)
- `/login` - magic-link sign-in page

Invite-only (auth required):
- `/calendar` - availability + booking request flow
- `/bookings` - guest booking status, cancel/reschedule
- `/guidebook` - authenticated guidebook

Admin-only:
- `/admin` - approvals, blocks, settings, invite allowlist, invite requests
- `/admin/suggestions` - suggestions triage list (filters + detail links)
- `/admin/suggestions/[id]` - suggestion detail + triage editor
- `/admin/qr` - print-friendly guidebook QR

Security notes:
- Booking and admin pages redirect unauthenticated users to `/login`.
- Public pages never expose address, door codes, guest identities, or booking data.
- Suggestions are invite-only and visible only to the author and admins.

## Suggestions feature (invite-only)
- Logged-in users can open `/suggestions` to propose sustainable improvements to The Grow Room.
- Suggestions are intended to reduce owner effort (guest-doable, another-guest-doable, or owner effort under ~15 minutes).
- Optional product link is supported for things like supply or fixture suggestions.

Eligibility rule:
- A user can only submit suggestions after at least one completed stay.
- "Completed stay" means:
  - booking status is `APPROVED`
  - checkout (`endDate`) is earlier than the current time
- Users without a completed stay can still open `/suggestions` and view the page, but they see:
  - `Suggestions are available after your first stay.`

Admin triage:
- Admins review suggestions in `/admin/suggestions`.
- Filter by status and category, then click a row to open `/admin/suggestions/[id]`.
- Admins can update:
  - status (`NEW`, `REVIEWING`, `ACCEPTED`, `DONE`, `DECLINED`)
  - category
  - owner effort tag
  - internal admin notes
- Suggestions are audited (`SUGGESTION_CREATED`, `SUGGESTION_ADMIN_UPDATED`) in the existing audit log.

## Invite request flow (public -> invite-only)
1. Guest submits `/request-invite` with name, email, social link, shared connection, trip purpose, and requested dates.
2. App stores the request in `InviteRequest` (status starts as `PENDING`).
3. Admin reviews requests in `/admin` and approves or denies.
4. Approve:
- request marked `APPROVED`
- user is added/upserted in the allowlist (`User.allowed = true`)
- app sends a "You're invited" email with a magic sign-in link (or logs email in dev if Resend is not configured)
5. Deny:
- request marked `DENIED`
- no denial email is sent automatically

## 24-hour door-code reveal behavior
- Reveal logic: `canRevealCodes(booking, now)` is true only when:
  - booking is `APPROVED`
  - current time is at or after `check-in - 24h`
- Guests outside that window see:
  - `Door codes unlock 24 hours before check-in. You'll see them here and get an email then.`
- Time reference is based on the app server clock (single consistent source).

## Cron route for arrival/check-out emails
Route:
- `POST /api/cron/checkout-reminders`

Auth:
- send header `Authorization: Bearer <CRON_SECRET>`
- Vercel cron header also supported

Example local trigger:
```bash
curl -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/checkout-reminders
```

The route sends:
- arrival-detail emails for approved bookings entering the 24h window (once, tracked by `arrivalEmailSentAt`)
- checkout reminder emails (once, tracked by `reminderSentAt`)

## Deploy on Vercel (`schedule.joelenquist.com`)
1. Push the repo to GitHub (or connect the local repo directly in Vercel).
2. Create a Vercel project and set the framework to Next.js.
3. Configure environment variables in Vercel (Production):
- `NEXTAUTH_URL=https://schedule.joelenquist.com`
- `NEXTAUTH_SECRET`
- `DATABASE_URL` (managed Postgres connection string)
- `ENCRYPTION_KEY`
- `CRON_SECRET`
- `ADMIN_EMAIL_1`, `ADMIN_EMAIL_2` (or `ADMIN_EMAILS`)
- `RESEND_API_KEY`, `EMAIL_FROM` (for magic links + notifications)
- optional Google OAuth / Google Calendar vars if used
4. Add custom domain `schedule.joelenquist.com` in Vercel Project Settings -> Domains.
5. Update DNS so `schedule.joelenquist.com` points to Vercel (follow Vercel's DNS target/CNAME instructions shown in the dashboard).
6. Run Prisma migrations against the production database before first use:
```bash
DATABASE_URL="postgresql://..." npm run db:deploy
```
7. (Optional) Seed admin users/settings after migrations:
```bash
DATABASE_URL="postgresql://..." ADMIN_EMAIL_1="you@example.com" ADMIN_EMAIL_2="spouse@example.com" ENCRYPTION_KEY="..." npm run db:seed
```
8. Verify the cron route is protected and working:
- `vercel.json` schedules `POST /api/cron/checkout-reminders`
- route requires `CRON_SECRET` via bearer header (Vercel cron is also supported)

Production notes:
- Keep the booking app invite-only; only `/`, `/request-invite`, `/faq`, and `/login` are public.
- Do not store production door codes in client-visible config; they remain admin/email-path only and subject to the 24h reveal rule.
- Use a managed Postgres provider (Neon, Supabase, Vercel Postgres-compatible offerings, etc.) for Vercel deployment.

## Photo gallery management
- Admin: `/admin` -> **Global settings** -> add/remove photo URLs.
- Stored in `Settings.photosJson` as JSON array.
- Guests view photos on `/guidebook` in a responsive grid.

## QR page
- Admin-only page: `/admin/qr`
- Contains:
  - title: **The Grow Room Guide**
  - QR code to `${NEXTAUTH_URL}/guidebook`
  - URL text
  - one-liner: `Scan for guidebook + checklist`
- Use browser print to create a paper card.

## Email behavior in local dev
- If `RESEND_API_KEY` + `EMAIL_FROM` are configured, real email is sent.
- Otherwise, full email payload is logged to terminal (dev fallback).
