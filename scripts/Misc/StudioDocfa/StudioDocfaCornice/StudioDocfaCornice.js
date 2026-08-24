/**
 * Gestione delle cornici standard dello Studio per le tavole DOCFA.
 *
 * Ogni cornice viene inserita come un blocco con nome controllato. Quando
 * l'operatore sceglie un nuovo formato / scala, vengono rimossi soltanto i
 * riferimenti ai blocchi di cornice creati da questo comando: il disegno, i
 * poligoni DOCFA, i layer e le altre entita' restano invariati.
 */
include("scripts/EAction.js");

var StudioDocfaCornicePrefix = "STUDIO_DOCFA_CORNICE_";
var StudioDocfaCornici = [
    { codice: "A4_100", etichetta: "A4 - scala 1:100" },
    { codice: "A4_200", etichetta: "A4 - scala 1:200" },
    { codice: "A4_500", etichetta: "A4 - scala 1:500" },
    { codice: "A3_100", etichetta: "A3 - scala 1:100" },
    { codice: "A3_200", etichetta: "A3 - scala 1:200" },
    { codice: "A3_500", etichetta: "A3 - scala 1:500" }
];

function studioDocfaCorniceFile(codice) {
    var relativePath = "/scripts/Misc/StudioDocfa/StudioDocfaCornice/Frames/" + codice + ".dxf";
    var dataPath = RSettings.getDataLocation();
    var candidates = [
        dataPath + relativePath,
        dataPath + "/QCAD Professional" + relativePath
    ];

    for (var i = 0; i < candidates.length; i++) {
        if (new QFileInfo(candidates[i]).exists()) {
            return candidates[i];
        }
    }
    // Restituisce comunque il percorso primario per produrre un messaggio di
    // errore utile se l'add-on fosse stato copiato senza le sue sei basi.
    return candidates[0];
}

function studioDocfaCorniciGestite(document) {
    var ids = document.queryAllEntities(false, false, RS.EntityAll);
    var riferimenti = [];

    for (var i = 0; i < ids.length; i++) {
        var entity = document.queryEntity(ids[i]);
        if (isNull(entity) || typeof entity.getReferencedBlockName !== "function") {
            continue;
        }

        var blockName = entity.getReferencedBlockName();
        if (blockName.indexOf(StudioDocfaCornicePrefix) === 0) {
            riferimenti.push(entity);
        }
    }
    return riferimenti;
}

function studioDocfaRimuoviCorniciGestite(documentInterface, riferimenti) {
    if (riferimenti.length === 0) {
        return 0;
    }

    var operation = new RDeleteObjectsOperation();
    for (var i = 0; i < riferimenti.length; i++) {
        operation.deleteObject(riferimenti[i]);
    }
    documentInterface.applyOperation(operation);
    return riferimenti.length;
}

function StudioDocfaCornice(guiAction) {
    EAction.call(this, guiAction);
}

StudioDocfaCornice.prototype = new EAction();

