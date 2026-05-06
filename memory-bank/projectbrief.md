# Project Brief

## Projekt
ParkShare ist eine interne Parkplatz-Sharing-App fuer Teams.

## Ziel
- Owner (feste Platzinhaber) koennen ihren Parkplatz fuer einzelne Tage freigeben.
- Flexible Nutzer koennen freigegebene Plaetze buchen (first come, first served).
- Admins verwalten Plaetze, Nutzer, Zuordnungen und operative Einstellungen.

## Kernanforderungen
- Rollenbasiertes System: `admin`, `owner`, `flexible`.
- Tagesgenaue Freigaben und Buchungen mit Konfliktschutz.
- Uebersicht fuer Tagesstatus (frei, gebucht, belegt).
- Admin-Panel fuer Stammdaten und operative Steuerung.
- Supabase als Backend mit RLS.

## Wichtige Produktregeln
- Standardfall Owner: Platz ist belegt, bis er freigegeben wird.
- Buchungen sind auf einen Platz/Tag begrenzt und muessen konsistent angezeigt werden.
- Statusdarstellung darf nur reale Buchungen als "gebucht" markieren.
