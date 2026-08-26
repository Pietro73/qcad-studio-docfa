/**
 * Prepara una polilinea DOCFA con layer e colore DXF della categoria scelta,
 * quindi passa al comando nativo Polilinea di QCAD.
 *
 * Non crea una geometria fittizia: l'operatore deve tracciare il vano reale e
 * usare l'opzione Chiudi del comando nativo prima di terminare l'azione.
 */
include("scripts/EAction.js");

var StudioDocfaLayerName = "Docfa_Poligoni";
var StudioDocfaCategorie = [
    { codice: "A / A1", colore: 1, descrizione: "Vani principali e accessori diretti" },
    { codice: "A2", colore: 8, descrizione: "Accessori diretti per C/1 e C/6" },
    { codice: "B", colore: 2, descrizione: "Accessori indiretti comunicanti" },
    { codice: "C", colore: 3, descrizione: "Accessori indiretti non comunicanti" },
    { codice: "D", colore: 4, descrizione: "Balconi, terrazze e similari comunicanti" },
    { codice: "E", colore: 5, descrizione: "Balconi, terrazze e similari non comunicanti" },
    { codice: "F", colore: 6, descrizione: "Corti, giardini e aree esclusive" },
    { codice: "G", colore: 7, descrizione: "Superfici non rilevanti" }
];

function studioDocfaEnsureLayer(documentInterface, document) {
    if (!isNull(document.queryLayer(StudioDocfaLayerName))) {
        return true;
    }

    var linetypeId = document.getLinetypeId("CONTINUOUS");
    var layer = new RLayer(
        document,
        StudioDocfaLayerName,
        false,
        false,
        new RColor("white"),
        linetypeId,
        RLineweight.Weight000
    );
    var operation = new RModifyObjectsOperation();
    operation.addObject(layer);
    documentInterface.applyOperation(operation);
    return !isNull(document.queryLayer(StudioDocfaLayerName));
}

function StudioDocfaPolilinea(guiAction) {
    EAction.call(this, guiAction);
}

StudioDocfaPolilinea.prototype = new EAction();

StudioDocfaPolilinea.prototype.beginEvent = function() {
    EAction.prototype.beginEvent.call(this);

    var labels = [];
    for (var i = 0; i < StudioDocfaCategorie.length; i++) {
        var categoria = StudioDocfaCategorie[i];
        labels.push(categoria.codice + " — " + categoria.descrizione
            + " (colore DXF " + categoria.colore + ")");
    }

    // La palette Studio CAD puo' preselezionare A-G e saltare il dialogo.
    // Il valore viene consumato una sola volta, cosi' il comando DPL normale
    // continua a mostrare la scelta completa.
    var indice = RSettings.getIntValue("StudioDocfa/NextCategoryIndex", -1);
    RSettings.setValue("StudioDocfa/NextCategoryIndex", -1);
    if (indice < 0 || indice >= labels.length) {
        var selezione = QInputDialog.getItem(
            EAction.getMainWindow(),
            "DOCFA Studio — categoria poligono",
            "Scegli la categoria del vano/area reale:",
            labels,
            0,
            false
        );
        if (selezione === "") {
            this.terminate();
            return;
        }
        indice = labels.indexOf(selezione);
    }
    if (indice < 0) {
        EAction.handleUserMessage("DOCFA Studio: categoria non riconosciuta.");
        this.terminate();
        return;
    }

    var documentInterface = this.getDocumentInterface();
    var document = this.getDocument();
    if (!studioDocfaEnsureLayer(documentInterface, document)) {
        EAction.handleUserMessage("DOCFA Studio: non riesco a creare il layer " + StudioDocfaLayerName + ".");
        this.terminate();
        return;
    }

    var scelta = StudioDocfaCategorie[indice];
    documentInterface.setCurrentLayer(StudioDocfaLayerName);
    // Il CAD index forza il gruppo DXF 62 (1..8), non un semplice colore RGB.
    documentInterface.setCurrentColor(RColor.createFromCadIndex(scelta.colore));
    EAction.handleUserMessage(
        "DOCFA Studio: " + scelta.codice + " impostato su "
        + StudioDocfaLayerName + ", colore DXF " + scelta.colore
        + ". Traccia il perimetro reale e scegli Chiudi."
    );

    var started = RGuiAction.triggerByCommand("polyline");
    if (!started) {
        started = RGuiAction.triggerByCommand("pl");
    }
    if (!started) {
        EAction.handleUserMessage("DOCFA Studio: comando Polilinea non disponibile.");
    }
    this.terminate();
};

StudioDocfaPolilinea.init = function(basePath) {
    var action = new RGuiAction(qsTr("DOCFA: &crea poligono classificato…"), RMainWindowQt.getMainWindow());
    action.setRequiresDocument(true);
    action.setScriptFile(basePath + "/StudioDocfaPolilinea.js");
    action.setDefaultCommands(["docfapoligono", "dpol", "dpl"]);
    action.setWidgetNames(["MiscMenu"]);
    action.setGroupSortOrder(165000);
    action.setSortOrder(30);
};
