# Active Context

## Aktueller Fokus
Teams-Verwaltung Refactor – **abgeschlossen**

## Letzte Änderungen
- `teams`-Tabelle in Supabase erstellt
- `profiles.team_id` (FK) und `parking_spots.team_id` (FK) migriert
- `lib/supabase.js`: Teams-CRUD, assignTeamToSpot, unassignTeamFromSpot, getAvailableSpotsForDate und getDailyOverview aktualisiert
- `components/AdminPanel.jsx`: komplett neu geschrieben – TeamsTab (neu), SpotsTab Mitarbeiter+Team-Dropdowns, UsersTab Team-Dropdown (team_id)

## Build-Status
✓ `npm run build` erfolgreich (12/12 Seiten)
