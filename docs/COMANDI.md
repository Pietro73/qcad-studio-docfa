# Comandi QCAD Studio CAD + DOCFA

I comandi si digitano con il puntatore nell'area di disegno. QCAD accetta gli
alias senza distinzione fra maiuscole e minuscole.

## Disegno

| Alias | Comando |
|---|---|
| `L` | Linea continua stile CAD: segmenti `LINE` separati, distanza diretta, virgola decimale e uscita con clic destro |
| `PL` | Polilinea |
| `RE` | Rettangolo |
| `CR` | Cerchio centro-raggio |
| `A3` | Arco per tre punti |
| `HA` | Tratteggio da selezione |
| `TE` | Testo |
| `DA` | Quota allineata |

### Linea con distanza diretta

1. Digita `L` e premi Invio.
2. Indica il primo punto.
3. Con ORTO attivo orienta il mouse a destra, sinistra, sopra o sotto.
4. Digita subito la distanza (`3`, `5`, `3,15`) e premi Invio.
5. Continua dal nuovo vertice; ogni tratto resta una linea autonoma.
6. Un clic destro termina il comando.

## Modifica

| Alias | Comando |
|---|---|
| `MV` | Sposta, eliminando l'originale senza finestra copie |
| `CO` | Copia, mantenendo l'originale |
| `RO` | Ruota intorno al punto indicato |
| `SZ` | Scala, anche per riferimento |
| `MI` | Specchia |
| `OF` | Offset |
| `TR` | Taglia / estendi |
| `TM` | Taglia entrambe |
| `SS` | Stira |
| `CH` | Cimatura; valore iniziale impostato a `0` |
| `RN` | Raccordo |
| `XP` | Esplodi |
| `ER` | Cancella |
| `LE` | Allunga / accorcia |

Quando un comando espone un campo numerico nella barra delle opzioni, la prima
cifra digitata sul disegno vi entra direttamente e sostituisce il valore
predefinito. Per esempio `OF` invia la digitazione al campo **Distanza**.

## Vista

| Alias | Comando |
|---|---|
| `ZA`, `ZE`, `ZO`, `Z0` | Zoom ottimizza / estensioni |
| `ZW` | Zoom finestra |
| `ZP` | Panoramica |
| `ZV` | Vista precedente |
| `GR` | Mostra / nasconde la griglia |

## ORTO, LIBERO e OSNAP

| Alias | Modalità |
|---|---|
| `EO` | Attiva ORTO persistente; resta attivo tra i segmenti finché non viene disattivato |
| `EN` | Passa a LIBERO e attiva lo snap libero |
| `SA` | OSNAP automatico |
| `SE` | Estremità |
| `SM` | Punto medio |
| `SNAPCENTER` | Centro |
| `SI` | Intersezione |
| `ST` | Punto più vicino sull'entità |
| `SU` | Perpendicolare |
| `SB` | Tangente |
| `SR` | Riferimento |

L'icona ORTO o LIBERO rimane evidenziata in palette per mostrare lo stato
effettivo del documento.

## DOCFA

| Alias | Funzione |
|---|---|
| `DCHK` | Pre-controllo locale di unità, layer, chiusura, colori e aree |
| `DCORN`, `DCORNICE` | Inserisce una cornice A4/A3 alla scala scelta |
| `DGUIDA` | Mostra la guida alle categorie |
| `DPOL`, `DPL` | Crea una polilinea classificata sul layer `Docfa_Poligoni` |

Nella palette sono disponibili pulsanti diretti per A/A1, A2, B, C, D, E, F
e G. Questi strumenti non sostituiscono i controlli e l'invio della procedura
DOCFA ufficiale.

## Impostazioni iniziali

Il modulo `StudioDefaults` imposta per le nuove sessioni:

- unità del disegno in metri;
- salvataggio predefinito DXF R15 / 2000-LT2000;
- cimatura con lunghezze iniziali `0` e `0`;
- sposta, ruota, specchia e trasla+ruota senza finestra copie e con rimozione
  dell'originale;
- scala senza finestra e fattore indicato dal mouse;
- colore trasparente per lo zero relativo.