StudioDocfaCornice.prototype.beginEvent = function() {
    EAction.prototype.beginEvent.call(this);

    var document = this.getDocument();
    var documentInterface = this.getDocumentInterface();
    var riferimentiEsistenti = studioDocfaCorniciGestite(document);
    var labels = [];

    for (var i = 0; i < StudioDocfaCornici.length; i++) {
        labels.push(StudioDocfaCornici[i].etichetta);
    }
    labels.push("Rimuovi la cornice DOCFA inserita dal modulo");

    var scelta = QInputDialog.getItem(
        EAction.getMainWindow(),
        "DOCFA Studio - cornice modello",
        "Scegli il formato e la scala:",
        labels,
        0,
        false
    );

    // In alcune build Qt il selettore rapido puo' restituire la prima voce
    // anche dopo Annulla. La seconda conferma, con Annulla come predefinito,
    // impedisce che cio' provochi una modifica involontaria del disegno.
    var conferma = QMessageBox.question(
        EAction.getMainWindow(),
        "DOCFA Studio - conferma cornice",
        "Vuoi applicare questa scelta?\n\n" + scelta,
        QMessageBox.Yes | QMessageBox.Cancel,
        QMessageBox.Cancel
    );
    if (conferma !== QMessageBox.Yes) {
        this.terminate();
        return;
    }

    if (scelta === labels[labels.length - 1]) {
        var rimossi = studioDocfaRimuoviCorniciGestite(documentInterface, riferimentiEsistenti);
        var messaggioRimozione = rimossi === 0
            ? "DOCFA Studio: non ci sono cornici gestite dal modulo in questo disegno."
            : "DOCFA Studio: rimossa " + rimossi + " cornice DOCFA. Il disegno non e' stato modificato.";
        QMessageBox.information(EAction.getMainWindow(), "DOCFA Studio", messaggioRimozione);
        EAction.handleUserMessage(messaggioRimozione);
        this.terminate();
        return;
    }

    var cornice;
    for (var j = 0; j < StudioDocfaCornici.length; j++) {
        if (StudioDocfaCornici[j].etichetta === scelta) {
            cornice = StudioDocfaCornici[j];
            break;
        }
    }
    if (typeof cornice === "undefined") {
        EAction.handleUserMessage("DOCFA Studio: scelta cornice non riconosciuta.");
        this.terminate();
        return;
    }

    if (document.getUnit() !== RS.Meter) {
        var messaggioUnita = "DOCFA Studio: il disegno deve essere impostato in metri prima di inserire una cornice. "
            + "Nessuna modifica e' stata effettuata.";
        QMessageBox.warning(EAction.getMainWindow(), "DOCFA Studio", messaggioUnita);
        EAction.handleUserMessage(messaggioUnita);
        this.terminate();
        return;
    }

    var fileName = studioDocfaCorniceFile(cornice.codice);
    if (!new QFileInfo(fileName).exists()) {
        var messaggioFile = "DOCFA Studio: file della cornice non trovato:\n" + fileName;
        QMessageBox.warning(EAction.getMainWindow(), "DOCFA Studio", messaggioFile);
        EAction.handleUserMessage(messaggioFile);
        this.terminate();
        return;
    }

    // Carica la base in un documento isolato, quindi la inserisce come blocco
    // nell'origine 0,0 del disegno attivo. Non apre ne' sovrascrive il modello.
    var memoryStorage = new RMemoryStorage();
    var spatialIndex = createSpatialIndex();
    var documentCornice = new RDocument(memoryStorage, spatialIndex);
    var interfaceCornice = new RDocumentInterface(documentCornice);
    interfaceCornice.setNotifyListeners(false);
    var result = interfaceCornice.importFile(fileName, "", false);
    if (result !== RDocumentInterface.IoErrorNoError) {
        var messaggioImport = "DOCFA Studio: non riesco a leggere la cornice " + cornice.etichetta + ".";
        QMessageBox.warning(EAction.getMainWindow(), "DOCFA Studio", messaggioImport);
        EAction.handleUserMessage(messaggioImport);
        this.terminate();
        return;
    }

    // Prima inserisce la nuova cornice; solo dopo elimina le vecchie, in modo
    // che un errore di importazione non lasci mai il disegno senza riquadro.
    var pasteOperation = new RPasteOperation(documentCornice);
    pasteOperation.setText("Inserisci cornice DOCFA " + cornice.codice);
    pasteOperation.setOffset(new RVector(0, 0));
    pasteOperation.setBlockName(StudioDocfaCornicePrefix + cornice.codice);
    pasteOperation.setScale(1.0);
    pasteOperation.setRotation(0.0);
    documentInterface.applyOperation(pasteOperation);

    var rimossiPrecedenti = studioDocfaRimuoviCorniciGestite(documentInterface, riferimentiEsistenti);
    var messaggio = "DOCFA Studio: inserita cornice " + cornice.etichetta + " all'origine 0,0."
        + (rimossiPrecedenti > 0
            ? " Rimossa " + rimossiPrecedenti + " cornice precedente."
            : "")
        + " La cornice e' un blocco gestito: usa di nuovo DCORN per cambiarla o rimuoverla.";
    QMessageBox.information(EAction.getMainWindow(), "DOCFA Studio", messaggio);
    EAction.handleUserMessage(messaggio);
    this.terminate();
};

StudioDocfaCornice.init = function(basePath) {
    var action = new RGuiAction(qsTr("DOCFA: &cornice da modello..."), RMainWindowQt.getMainWindow());
    action.setRequiresDocument(true);
    action.setScriptFile(basePath + "/StudioDocfaCornice.js");
    action.setDefaultCommands(["docfacornice", "dcorn", "dcornice"]);
    action.setWidgetNames(["MiscMenu"]);
    action.setGroupSortOrder(165000);
    action.setSortOrder(15);
};
