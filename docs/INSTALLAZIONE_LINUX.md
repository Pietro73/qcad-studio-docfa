# QCAD Studio Linux — installazione 25/08/2026

Pacchetto portabile delle palette Studio CAD, degli strumenti locali DOCFA e
del profilo iniziale Studio per QCAD Professional su Linux. Non contiene dati,
disegni o configurazioni personali e non modifica l'installazione del programma.

## Prerequisiti

- QCAD **Professional** per Linux, installato e avviato almeno una volta;
- Bash, `awk`, `cp`, `diff`, `find` e `pgrep`, normalmente disponibili in una
  distribuzione Linux desktop;
- QCAD completamente chiuso durante installazione e ripristino;
- una copia di questo pacchetto scrivibile dall'utente che esegue QCAD.

QCAD per Linux e' disponibile sia come installer sia come archivio; la guida
ufficiale indica normalmente l'installazione sotto `~/opt`. Il pacchetto Studio
non dipende pero' dal percorso dell'applicazione: lavora nella directory dati
utente di QCAD.

Il percorso autorevole nel PC specifico si ottiene dalla **Shell ECMAScript**
di QCAD, eseguendo:

```js
print(RSettings.getDataLocation());
print(RSettings.getPath());
```

Il primo valore e' la directory dati dove QCAD cerca gli add-on utente; il
secondo e' il percorso della configurazione. Lo script usa come impostazione
predefinita i percorsi XDG `~/.local/share/QCAD/QCAD` e cerca, in quest'ordine,
`QCAD3.conf` e `QCAD3.ini` sotto `${XDG_CONFIG_HOME:-~/.config}/QCAD/`.

## Installazione automatica

1. Chiudere ogni finestra e processo QCAD.
2. Aprire un terminale nella cartella del pacchetto.
3. Rendere eseguibili gli script, una sola volta:

   ```bash
   chmod +x installa_linux.sh ripristina_linux.sh verifica_linux.sh
   ```

4. Eseguire:

   ```bash
   ./installa_linux.sh
   ./verifica_linux.sh
   ```

Per una configurazione o directory dati non standard, usare i valori ottenuti
con `RSettings`:

```bash
./installa_linux.sh --data-dir /percorso/dati/QCAD --config-file /percorso/configurazione/QCAD3.conf
```

L'installer confronta i tre moduli prima di copiarli, salva un backup datato
`GGMMAAAA-HHMMSS`, aggiorna in modo atomico solo `List=` nella sezione
`[AddOns]` e poi ricontrolla i file copiati. Una seconda esecuzione invariata e'
idempotente: non duplica la lista e non genera un nuovo backup.

## Installazione manuale

Usare questo metodo solo se l'installer non puo' essere eseguito. Con QCAD
chiuso, copiare **il contenuto** di `scripts/Misc/` nella cartella
`scripts/Misc/` sotto il valore restituito da `RSettings.getDataLocation()`.
Devono risultare le cartelle:

```text
StudioDefaults/
StudioCadUI/
StudioDocfa/
```

Fare prima una copia del file indicato da `RSettings.getPath()`. Nella sua
sezione `[AddOns]`, aggiungere una sola volta alla chiave `List=` le sette voci
seguenti, sostituendo `<data-dir>` con il valore effettivamente stampato da
`RSettings.getDataLocation()` e mantenendo tutte le voci gia' presenti:

```text
<data-dir>/scripts/Misc/StudioDefaults/StudioDefaults.js
<data-dir>/scripts/Misc/StudioCadUI/StudioCadUI.js
<data-dir>/scripts/Misc/StudioDocfa/StudioDocfa.js
<data-dir>/scripts/Misc/StudioDocfa/StudioDocfaControlla/StudioDocfaControlla.js
<data-dir>/scripts/Misc/StudioDocfa/StudioDocfaCornice/StudioDocfaCornice.js
<data-dir>/scripts/Misc/StudioDocfa/StudioDocfaGuida/StudioDocfaGuida.js
<data-dir>/scripts/Misc/StudioDocfa/StudioDocfaPolilinea/StudioDocfaPolilinea.js
```

Le voci sono generate dall'installer dal percorso dati runtime: il pacchetto non
contiene alcun percorso personale statico. Riavviare QCAD una sola volta dopo la
copia.

## Verifica funzionale in QCAD

Aprire un disegno di prova non operativo e digitare nella riga comando:

- `ZA`, `ZO`, `ZE` per i comandi di zoom;
- `L` per la linea continua tipo AutoCAD: indicare il punto iniziale, orientare
  il mouse e digitare subito la distanza (`3` oppure `3,15`) sopra il disegno,
  senza fare clic nella riga comando: questa acquisizione automatica vale gia'
  per il **primo tratto**, subito dopo il messaggio `Punto successivo`. Premere
  Invio: il comando continua dal vertice precedente e acquisisce allo stesso
  modo tutte le distanze successive; un clic destro termina. Ogni tratto resta
  una entita' `LINE` separata, non una polilinea. Il comando conserva la
  direzione scelta prima di spostare il focus e acquisisce il primo numero sia
  alla pressione sia, come fallback, al rilascio del tasto. I due eventi sono
  deduplicati: la prima cifra compare una sola volta anche sulle combinazioni
  macOS / Qt che non inoltrano uno dei due eventi alla vista del disegno;
- `CO` per copia, `MV` per spostamento, `RO` per rotazione, `SZ` per scala e
  `CH` per cimatura;
