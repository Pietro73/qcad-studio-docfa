/** Copia senza dialogo: mantiene sempre l'originale e crea una sola copia. */
include("scripts/Modify/Translate/Translate.js");

function StudioCadCopy(guiAction) {
    Translate.call(this, guiAction);
    this.copy = true;
    this.copies = 1;
    this.useCurrentAttributes = false;
}

StudioCadCopy.prototype = new Translate();
StudioCadCopy.includeBasePath = includeBasePath;

StudioCadCopy.prototype.beginEvent = function() {
    // Reimposta ad ogni esecuzione: le opzioni del comando MV non possono
    // trasformare involontariamente CO in uno spostamento.
    this.copy = true;
    this.copies = 1;
    this.useCurrentAttributes = false;
    Translate.prototype.beginEvent.call(this);
};
