/**
 * Studio DOCFA - strumenti QCAD di pre-controllo e redazione guidata.
 *
 * Il modulo non invia file e non sostituisce DOCFA: fornisce solo comandi
 * locali per partire dai modelli dello Studio e intercettare errori tecnici
 * prima dell'esportazione raster della scheda.
 */
include("scripts/Misc/Misc.js");

function StudioDocfa(guiAction) {
    Misc.call(this, guiAction);
}

StudioDocfa.prototype = new Misc();
StudioDocfa.includeBasePath = includeBasePath;

StudioDocfa.getTitle = function() {
    return qsTr("&DOCFA Studio");
};

StudioDocfa.prototype.getTitle = function() {
    return StudioDocfa.getTitle();
};

StudioDocfa.getMenu = function() {
    return EAction.getSubMenu(
        Misc.getMenu(),
        165000,
        10,
        StudioDocfa.getTitle(),
        "StudioDocfaMenu"
    );
};

StudioDocfa.init = function() {
    // Le azioni sono esposte direttamente in Varie come "DOCFA: ...".
    // Evitiamo di creare un sottomenu vuoto se una versione di QCAD cambia
    // l'ordine di inizializzazione degli add-on locali.
};