- `DCHK` per il pre-controllo poligoni, `DCORN` per la cornice modello,
  `DGUIDA` per la guida e `DPOL` per il poligono classificato.

Nella palette **Studio CAD** verificare inoltre il gruppo
**Orto / Libero / OSNAP**:

- **ORTO** applica la restrizione ortogonale e la blocca mediante l'interfaccia
  nativa di QCAD: resta attiva anche tra un tratto e il successivo finche' non
  viene premuto **LIBERO**;
- **LIBERO** disattiva la restrizione e attiva lo snap libero (`EN` + `SF`);
- **Auto**, Estremita, Medio, Centro, Intersezione, Entita, Perpendicolare,
  Tangente e Riferimento richiamano direttamente gli snap nativi di QCAD.

La palette carica direttamente le icone native di QCAD; se una build Linux non
espone la risorsa prevista usa gli SVG chiari inclusi nel plugin. Non dipende
da `autoPath`, che in alcune distribuzioni lasciava visibile il pulsante ma
senza immagine. `verifica_linux.sh` controlla che tutti gli SVG di riserva siano
stati copiati e risultino leggibili.

Per i comandi che attendono un numero non occorre spostare il puntatore nella
barra delle opzioni: digitando sul disegno, il primo carattere numerico viene
inviato al primo campo numerico visibile e modificabile del comando. Il valore
predefinito viene selezionato e sostituito. Per esempio, con **Offset (OF)** il
numero digitato entra direttamente in **Distanza**; la stessa regola vale per
campi analoghi quali angolo e raggio. Se il comando non espone un campo numerico
nella barra delle opzioni, l'input viene inviato alla riga comando. A comando
inattivo i numeri non vengono intercettati.

Verificare inoltre la palette Studio CAD, le icone dei cinque gruppi e le
quattro voci `DOCFA:` nel menu
**Varie**. Se un comando non appare, chiudere QCAD, controllare che le sette
voci siano presenti una sola volta in `[AddOns] List`, quindi verificare i
percorsi con `RSettings.getDataLocation()` e `RSettings.getPath()`.

## Ripristino

Con QCAD chiuso, eseguire:

```bash
./ripristina_linux.sh
```

Il comando sceglie il backup Studio piu' recente associato alla configurazione
selezionata. Per indicarne uno preciso (raccomandato quando vi sono piu'
installazioni), usare il percorso stampato dall'installer:

```bash
./ripristina_linux.sh --data-dir /percorso/dati/QCAD \
  --config-file /percorso/configurazione/QCAD3.conf \
  --backup-dir /percorso/backup-studio-qcad/GGMMAAAA-HHMMSS
```

Il ripristino aggiorna soltanto `[AddOns] List` e riporta i soli moduli Studio
allo stato precedente al backup scelto. Non cancella altri add-on QCAD.

## Avvertenza DOCFA

`DCHK`, `DCORN`, `DGUIDA` e `DPOL` sono strumenti locali di preparazione e
pre-controllo grafico. Non validano, firmano, inviano o attestano una pratica
DOCFA. Prima dell'esportazione raster e della presentazione occorre controllare
rilievo, atti, scala, tavola, superfici e procedura DOCFA ufficiale.

## Differenze macOS / Linux

Su macOS la configurazione puo' essere `~/.config/QCAD/QCAD3.ini`; la guida
ufficiale QCAD indica per Linux `~/.config/QCAD/QCAD3.conf`. Su Linux si usa la
directory dati XDG dell'utente, non il bundle applicativo e non una cartella
macOS. Per questo il pacchetto non copia `QCAD3.ini` e non contiene percorsi
personali.

## Impostazioni applicate da StudioDefaults

All'avvio dell'add-on vengono impostati tramite `RSettings`:

- interfaccia italiana: `Language/UiLanguage=it`;
- unita disegno metri, misura `1`, unita carta `4`;
- salvataggio DXF R15 2000/LT2000;
- cimatura con lunghezze `0` e `0`;
- linea `L` continua con distanza diretta, virgola decimale, tratti `LINE`
  separati e uscita con un solo clic destro;
- focus numerico automatico: la digitazione sopra il disegno raggiunge il campo
  numerico del comando (ad esempio `Distanza` di Offset), sostituendone il valore
  predefinito; in assenza di tale campo usa la riga comando;
- zoom automatico: `zoomauto, za, ze, zo, z0`;
- scala: `scale, sz, sc`, senza dialogo, fattore da mouse e X/Y `1`;
- sposta: `move, mv, m`, senza dialogo e con rimozione dell'originale;
- ruota: `rotate, ro`, senza dialogo, angolo da mouse e rimozione dell'originale;
- specchia e trasla+ruota senza dialogo e con rimozione dell'originale;
- colore dello zero relativo RGBA `(162, 36, 36, 0)`.

## Riferimenti ufficiali QCAD

- [Installazione QCAD su Linux](https://qcad.org/en/documentation/installation)
- [RSettings: getDataLocation, getPath e API script](https://www.qcad.org/doc/qcad/latest/developer/class_r_settings.html)
- [Ripristino della configurazione QCAD](https://www.qcad.org/en/tutorial-resetting-the-qcad-configuration)
- [Manuale di riferimento QCAD](https://www.qcad.org/doc/qcad/latest/reference/en/qcad_reference_manual_en.pdf)
