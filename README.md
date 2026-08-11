# Ruderliga

Gemeinsame Trainings-Rangliste für zwei (oder mehr) Leute am **Domyos Woodrower**.
Werte werden nach jeder Einheit vom Gerätedisplay abgetippt; daraus entsteht eine
Rangliste zum Vergleichen und Motivieren.

**Live:** https://stefanjetter89-stack.github.io/ruderliga/

---

## Wie der Zugriffsschutz funktioniert

Es gibt keinen Login. Die einzige Zugangsberechtigung ist der **Crew-Code**.

- Der Code wird clientseitig mit SHA-256 gehasht; nur der Hash erreicht die Datenbank.
- Die Tabellen haben RLS aktiviert und **keine Policies** — über die REST-API sind
  sie damit vollständig geschlossen.
- Jeder Zugriff läuft über `security definer`-Funktionen, die bei jedem Aufruf den
  Code-Hash entgegennehmen und die Crew daraus auflösen. Ohne gültigen Code gibt es
  keine Zeilen — auch nicht mit dem öffentlichen anon-Key.
- Eine `crew_id` allein ist deshalb wertlos: Raten oder Erbeuten einer UUID bringt
  ohne den zugehörigen Code nichts.

Der Code hat ~49 Bit Entropie (10 Zeichen aus einem 30er-Alphabet, aus dem CSPRNG),
ist also nicht durchprobierbar. **Er ist nicht wiederherstellbar** — geht er auf
allen Geräten verloren, ist die Crew nicht mehr erreichbar. Deshalb wird er lokal
gespeichert und ist jederzeit unter *Einstellungen* einsehbar.

Der anon-Key im Bundle ist übrigens **kein Geheimnis** und muss nicht rotiert werden:
Bei Supabase identifiziert er nur das Projekt. Die Schutzschicht ist das Schema.

## Setup

```bash
npm install
cp .env.local.example .env.local   # eigene Supabase-Werte eintragen
npm run dev
```

Für ein frisches Supabase-Projekt: den Inhalt von [`supabase/schema.sql`](supabase/schema.sql)
im SQL-Editor ausführen. Eine bestehende Datenbank wird stattdessen mit den Dateien in
[`supabase/migrations/`](supabase/migrations/) der Reihe nach aktualisiert — `001_lockdown.sql`
(RLS-Abriegelung, falls noch nicht angewendet), dann `002_watts.sql` (Leistung in Watt statt
Ruderschläge/Widerstandsstufe).

Benötigte Umgebungsvariablen (lokal in `.env.local`, in CI als GitHub Secrets):

| Variable | Woher |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | ebenda → `anon` / `public` key (**nicht** `service_role`) |

## Kommandos

```bash
npm run dev        # Dev-Server
npm run build      # Typecheck + Produktions-Build
npm run typecheck  # nur tsc
npm run lint       # oxlint
npm test           # Vitest (Kernlogik)
```

## Architektur

```
src/
  lib/
    api.ts          Datenschicht — ausschließlich RPC-Aufrufe, typisiert
    crewCode.ts     Code-Erzeugung (CSPRNG) und Hashing
    validation.ts   Zod-Schemata, spiegeln die CHECK-Constraints der DB
    leaderboard.ts  Ranglisten-Logik als reine Funktionen (testbar ohne React)
    format.ts       Dauer/Pace/Datum — lokale Zeitzone, kein UTC-Versatz
  hooks/            Datenhaltung, Ladezustände, Identität
  components/       UI, nah am Mockup (ruderliga-mockup.html)
supabase/
  schema.sql        vollständiges Schema für ein neues Projekt
  migrations/       Änderungen für bestehende Datenbanken
```

Ein paar Entscheidungen, die nicht aus dem Code hervorgehen:

- **Identität statt Auswahlfeld.** Wer eintragt, wird beim Crew-Beitritt einmalig
  festgelegt und lokal gemerkt. Kein „Wer war das?"-Dropdown pro Eintrag; ein Wechsel
  passiert nur bewusst über die Einstellungen.
- **Keine Kalorien, kein Puls.** Beides hängt an Gewicht und Fitnesslevel und ist
  zwischen zwei Personen nicht fair vergleichbar — es würde die leichtere Person
  bei gleicher Anstrengung bevorteilen. Deshalb weder erfasst noch gewertet.
- **Zeit/500 m ist überschreibbar.** Der Wert wird aus Dauer und Distanz berechnet,
  lässt sich vor dem Speichern aber korrigieren, falls das Gerätedisplay abweicht.
- **Schreiben erst nach bestätigtem Laden.** Das Eintragsformular bleibt gesperrt,
  bis die Daten der Crew geladen sind, damit ein Schreibvorgang nie einem
  unvollständigen Stand vorauseilt.
- **Bearbeiten ist ein atomares Update.** Anlegen und Bearbeiten fragen dieselben
  Felder ab (Datum, Dauer, Distanz, Leistung, Schlagfrequenz) und `update_session`
  schreibt sie in einem einzigen Statement — kein Read-Modify-Write.

### Bekannte Grenzen

- Kein Echtzeit-Abgleich: Einträge des anderen Geräts erscheinen beim
  Fenster-Fokus, nicht sofort.
- Wer die Mitgliedschaft in einer Crew hat, kann jeden Eintrag dieser Crew sehen;
  bearbeiten und löschen darf man nur die eigenen.

## Deployment

Push auf `main` → GitHub Actions baut und veröffentlicht auf GitHub Pages.
Die beiden `VITE_*`-Werte müssen als Repository-Secrets hinterlegt sein.

## Nicht-Ziele

Keine Geräte-Anbindung (Bluetooth/Kinomap), kein Supabase Auth, keine Trainingspläne,
keine Notizen, keine Fotos, keine Kalorien-/Pulserfassung.
