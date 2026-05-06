# System Patterns

## Architektur
- Next.js App Router Frontend.
- Supabase (Auth + Postgres) als Daten- und Auth-Schicht.
- UI-Komponenten rufen zentralisierte Datenfunktionen in `lib/supabase.js` auf.

## Rollen- und Datenmuster
- `spot_assignments` verbindet Owner mit einem oder mehreren Plaetzen.
- `availabilities` bildet explizite Freigaben je Spot/Tag ab.
- `reservations` bildet konkrete Buchungen je Spot/Tag/Nutzer ab.
- `spot_blocks` uebersteuert wiederkehrende/permanente Freigaben fuer einzelne Tage.

## Statusberechnung
- Tagesstatus in der Uebersicht wird in `getDailyOverview()` aggregiert.
- Verfuegbarkeit entsteht aus Freigaben (explizit, wiederkehrend, ggf. permanent), abzgl. Blocks und bestaetigten Reservierungen.

## Wichtige Korrektur (heutiger Fix)
- Kalender-Reserved-Check muss spot-spezifisch sein.
- Pattern: Reservierung fuer Kalenderstatus immer mit `date + spot_id` pruefen, nicht nur mit `date`.

## Admin-Interaktionsmuster
- Admin-Aktionen im Spots-Tab sind operativ/tagesbezogen.
- "Heute freigeben" nutzt idempotenten Upsert (`releaseSpotsMultiple`) fuer genau das aktuelle Datum.
