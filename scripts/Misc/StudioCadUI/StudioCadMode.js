/** Funzioni condivise per ORTO persistente, LIBERO e stato della palette. */

function studioCadSetSnapLock(enabled) {
    var appWin = RMainWindowQt.getMainWindow();
    var di = appWin.getDocumentInterface();
    if (isNull(di)) {
        return false;
    }

    // Il blocco viene applicato al documento, non alla sola icona: in questo
    // modo ORTO resta attivo anche tra un tratto e il successivo.
    if (di.isSnapLocked() !== enabled) {
        if (enabled) {
            di.lockSnap();
        }
        else {
            di.unlockSnap();
        }
    }
    return di.isSnapLocked() === enabled;
}
function studioCadRestrictionState() {
    var di = EAction.getMainWindow().getDocumentInterface();
    if (isNull(di)) {
        return "none";
    }

    var restriction = di.getSnapRestriction();
    var restrictionName = isNull(restriction) ? "" : String(restriction);
    if (restrictionName.indexOf("RRestrictOrthogonal") !== -1) {
        return "ortho";
    }
    if (restrictionName.indexOf("RRestrictOff") !== -1) {
        return "free";
    }
    return "other";
}

function studioCadRefreshModeButtons() {
    var appWin = EAction.getMainWindow();
    var orthoButton = appWin.findChild("StudioCadButton_OrthoOn");
    var freeButton = appWin.findChild("StudioCadButton_Free");

    var detectedState = studioCadRestrictionState();
    // Ignora gli stati intermedi esposti per pochi istanti durante il cambio
    // comando: evita il lampeggio dell'evidenziazione.
    if (detectedState === "ortho" || detectedState === "free") {
        StudioCadUI.lastRestrictionState = detectedState;
    }
    var restrictionState = StudioCadUI.lastRestrictionState;
    var orthoActive = restrictionState === "ortho";
    var freeActive = restrictionState === "free";

    if (!isNull(orthoButton)) {
        if (orthoButton.checked !== orthoActive) {
            orthoButton.checked = orthoActive;
        }
        var orthoToolTip = orthoActive ?
            qsTr("ORTO ATTIVO - resta attivo finche non premi LIBERO") :
            qsTr("ORTO disattivo - premi per attivarlo in modo persistente");
        if (orthoButton.toolTip !== orthoToolTip) {
            orthoButton.toolTip = orthoToolTip;
        }
    }
    if (!isNull(freeButton)) {
        if (freeButton.checked !== freeActive) {
            freeButton.checked = freeActive;
        }
        var freeToolTip = freeActive ?
            qsTr("LIBERO ATTIVO - ORTO disattivato") :
            qsTr("LIBERO - premi per disattivare ORTO e lo snap forzato");
        if (freeButton.toolTip !== freeToolTip) {
            freeButton.toolTip = freeToolTip;
        }
    }
}
