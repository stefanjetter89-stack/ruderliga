Hinweis vorab: ruderliga-mockup.html liegt bereits im Projektordner als visuelle Referenz. gh CLI ist installiert und eingeloggt (gh auth status funktioniert) — GitHub-Repo bitte automatisch anlegen. Für Supabase gibt es keine CLI/Auth, das lege ich manuell an, wenn du an der Stelle bist — bitte dort kurz pausieren und mir sagen, was ich brauche.

# Projekt: Ruderliga – Trainings-Rangliste für Domyos Woodrower

## Kontext
Zwei (später ggf. mehr) Nutzer trainieren am selben Rudergerät-Modell (Domyos Woodrower) an unterschiedlichen Standorten. Sie tragen nach jeder Trainingseinheit die Werte vom Gerätedisplay manuell ein. Daraus entsteht eine gemeinsame Rangliste zum Vergleichen und Motivieren.

Architektur-Vorbild (nur Muster, nicht Infrastruktur): das "Kosmos"-Gruppencode-System aus meinem Projekt "Abendbrett" (stefanjetter89-stack/abendbrett) – gleiches Prinzip für geräteübergreifenden Shared State, hier als "Crew-Code" umbenannt.

## Tech-Stack
- React 18 + Vite
- Supabase (Postgres + JS-Client) — eigenständiges, neues Supabase-Projekt, komplett unabhängig von der Abendbrett-Instanz
- Deployment: GitHub Pages via GitHub Actions
- Repo: stefanjetter89-stack/ruderliga

## Datenmodell (Supabase)

Tabelle `crews`:
- id (uuid, pk, default gen_random_uuid())
- code_hash (text, unique) – SHA-256 + Salt, gleiches Verfahren wie Abendbrett/Kosmos
- name (text, nullable)
- created_at (timestamptz, default now())

Tabelle `members`:
- id (uuid, pk)
- crew_id (uuid, fk → crews, on delete cascade)
- display_name (text)
- created_at (timestamptz)
- unique (crew_id, display_name)

Tabelle `sessions`:
- id (uuid, pk)
- crew_id (uuid, fk)
- member_id (uuid, fk) — kommt aus dem Crew-Beitritt, wird NICHT pro Eintrag abgefragt
- session_date (date)
- duration_seconds (int)
- distance_m (int)
- total_strokes (int, nullable)
- avg_spm (numeric, nullable)
- pace_per_500m_seconds (numeric, nullable) — clientseitig aus duration_seconds/distance_m*500 vorberechnet, aber ein normaler (kein generierter) Spalten-Typ, damit der Wert vor dem Speichern überschrieben werden kann, falls das Gerät abweicht
- resistance_level (int 1-15, nullable)
- created_at (timestamptz)

Bewusst KEIN calories-Feld, KEIN avg_heart_rate-Feld, KEIN Notizfeld, KEIN Foto-Upload. Kalorien/Puls sind zwischen zwei unterschiedlichen Personen nicht fair vergleichbar (abhängig von Gewicht/Fitnesslevel) und daher weder in der Erfassung noch in der Rangliste enthalten. Kein Feature-Creep über dieses Minimum hinaus.

RLS: Analog Kosmos-Modell aus Abendbrett — Zugriffsschutz über die Unratenbarkeit des Crew-Codes (Client prüft code_hash beim Beitritt), nicht über Supabase Auth. Policies erlauben Read/Write, sobald crew_id bekannt ist.

## Identität
Beim Crew-Beitritt wird der Name einmalig festgelegt und lokal auf dem Gerät gemerkt (analog Kosmos "Bist du das?"-Check aus Abendbrett). Kein Auswahlfeld "Wer" im Eintragsformular — jeder Eintrag hängt automatisch am angemeldeten Mitglied. Identitätswechsel nur explizit über Einstellungen, nicht pro Eintrag.

## Kernfunktionen
1. Crew erstellen / beitreten via Code (Kosmos-Flow: Code eingeben → Namen wählen/erkennen → Kollisionsschutz bei Namensdopplung)
2. Trainingseintrag erfassen: Datum, Dauer (mm:ss), Distanz, Ruderschläge gesamt, SPM. Zeit/500m live vorberechnet und anzeigbar, vor dem Speichern editierbar. Widerstandsstufe optional.
3. Rangliste mit umschaltbaren Kategorien (nur faire Vergleichswerte):
   - Bestzeit /500m (schnellster Einzelwert, aufsteigend sortiert)
   - Gesamtdistanz (kumulativ über gewählten Zeitraum)
   - Trainingsfrequenz (Sessions in den letzten 7 / 30 Tagen)
   Zeitraum-Filter: Alle-Zeit / Dieser Monat / Diese Woche
