# Allgemeines Design System fuer Web-Projekte

Dieses Dokument definiert visuelle und interaktive Standards fuer aktuelle und kuenftige Web-Projekte. Es ist bewusst technologie- und projektunabhaengig formuliert und kann in beliebige Stacks (z. B. Tailwind, CSS Modules, Styled Components) uebernommen werden.

---

## 1. Markenprinzipien

| Aspekt | Richtung |
|--------|----------|
| **Stimmung** | Klar, professionell, technisch-praezise; hoher Kontrast mit gezieltem Akzent |
| **Typografie** | **Gotham** als Standardfamilie in klaren Rollen (Book / Medium / Bold) |
| **Layout** | Viel Weissraum, klare Hierarchie, konsistente Abstaende, weiche Card-Radien |
| **Sprache UI** | Sachlich und knapp; Ueberschriften koennen mit Grossbuchstaben und Tracking arbeiten |

---

## 2. Farben

### 2.1 Kernpalette (Design-Tokens)

| Token | Hex | Verwendung |
|-------|-----|------------|
| `color-black` | `#0A0A0A` | Primaertext, dunkle Flaechen, starke Kontraste |
| `color-white` | `#FFFFFF` | Seitenhintergruende, Karten, Gegenflaechen |
| `color-accent` | `#DEB887` | Highlights, CTA, Fokus-Verstaerkung, visuelle Priorisierung |

### 2.2 Graustufen

| Token | Hex | Typische Nutzung |
|-------|-----|------------------|
| `gray-900` | `#222222` | Dunkler UI-Text auf hellen Flaechen |
| `gray-800` | `#333333` | Standardtext mit hoher Lesbarkeit |
| `gray-700` | `#555555` | Sekundaerer Inhalt |
| `gray-600` | `#777777` | Metadaten / schwache Betonung |
| `gray-500` | `#999999` | Hilfstexte, Beschreibungen |
| `gray-400` | `#BBBBBB` | Platzhalter, dezente Links |
| `gray-300` | `#DDDDDD` | Icons in Ruhelage |
| `gray-200` | `#EEEEEE` | Border, Divider, neutrale Tracks |
| `gray-100` | `#F5F5F5` | Leichte Flaechen |
| `gray-50` | `#FAFAFA` | Sehr helle Seitenhintergruende |

### 2.3 Farbregeln

- Selektion: Akzent-Hintergrund mit schwarzem Text.
- Fokus: immer sichtbar; mind. 2px Outline plus Offset.
- Akzentfarbe sparsam einsetzen: nur fuer klare Prioritaet (CTA, Status mit Handlungsbedarf, aktive Elemente).

---

## 3. Typografie (Gotham Standard)

### 3.1 Schriftsystem

| Rolle | Familie | Einsatz |
|-------|---------|---------|
| **Headline** | Gotham Bold | Ueberschriften, Kapitel, starke visuelle Einstiegspunkte |
| **Highlight Inline** | Gotham Medium | Hervorhebungen innerhalb von Fliesstext |
| **Body** | Gotham Book | Fliesstexte, Formulare, Beschreibungen |

### 3.2 Feste Groessen-Hierarchie (Desktop-Basis)

| Kontext | Groesse |
|---------|---------|
| **Ueberschriften / Kapitel** | **50** |
| **Zahlen- / Index-Headlines** (z. B. `2.4.`) | **45** |
| **Split-Layout Headlines** | **40** |
| **Fliesstext** | **11** |

### 3.3 Typo-Regeln

- Ueberschriften: Gotham Bold, hohe visuelle Dominanz, enge Laufweite (`tracking-tight` aehnlich).
- Fliesstext: Gotham Book, ruhiges Zeilenbild, ausreichend Zeilenabstand.
- Inline-Highlights im Text: Gotham Medium statt Farbe als einzige Hervorhebung.
- Die vier Basiswerte (50/45/40/11) sind die Referenz und duerfen responsiv skaliert werden.

### 3.4 Responsive Leitplanken

