/**
 * Controllo tecnico locale dei poligoni DOCFA: non e' una validazione o
 * accettazione della pratica nella procedura ministeriale.
 */
include("scripts/EAction.js");

var StudioDocfaCheckLayer = "Docfa_Poligoni";
var StudioDocfaCheckCodici = [1, 8, 2, 3, 4, 5, 6, 7];
var StudioDocfaCheckNomi = {
    1: "A/A1", 8: "A2", 2: "B", 3: "C",
    4: "D", 5: "E", 6: "F", 7: "G"
};

function studioDocfaFormatoArea(area) {
    return (Math.round(area * 100) / 100).toFixed(2).replace(".", ",");
}

function studioDocfaCheckColoreConsentito(colore) {
    for (var i = 0; i < StudioDocfaCheckCodici.length; i++) {
        if (StudioDocfaCheckCodici[i] === colore) {
            return true;
        }
    }
    return false;
}

function StudioDocfaControlla(guiAction) {
    EAction.call(this, guiAction);
}

StudioDocfaControlla.prototype = new EAction();

StudioDocfaControlla.prototype.beginEvent = function() {
    EAction.prototype.beginEvent.call(this);

    var document = this.getDocument();
    var requiredLayers = ["RIQUADRO", "MURI_PERIMETRALI", "TRAMEZZI", "SERRAMENTI", "QUOTE", "TESTI"];
    var missingLayers = [];
    for (var i = 0; i < requiredLayers.length; i++) {
        if (isNull(document.queryLayer(requiredLayers[i]))) {
            missingLayers.push(requiredLayers[i]);
        }
    }

    var allIds = document.queryAllEntities(false, false, RS.EntityAll);
    var layerPresente = !isNull(document.queryLayer(StudioDocfaCheckLayer));
    var numeroPoligoni = 0;
    var aperti = 0;
    var tipiErrati = 0;
    var coloriErrati = 0;
    var conteggi = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0};
    var aree = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0};

    for (var k = 0; k < allIds.length; k++) {
        var entity = document.queryEntity(allIds[k]);
        if (isNull(entity) || entity.getLayerName() !== StudioDocfaCheckLayer) {
            continue;
        }

        if (entity.getType() !== RS.EntityPolyline) {
            tipiErrati++;
            continue;
        }

        numeroPoligoni++;
        if (!entity.isClosed()) {
            aperti++;
        }
        var colore = entity.getColor().getColorIndex();
        if (studioDocfaCheckColoreConsentito(colore)) {
            conteggi[colore]++;
            if (entity.isClosed()) {
                aree[colore] += Math.abs(entity.getArea());
            }
        } else {
            coloriErrati++;
        }
    }

    var riepilogoCategorie = [];
    for (var j = 0; j < StudioDocfaCheckCodici.length; j++) {
        var codice = StudioDocfaCheckCodici[j];
        if (conteggi[codice] > 0) {
            riepilogoCategorie.push(
                StudioDocfaCheckNomi[codice] + ": " + conteggi[codice]
                + " (" + studioDocfaFormatoArea(aree[codice]) + " m²)"
            );
        }
    }

    var meters = document.getUnit() === RS.Meter;
    var strutturaOk = meters && layerPresente && numeroPoligoni > 0
        && aperti === 0 && tipiErrati === 0 && coloriErrati === 0;
    var result = "CONTROLLO POLIGONI DOCFA (locale)\n\n"
        + "Unita disegno: " + (meters ? "metri OK" : "NON in metri") + "\n"
        + "Entita nel modello: " + allIds.length + "\n"
        + "Layer " + StudioDocfaCheckLayer + ": " + (layerPresente ? "presente" : "MANCANTE") + "\n"
        + "Poligoni sul layer: " + numeroPoligoni + " | aperti: " + aperti + "\n"
        + "Oggetti non polilinea sul layer: " + tipiErrati + " | colori non validi: " + coloriErrati + "\n"
        + "Categorie / aree geometriche: " + (riepilogoCategorie.length === 0 ? "nessuna" : riepilogoCategorie.join("; ")) + "\n"
        + "Layer grafici: " + (missingLayers.length === 0
            ? "OK" : "mancanti: " + missingLayers.join(", ")) + "\n\n"
        + "Esito struttura QCAD: " + (strutturaOk ? "OK" : "DA CORREGGERE") + "\n\n"
        + "Le aree sono geometriche e non equivalgono alla superficie catastale. "
        + "Controllo di redazione QCAD, non validazione/accettazione DOCFA. Verifica "
        + "sempre rilievo, atti, scala, tavola raster e pratica nel DOCFA ufficiale.";

    QMessageBox.information(RMainWindowQt.getMainWindow(), "DOCFA Studio", result);
    EAction.handleUserMessage(result.replace(/\n/g, " "));
    this.terminate();
};

StudioDocfaControlla.init = function(basePath) {
    var action = new RGuiAction(qsTr("DOCFA: &controllo poligoni pre-pratica"), RMainWindowQt.getMainWindow());
    action.setRequiresDocument(true);
    action.setScriptFile(basePath + "/StudioDocfaControlla.js");
    // "DC" e' gia' il comando nativo di quota continua di QCAD.
    action.setDefaultCommands(["docfacontrolla", "dchk"]);
    // QCAD 3.32 carica in modo affidabile le azioni locali ancorate al menu
    // principale Varie (MiscMenu); un sottomenu locale puo' non essere creato.
    action.setWidgetNames(["MiscMenu"]);
    action.setGroupSortOrder(165000);
    action.setSortOrder(10);
};
