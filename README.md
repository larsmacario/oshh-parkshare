# ParkShare – Orendt Studios

Intelligentes Parkplatz-Sharing für das Team. Feste Platzinhaber geben freie Tage bekannt, flexible Mitarbeiter können diese Plätze buchen.

## Quick Start

### 1. Dependencies installieren

```bash
npm install
```

### 2. Supabase einrichten

1. Erstelle ein Supabase-Projekt (oder nutze ein bestehendes)
2. Öffne den **SQL Editor** und führe `lib/database.sql` aus
3. Kopiere URL und Anon Key aus **Settings → API**

### 3. Environment Variables

```bash
cp .env.local.example .env.local
```

Trage deine Supabase-Werte ein:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG... (nur serverseitig)
PERSONIO_CLIENT_ID=xxxxx
PERSONIO_CLIENT_SECRET=xxxxx
CRON_SECRET=xxxxx
# Optional:
# PERSONIO_BASE_URL=https://api.personio.de/v1
```

### 4. Starten

```bash
npm run dev
```

- App: [http://localhost:3000](http://localhost:3000)
- Login: [http://localhost:3000/login](http://localhost:3000/login)
- Dashboard: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
- Admin: [http://localhost:3000/admin](http://localhost:3000/admin)

## Rollen

| Rolle | Beschreibung |
|-------|-------------|
| **Admin** | Verwaltet Plätze, Mitarbeiter, Zuordnungen. Sieht Statistiken. |
| **Owner** (Platzinhaber) | Hat einen festen Platz. Kann Tage freigeben. |
| **Flexible** | Kann freigegebene Plätze buchen. |

## Architektur

### Datenfluss

```
Owner gibt Tag frei → Availability wird erstellt →
Flexible sieht freien Platz → Reservierung (mit Conflict-Check) →
Platz ist für den Tag belegt
```

### Tabellen

- `profiles` – Mitarbeiter (via Supabase Auth)
- `parking_spots` – Physische Parkplätze
- `spot_assignments` – Owner ↔ Platz Zuordnung
- `availabilities` – Freigegebene Tage
- `reservations` – Buchungen

### Sicherheit

- Row Level Security (RLS) auf allen Tabellen
- Owner können nur eigene Plätze freigeben
- Flexible können nur offene Plätze buchen
- Admin hat vollen Zugriff
- Ein User = max. 1 Buchung pro Tag (DB Constraint)

## Projektstruktur

```
parkshare/
├── app/
│   ├── layout.js              # Root Layout + Fonts
│   ├── page.js                # Landing → Redirect
│   ├── globals.css            # Tailwind + Orendt Styles
│   ├── login/page.js          # Login / Registrierung
│   ├── dashboard/page.js      # Haupt-Dashboard (rollenbasiert)
│   └── admin/page.js          # Admin-Panel
├── components/
│   ├── Header.jsx             # Navigation + User-Info
│   ├── ParkingOverview.jsx    # Tages-Übersicht aller Plätze
│   ├── OwnerCalendar.jsx      # Kalender zum Freigeben
│   ├── FlexibleBooking.jsx    # Buchungs-Interface
│   └── AdminPanel.jsx         # Verwaltung (Plätze, User, Zuordnungen)
├── lib/
│   ├── supabase.js            # Supabase Client + DB Functions
│   ├── hooks.js               # Auth Hook
│   ├── dates.js               # Datum-Hilfsfunktionen
│   └── database.sql           # SQL Migration
├── tailwind.config.js         # Orendt Branding Tokens
└── package.json
```

## Design

- **Fonts:** Sora (Display) + Instrument Sans (Body)
- **Farben:** Schwarz/Weiß + Neon-Accent (#E8FF00)
- **Status-Farben:** Grün (verfügbar), Gelb (reserviert), Rot (belegt)
- **Style:** Clean, editorial, Orendt Studios Branding

## Erster Admin-User

Nach der Registrierung den ersten User manuell zum Admin machen:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'deine@email.com';
```

## Deployment (Vercel)

```bash
vercel
```

Environment Variables in den Vercel-Projekteinstellungen hinterlegen.

## Automatischer Personio-Abgleich (05:00)

Die App enthält einen täglichen Sync unter `/api/cron/personio-sync`.

- **Schedule:** täglich um `05:00` (Vercel Cron via `vercel.json`)
- **Quelle:** Personio Public API (`/auth` + `/company/time-offs`)
- **Matching:** `Personio employee.email` gegen `profiles.email` (lowercase/trim)
- **Scope:** nur `owner`-Profile mit aktiver Platzzuweisung (`spot_assignments`)
- **Regel:** nur **ganztägige** und **approved** Abwesenheiten für **heute**
- **Ergebnis:** idempotente Freigabe in `availabilities` über `onConflict: spot_id,date`

### Route-Schutz

Wenn `CRON_SECRET` gesetzt ist, erwartet die Route:

```
Authorization: Bearer <CRON_SECRET>
```

### Manuelle Verifikation (Dry-Run)

1. Testdaten in Personio für heute mit ganztägiger Abwesenheit anlegen.
2. Sicherstellen, dass die Person als `owner` in `profiles` existiert und eine aktive `spot_assignments`-Zuordnung hat.
3. Route manuell aufrufen (z. B. Postman/cURL) mit `Authorization` Header.
4. In der Response prüfen:
   - `matchedOwners > 0`
   - `releasedRows > 0`
5. Bei erneutem Aufruf dürfen keine Duplikate entstehen (idempotent über Upsert).

### Typische Fehlerbilder

- **Keine Matches:** E-Mail in Personio und `profiles.email` weichen ab.
- **Keine Freigaben trotz Match:** keine aktive Spot-Zuweisung für den Owner.
- **401:** `CRON_SECRET` fehlt/falsch im Header.
- **500 Personio:** Credentials falsch oder Personio API temporär nicht verfügbar.

## Nächste Schritte (Phase 2)

- [ ] Wiederkehrende Freigaben ("Jeden Freitag remote")
- [ ] E-Mail-Benachrichtigungen
- [ ] Auslastungs-Statistiken
- [ ] Warteliste
- [ ] Interaktiver Lageplan (SVG)
- [ ] PWA für Mobile