- Tablet/Mobile duerfen proportional verkleinern, Hierarchie bleibt jedoch erhalten (50 > 45 > 40 > 11).
- Empfohlen: skalierte Typo per Breakpoints oder `clamp()`, ohne die Rollen zu mischen.
- Mindestlesbarkeit fuer Body-Text immer sicherstellen.

---

## 4. Abstaende, Raster und Layout

- Layouts arbeiten mit klaren Content-Breiten (schmal, mittel, breit) statt beliebigen Max-Widths.
- Vertikale Rhythmen konsistent halten (z. B. 4/8/12/16/24/32 als Spacing-Skala).
- Cards und Inhaltsbloecke mit ausreichend Innenabstand fuellen.
- Vollflaechige Bereiche sollten die Viewport-Hoehe sinnvoll nutzen.

---

## 5. Komponenten und Oberflaechen

| Element | Standard |
|---------|----------|
| **Cards** | Heller Hintergrund, weiche Ecken, dezente Border, leichter Shadow |
| **Interaktive Zeilen/Karten** | Sichtbarer Hover-State, sanfte Transition, klare aktive Auswahl |
| **Primaer-Button** | Dunkle Flaeche, kontrastreicher Text, deutliche Priorisierung |
| **Sekundaer-Button** | Neutrale Border-Variante, ruhiger Hover-Hintergrund |
| **CTA-Element** | Akzentflaeche, starke Lesbarkeit, klare Hover-/Active-Rueckmeldung |
| **Input-Felder** | Deutliche Border, ruhiger Hintergrund, klarer Fokuszustand |
| **Modal-Overlay** | Abgedunkelter Hintergrund, fokussiertes Vordergrund-Panel |
| **Progress** | Neutraler Track plus kontrastreiche Fortschrittsflaeche |

---

## 6. Hintergruende und Texturen

- Basisflaechen bevorzugt ruhig und hell halten.
- Dunkle Vollflaechen gezielt fuer Hero-/Buehnenbereiche nutzen.
- Subtile Texturen/Raster nur dann einsetzen, wenn sie die Lesbarkeit nicht beeintraechtigen.

---

## 7. Bewegung und Interaktion

- Animationen kurz und funktional halten; sie duerfen Orientierung verbessern, nicht ablenken.
- Standard-Effekte: Fade-In, Slide-In, Scale-In.
- Uebergaenge fuer Farben, Schatten und Transform konsistent definieren.
- Stagger-Effekte nur bei Listen/Sequenzen mit echtem Mehrwert nutzen.

---

## 8. Icons

- Outline-Stil mit konsistenter Linienstaerke.
- Runde Kanten (`linecap`, `linejoin`) fuer ein ruhiges Gesamtbild.
- Farbe standardmaessig ueber Textfarbe ableiten (`currentColor`-Prinzip).

---

## 9. Barrierefreiheit

- Fokusindikator auf allen interaktiven Elementen immer sichtbar.
- Kontrastverhaeltnisse fuer Text und UI-States einhalten.
- Klick-/Touch-Flaechen gross genug auslegen.
- Semantische Labels und ARIA nur dort ergaenzen, wo native Semantik nicht reicht.

---

## 10. Technische Umsetzung (Framework-neutral)

Dieses Design System kann als Design-Token-Set umgesetzt werden, z. B. als:

- CSS-Variablen (empfohlen als Quelle der Wahrheit),
- Theme-Objekt in einem UI-Framework,
- Utility-Klassen in einem CSS-Toolkit.

Wichtig ist nicht das konkrete Tooling, sondern die konsistente Anwendung der Token, Typo-Rollen und Interaktionsmuster.

---

## 11. Pflege und Versionierung

- Aenderungen an Farben, Typografie oder Komponenten zuerst in den Design-Tokens pflegen.
- Danach Dokumentation und UI-Komponenten synchron aktualisieren.
- Neue Web-Projekte uebernehmen dieses Dokument als Baseline und dokumentieren nur begruendete projektspezifische Abweichungen separat.
