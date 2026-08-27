/**
 * Scala stile AutoCAD: fattore diretto o riferimento, nella stessa icona.
 *
 * Flusso: selezione -> punto base -> digita un fattore (2, 0,5, ...) e Invio,
 * oppure R e Invio per il modo riferimento: due estremi di una distanza nota
 * e la lunghezza che deve assumere. La scala avviene attorno al punto base e
 * resta annullabile con Modifica > Annulla.
 */
include("scripts/Modify/Scale/Scale.js");

// I valori accettano la virgola come separatore decimale perche' sul campo
// si detta "5,70": convertiamo prima di validare.
function studioCadScalaParseNumero(value) {
    if (typeof value !== "string") {
        return undefined;
    }
    var normalized = value.replace(/^\s+|\s+$/g, "").replace(",", ".");
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) {
        return undefined;
    }
    var numero = Number(normalized);
    if (!isFinite(numero) || numero <= 0) {
        return undefined;
    }
    return numero;
}

// "R" attiva il modo riferimento; ammessi anche "r" e "rif" per tolleranza
// verso chi scrive alla vecchia maniera di AutoCAD.
function studioCadScalaComandoRiferimento(value) {
    if (typeof value !== "string") {
        return false;
    }
    var normalized = value.replace(/^\s+|\s+$/g, "").toLowerCase();
    return normalized === "r" || normalized === "rif";
}

// Fattore dal riferimento: guardia sulla distanza quasi nulla per evitare
// divisioni instabili quando i due estremi coincidono per errore di click.
function studioCadScalaFattoreDaRiferimento(lunghezzaRif, lunghezzaNuova, tolleranza) {
    if (!isFinite(lunghezzaRif) || !isFinite(lunghezzaNuova)) {
        return undefined;
    }
    if (lunghezzaRif <= tolleranza || lunghezzaNuova <= 0) {
        return undefined;
    }
    return lunghezzaNuova / lunghezzaRif;
}

// Primo carattere digitato sul disegno da instradare nella riga comandi:
// cifre e separatori sempre; R solo quando si sta scegliendo il fattore.
function studioCadScalaCarattereInput(value, ammettiRiferimento) {
    if (typeof value !== "string" || value.length !== 1) {
        return undefined;
    }
    if (/^[0-9.,]$/.test(value)) {
        return value;
    }
    if (ammettiRiferimento && /^[rR]$/.test(value)) {
        return value;
    }
    return undefined;
}

function StudioCadScala(guiAction) {
    Scale.call(this, guiAction);

    // Niente dialogo del comando nativo: il fattore arriva dalla riga comandi.
    this.useDialog = false;
    this.factorByMouse = false;
}

StudioCadScala.prototype = new Scale();
StudioCadScala.includeBasePath = includeBasePath;

// Fasi proprie del flusso; gli stati nativi di Scale servono solo ad armare
// il click di coordinate, la logica sta tutta in pickCoordinate/commandEvent.
StudioCadScala.Fase = {
    PuntoBase: 0,
    Fattore: 1,
    Rif1: 2,
    Rif2: 3,
    NuovaLunghezza: 4
};

StudioCadScala.prototype.getTitle = function() {
    return qsTr("Scala (fattore o riferimento)");
};

StudioCadScala.prototype.beginEvent = function() {
    Transform.prototype.beginEvent.call(this);

    // Messaggio esplicito: l'icona resta cliccabile anche senza selezione e
    // l'utente deve capire subito cosa manca.
    var doc = this.getDocument();
    if (isNull(doc) || doc.countSelectedEntities() === 0) {
        EAction.handleUserWarning(qsTr("Selezionare prima gli oggetti da scalare, poi rilanciare Scala."));
        this.terminate();
        return;
    }

    this.factorX = undefined;
    this.factorY = undefined;
    this.basePoint = undefined;
    this.rif1 = undefined;
    this.rif2 = undefined;
    this.lunghezzaRif = undefined;
    this.tastoGestitoInPressione = undefined;

    this.impostaFase(StudioCadScala.Fase.PuntoBase);
};

StudioCadScala.prototype.impostaFase = function(fase) {
    this.fase = fase;

    switch (fase) {
    case StudioCadScala.Fase.PuntoBase:
        // Stato nativo solo per armare il crosshair e gli snap.
        Scale.prototype.setState.call(this, Scale.State.SettingFocusPoint);
        this.setCommandPrompt(qsTr("Punto base della scala"));
        this.setLeftMouseTip(qsTr("Punto base"));
        break;
    case StudioCadScala.Fase.Fattore:
        this.setCommandPrompt(qsTr("Fattore di scala (es. 2 oppure 0,5) e Invio - R e Invio per riferimento"));
        this.setLeftMouseTip(qsTr("Digitare il fattore, oppure R per riferimento"));
        break;
    case StudioCadScala.Fase.Rif1:
        Scale.prototype.setState.call(this, Scale.State.SettingReferencePoint);
        this.setCommandPrompt(qsTr("Primo estremo della distanza di riferimento"));
        this.setLeftMouseTip(qsTr("Primo estremo"));
        break;
    case StudioCadScala.Fase.Rif2:
        this.setCommandPrompt(qsTr("Secondo estremo della distanza di riferimento"));
        this.setLeftMouseTip(qsTr("Secondo estremo"));
        break;
    case StudioCadScala.Fase.NuovaLunghezza:
        this.setCommandPrompt(
            qsTr("Nuova lunghezza del riferimento e Invio (attuale: %1)")
                .arg(this.lunghezzaRif.toFixed(4))
        );
        this.setLeftMouseTip(qsTr("Digitare la nuova lunghezza"));
        break;
    }
};

