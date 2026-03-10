# Active Context

## Aktueller Fokus
UUID Syntax-Fehler beim Buchen von permanenten Plätzen – **abgeschlossen**

## Letzte Änderungen
- `lib/supabase.js`: `reserveSpot` angepasst, um neben `recurring-` auch `permanent-` Präfixe bei `availabilityId` zu behandeln (verhindert UUID-Syntax-Fehler in DB).

## Build-Status
✓ `npm run dev` läuft, Bugfix implementiert

