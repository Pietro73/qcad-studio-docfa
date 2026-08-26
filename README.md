# QCAD Studio CAD + DOCFA

Add-on locale per **QCAD Professional** che riunisce:

- una palette verticale a comandi diretti, leggibile con il tema scuro;
- comandi e modalità operative più vicini al flusso AutoCAD;
- ORTO persistente, LIBERO e accesso diretto agli OSNAP;
- strumenti grafici preliminari per DOCFA;
- impostazioni iniziali dello Studio per nuovi disegni.

Il progetto è ECMAScript/QtScript, non usa servizi cloud e non contiene dati o
configurazioni personali. Le icone Autodesk non sono incluse: quelle proprie
del plugin sono originali; per i comandi QCAD viene usata l'icona nativa con un
SVG locale di riserva. In questo modo la palette non resta vuota se una build
Linux espone risorse grafiche diverse.

> Il progetto non è affiliato a RibbonSoft/QCAD, Autodesk o Agenzia delle
> Entrate. Gli strumenti DOCFA svolgono preparazione e pre-controllo grafico:
> non validano, firmano o inviano pratiche.

## Funzioni principali

| Area | Funzioni |
|---|---|
| Disegno | Linea continua stile CAD, polilinea, rettangolo, cerchio, arco, tratteggio, testo e quote |
| Modifica | Sposta, copia, ruota, scala, specchia, offset, taglia, stira, cimatura, raccordo, esplodi e cancella |
| Vista | Zoom ottimizza, finestra, pan, vista precedente e griglia |
| Precisione | ORTO persistente, LIBERO e OSNAP Auto/estremità/medio/centro/intersezione/entità/perpendicolare/tangente/riferimento |
| DOCFA | Controllo poligoni, cornici A4/A3, guida e poligoni classificati A/A2/B/C/D/E/F/G |

Il comando `L` crea segmenti `LINE` consecutivi e separati. Dopo il primo
punto, orienta il mouse e digita direttamente una distanza, anche con virgola
(`3,15`), senza fare clic nella riga comando. Invio crea il tratto e mantiene il
comando attivo; il clic destro termina.

La digitazione sul disegno viene instradata anche al primo campo numerico
visibile dei comandi che attendono un valore, ad esempio **Distanza** di Offset.

## Installazione rapida su Linux

1. Scarica lo ZIP dell'ultima release e decomprimilo.
2. Chiudi completamente QCAD.
3. Nel terminale, dalla cartella decompressa, esegui:

   ```bash
   chmod +x installa_linux.sh ripristina_linux.sh verifica_linux.sh
   ./installa_linux.sh
   ./verifica_linux.sh
   ```

4. Avvia QCAD una volta con `-rescan`, quindi usalo normalmente:

   ```bash
   /percorso/della/tua/installazione/qcad -rescan
   ```

L'installer usa per impostazione predefinita
`~/.local/share/QCAD/QCAD`, salva un backup datato e modifica soltanto la lista
degli add-on e i tre moduli `StudioDefaults`, `StudioCadUI` e `StudioDocfa`.

Se QCAD usa percorsi non standard, apri la **Shell ECMAScript** di QCAD e
stampa:

```js
print(RSettings.getDataLocation());
print(RSettings.getPath());
```

Poi ripeti l'installazione indicando esattamente i due valori:

```bash
./installa_linux.sh \
  --data-dir /percorso/restituito/getDataLocation \
  --config-file /percorso/restituito/getPath
./verifica_linux.sh \
  --data-dir /percorso/restituito/getDataLocation \
  --config-file /percorso/restituito/getPath
```

La procedura completa e il ripristino sono in
[docs/INSTALLAZIONE_LINUX.md](docs/INSTALLAZIONE_LINUX.md).

## Installazione manuale su macOS, Linux o Windows

Con QCAD chiuso, copia queste tre cartelle:

```text
scripts/Misc/StudioDefaults
scripts/Misc/StudioCadUI
scripts/Misc/StudioDocfa
```

nella cartella `scripts/Misc` sotto il valore restituito da
`RSettings.getDataLocation()`. Conserva la struttura e riavvia QCAD con
`-rescan`. Non copiare i file nel bundle dell'applicazione se è disponibile la
cartella dati utente.

## Comandi e uso

La tabella completa è in [docs/COMANDI.md](docs/COMANDI.md). I comandi più usati
sono:

| Comando | Azione |
|---|---|
| `L` | Linea continua stile CAD con distanza digitata sul disegno |
| `EO` | ORTO persistente |
| `EN` | LIBERO (`EN` + snap libero) |
| `ZA`, `ZE`, `ZO` | Zoom ottimizza |
| `MV`, `CO`, `RO`, `SZ`, `OF` | Sposta, copia, ruota, scala, offset |
| `DCORN` | Inserisce una cornice DOCFA |
| `DPOL` | Avvia un poligono DOCFA classificato |
| `DCHK` | Pre-controllo grafico locale |
| `DGUIDA` | Guida alle categorie DOCFA |

## Verifica dopo l'installazione

`./verifica_linux.sh` controlla in modo non distruttivo che tutti gli script e
gli SVG portabili siano presenti e leggibili. Dopo il riavvio di QCAD verifica
anche visivamente:

1. palette **Studio CAD** agganciata a sinistra;
2. icone visibili nei gruppi Disegna, Modifica, Vista, ORTO/OSNAP e DOCFA;
3. sequenza `L` → primo punto → direzione mouse → `3` → Invio;
4. ORTO che resta attivo finché non premi LIBERO.

QCAD può mantenere in cache gli script: dopo un aggiornamento chiudilo del
tutto e avvialo con `-rescan`; durante lo sviluppo è utile anche
`-always-load-scripts`.

## Sviluppo e test

```bash
node --test tests/*.js
bash tests/test_linux_installer.sh
bash -n installa_linux.sh ripristina_linux.sh verifica_linux.sh
```

Le sei cornici incluse sono semplici riquadri creati per il progetto e non
modelli ufficiali dell'Agenzia delle Entrate. Si rigenerano con
`tools/generate_frames.py` dopo aver installato `requirements-dev.txt`.

## Licenza

Codice, documentazione, icone originali e cornici del repository sono
distribuiti con licenza [MIT](LICENSE). Marchi, software e procedure citati
restano dei rispettivi titolari.
