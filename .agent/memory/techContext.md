# Tech Context: Parkshare

## Tech Stack
- **Frontend**: React 19, Next.js 14+ (App Router)
- **Backend/Database**: Supabase (PostgreSQL, Auth, RLS)
- **Styling**: Tailwind CSS
- **Deployment**: Vercel
- **External Integration**: Personio Public API (`/auth`, `/company/time-offs`)

## Dependencies
- Lucide React (Icons)
- Supabase Auth Helpers
- Clsx / Tailwind Merge

## Constraints
- Must follow Orendt Studios branding.
- Strict security via RLS required.
- Personio credentials and service keys must remain server-side only.
- Cron and admin sync endpoints require auth protection.
