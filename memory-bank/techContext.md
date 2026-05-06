# Tech Context

## Stack
- Next.js (App Router), React
- Supabase JS Client
- Tailwind CSS
- Vercel Deployment (inkl. Cron)

## Wichtige Projektpfade
- `components/OwnerCalendar.jsx`
- `components/FlexibleBooking.jsx`
- `components/ParkingOverview.jsx`
- `components/AdminPanel.jsx`
- `lib/supabase.js`
- `lib/database.sql`

## Konfiguration
- Umgebungsvariablen in `.env.local` (Supabase, Personio, Cron Secret).
- DB/RLS-Setup ueber `lib/database.sql`.

## Betriebsrelevante Integrationen
- Personio-Sync per Cron-Route `/api/cron/personio-sync`.
- Idempotente Freigabe ueber `onConflict: spot_id,date`.

## Technische Hinweise aus letzter Session
- `getReservationsForDate()` unterstuetzt jetzt optionalen `spotId`-Filter.
- Admin-Panel verwendet fuer Tagesfreigabe `releaseSpotsMultiple(spotId, userId, [today])`.
