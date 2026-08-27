const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const sourcePath = path.join(
    __dirname,
    "../scripts/Misc/StudioCadUI/StudioCadUI.js"
);
function loadStudioCadUI() {
    const sandbox = {
        include() {},
        includeBasePath: "",
        EAction: function EAction() {},
        isNull(value) {
            return value === undefined || value === null;
        }
    };
    sandbox.EAction.prototype = {
        keyPressEvent() {},
        keyReleaseEvent() {}
    };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(sourcePath, "utf8"), sandbox, {
        filename: sourcePath
    });
    return sandbox;
}

function editableField(name, overrides = {}) {
    return {
        objectName: name,
        visible: true,
        enabled: true,
        readOnly: false,
        ...overrides
    };
}

test("riconosce soltanto un primo carattere numerico", () => {
    const ui = loadStudioCadUI();

    for (const value of ["0", "7", ",", "."]) {
        assert.equal(ui.studioCadNumericInputCharacter(value), value);
    }
    for (const value of ["", "12", "a", "-", " "]) {
        assert.equal(ui.studioCadNumericInputCharacter(value), undefined);
    }
});

test("riconosce il tasto numerico fisico quando Qt espone un testo vuoto", () => {
    const ui = loadStudioCadUI();

    assert.equal(ui.studioCadNumericInputFromEvent({
        text() {
            return "";
        },
        key() {
            return 53;
        }
    }), "5");
});

test("installa il router sia in pressione sia al rilascio", () => {
    const ui = loadStudioCadUI();
    const operations = [];

    ui.EAction.prototype.keyPressEvent = function() {
        operations.push("press-originale");
    };
    ui.EAction.prototype.studioCadOriginalKeyPressEvent =
        ui.EAction.prototype.keyPressEvent;
    ui.EAction.prototype.keyPressEvent = function(event) {
        const router = ui.EAction.prototype.studioCadNumericKeyRouter;
        if (typeof router === "function" && router.call(this, event)) {
            return;
        }
        ui.EAction.prototype.studioCadOriginalKeyPressEvent.call(this, event);
    };
    ui.EAction.prototype.keyReleaseEvent = function() {
        operations.push("release-originale");
    };

    ui.studioCadInstallNumericFocusRouter();

    assert.equal(
        ui.EAction.prototype.studioCadNumericKeyRouter,
        ui.studioCadRouteNumericKey
    );
    assert.notEqual(
        ui.EAction.prototype.keyPressEvent,
        ui.EAction.prototype.studioCadOriginalKeyPressEvent
    );
    assert.equal(ui.EAction.prototype.studioCadNumericKeyReleaseRouter, undefined);
});

test("il router globale non duplica la prima cifra tra pressione e rilascio", () => {
    const ui = loadStudioCadUI();
    const inserted = [];
    let accepted = 0;
    const commandEdit = editableField("CommandEdit", {
        setFocus() {},
        insert(value) {
            inserted.push(value);
        }
    });

    ui.EAction.getMainWindow = function() {
        return {
            findChild(name) {
                if (name === "ToolButtonReset") {
                    return {checked: false};
                }
                if (name === "Options") {
                    return {findChildren() { return []; }};
                }
                if (name === "CommandEdit") {
                    return commandEdit;
                }
                return undefined;
            }
        };
    };

    const action = {};
    const event = {
        text() {
            return "5";
        },
        accept() {
            accepted += 1;
        }
    };
    assert.equal(ui.studioCadRouteNumericKey.call(action, event, "press"), true);
    assert.equal(ui.studioCadRouteNumericKey.call(action, event, "release"), true);
    assert.deepEqual(inserted, ["5"]);
    assert.equal(accepted, 2);
});

test("sceglie la prima casella numerica visibile e modificabile delle opzioni", () => {
    const ui = loadStudioCadUI();
    const hidden = editableField("Hidden", {visible: false});
    const disabled = editableField("Disabled", {enabled: false});
    const distance = editableField("Distance");
    const number = editableField("qt_spinbox_lineedit");
    const options = {
        findChildren(type) {
            assert.equal(type, "QLineEdit");
            return [hidden, disabled, distance, number];
        }
    };

    assert.equal(ui.studioCadFindNumericOption(options), distance);
});

