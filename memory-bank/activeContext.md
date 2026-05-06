# Active Context

## Aktueller Fokus
Stabilisierung der Tagesstatus-Logik und Vereinfachung von Admin-Freigaben.

## Heute umgesetzt
- Bugfix: Kalender markierte freigegebene Tage faelschlich als "Gebucht", sobald irgendeine Buchung am selben Datum existierte.
  - Ursache: Reservierungscheck nur nach Datum.
  - Fix:
    - `lib/supabase.js`: `getReservationsForDate(date, spotId = null)` erweitert.
    - `components/OwnerCalendar.jsx`: Spot-spezifischer Check via `getReservationsForDate(a.date, a.spot_id)`.
- Feature-Anpassung Admin:
  - Dauerhaft-Freigabe-Toggle im `AdminPanel` entfernt.
  - Neue Aktion pro Parkplatz: "Heute freigeben".
  - Bereits heute verfuegbare Plaetze werden als "Heute freigegeben" angezeigt und nicht erneut freigegeben.

## Offene Anschlussarbeiten
- Optional: Admin-Aktion "Heute wieder besetzen" (Freigabe fuer heute zuruecknehmen).
- Optional: Konsistenter Helper fuer spot-spezifische Reservierungschecks, um künftige Fehlverwendungen zu vermeiden.
