# QCAD Studio DOCFA

Add-on ECMAScript per **QCAD Professional 3.32+**, pensato per preparare e
controllare alcuni elementi grafici di una pratica catastale italiana. Funziona
su macOS, Windows e Linux: usa solo gli script standard QCAD e non richiede
servizi cloud o componenti esterni.

> Non è affiliato a RibbonSoft/QCAD né all'Agenzia delle Entrate. Non invia
> pratiche e non garantisce l'accettazione da parte di DOCFA: verifica finale,
> rilievo, tavola raster e responsabilità professionale restano dell'operatore.

## Cosa fa

| Comando | Funzione |
|---|---|
| `DCORN` / `DCORNICE` | Inserisce una cornice A4/A3 a 1:100, 1:200 o 1:500 nell'origine 0,0; una nuova scelta sostituisce solo la cornice creata dall'add-on. |
| `DPOL` / `DPL` | Imposta `Docfa_Poligoni` e il colore DXF della categoria, poi avvia Polilinea QCAD. |
| `DCHK` | Controllo locale di metri, layer, chiusura polilinee, colori e aree geometriche. |
| `DGUIDA` | Tabella categorie/colori e promemoria del flusso. |

Le categorie usano **un solo layer** `Docfa_Poligoni`; il colore DXF assegnato
alla singola polilinea identifica A/A1=1, A2=8, B=2, C=3, D=4, E=5, F=6, G=7.

## Installazione

1. Chiudi QCAD.
2. Copia la cartella `scripts/Misc/StudioDocfa` contenuta nello ZIP nella
   cartella dati di QCAD, conservando la stessa struttura.
3. Riavvia QCAD e usa il menu **Varie**: le quattro azioni compaiono con il
   prefisso `DOCFA:`.

La collocazione della cartella dati dipende dall'installazione QCAD. Dal menu
QCAD si può normalmente verificare il percorso in **Aiuto → Informazioni**.
Non copiare questi file dentro l'applicazione QCAD: usare la cartella dati
utente evita modifiche ai binari e semplifica gli aggiornamenti.

## Cornici incluse

Le sei cornici distribuite qui sono state create appositamente per questo
progetto come semplici rettangoli sul layer `RIQUADRO`, in metri:

| Formato | 1:100 | 1:200 | 1:500 |
|---|---:|---:|---:|
| A4 | 19,50 × 23,50 m | 39,00 × 47,00 m | 97,50 × 117,50 m |
| A3 | 26,00 × 40,50 m | 52,00 × 81,00 m | 130,00 × 202,50 m |

Non sono cartigli ufficiali o modelli forniti dall'Agenzia delle Entrate. Puoi
sostituirli con il tuo riquadro interno, rispettando i nomi dei file e facendo
una prova nella tua procedura di lavoro. `DCORN` elimina soltanto i riferimenti
ai blocchi con prefisso `STUDIO_DOCFA_CORNICE_`; non cancella un vecchio
riquadro presente come geometria sciolta nel DXF. I file cornice sono DXF R12
senza un'unità incorporata: `DCORN` richiede perciò che il disegno destinatario
sia già impostato in metri.

## Sviluppo e controlli

Le cornici si rigenerano (solo per chi sviluppa il progetto) con:

```bash
python3 -m pip install -r requirements-dev.txt
python3 tools/generate_frames.py
```

Prima di un rilascio:

```bash
node --check scripts/Misc/StudioDocfa/StudioDocfaCornice/StudioDocfaCornice.js
zip -r QCAD_Studio_DOCFA_AddOn.zip scripts
unzip -t QCAD_Studio_DOCFA_AddOn.zip
```

## Licenza

Codice, documentazione e cornici create per questo repository sono distribuiti
con licenza [MIT](LICENSE). Marchi, software e procedure DOCFA/QCAD restano
dei rispettivi titolari.
