# Gin in provetta (ePub)

Strumenti per generare l'ePub del trattato a partire dai dati di GinBuilder.

1. `node export.js` (dalla cartella `libro`, con `jsdom` installato) legge `../index.html` e scrive `dati.json` con i testi delle pagine e i dati.
2. `python3 build2.py Gin-in-provetta.epub` costruisce il libro completo con `libro.css`, `libro.js` e i testi originali di `testi.py` (introduzione, ridondanze, fonti).

I colori degli SVG sono scritti come attributi, perché Kotobee Reader ignora il CSS applicato agli SVG.
Le parti interattive richiedono un lettore che esegua JavaScript, come Kotobee Reader.

Testi originali del libro in `testi.py`: introduzione, uso, fonti, ridondanze e Appendice D (la decolorazione). Le schede delle botaniche riportano dose, grado alcolico consigliato e limiti presi dagli stessi dati dell'app (`EXT` in `dati.json`, da `export.js`): nessun riferimento fisso a 43°.
