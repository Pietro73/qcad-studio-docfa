const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const sourcePath = path.join(
    __dirname,
    "../scripts/Misc/StudioCadUI/StudioCadUI.js"
);
const iconDir = path.join(
    __dirname,
    "../scripts/Misc/StudioCadUI/icons"
);

function loadStudioCadUI(missingPaths = []) {
    const loadedPaths = [];
    const sandbox = {
        include() {},
        includeBasePath: "",
        EAction: function EAction() {},
        QIcon: function QIcon(iconPath) {
            loadedPaths.push(iconPath);
            this.isNull = function() {
                return missingPaths.includes(iconPath);
            };
        },
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
    sandbox.loadedPaths = loadedPaths;
    return sandbox;
}

test("mantiene intatti i percorsi risorsa Qt e risolve le icone locali", () => {
    const ui = loadStudioCadUI();
    assert.equal(
        ui.studioCadResolveIconPath(":scripts/Draw/Test.svg", "/plugin"),
        ":scripts/Draw/Test.svg"
    );
    assert.equal(
        ui.studioCadResolveIconPath("draw.svg", "/plugin"),
        "/plugin/icons/draw.svg"
    );
});
test("su Linux carica QIcon direttamente e usa il fallback portabile", () => {
    const primary = ":scripts/Draw/Line/Line2P/Line2P-inverse.svg";
    const ui = loadStudioCadUI([primary]);
    const icon = ui.studioCadLoadIcon({
        icon: primary,
        fallbackIcon: "draw.svg"
    }, "/plugin");

    assert.equal(icon.isNull(), false);
    assert.deepEqual(ui.loadedPaths, [primary, "/plugin/icons/draw.svg"]);
});

test("tutte le icone locali richiamate dal codice sono incluse e sono SVG", () => {
    const source = fs.readFileSync(sourcePath, "utf8");
    const names = new Set();
    for (const match of source.matchAll(/(?:icon|fallbackIcon):\s*"([^":/]+\.svg)"/g)) {
        names.add(match[1]);
    }
    for (const match of source.matchAll(/basePath,\s*"([^":/]+\.svg)"\)/g)) {
        names.add(match[1]);
    }

    assert.ok(names.size >= 10, "la palette deve includere le proprie icone");
    for (const name of names) {
        const file = path.join(iconDir, name);
        assert.ok(fs.existsSync(file), `icona mancante: ${name}`);
        assert.match(fs.readFileSync(file, "utf8"), /<svg\b/);
    }
});
