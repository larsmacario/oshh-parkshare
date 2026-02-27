import Footer from "@/components/Footer"
import Link from "next/link"

export const metadata = {
    title: "Datenschutzerklärung | ParkShare",
    description: "Datenschutzerklärung der ParkShare-Anwendung von Orendt Studios",
}

function Section({ title, children }) {
    return (
        <section className="mb-10">
            <h2 className="font-display text-[10px] font-bold uppercase tracking-[0.25em] text-orendt-gray-400 mb-3">
                {title}
            </h2>
            <div className="bg-white border border-orendt-gray-100 rounded-2xl p-6 sm:p-8 space-y-4 text-orendt-gray-500 font-body text-sm leading-relaxed shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)]">
                {children}
            </div>
        </section>
    )
}

function InfoRow({ label, value, highlight }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b border-orendt-gray-50 last:border-0">
            <span className="font-display text-[10px] font-bold uppercase tracking-[0.15em] text-orendt-gray-400 sm:w-48 shrink-0 mt-0.5">
                {label}
            </span>
            <span className={`font-body text-sm ${highlight ? "font-semibold text-orendt-black" : "text-orendt-gray-500"}`}>
                {value}
            </span>
        </div>
    )
}

function RoleBadge({ role, color }) {
    const colors = {
        owner: "bg-orendt-accent/15 text-orendt-black border-orendt-accent/30",
        flexible: "bg-orendt-gray-50 text-orendt-gray-500 border-orendt-gray-200",
        both: "bg-orendt-black/5 text-orendt-black border-orendt-black/10",
    }
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-display font-bold uppercase tracking-[0.12em] border ${colors[color]}`}>
            {role}
        </span>
    )
}

export default function DatenschutzPage() {
    return (
        <div className="min-h-screen flex flex-col bg-white">
            {/* Decorative background */}
            <div className="fixed top-[-5%] right-[-5%] w-[35%] h-[35%] bg-orendt-accent/8 rounded-full blur-[100px] pointer-events-none" />
            <div className="fixed bottom-[-5%] left-[-5%] w-[35%] h-[35%] bg-orendt-gray-50 rounded-full blur-[100px] pointer-events-none" />

            {/* Header */}
            <div className="w-full border-b border-orendt-gray-100 px-6 py-4 sticky top-0 z-50 bg-white/80 backdrop-blur-md">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <Link href="/login">
                        <div className="h-9 px-3 py-2 bg-orendt-black rounded-xl flex items-center justify-center">
                            <img src="/orendtstudios_logo.png" alt="Orendt Studios" className="h-full w-auto object-contain" />
                        </div>
                    </Link>
                    <Link
                        href="/dashboard"
                        className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-orendt-gray-400 hover:text-orendt-black transition-colors"
                    >
                        ← Zurück
                    </Link>
                </div>
            </div>

            {/* Main content */}
            <main className="flex-1 relative z-10 px-4 sm:px-6 py-12 sm:py-16">
                <div className="max-w-3xl mx-auto">

                    {/* Page title */}
                    <div className="mb-12">
                        <p className="font-display text-[10px] font-bold uppercase tracking-[0.35em] text-orendt-gray-400 mb-3">
                            ParkShare · Orendt Studios
                        </p>
                        <h1 className="font-display text-[36px] sm:text-[52px] font-bold text-orendt-black tracking-tighter leading-tight">
                            Datenschutz&shy;erklärung
                        </h1>
                        <p className="mt-4 font-body text-sm text-orendt-gray-400">
                            Stand: Februar 2026 · Gemäß DSGVO (EU) 2016/679
                        </p>
                    </div>

                    {/* 1. Verantwortlicher */}
                    <Section title="1. Verantwortlicher">
                        <InfoRow label="Organisation" value="Orendt Studios" />
                        <InfoRow label="Anwendung" value="ParkShare – Internes Parkplatz-Sharing-System" />
                        <InfoRow label="Kontakt" value="Bitte wende dich an deinen Administrator." />
                        <p className="text-sm text-orendt-gray-400 pt-2">
                            Diese Anwendung ist ein internes Tool für Mitarbeitende von Orendt Studios und nicht öffentlich zugänglich.
                        </p>
                    </Section>

                    {/* 2. Personenbezogene Daten – Allgemein */}
                    <Section title="2. Personenbezogene Daten – Allgemein (alle Nutzer)">
                        <p>
                            Für alle registrierten Nutzer werden folgende Daten erhoben und gespeichert:
                        </p>
                        <div>
                            <InfoRow label="Name" value="Vollständiger Name (Vor- und Nachname)" />
                            <InfoRow label="E-Mail-Adresse" value="Zur Authentifizierung und internen Identifikation" />
                            <InfoRow label="Nutzerrolle" value="Admin, Inhaber oder Flexibel" />
                            <InfoRow label="Konto-Status" value="Aktiv oder gesperrt (is_blocked)" />
                            <InfoRow label="Erstellt am" value="Zeitstempel der Kontoerstellung" />
                        </div>
                        <div className="mt-2 flex items-start gap-3 p-4 bg-green-500/5 border border-green-500/15 rounded-xl">
                            <svg className="w-5 h-5 text-green-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <p className="font-display text-[10px] font-bold uppercase tracking-[0.15em] text-green-700 mb-1">
                                    Keine Kfz-Kennzeichen
                                </p>
                                <p className="font-body text-sm text-green-700/80">
                                    Fahrzeugkennzeichen werden in ParkShare <strong>nicht</strong> erfasst, gespeichert oder verarbeitet.
                                    Es erfolgt keinerlei Verknüpfung von Nutzerdaten mit Fahrzeugdaten.
                                </p>
                            </div>
                        </div>
                    </Section>

                    {/* 3. Personenbezogene Daten – Inhaber */}
                    <Section title="3. Personenbezogene Daten – Platzinhaber (Owner)">
                        <div className="flex items-center gap-2 mb-4">
                            <RoleBadge role="Nur für Inhaber" color="owner" />
                        </div>
                        <p className="mb-4">
                            Nutzer mit der Rolle <strong>Inhaber</strong> verwalten einen festen Parkplatz.
                            Zusätzlich zu den allgemeinen Daten werden gespeichert:
                        </p>
                        <InfoRow label="Parkplatznummer" value="Zugewiesener Parkplatz (z. B. P-01)" />
                        <InfoRow label="Verfügbarkeitskalender" value="Tage, an denen der Platz freigegeben ist (availabilities-Tabelle)" />
                        <InfoRow label="Wiederkehrende Verfügbarkeit" value="Dauerhaft freigegebene Wochentage (recurring_availabilities-Tabelle)" />
                        <InfoRow label="Buchungshistorie" value="Wann der eigene Platz von wem gebucht wurde (bookings-Tabelle, anonymisiert)" />
                        <p className="mt-4 text-orendt-gray-400 text-xs">
                            Die Verfügbarkeitsdaten sind nur für Administratoren und den jeweiligen Inhaber einsehbar.
                            Flexible Nutzer sehen lediglich, ob ein Platz verfügbar ist – nicht wem er gehört.
                        </p>
                    </Section>

                    {/* 4. Personenbezogene Daten – Flexibel */}
                    <Section title="4. Personenbezogene Daten – Flexible Nutzer (Flexible)">
                        <div className="flex items-center gap-2 mb-4">
                            <RoleBadge role="Nur für Flexible" color="flexible" />
                        </div>
                        <p className="mb-4">
                            Nutzer mit der Rolle <strong>Flexibel</strong> buchen kurzfristig freie Parkplätze.
                            Zusätzlich zu den allgemeinen Daten werden gespeichert:
                        </p>
                        <InfoRow label="Buchungsdaten" value="Datum und Uhrzeit einer Buchung (bookings-Tabelle)" />
                        <InfoRow label="Zugewiesener Parkplatz" value="Welcher Platz für welchen Tag gebucht wurde (spot_id)" />
                        <InfoRow label="Buchungshistorie" value="Alle bisherigen Buchungen des Nutzers" />
                        <p className="mt-4 text-orendt-gray-400 text-xs">
                            Buchungsdaten werden ausschließlich intern zur Verwaltung der Parkplatzbelegung verwendet
                            und nicht an Dritte weitergegeben.
                        </p>
                    </Section>

                    {/* 5. Vercel Hosting */}
                    <Section title="5. Hosting & Infrastruktur – Vercel">
                        <p>
                            Die ParkShare-Anwendung wird über <strong>Vercel Inc.</strong> (San Francisco, USA) gehostet und ausgeliefert.
                        </p>
                        <InfoRow label="Anbieter" value="Vercel Inc., 340 Pine Street Suite 701, San Francisco, CA 94104, USA" />
                        <InfoRow label="Zweck" value="Bereitstellung und Auslieferung der Web-Anwendung (CDN, Edge-Network)" />
                        <InfoRow label="Datenverarbeitung" value="Vercel verarbeitet technische Zugriffslogs (IP-Adresse, Browser, Zeitstempel) für den Betrieb" />
                        <InfoRow label="Rechtsgrundlage" value="Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse – Betrieb der Anwendung)" />
                        <InfoRow label="Datenschutz" value="Vercel Data Processing Agreement (DPA) liegt vor" />
                        <p className="mt-2 text-xs">
                            Weitere Informationen:{" "}
                            <a
                                href="https://vercel.com/legal/privacy-policy"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-orendt-black underline underline-offset-2 hover:opacity-70 transition-opacity"
                            >
                                vercel.com/legal/privacy-policy
                            </a>
                        </p>
                    </Section>

                    {/* 6. Supabase Auth */}
                    <Section title="6. Authentifizierung – Supabase Auth">
                        <p>
                            Die Authentifizierung (Login, Registrierung, Session-Verwaltung) wird über <strong>Supabase</strong> abgewickelt.
                        </p>
                        <InfoRow label="Anbieter" value="Supabase Inc., San Francisco, USA" />
                        <InfoRow label="E-Mail & Passwort" value="E-Mail-basierter Login; Passwörter werden mit bcrypt gehasht – nie im Klartext gespeichert" />
                        <InfoRow label="Session-Token" value="JWT (JSON Web Token) – kurzlebig, im Browser-Speicher verwaltet" />
                        <InfoRow label="Passwort-Reset" value="Temporäre, einmalig verwendbare Reset-Links per E-Mail" />
                        <InfoRow label="Erstpasswort" value="Mitarbeitende, die vom Admin angelegt werden, erhalten ein temporäres Passwort und werden beim ersten Login zur Änderung aufgefordert" />
                        <InfoRow label="Datenbankregion" value="EU (Frankfurt, AWS eu-central-1)" />
                        <p className="mt-2 text-xs">
                            Weitere Informationen:{" "}
                            <a
                                href="https://supabase.com/privacy"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-orendt-black underline underline-offset-2 hover:opacity-70 transition-opacity"
                            >
                                supabase.com/privacy
                            </a>
                        </p>
                    </Section>

                    {/* 7. Supabase Datenbank */}
                    <Section title="7. Datenbank – Supabase PostgreSQL">
                        <p>
                            Alle Anwendungsdaten werden in einer <strong>PostgreSQL-Datenbank</strong> bei Supabase gespeichert.
                        </p>
                        <InfoRow label="Datenbank-Typ" value="PostgreSQL (verwaltete Instanz bei Supabase)" />
                        <InfoRow label="Datenbankregion" value="EU West (Frankfurt / AWS eu-central-1)" />
                        <InfoRow label="Zugriffskontrolle" value="Row Level Security (RLS) – jeder Nutzer kann nur seine eigenen Daten lesen und schreiben" />
                        <InfoRow label="Verschlüsselung" value="Daten at-rest verschlüsselt; Verbindungen über TLS/SSL" />
                        <InfoRow label="Tabellen mit personenbezogenen Daten" value="profiles, bookings, availabilities, recurring_availabilities" />
                        <InfoRow label="Backups" value="Automatische tägliche Backups durch Supabase" />
                        <div className="mt-3 p-4 bg-orendt-gray-50 border border-orendt-gray-100 rounded-xl">
                            <p className="font-display text-[9px] font-bold uppercase tracking-[0.15em] text-orendt-gray-400 mb-2">
                                Welche Tabellen werden genutzt?
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-orendt-gray-500">
                                {[
                                    ["profiles", "Nutzerprofile, Rollen, Sperrstatus"],
                                    ["parking_spots", "Parkplatzdaten (Nummer, Inhaber)"],
                                    ["availabilities", "Freigegebene Tage (Inhaber)"],
                                    ["recurring_availabilities", "Wiederkehrende Wochentage (Inhaber)"],
                                    ["bookings", "Buchungen (Flexible Nutzer)"],
                                ].map(([table, desc]) => (
                                    <div key={table} className="flex gap-2">
                                        <span className="bg-orendt-black text-orendt-accent px-2 py-0.5 rounded text-[10px] font-bold shrink-0">
                                            {table}
                                        </span>
                                        <span className="font-body">{desc}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Section>

                    {/* 8. Rechte der Nutzer */}
                    <Section title="8. Deine Rechte (DSGVO Art. 15–22)">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[
                                ["Auskunft (Art. 15)", "Du kannst jederzeit Auskunft über deine gespeicherten Daten verlangen."],
                                ["Berichtigung (Art. 16)", "Du kannst fehlerhafte Daten korrigieren lassen."],
                                ["Löschung (Art. 17)", "Du kannst deinen Account und alle zugehörigen Daten selbst löschen (Einstellungen → Account löschen)."],
                                ["Einschränkung (Art. 18)", "Du kannst die Verarbeitung deiner Daten einschränken lassen."],
                                ["Widerspruch (Art. 21)", "Du kannst der Verarbeitung widersprechen."],
                                ["Beschwerde", "Du hast das Recht, dich bei einer Datenschutzbehörde zu beschweren."],
                            ].map(([right, desc]) => (
                                <div key={right} className="p-4 bg-orendt-gray-50 border border-orendt-gray-100 rounded-xl">
                                    <p className="font-display text-[10px] font-bold uppercase tracking-[0.12em] text-orendt-black mb-1.5">
                                        {right}
                                    </p>
                                    <p className="font-body text-xs text-orendt-gray-400 leading-relaxed">{desc}</p>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-orendt-gray-400 pt-2">
                            Zur Ausübung deiner Rechte wende dich an deinen Administrator.
                        </p>
                    </Section>

                    {/* 9. Datenlöschung */}
                    <Section title="9. Datenlöschung & Account-Entfernung">
                        <p>
                            Du kannst deinen Account und alle damit verbundenen personenbezogenen Daten selbst in den
                            <strong> Profileinstellungen</strong> unter „Account löschen" permanent löschen.
                        </p>
                        <p>
                            Bei der Löschung werden entfernt: Profildaten, Buchungshistorie, Verfügbarkeitseinträge
                            und alle zugehörigen Authentifizierungsdaten bei Supabase Auth.
                        </p>
                        <p className="text-orendt-gray-400 text-xs">
                            Alternativ kann ein Administrator deinen Account über das Admin-Panel deaktivieren oder löschen.
                        </p>
                    </Section>

                    {/* Back link */}
                    <div className="mt-6 text-center">
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center gap-2 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-orendt-gray-400 hover:text-orendt-black transition-colors"
                        >
                            ← Zurück zur App
                        </Link>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
