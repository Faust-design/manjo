# manjo einrichten (ca. 10 Minuten)

## 1. Datenbank
1. Supabase Dashboard → dein Projekt → **SQL Editor** → neue Abfrage.
2. Den ganzen Inhalt von `schema.sql` einfügen und **Run** drücken.
   (Falls eine Zeile mit `alter publication` einen Fehler meldet, weil die Tabelle schon drin ist: ignorieren.)

## 2. Anmeldung
- **Authentication → Providers → Email** ist standardmäßig an.
- Zum Ausprobieren kannst du unter *Authentication → Sign In / Providers → Email* „Confirm email“ ausschalten, dann entfällt die Bestätigungsmail.

## 3. Zugangsdaten eintragen
In `config.js` bei `url` und `key` die Werte aus **Project Settings → API** eintragen: Project URL und den `anon public` Key.
Der anon-Key ist öffentlich gedacht. Geschützt sind die Daten durch die Regeln aus `schema.sql`. Den `service_role`-Key niemals eintragen.

## 4. Veröffentlichen
Alle Dateien dieses Ordners in ein GitHub-Repo legen und **GitHub Pages** einschalten (wie bei Penny). Die App läuft dann unter `https://<name>.github.io/<repo>/`.

## 5. Auf dem iPhone installieren
Die Adresse in Safari öffnen → Teilen → **Zum Home-Bildschirm**.

## Einladen
Zahnrad → *Personen* → E-Mail-Adresse der Person eingeben. Sie meldet sich mit genau dieser Adresse an (Konto vorher oder nachher anlegen) und sieht dann nur die Listen, zu denen sie eingeladen ist.

## Update: Rechnungen

Einmalig im Supabase-Projekt den Inhalt von `schema_v2.sql` im SQL Editor ausführen. Danach gibt es den Bereich Rechnungen. Die bestehenden Listen bleiben erhalten.
