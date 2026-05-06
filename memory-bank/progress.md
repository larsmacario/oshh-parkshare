# Progress

## Was funktioniert
- Rollenbasierter Zugang (`admin`, `owner`, `flexible`).
- Owner-Kalender fuer Tagesfreigaben.
- Flexible Buchung fuer freie Plaetze.
- Admin-Panel fuer Nutzer-/Platzverwaltung und Tagesuebersicht.
- Personio-Cron-Sync fuer taegliche, idempotente Freigaben.

## Zuletzt abgeschlossen
- Kalender-Bugfix fuer korrekte "Gebucht"-Markierung pro Spot statt nur pro Datum.
- Admin-Flow angepasst:
  - Dauerhaft-Option entfernt.
  - "Heute freigeben" direkt im Spots-Tab integriert.

## Bekannte Restpunkte
- Kein direkter Admin-Undo fuer Tagesfreigabe im Spots-Tab.
- Regression-Tests (automatisiert) fuer Statusaggregation sind nicht dokumentiert/sichtbar.

## Naechste sinnvolle Schritte
- Admin-Undo "Heute wieder besetzen" implementieren.
- Spot-/Datums-Statuslogik durch gezielte Tests absichern.
