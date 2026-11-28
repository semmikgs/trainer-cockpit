# MTV Schwarmstedt – Trainer-Cockpit

Persönlicher Bereich für die mJD: Landing Page mit nuLiga-Infos, Erinnerungen, ToDo, Übungsleiter-Abrechnung und Kadertool.

- **Seite:** https://semmikgs.github.io/trainer-cockpit/
- **Daten:** Supabase-Projekt „Handball“ (Tabelle `user_docs`, Row-Level-Security: jeder sieht nur seine eigenen Daten)
- **Einrichtung:** `supabase/setup.sql` einmal im Supabase SQL-Editor ausführen
- **nuLiga-Daten:** kommen aus `semmikgs/public` (`mtv/daten.json`)
- **Allgemeine Werkzeuge** (Trainingsplanung, Taktikboard) liegen in `semmikgs/handball-djugend`

| Ordner | Inhalt |
|---|---|
| `/` | Cockpit |
| `abrechnung/` | Übungsleiter-Abrechnung, PDF-Export füllt `abrechnung/vorlage.pdf` (Original-Formular) |
| `kader/` | Kadertool: Kader, Aufstellung, Wechselplan, Bewertung, Spielnoten (Cloud-Dokument `kader`) |
| `wurf/` | Wurfmessung per iPad-Kamera: Grundmodus + zuschaltbar Werfer, letzte Würfe, Bestenliste, Wurfart/Hand/Pass, Zeitlupe, Ansage, Challenge (Cloud-Dokument `wurf`, Top 3 je Spieler erscheinen im Kadertool) |
| `technik/` | Wurftechnik: Videoanalyse der Wurfarten (zuerst Sprungwurf) mit Vorlage nach Lehrmeinung, Spieler aus dem Kadertool, Entwicklung je Spieler (Cloud-Dokument `technik`, Score erscheint im Kadertool); offline über `technik/sw.js` |
| `shared/cloud.js` | Login + Cloud-Speicher (mit Offline-Kopie) |
| `shared/kalender.js` | Ferien & Feiertage Niedersachsen (bis Sommer 2028 – danach ergänzen) |
| `.github/workflows/supabase-ping.yml` | hält das Free-Projekt aktiv |