test("Offset riceve la prima cifra in Distanza e sostituisce il valore predefinito", () => {
    const ui = loadStudioCadUI();
    const operations = [];
    let accepted = false;
    const distance = editableField("Distance", {
        setFocus() {
            operations.push("focus");
        },
        selectAll() {
            operations.push("selectAll");
        },
        insert(value) {
            operations.push("insert:" + value);
        }
    });
    const commandEdit = editableField("CommandEdit", {
        setFocus() {
            throw new Error("Offset non deve usare la riga comandi");
        }
    });
    const options = {
        findChildren() {
            return [distance];
        }
    };

    ui.EAction.getMainWindow = function() {
        return {
            findChild(name) {
                if (name === "ToolButtonReset") {
                    return {checked: false};
                }
                if (name === "Options") {
                    return options;
                }
                if (name === "CommandEdit") {
                    return commandEdit;
                }
                return undefined;
            }
        };
    };

    const routed = ui.studioCadRouteNumericKey({
        text() {
            return "3";
        },
        accept() {
            accepted = true;
        }
    });

    assert.equal(routed, true);
    assert.equal(accepted, true);
    assert.deepEqual(operations, ["focus", "selectAll", "insert:3"]);
});

test("senza opzioni numeriche usa la riga comandi del comando attivo", () => {
    const ui = loadStudioCadUI();
    const operations = [];
    const commandEdit = editableField("CommandEdit", {
        setFocus() {
            operations.push("focus");
        },
        insert(value) {
            operations.push("insert:" + value);
        }
    });

    ui.EAction.getMainWindow = function() {
        return {
            findChild(name) {
                if (name === "ToolButtonReset") {
                    return {checked: false};
                }
                if (name === "Options") {
                    return {findChildren() { return []; }};
                }
                if (name === "CommandEdit") {
                    return commandEdit;
                }
                return undefined;
            }
        };
    };

    assert.equal(ui.studioCadRouteNumericKey({
        text() {
            return "5";
        },
        accept() {}
    }), true);
    assert.deepEqual(operations, ["focus", "insert:5"]);
});

test("a comando inattivo non cattura i numeri", () => {
    const ui = loadStudioCadUI();
    ui.EAction.getMainWindow = function() {
        return {
            findChild(name) {
                if (name === "ToolButtonReset") {
                    return {checked: true};
                }
                throw new Error("Nessun campo va cercato a comando inattivo");
            }
        };
    };

    assert.equal(ui.studioCadRouteNumericKey({
        text() {
            return "8";
        }
    }), false);
});

test("ORTO persistente usa direttamente il blocco snap del documento", () => {
    const ui = loadStudioCadUI();
    const operations = [];
    let locked = false;
    const documentInterface = {
        isSnapLocked() {
            return locked;
        },
        lockSnap() {
            operations.push("lock");
            locked = true;
        },
        unlockSnap() {
            operations.push("unlock");
            locked = false;
        }
    };
    ui.RMainWindowQt = {
        getMainWindow() {
            return {
                getDocumentInterface() {
                    return documentInterface;
                }
            };
        }
    };

    assert.equal(ui.studioCadSetSnapLock(true), true);
    assert.equal(ui.studioCadSetSnapLock(true), true);
    assert.deepEqual(operations, ["lock"]);

    assert.equal(ui.studioCadSetSnapLock(false), true);
    assert.deepEqual(operations, ["lock", "unlock"]);
});

test("EO ed EN pilotano i bottoni nativi di restrizione con blocco snap", () => {
    const source = fs.readFileSync(sourcePath, "utf8");
    assert.match(source, /command:"eo", target:"ToolButtonRestrictOrthogonal", snapLock:true/);
    assert.match(source, /target:"ToolButtonRestrictOff", command:"en"/);
    assert.match(source, /target:"ToolButtonSnapFree", command:"sf"/);
    assert.match(source, /function studioCadSetSnapLock/);
});
