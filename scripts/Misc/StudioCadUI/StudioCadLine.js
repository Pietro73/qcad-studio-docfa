/**
 * Linea continua con inserimento diretto della distanza, nello stile AutoCAD.
 * Dopo il primo punto, un numero conferma un segmento nella direzione indicata
 * dal mouse; il punto finale diventa l'inizio del segmento successivo.
 */
include("scripts/Draw/Line/Line2P/Line2P.js");

function studioCadParseDistance(value) {
    if (typeof value !== "string") {
        return undefined;
    }

    var normalized = value.replace(/^\s+|\s+$/g, "").replace(",", ".");
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) {
        return undefined;
    }

    var distance = Number(normalized);
    if (!isFinite(distance) || distance <= 0) {
        return undefined;
    }
    return distance;
}

function studioCadDistanceInputCharacter(value) {
    if (typeof value !== "string" || value.length !== 1) {
        return undefined;
    }

    // Punto e virgola sono ammessi anche come primo carattere per distanze
    // inferiori all'unita', ad esempio ",25" oppure ".25".
    if (!/^[0-9.,]$/.test(value)) {
        return undefined;
    }
    return value;
}

function studioCadDistanceInputFromEvent(event) {
    var text = typeof event.text === "function" ? event.text() : event.text;
    if (typeof text !== "string") {
        text = "";
    }
    var character = studioCadDistanceInputCharacter(text);
    if (!isNull(character)) {
        return character;
    }

    // Su alcune combinazioni macOS / Qt il primo KeyPress ricevuto dal
    // viewport riporta text() vuoto. Recuperiamo allora il carattere dal
    // codice del tasto, senza trasformare in numero tasti che hanno gia' un
    // testo non numerico (ad esempio una scorciatoia con modificatore).
    if (text !== "") {
        return undefined;
    }
    var key = typeof event.key === "function" ? event.key() : event.key;
    if (!isNull(key) && typeof key.valueOf === "function") {
        key = key.valueOf();
    }
    key = Number(key);
    if (key >= 48 && key <= 57) {
        return String.fromCharCode(key);
    }
    if (key === 44) {
        return ",";
    }
    if (key === 46) {
        return ".";
    }
    return undefined;
}

function studioCadFocusDistanceInput() {
    var commandEdit = EAction.getMainWindow().findChild("CommandEdit");
    if (isNull(commandEdit)) {
        return undefined;
    }
    commandEdit.setFocus();
    return commandEdit;
}

function studioCadResolveDirectedEnd(start, pointer, distance, orthogonal) {
    if (isNaN(start.x) || isNaN(start.y) ||
            isNaN(pointer.x) || isNaN(pointer.y) ||
            !isFinite(distance) || distance <= 0) {
        return undefined;
    }

    var dx = pointer.x - start.x;
    var dy = pointer.y - start.y;
    var directionLength = Math.sqrt(dx * dx + dy * dy);
    if (directionLength <= 1.0e-12) {
        return undefined;
    }

    if (orthogonal) {
        // L'asse dominante rende stabile il verso anche quando il puntatore non
        // e' perfettamente allineato a causa dello zoom o dello snap grafico.
        if (Math.abs(dx) >= Math.abs(dy)) {
            return {
                x: start.x + (dx < 0 ? -distance : distance),
                y: start.y
            };
        }
        return {
            x: start.x,
            y: start.y + (dy < 0 ? -distance : distance)
        };
    }

    return {
        x: start.x + dx / directionLength * distance,
        y: start.y + dy / directionLength * distance
    };
}

function StudioCadLine(guiAction) {
    Line2P.call(this, guiAction);
}

StudioCadLine.prototype = new Line2P();
StudioCadLine.includeBasePath = includeBasePath;

StudioCadLine.prototype.getTitle = function() {
    return qsTr("Linea continua stile AutoCAD");
};

