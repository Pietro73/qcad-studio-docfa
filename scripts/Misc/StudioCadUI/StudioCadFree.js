/** Disattiva ORTO persistente e ripristina lo snap libero. */
include("scripts/EAction.js");
include("StudioCadMode.js");

function StudioCadFree(guiAction) {
    EAction.call(this, guiAction);
}

StudioCadFree.prototype = new EAction();

StudioCadFree.prototype.beginEvent = function() {
    EAction.prototype.beginEvent.call(this);

    studioCadSetSnapLock(false);
    var released = RGuiAction.triggerByCommand("restrictoff");
    var snapFree = RGuiAction.triggerByCommand("snapfree");
    var appWin = EAction.getMainWindow();

    if (!released) {
        var offButton = appWin.findChild("ToolButtonRestrictOff");
        if (!isNull(offButton)) {
            offButton.click();
            released = true;
        }
    }
    if (!snapFree) {
        var freeButton = appWin.findChild("ToolButtonSnapFree");
        if (!isNull(freeButton)) {
            freeButton.click();
            snapFree = true;
        }
    }

    if (!released || !snapFree) {
        EAction.handleUserWarning(qsTr(
            "Studio CAD: impossibile completare il passaggio a LIBERO."
        ));
    }
    else {
        StudioCadUI.lastRestrictionState = "free";
        studioCadRefreshModeButtons();
        EAction.handleUserMessage(qsTr("Studio CAD: modalita LIBERA attiva"));
    }
    this.terminate();
};
