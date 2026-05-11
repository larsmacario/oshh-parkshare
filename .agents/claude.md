# Projekt: OSHH-ParkShare

## Sprache
Antworte auf Deutsch.

## Was das ist
Interne Web-App fuer Parkplatz-Sharing bei Orendt Studios.
Owner geben Plaetze frei, flexible Mitarbeitende koennen diese buchen, Admins verwalten Nutzer und Plaetze.

## Wichtige Befehle
- Dev: `npm run dev`
- Build: `npm run build`
- Test: `npm run lint`

## Konventionen
- UI nutzt Tailwind mit zentralen Design-Tokens in `tailwind.config.js` und `app/globals.css`.
- Rollenlogik (admin/owner/flexible) wird serverseitig ueber Supabase und RLS abgesichert.
- API-Routen liegen in `app/api/**/route.js`.

## Memory
Lies zu Beginn jeder Session `.agents/memory/project.md` und `.agents/memory/current.md`.
Bei `update memory`: aktualisiere `current.md`, `project.md` nur bei Architektur-Aenderungen.
