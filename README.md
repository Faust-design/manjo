# manjo
Gemeinsame Einkaufslisten mit automatischer Zuordnung zu den Stationen im Laden, Kassenzettel-Erkennung und geteilten Ausgaben.

Statische Web-App (GitHub Pages) mit Supabase als Datenbank. Einrichtung: siehe [ANLEITUNG.md](ANLEITUNG.md).

## Aufbau
- `index.html`, `styles.css`, `app.js`: Oberfläche und Datenabgleich
- `lib/`: reine Funktionen (Zuordnung, Ziehen, Kassenzettel, Saldo, Mengen), getestet
- `schema*.sql`: Datenbank, nacheinander einmal in Supabase ausführen
- `tests/`: `npm test` führt Unit-Tests und einen Ablauftest der App aus; GitHub führt sie bei jedem Hochladen aus
