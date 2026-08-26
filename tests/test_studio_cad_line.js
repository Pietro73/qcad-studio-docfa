const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const sourcePath = path.join(
    __dirname,
    "../scripts/Misc/StudioCadUI/StudioCadLine.js"
);

function loadLineHelpers() {
    const sandbox = {
        include() {},
        includeBasePath: "",
        Line2P: function Line2P() {},
        EAction: function EAction() {},
        isNull(value) {
            return value === undefined || value === null;
        },
        isVector(value) {
            return value !== undefined && value !== null &&
                Number.isFinite(value.x) && Number.isFinite(value.y);
        },
        RVector: function RVector(x, y) {
            this.x = x;
            this.y = y;
        }
    };
    sandbox.Line2P.prototype = {};
    sandbox.EAction.prototype = {};
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(sourcePath, "utf8"), sandbox, {
        filename: sourcePath
    });
    return sandbox;
}

test("interpreta distanze positive con punto o virgola", () => {
    const helpers = loadLineHelpers();
    assert.equal(helpers.studioCadParseDistance("3"), 3);
    assert.equal(helpers.studioCadParseDistance(" 3,5 "), 3.5);
    assert.equal(helpers.studioCadParseDistance(".25"), 0.25);
});

test("rifiuta distanze ambigue, nulle o negative", () => {
    const helpers = loadLineHelpers();
    for (const value of ["", "abc", "3m", "0", "-2", "3,2,1"]) {
        assert.equal(helpers.studioCadParseDistance(value), undefined);
    }
});

test("in ORTO usa l'asse dominante e il verso del mouse", () => {
    const helpers = loadLineHelpers();
    const right = helpers.studioCadResolveDirectedEnd(
        {x: 0, y: 0}, {x: 8, y: 1}, 3, true
    );
    assert.equal(right.x, 3);
    assert.equal(right.y, 0);

    const down = helpers.studioCadResolveDirectedEnd(
        {x: 3, y: 0}, {x: 3.1, y: -9}, 5, true
    );
    assert.equal(down.x, 3);
    assert.equal(down.y, -5);
});

test("la sequenza 3, 5, 3, 5 chiude una stanza rettangolare", () => {
    const helpers = loadLineHelpers();
    let point = {x: 0, y: 0};
    point = helpers.studioCadResolveDirectedEnd(point, {x: 10, y: 0}, 3, true);
    point = helpers.studioCadResolveDirectedEnd(point, {x: 3, y: 10}, 5, true);
    point = helpers.studioCadResolveDirectedEnd(point, {x: -10, y: 5}, 3, true);
    point = helpers.studioCadResolveDirectedEnd(point, {x: 0, y: -10}, 5, true);
    assert.equal(point.x, 0);
    assert.equal(point.y, 0);
});

test("in LIBERO mantiene la direzione esatta del mouse", () => {
    const helpers = loadLineHelpers();
    const end = helpers.studioCadResolveDirectedEnd(
        {x: 0, y: 0}, {x: 3, y: 4}, 10, false
    );
    assert.equal(end.x, 6);
    assert.equal(end.y, 8);
});

test("non crea un segmento senza una direzione del mouse", () => {
    const helpers = loadLineHelpers();
    assert.equal(
        helpers.studioCadResolveDirectedEnd(
            {x: 1, y: 1}, {x: 1, y: 1}, 3, true
        ),
        undefined
    );
});

test("riconosce la prima cifra della distanza digitata sopra il disegno", () => {
    const helpers = loadLineHelpers();

    for (const value of ["0", "3", ",", "."]) {
        assert.equal(helpers.studioCadDistanceInputCharacter(value), value);
    }
    for (const value of ["", "12", "a", "-", " "]) {
        assert.equal(helpers.studioCadDistanceInputCharacter(value), undefined);
    }
});

test("la pressione della prima cifra mette a fuoco la riga comandi senza perderla", () => {
    const helpers = loadLineHelpers();
    const inserted = [];
    let focused = false;
    let accepted = false;
    let delegated = false;

    helpers.Line2P.State = {SettingNextPoint: 2};
    helpers.Line2P.prototype.keyPressEvent = function() {
        delegated = true;
    };
    helpers.EAction.getMainWindow = function() {
        return {
            findChild(name) {
                assert.equal(name, "CommandEdit");
                return {
                    setFocus() {
                        focused = true;
                    },
                    insert(value) {
                        inserted.push(value);
                    }
                };
            }
        };
    };

    const action = Object.create(helpers.StudioCadLine.prototype);
    action.state = helpers.Line2P.State.SettingNextPoint;
    action.keyPressEvent({
        text() {
            return "3";
        },
        accept() {
            accepted = true;
        }
    });

    assert.equal(focused, true);
    assert.deepEqual(inserted, ["3"]);
    assert.equal(accepted, true);
    assert.equal(delegated, false);
});

