/** Promemoria operativo: non modifica il disegno. */
include("scripts/EAction.js");

function StudioDocfaGuida(guiAction) {
    EAction.call(this, guiAction);
}

StudioDocfaGuida.prototype = new EAction();

StudioDocfaGuida.prototype.beginEvent = function() {
    EAction.prototype.beginEvent.call(this);
    var message = "POLIGONI DOCFA IN QCAD\n\n"
        + "Il layer tecnico e' uno solo: Docfa_Poligoni. La categoria e' il colore DXF della polilinea, non un layer diverso.\n\n"
        + "A/A1 = 1   | A2 = 8   | B = 2   | C = 3\n"
        + "D = 4      | E = 5    | F = 6   | G = 7\n\n"
        + "1. Apri il modello A4/A3 nella scala necessaria e lavora in metri.\n"
        + "2. Digita DPOL (o scegli Varie > DOCFA: crea poligono classificato), scegli la categoria, disegna il perimetro reale e seleziona Chiudi.\n"
        + "3. Digita DCHK per controllare layer, chiusura e colori 1..8.\n"
        + "4. Completa sempre dati, tavola e controlli nella procedura DOCFA ufficiale.\n\n"
        + "QCAD prepara e controlla il disegno: non certifica ne' invia la pratica DOCFA.";
    QMessageBox.information(RMainWindowQt.getMainWindow(), "DOCFA Studio", message);
    EAction.handleUserMessage(message.replace(/\n/g, " "));
    this.terminate();
};

StudioDocfaGuida.init = function(basePath) {
    var action = new RGuiAction(qsTr("DOCFA: &guida flusso"), RMainWindowQt.getMainWindow());
    action.setRequiresDocument(false);
    action.setScriptFile(basePath + "/StudioDocfaGuida.js");
    // "DG" e' gia' il comando nativo di quota lunghezza arco di QCAD.
    action.setDefaultCommands(["docfaguida", "dguida"]);
    action.setWidgetNames(["MiscMenu"]);
    action.setGroupSortOrder(165000);
    action.setSortOrder(20);
};
