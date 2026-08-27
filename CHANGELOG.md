# Changelog

## 1.0.0-rc3 — 2026-08-27

- Nuovo comando `scr` (Scala stile AutoCAD) agganciato all'icona Scala della
  palette: punto base, poi fattore diretto (`2`, `0,5`, anche con virgola)
  oppure `R` e Invio per il modo riferimento (due estremi di una distanza
  nota e la lunghezza finale, digitata nella riga comandi). Scala attorno al
  punto base, annullabile, con instradamento dei tasti dal disegno come per
  la linea. Base della palette riallineata alla versione installata del
  25/08 (fix ORTO/snap-lock) che non era mai rientrata nel repo.
- Installazione multi-piattaforma: `installa.sh`, `ripristina.sh` e
  `verifica.sh` coprono Linux e macOS (rilevamento automatico dei percorsi),
  nuovo `installa_windows.ps1` con `-Verifica` e `-Ripristina` integrate.
  I vecchi nomi `*_linux.sh` sono sostituiti.
- Ripristinato il fallback delle icone per le build Linux (riserva SVG di
  gruppo quando la risorsa nativa QCAD manca), perso nel riallineamento.
- Rimossi `StudioCadMode.js`, `StudioCadOrtho.js` e `StudioCadFree.js`:
  la gestione ORTO/LIBERO vive ora dentro `StudioCadUI.js` (snap-lock via
  API documento) e i tre file non erano piu' referenziati.

## 1.0.0-rc2 — 2026-08-26

- Riuniti palette Studio CAD, profilo iniziale e strumenti DOCFA.
- Aggiunti linea continua con distanza diretta, focus numerico, ORTO
  persistente, LIBERO e OSNAP diretti.
- Corretto il caricamento delle icone su Linux: `QIcon` riceve direttamente il
  percorso e usa SVG locali quando una risorsa nativa QCAD non è disponibile.
- Aggiunti installer, ripristino e verifica non distruttiva per Linux.
- Gestita anche una configurazione QCAD con lista `[AddOns]` inizialmente vuota.
- Aggiornate le istruzioni di installazione e la guida dei comandi.

## 0.1.0 — 2026-08-24

- Prima pubblicazione dell'add-on QCAD Studio DOCFA.
- Polilinee classificate su `Docfa_Poligoni` con colori DXF 1-8.
- Pre-controllo di unità, layer, chiusura, colori e aree geometriche.
- Sei cornici aperte A4/A3 alle scale 1:100, 1:200 e 1:500, con sostituzione
  sicura della sola cornice gestita.