test("pressione e rilascio della stessa cifra non la duplicano", () => {
    const helpers = loadLineHelpers();
    const inserted = [];
    let accepted = 0;

    helpers.Line2P.State = {SettingNextPoint: 2};
    helpers.Line2P.prototype.keyPressEvent = function() {};
    helpers.Line2P.prototype.keyReleaseEvent = function() {};
    helpers.EAction.getMainWindow = function() {
        return {
            findChild() {
                return {
                    setFocus() {},
                    insert(value) {
                        inserted.push(value);
                    }
                };
            }
        };
    };

    const action = Object.create(helpers.StudioCadLine.prototype);
    action.state = helpers.Line2P.State.SettingNextPoint;
    const event = {
        text() {
            return "3";
        },
        accept() {
            accepted += 1;
        }
    };
    action.keyPressEvent(event);
    action.keyReleaseEvent(event);

    assert.deepEqual(inserted, ["3"]);
    assert.equal(accepted, 2);
});

test("il rilascio del tasto fisico viene riconosciuto anche senza testo Qt", () => {
    const helpers = loadLineHelpers();
    const inserted = [];

    helpers.Line2P.State = {SettingNextPoint: 2};
    helpers.Line2P.prototype.keyReleaseEvent = function() {};
    helpers.EAction.getMainWindow = function() {
        return {
            findChild() {
                return {
                    setFocus() {},
                    insert(value) {
                        inserted.push(value);
                    }
                };
            }
        };
    };

    const action = Object.create(helpers.StudioCadLine.prototype);
    action.state = helpers.Line2P.State.SettingNextPoint;
    action.point2Cursor = {x: 8, y: 1};
    action.keyReleaseEvent({
        text() {
            return "";
        },
        key() {
            return 51;
        },
        accept() {}
    });

    assert.deepEqual(inserted, ["3"]);
    assert.equal(action.studioCadDirectionPoint, action.point2Cursor);
});

test("riconosce anche un codice tasto Qt esposto come proprieta", () => {
    const helpers = loadLineHelpers();
    assert.equal(helpers.studioCadDistanceInputFromEvent({
        text: "",
        key: 49
    }), "1");
});

test("la prima distanza usa la direzione memorizzata prima del cambio di focus", () => {
    const helpers = loadLineHelpers();
    let accepted = false;
    let endPoint;

    helpers.Line2P.State = {SettingNextPoint: 2};
    const action = Object.create(helpers.StudioCadLine.prototype);
    action.state = helpers.Line2P.State.SettingNextPoint;
    action.point1 = {x: 0, y: 0};
    action.point2Cursor = {x: 0, y: 0};
    action.studioCadDirectionPoint = {x: 8, y: 1};
    action.isOrthogonalRestrictionActive = function() {
        return true;
    };
    action.pickCoordinate = function(event, preview) {
        assert.equal(preview, false);
        endPoint = event.getModelPosition();
    };

    action.commandEvent({
        getCommand() {
            return "3";
        },
        accept() {
            accepted = true;
        }
    });

    assert.equal(endPoint.x, 3);
    assert.equal(endPoint.y, 0);
    assert.equal(accepted, true);
    assert.equal(action.studioCadDirectionPoint, undefined);
});

test("il rilascio dei tasti non numerici resta gestito normalmente da QCAD", () => {
    const helpers = loadLineHelpers();
    let delegated = false;

    helpers.Line2P.State = {SettingNextPoint: 2};
    helpers.Line2P.prototype.keyReleaseEvent = function() {
        delegated = true;
    };
    helpers.EAction.getMainWindow = function() {
        throw new Error("La riga comandi non va cercata per un tasto non numerico");
    };

    const action = Object.create(helpers.StudioCadLine.prototype);
    action.state = helpers.Line2P.State.SettingNextPoint;
    action.keyReleaseEvent({
        text() {
            return "a";
        }
    });

    assert.equal(delegated, true);
});
