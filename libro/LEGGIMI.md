# Trattato del gin compound (ePub)

Strumenti per generare l'ePub del trattato a partire dai dati di GinBuilder.

1. `node export.js` (dalla cartella `libro`, con `jsdom` installato) legge `../index.html` e scrive `dati.json`.
2. `python3 build.py Trattato.epub` costruisce l'ePub con `libro.css` e `libro.js`.

Le parti interattive (confronti sotto i radar, filtri della matrice) richiedono un lettore che esegua JavaScript, come Kotobee Reader.