StudioCadScala.prototype.pickCoordinate = function(event, preview) {
    var di = this.getDocumentInterface();
    var punto = event.getModelPosition();

    if (preview) {
        // Nessuna anteprima dedicata: il flusso privilegia input numerici.
        return;
    }

    switch (this.fase) {
    case StudioCadScala.Fase.PuntoBase:
        this.basePoint = punto;
        di.setRelativeZero(punto);
        this.impostaFase(StudioCadScala.Fase.Fattore);
        break;
    case StudioCadScala.Fase.Rif1:
        this.rif1 = punto;
        di.setRelativeZero(punto);
        this.impostaFase(StudioCadScala.Fase.Rif2);
        break;
    case StudioCadScala.Fase.Rif2:
        this.rif2 = punto;
        this.lunghezzaRif = this.rif1.getDistanceTo(this.rif2);
        if (this.lunghezzaRif < RS.PointTolerance) {
            EAction.handleUserWarning(qsTr("I due estremi coincidono: indicare punti distinti."));
            this.impostaFase(StudioCadScala.Fase.Rif1);
            return;
        }
        di.setRelativeZero(punto);
        this.impostaFase(StudioCadScala.Fase.NuovaLunghezza);
        break;
    default:
        // Nelle fasi a input numerico un click non ha significato: il prompt
        // resta a guidare l'utente.
        break;
    }
};

StudioCadScala.prototype.applicaFattore = function(fattore) {
    this.factorX = fattore;
    this.factorY = undefined;
    this.focusPoint = this.basePoint;

    var op = this.getOperation(false);
    if (isNull(op)) {
        EAction.handleUserWarning(qsTr("Fattore di scala non valido."));
        this.terminate();
        return;
    }

    var di = this.getDocumentInterface();
    di.applyOperation(op);
    di.setRelativeZero(this.basePoint);
    this.terminate();
};

StudioCadScala.prototype.commandEvent = function(event) {
    this.tastoGestitoInPressione = undefined;
    var testo = event.getCommand();

    if (this.fase === StudioCadScala.Fase.Fattore) {
        if (studioCadScalaComandoRiferimento(testo)) {
            event.accept();
            this.impostaFase(StudioCadScala.Fase.Rif1);
            return;
        }
        var fattore = studioCadScalaParseNumero(testo);
        if (isNull(fattore)) {
            EAction.handleUserWarning(qsTr("Valore non valido: digitare un fattore positivo oppure R."));
            event.accept();
            return;
        }
        event.accept();
        this.applicaFattore(fattore);
        return;
    }

    if (this.fase === StudioCadScala.Fase.NuovaLunghezza) {
        var nuova = studioCadScalaParseNumero(testo);
        var fattoreRif = studioCadScalaFattoreDaRiferimento(
            this.lunghezzaRif, nuova, RS.PointTolerance
        );
        if (isNull(nuova) || isNull(fattoreRif)) {
            EAction.handleUserWarning(qsTr("Lunghezza non valida: digitare un numero positivo."));
            event.accept();
            return;
        }
        event.accept();
        this.applicaFattore(fattoreRif);
        return;
    }

    Scale.prototype.commandEvent.call(this, event);
};

// Digitare direttamente sul disegno: il primo carattere utile va nella riga
// comandi, cosi' il flusso resta "muovi il mouse e scrivi" come per la linea.
StudioCadScala.prototype.instradaTasto = function(event, faseTastiera) {
    var faseInput = this.fase === StudioCadScala.Fase.Fattore ||
        this.fase === StudioCadScala.Fase.NuovaLunghezza;
    if (!faseInput) {
        return false;
    }

    var testo = typeof event.text === "function" ? event.text() : event.text;
    if (typeof testo !== "string") {
        testo = "";
    }
    var carattere = studioCadScalaCarattereInput(
        testo, this.fase === StudioCadScala.Fase.Fattore
    );
    if (isNull(carattere)) {
        return false;
    }

    // Su macOS il KeyRelease puo' arrivare all'azione anche dopo che il
    // KeyPress ha spostato il focus sulla riga comandi: non duplicare.
    if (faseTastiera === "release" && this.tastoGestitoInPressione === carattere) {
        this.tastoGestitoInPressione = undefined;
        event.accept();
        return true;
    }

    var commandEdit = EAction.getMainWindow().findChild("CommandEdit");
    if (isNull(commandEdit)) {
        return false;
    }
    commandEdit.setFocus();
    commandEdit.insert(carattere);
    if (faseTastiera === "press") {
        this.tastoGestitoInPressione = carattere;
    }
    event.accept();
    return true;
};

StudioCadScala.prototype.keyPressEvent = function(event) {
    if (this.instradaTasto(event, "press")) {
        return;
    }
    Scale.prototype.keyPressEvent.call(this, event);
};

StudioCadScala.prototype.keyReleaseEvent = function(event) {
    if (this.instradaTasto(event, "release")) {
        return;
    }
    Scale.prototype.keyReleaseEvent.call(this, event);
};

// La registrazione dell'azione avviene in StudioCadUI.init, insieme agli
// altri comandi della palette: questo file definisce solo il comportamento.
