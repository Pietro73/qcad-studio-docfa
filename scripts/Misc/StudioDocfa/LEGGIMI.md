# DOCFA Studio per QCAD Pro

Add-on ECMAScript locale per QCAD Professional, installato nella cartella dati
utente di QCAD. Non modifica l'app QCAD e non richiede componenti esterni.

Comandi:

- `DCORN` / `DCORNICE` / `docfacornice`: inserisce una delle sei cornici
  modello (`A4` o `A3`, scale 1:100, 1:200, 1:500) nell'origine `0,0` del
  disegno, oppure rimuove la cornice inserita dal modulo. Scegliendo una nuova
  base la precedente viene sostituita senza toccare muri, testi o poligoni;
- `DPOL` / `DPL` / `docfapoligono`: sceglie A/A1, A2, B, C, D, E, F o G,
  imposta il layer `Docfa_Poligoni` e il corrispondente colore DXF 1..8, poi
  avvia la polilinea nativa QCAD;
- `DCHK` / `docfacontrolla`: controlla il layer, la chiusura delle polilinee,
  i colori previsti e riepiloga le aree geometriche per categoria; e' un
  pre-controllo tecnico non certificativo;
- `DGUIDA` / `docfaguida`: mostra la tabella colori/categorie e il flusso.

Le quattro voci appaiono direttamente nel menu **Varie** con prefisso `DOCFA:`.

Le cornici sono risorse incluse nell'add-on (`StudioDocfaCornice/Frames`): il
modulo non dipende dal percorso del disco esterno e puo' essere copiato sul PC
o su Linux insieme alla cartella dell'add-on. Il disegno deve essere in metri;
una cornice gia' presente come entita' sciolte in un vecchio DXF non viene
cancellata automaticamente, per non rischiare di eliminare geometrie manuali.

Il modulo non carica file in DOCFA e non attesta l'accettazione della pratica:
la verifica finale resta nella procedura DOCFA e nella valutazione professionale
del caso concreto.