4. Persönliche Bestwerte pro Mitglied automatisch erkennen und markieren (Badge "Neuer PB" beim Eintragen, analog dem Toast im Mockup)
5. Verlauf/Historie mit Bearbeiten/Löschen (zweistufige Löschbestätigung wie in Abendbrett; die K1/K2 Data-Loss-Patterns aus dem Abendbrett-Review sind von Anfang an zu vermeiden: kein Schreiben vor bestätigtem Laden, Konflikt-Merge statt Overwrite)

## Design-Richtung
Material des echten Geräts als Ausgangspunkt: Eiche-Holz + Wasser/Rudern. Dunkler Wasser-Ton als Hintergrund (#0e1a1c), Eichen-Amber (#c9873f) und Aqua (#3fcfc0) als Akzentfarben. Hero-Element: digitales Display im Stil des echten Woodrower-TFT-Bildschirms, zeigt die aktuelle Bestzeit/500m der Crew. Plus Jakarta Sans für Body-Text, Space Grotesk (tabular nums) für Zahlen/Zeiten. Versionsnummer sichtbar im Header. Als visuelle Referenz dient das bereits im Projektordner liegende Mockup (ruderliga-mockup.html) — gleiche Tokens, gleiche Komponentenstruktur, nur produktionsreif in React umgesetzt.

## Setup & Deployment (bitte in dieser Reihenfolge ausführen)

### A — Projekt initialisieren

```bash
npm create vite@latest ruderliga -- --template react
cd ruderliga
npm install @supabase/supabase-js
```

### B — Supabase-Client & Schema vorbereiten

Lege `supabase/schema.sql` mit dem vollständigen Schema (Tabellen + RLS Policies, siehe Datenmodell oben) im Repo ab, damit es dokumentiert und wiederholbar ist. Lege `src/lib/supabase.js` an, das die Umgebungsvariablen `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` liest. Lege `.env.local.example` mit Platzhaltern an und trage `.env.local` in `.gitignore` ein.

Es gibt keine Supabase-CLI/Auth verfügbar — das Supabase-Projekt lege ich manuell im Dashboard an. Halte den Code trotzdem vollständig fertig, nur eben ohne aktive Verbindung bis ich die echten Keys eintrage. Pausiere an dieser Stelle kurz und sag mir genau, welches SQL ich wohin kopieren muss und welche zwei Werte du danach von mir brauchst.

### C — Git & GitHub-Repo

```bash
git init
git add -A
git commit -m "Initial commit: Ruderliga MVP"
gh auth status
```

gh ist installiert und eingeloggt — lege das Repo automatisch an:

```bash
gh repo create stefanjetter89-stack/ruderliga --public --source=. --remote=origin --push
```

### D — GitHub Actions Workflow

Lege `.github/workflows/deploy.yml` an (Build bei Push auf main, Deploy via `actions/deploy-pages`). Der Build-Step braucht `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` als GitHub Secrets — wenn ich dir die Werte im Gespräch gebe, setze sie direkt per `gh secret set`.

Stelle GitHub Pages auf "Source: GitHub Actions":

```bash
gh api -X PUT repos/stefanjetter89-stack/ruderliga/pages -f build_type=workflow
```

Falls das fehlschlägt, probiere `-X POST` statt `-X PUT`.

Setze `base: '/ruderliga/'` in `vite.config.js`, da es ein Projekt-Repo (kein *.github.io-Root-Repo) ist.

## Nicht-Ziele (bewusst außerhalb MVP-Scope)
- Keine automatische Geräte-Anbindung (Bluetooth/Kinomap-Import) – manuelle Eingabe ist bewusst gewählt
- Kein Auth über Supabase Auth – Crew-Code-Modell reicht
- Keine Trainingspläne/Coaching-Funktionen, keine Notizen, keine Fotos, keine Kalorien/Puls-Erfassung