StudioCadLine.prototype.isOrthogonalRestrictionActive = function() {
    var restriction = this.getDocumentInterface().getSnapRestriction();
    return !isNull(restriction) &&
        String(restriction).indexOf("RRestrictOrthogonal") !== -1;
};

StudioCadLine.prototype.routeDistanceKey = function(event, phase) {
    var character = studioCadDistanceInputFromEvent(event);
    if (this.state === Line2P.State.SettingNextPoint && !isNull(character)) {
        // In Qt il KeyRelease puo' ancora essere consegnato all'azione anche
        // dopo che il KeyPress ha spostato il focus sulla riga comandi. Non
        // reinseriamo la stessa prima cifra una seconda volta.
        if (phase === "release" &&
                this.studioCadKeyHandledOnPress === character) {
            this.studioCadKeyHandledOnPress = undefined;
            event.accept();
            return true;
        }

        // Il passaggio del focus alla riga comandi puo' far perdere a Qt il
        // punto di anteprima corrente. Conserviamo prima la direzione scelta
        // dal mouse, soprattutto per il primo segmento.
        if (isVector(this.point2Cursor)) {
            this.studioCadDirectionPoint = this.point2Cursor;
        }
        var commandEdit = studioCadFocusDistanceInput();
        if (!isNull(commandEdit)) {
            // Acquisiamo il primo carattere sia in pressione sia, come
            // fallback per alcune tastiere macOS, al rilascio. Questo evita
            // che la prima distanza resti invisibile come nel video reale.
            commandEdit.insert(character);
            if (phase === "press") {
                this.studioCadKeyHandledOnPress = character;
            }
            event.accept();
            return true;
        }
    }

    return false;
};

StudioCadLine.prototype.keyPressEvent = function(event) {
    if (this.routeDistanceKey(event, "press")) {
        return;
    }

    Line2P.prototype.keyPressEvent.call(this, event);
};

StudioCadLine.prototype.keyReleaseEvent = function(event) {
    if (this.routeDistanceKey(event, "release")) {
        return;
    }

    Line2P.prototype.keyReleaseEvent.call(this, event);
};

StudioCadLine.prototype.commandEvent = function(event) {
    this.studioCadKeyHandledOnPress = undefined;
    var distance = studioCadParseDistance(event.getCommand());
    if (isNaN(distance)) {
        Line2P.prototype.commandEvent.call(this, event);
        return;
    }

    if (this.state !== Line2P.State.SettingNextPoint || !isVector(this.point1)) {
        EAction.handleUserWarning(qsTr("Indicare prima il punto iniziale della linea."));
        event.accept();
        return;
    }

    var pointer = this.studioCadDirectionPoint;
    if (!isVector(pointer)) {
        pointer = this.point2Cursor;
    }
    if (!isVector(pointer)) {
        pointer = this.getDocumentInterface().getLastPosition();
    }
    if (!isVector(pointer)) {
        EAction.handleUserWarning(qsTr("Muovere il mouse per indicare la direzione."));
        event.accept();
        return;
    }

    var end = studioCadResolveDirectedEnd(
        {x:this.point1.x, y:this.point1.y},
        {x:pointer.x, y:pointer.y},
        distance,
        this.isOrthogonalRestrictionActive()
    );
    if (isNull(end)) {
        EAction.handleUserWarning(qsTr("Direzione non valida: spostare il mouse e riprovare."));
        event.accept();
        return;
    }

    var endPoint = new RVector(end.x, end.y);
    this.pickCoordinate({
        getModelPosition: function() {
            return endPoint;
        }
    }, false);
    this.studioCadDirectionPoint = undefined;
    event.accept();
};

StudioCadLine.prototype.escapeEvent = function() {
    // Un solo tasto destro / Esc conclude l'intera sequenza, come richiesto
    // dal flusso AutoCAD, invece di tornare alla richiesta del primo punto.
    EAction.prototype.escapeEvent.call(this);
};
