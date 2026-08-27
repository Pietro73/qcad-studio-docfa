const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const sourcePath = path.join(
    __dirname,
    "../scripts/Misc/StudioCadUI/StudioCadScala.js"
);

function loadScalaHelpers() {
    // Sandbox minimo: il file usa l'API QCAD solo dentro i metodi dell'azione,
    // gli helper testati qui sono funzioni pure.
    const sandbox = {
        include() {},
        includeBasePath: "",
        qsTr(text) { return text; },
        isNull(value) { return value === undefined || value === null; },
        Scale: function Scale() {},
        Transform: function Transform() {},
        EAction: function EAction() {},
        RS: { PointTolerance: 1.0e-9 }
    };
    sandbox.Scale.prototype = {};
    sandbox.Scale.State = { SettingFocusPoint: 0, SettingReferencePoint: 1 };
    sandbox.Transform.prototype = {};
    sandbox.EAction.handleUserWarning = function() {};
    sandbox.EAction.getMainWindow = function() { return undefined; };

    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(sourcePath, "utf8"), sandbox);
    return sandbox;
}

const helpers = loadScalaHelpers();

test("parse numero: fattori validi con punto e virgola", () => {
    assert.equal(helpers.studioCadScalaParseNumero("2"), 2);
    assert.equal(helpers.studioCadScalaParseNumero("0.5"), 0.5);
    assert.equal(helpers.studioCadScalaParseNumero("0,5"), 0.5);
    assert.equal(helpers.studioCadScalaParseNumero(" 5,70 "), 5.7);
    assert.equal(helpers.studioCadScalaParseNumero(",25"), 0.25);
});

test("parse numero: rifiuta zero, negativi e testo", () => {
    assert.equal(helpers.studioCadScalaParseNumero("0"), undefined);
    assert.equal(helpers.studioCadScalaParseNumero("-1"), undefined);
    assert.equal(helpers.studioCadScalaParseNumero("abc"), undefined);
    assert.equal(helpers.studioCadScalaParseNumero("1,2,3"), undefined);
    assert.equal(helpers.studioCadScalaParseNumero(""), undefined);
    assert.equal(helpers.studioCadScalaParseNumero(undefined), undefined);
});

test("comando riferimento: R, r, rif con spazi", () => {
    assert.equal(helpers.studioCadScalaComandoRiferimento("R"), true);
    assert.equal(helpers.studioCadScalaComandoRiferimento("r"), true);
    assert.equal(helpers.studioCadScalaComandoRiferimento(" rif "), true);
    assert.equal(helpers.studioCadScalaComandoRiferimento("2"), false);
    assert.equal(helpers.studioCadScalaComandoRiferimento(""), false);
    assert.equal(helpers.studioCadScalaComandoRiferimento(undefined), false);
});

test("fattore da riferimento: caso reale quota 570", () => {
    // Quota misurata sull'immagine 3.02 unita', quota vera 5.70 metri.
    const fattore = helpers.studioCadScalaFattoreDaRiferimento(3.02, 5.70, 1.0e-9);
    assert.ok(Math.abs(fattore - 1.887417) < 1.0e-5);
});

test("fattore da riferimento: guardie su distanze degeneri", () => {
    const tol = 1.0e-9;
    assert.equal(helpers.studioCadScalaFattoreDaRiferimento(0, 5, tol), undefined);
    assert.equal(helpers.studioCadScalaFattoreDaRiferimento(tol / 2, 5, tol), undefined);
    assert.equal(helpers.studioCadScalaFattoreDaRiferimento(3, 0, tol), undefined);
    assert.equal(helpers.studioCadScalaFattoreDaRiferimento(NaN, 5, tol), undefined);
});

test("caratteri instradabili: cifre sempre, R solo in fase fattore", () => {
    assert.equal(helpers.studioCadScalaCarattereInput("5", false), "5");
    assert.equal(helpers.studioCadScalaCarattereInput(",", true), ",");
    assert.equal(helpers.studioCadScalaCarattereInput("r", true), "r");
    assert.equal(helpers.studioCadScalaCarattereInput("R", true), "R");
    assert.equal(helpers.studioCadScalaCarattereInput("r", false), undefined);
    assert.equal(helpers.studioCadScalaCarattereInput("x", true), undefined);
    assert.equal(helpers.studioCadScalaCarattereInput("12", true), undefined);
});
