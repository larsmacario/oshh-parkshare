# Active Context

## Aktueller Fokus
Personio-Abwesenheitsabgleich + Admin-Transparenz – **abgeschlossen**

## Letzte Änderungen
- `lib/personio.js`: Personio Auth + Time-Off-Abruf + Full-day-Filter implementiert.
- `lib/personio-sync.js`: zentrale Sync-Logik für automatischen und manuellen Abgleich erstellt.
- `lib/supabase-admin.js`: serverseitiger Supabase Service-Role Client ergänzt.
- `app/api/cron/personio-sync/route.js`: täglicher Cron-Endpoint (idempotenter Release-Flow).
- `app/api/admin/personio-sync/route.js`: manueller Admin-Trigger für sofortigen Abgleich.
- `app/api/admin/personio-absences/route.js`: Wochenübersicht (Mo-Fr) nur für Owner inkl. Last-Sync-Daten.
- `components/AdminPanel.jsx`: neuer Tab „Abwesenheiten“, Button „Jetzt Abgleichen“, Last-Update-Anzeige, robuste API-Response-Verarbeitung.
- `vercel.json`: täglicher Cron auf `/api/cron/personio-sync` um 05:00 konfiguriert.

## Build-Status
✓ `npm run dev` läuft, Personio-Sync + Admin-Abwesenheiten integriert

