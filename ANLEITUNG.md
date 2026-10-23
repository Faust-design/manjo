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
Account → *Personen und Freigaben* → E-Mail-Adresse eintragen und die Märkte anhaken, die die Person sehen darf. Es geht keine Mail raus: Die Person meldet sich mit genau dieser Adresse an (Konto vorher oder nachher anlegen) und sieht dann die freigegebenen Märkte.

## Update: Rechnungen

Einmalig im Supabase-Projekt den Inhalt von `schema_v2.sql` im SQL Editor ausführen. Danach gibt es den Bereich Rechnungen. Die bestehenden Listen bleiben erhalten.

## Update: Kassenzettel fotografieren

Einmalig im Supabase-Projekt den Inhalt von `schema_v3.sql` im SQL Editor ausführen. Danach gibt es unter Rechnungen die Tabs Fotografieren, Saldo und Kategorien. Die Erkennung läuft auf dem Gerät. Beim ersten Foto lädt die App die Erkennung nach, das dauert einen Moment.

## Update: Namen, Ausgleich, keine doppelten Artikel

Einmalig im Supabase-Projekt den Inhalt von `schema_v4.sql` im SQL Editor ausführen. Danach:

- Unter Account trägt jede Person ihren Namen ein. Im Saldo steht dann „Kim → Du“ statt der E-Mail-Adresse.
- Im Saldo gibt es „Ausgleichen“, wenn Geld zurückgezahlt wurde.
- Doppelte Artikel auf einer Liste verhindert die Datenbank. Schon vorhandene Dubletten werden dabei zusammengeführt.

## Bedienung in Kürze

- **Abhaken:** auf den Kreis tippen oder den Artikel nach rechts wischen.
- **Bearbeiten:** auf den Namen tippen. Dort lassen sich Name, Menge und Station ändern.
- **Löschen:** nach links wischen oder im Bearbeiten-Fenster. Ein paar Sekunden lang lässt es sich rückgängig machen.
- **Mengen:** einfach mit eintippen, etwa „3 Bananen“ oder „Milch 2 l“.
- **Einkaufsmodus:** der Knopf „Einkaufen“ hält den Bildschirm an und vergrößert die Zeilen.
- **Ohne Netz:** Artikel und Häkchen werden gespeichert und gesendet, sobald wieder Verbindung besteht.
- **Märkte:** Reihenfolge und Sichtbarkeit der Tabs stellst du unter Märkte ein (gilt pro Gerät).
- **Rechnungen** gelten für alle Märkte zusammen. Mit den Chips filterst du auf einen Markt. Ein Tipp auf eine Ausgabe öffnet sie zum Bearbeiten.

## Update: Glossar und Preisgedächtnis

Einmalig im Supabase-Projekt den Inhalt von `schema_v5.sql` im SQL Editor ausführen. Danach:

- **Glossar** unter Märkte: Ein Begriff wie „Hafermilch“ steht für ein genaues Produkt („NoMilk Hafer 3,5 %“) und einen Markt. Tippt jemand den Begriff in eine Liste, landet er auf der Liste dieses Markts. Mit „Hier lassen“ bleibt er, wo er eingetippt wurde.
- **Preise:** Ein Tipp auf einen Artikel zeigt den letzten Preis je Markt aus euren Kassenzetteln. Ist ein Artikel woanders günstiger, schlägt die App „Verschieben“ vor.

## Update: Allgemeine Liste

Einmalig im Supabase-Projekt den Inhalt von `schema_v6.sql` im SQL Editor ausführen. Danach:

- Unter Märkte → Neuer Markt → **Allgemein** (oder über den Hinweis in einer Liste) legst du die allgemeine Liste an. Sie steht als Tab immer ganz vorn.
- Was dort steht, erscheint in den **Märkten, die es führen**, einsortiert nach deren Route: Lebensmittel nur in Supermärkten, Schrauben im Baumarkt, Spülmittel im Supermarkt und in der Drogerie. Unbekanntes landet im Supermarkt. Die Allgemein-Liste ist nach Stationen sortiert (Obst, Brot, Milch …), und was ihr direkt in einem Markt eintragt, erscheint dort ebenfalls (mit „nur <Markt>“). Ist ein Artikel einem Markt zugeordnet, erscheint er **nur dort**.
- Zugeordnet wird automatisch über das Glossar oder, wenn die Kassenzettel denselben Artikel in mindestens zwei Märkten zeigen und einer mindestens 10 % günstiger ist. Im Artikel lässt sich die Zuordnung jederzeit umstellen („Erscheint in“).
- Abhaken in einem Markt hakt den Artikel auch in der allgemeinen Liste ab. Die allgemeine Liste selbst bleibt vollständig.
