# System Patterns: Parkshare

## Architecture
- Next.js App Router for routing and layout.
- Decoupled components in `components/`.
- Lib folder for Supabase and helper functions.
- Hybrid sync architecture:
  - Scheduled job via Vercel Cron (daily at 05:00).
  - Manual admin-triggered sync via protected API route.
  - Shared sync core in `lib/personio-sync.js` to avoid logic drift.
- API security pattern:
  - Cron route protected via optional `CRON_SECRET`.
  - Admin routes verify Supabase session token and admin role before execution.

## Design Patterns
- **Glassmorphism**: Subtle backgrounds for cards and modals.
- **Clean Typography**: Large headings, generous whitespace.
- **Micro-animations**: Smooth transitions for loading and interactions.
- **Idempotent writes**: spot releases use DB upsert (`spot_id,date`) to prevent duplicates.

## Standards
- Atomic Git commits.
- English code/comments, German UI.
