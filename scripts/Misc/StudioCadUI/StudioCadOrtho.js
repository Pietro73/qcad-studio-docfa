/** Attiva ORTO e lo mantiene bloccato fino al comando LIBERO. */
include("scripts/EAction.js");
include("StudioCadMode.js");

function StudioCadOrtho(guiAction) {
    EAction.call(this, guiAction);
}

StudioCadOrtho.prototype = new EAction();

StudioCadOrtho.prototype.beginEvent = function() {
    EAction.prototype.beginEvent.call(this);

    // Non richiamiamo EO perché è l'alias di questa stessa azione. Il nome
    // lungo attiva la restrizione nativa QCAD senza creare ricorsione.
    var activated = RGuiAction.triggerByCommand("restrictorthogonal");
    if (!activated) {
        var button = EAction.getMainWindow().findChild(
            "ToolButtonRestrictOrthogonal"
        );
        if (!isNull(button)) {
            button.click();
            activated = true;
        }
    }

    if (!activated || !studioCadSetSnapLock(true)) {
        EAction.handleUserWarning(qsTr(
            "Studio CAD: impossibile attivare ORTO persistente."
        ));
    }
    else {
        StudioCadUI.lastRestrictionState = "ortho";
        studioCadRefreshModeButtons();
        EAction.handleUserMessage(qsTr("Studio CAD: ORTO persistente attivo"));
    }
    this.terminate();
};
