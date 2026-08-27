/**
 * Studio CAD UI
 *
 * Palette verticale di comandi diretti, organizzata come un pannello CAD.
 * Il pannello non modifica il documento: avvia esclusivamente azioni QCAD.
 */
include("scripts/EAction.js");
include("StudioCadMode.js");

function StudioCadUI(guiAction) {
    EAction.call(this, guiAction);
}

StudioCadUI.prototype = new EAction();
StudioCadUI.includeBasePath = includeBasePath;

function studioCadNumericInputCharacter(value) {
    if (typeof value !== "string" || value.length !== 1) {
        return undefined;
    }
    if (!/^[0-9.,]$/.test(value)) {
        return undefined;
    }
    return value;
}

function studioCadNumericInputFromEvent(event) {
    var text = typeof event.text === "function" ? event.text() : event.text;
    if (typeof text !== "string") {
        text = "";
    }
    var character = studioCadNumericInputCharacter(text);
    if (!isNull(character)) {
        return character;
    }
    if (text !== "") {
        return undefined;
    }
    var key = typeof event.key === "function" ? event.key() : event.key;
    if (!isNull(key) && typeof key.valueOf === "function") {
        key = key.valueOf();
    }
    key = Number(key);
    if (key >= 48 && key <= 57) {
        return String.fromCharCode(key);
    }
    if (key === 44) {
        return ",";
    }
    if (key === 46) {
        return ".";
    }
    return undefined;
}

function studioCadWidgetFlag(widget, name, fallback) {
    var value = widget[name];
    if (typeof value === "function") {
        value = value.call(widget);
    }
    if (isNull(value)) {
        return fallback;
    }
    return value === true;
}

function studioCadFindNumericOption(options) {
    if (isNull(options)) {
        return undefined;
    }

    // I campi principali delle opzioni QCAD (Distance, Angle, Radius, ecc.)
    // sono QLineEdit o sottoclassi. L'ordine dei figli segue quello visivo:
    // per Offset, Distance precede il contatore Number.
    var fields = options.findChildren("QLineEdit");
    for (var i=0; i<fields.length; i++) {
        var field = fields[i];
        if (studioCadWidgetFlag(field, "visible", true) &&
                studioCadWidgetFlag(field, "enabled", true) &&
                !studioCadWidgetFlag(field, "readOnly", false)) {
            return field;
        }
    }
    return undefined;
}

function studioCadRouteNumericKey(event, phase) {
    var character = studioCadNumericInputFromEvent(event);
    if (isNull(character)) {
        return false;
    }

    if (phase === "release" &&
            this.studioCadNumericKeyHandledOnPress === character) {
        this.studioCadNumericKeyHandledOnPress = undefined;
        event.accept();
        return true;
    }

    var appWin = EAction.getMainWindow();
    var resetButton = appWin.findChild("ToolButtonReset");
    if (!isNull(resetButton) && resetButton.checked === true) {
        return false;
    }

    var target = studioCadFindNumericOption(appWin.findChild("Options"));
    if (!isNull(target)) {
        target.setFocus();
        // Il primo numero sostituisce il valore predefinito (es. 4.3 di
        // Offset), come avviene nella digitazione dinamica di AutoCAD.
        target.selectAll();
        target.insert(character);
        if (phase === "press") {
            this.studioCadNumericKeyHandledOnPress = character;
        }
        event.accept();
        return true;
    }

    var commandEdit = appWin.findChild("CommandEdit");
    if (!isNull(commandEdit)) {
        commandEdit.setFocus();
        commandEdit.insert(character);
        if (phase === "press") {
            this.studioCadNumericKeyHandledOnPress = character;
        }
        event.accept();
        return true;
    }
    return false;
}

function studioCadInstallNumericFocusRouter() {
    // La combinazione Qt/macOS varia tra tastiere: alcune consegnano la prima
    // cifra in KeyPress, altre soltanto in KeyRelease. Installiamo entrambi i
    // percorsi, con deduplicazione, senza creare wrapper annidati ai reload.
    if (isNull(EAction.prototype.studioCadOriginalKeyPressEvent)) {
        EAction.prototype.studioCadOriginalKeyPressEvent =
            EAction.prototype.keyPressEvent;
    }
    EAction.prototype.keyPressEvent = function(event) {
        var router = EAction.prototype.studioCadNumericKeyRouter;
        if (typeof router === "function" &&
                router.call(this, event, "press")) {
            return;
        }
        EAction.prototype.studioCadOriginalKeyPressEvent.call(this, event);
    };

    if (isNull(EAction.prototype.studioCadOriginalKeyReleaseEvent)) {
        EAction.prototype.studioCadOriginalKeyReleaseEvent =
            EAction.prototype.keyReleaseEvent;
        EAction.prototype.keyReleaseEvent = function(event) {
            var router = EAction.prototype.studioCadNumericKeyRouter;
            if (typeof router === "function" &&
                    router.call(this, event, "release")) {
                return;
            }
            EAction.prototype.studioCadOriginalKeyReleaseEvent.call(this, event);
        };
    }
    EAction.prototype.studioCadNumericKeyRouter = studioCadRouteNumericKey;
    EAction.prototype.studioCadNumericKeyReleaseRouter = undefined;
}

function studioCadRunStep(step) {
    // I pulsanti delle toolbar native possono esistere anche quando la toolbar
    // e' nascosta: il click in quel caso non attiva sempre il comando. Avviare
    // prima l'azione QCAD tramite il relativo alias mantiene ORTO e OSNAP
    // funzionanti anche dalla palette Studio CAD.
    if (!isNull(step.command) && RGuiAction.triggerByCommand(step.command)) {
        return true;
    }

    var appWin = EAction.getMainWindow();
    if (!isNull(step.target)) {
        var nativeButton = appWin.findChild(step.target);
        if (!isNull(nativeButton)) {
            nativeButton.click();
            return true;
        }
    }
    return false;
}

function studioCadTrigger(definition) {
    return function() {
        if (!isNull(definition.category) && !isNaN(definition.category)) {
            RSettings.setValue("StudioDocfa/NextCategoryIndex", definition.category);
        }

        if (definition.snapLock === false) {
            studioCadSetSnapLock(false);
        }

        var steps = definition.steps;
        if (isNull(steps)) {
            steps = [{target:definition.target, command:definition.command}];
        }

        var failed = [];
        for (var i=0; i<steps.length; i++) {
            if (!studioCadRunStep(steps[i])) {
                failed.push(steps[i].command);
            }
        }
        if (failed.length > 0) {
            EAction.handleUserWarning(qsTr("Command not available: ") + failed.join(", "));
            return;
        }
        if (definition.snapLock === true && !studioCadSetSnapLock(true)) {
            EAction.handleUserWarning(qsTr("Impossibile mantenere ORTO bloccato."));
            return;
        }
        if (definition.restrictionState === "ortho" ||
                definition.restrictionState === "free") {
            StudioCadUI.lastRestrictionState = definition.restrictionState;
        }
        if (!isNull(definition.message)) {
            EAction.handleUserMessage(definition.message);
        }
        studioCadRefreshModeButtons();
    };
}

function studioCadResolveIconPath(iconPath, basePath) {
    if (iconPath.indexOf(":scripts/") === 0 ||
            iconPath.indexOf(":/scripts/") === 0) {
        var relativePath = iconPath.replace(/^:\/*/, "");
        var appPath = RSettings.getApplicationPath();
        var filePath = appPath + "/" + relativePath;
        var fileInfo = new QFileInfo(filePath);
        if (fileInfo.exists() && fileInfo.isFile()) {
            return filePath;
        }
    }
    if (iconPath.indexOf(":") === 0 || iconPath.indexOf("/") === 0) {
        return iconPath;
    }
    return basePath + "/icons/" + iconPath;
}

function studioCadIconIsNull(icon) {
    if (isNull(icon)) {
        return true;
    }
    if (typeof icon.isNull === "function") {
        return icon.isNull();
    }
    return icon.isNull === true;
}

function studioCadPngFallbackPath(iconPath) {
    if (iconPath.match(/\.svg$/i)) {
        return iconPath.replace(/\.svg$/i, ".png");
    }
    return undefined;
}

function studioCadIconHasPixmap(icon) {
    if (studioCadIconIsNull(icon)) {
        return false;
    }
    try {
        var pixmap = icon.pixmap(new QSize(24, 24));
        if (!isNull(pixmap)) {
            if (typeof pixmap.isNull === "function") {
                return !pixmap.isNull();
            }
            if (!isNull(pixmap.isNull)) {
                return pixmap.isNull !== true;
            }
        }
    }
    catch (e) {
        return true;
    }
    return true;
}

function studioCadLoadIconPath(iconPath) {
    var icon = new QIcon(iconPath);
    if (studioCadIconHasPixmap(icon)) {
        return icon;
    }

    var pngPath = studioCadPngFallbackPath(iconPath);
    if (!isNull(pngPath)) {
        icon = new QIcon(pngPath);
        if (studioCadIconHasPixmap(icon)) {
            return icon;
        }
    }
    return icon;
}

function studioCadLoadIcon(definition, basePath) {
    var iconPath = studioCadResolveIconPath(definition.icon, basePath);

    // Nelle build Linux le icone QCAD possono essere file reali sotto la
    // cartella applicazione oppure risorse Qt. Alcuni QIcon non nulli non
    // producono pixmap: in quel caso passa al fallback locale, prima SVG e
    // poi PNG pre-renderizzato per le build senza icon engine SVG funzionante.
    var icon = studioCadLoadIconPath(iconPath);
    if (studioCadIconHasPixmap(icon)) {
        return icon;
    }

    if (!isNull(definition.fallbackIcon)) {
        icon = studioCadLoadIconPath(studioCadResolveIconPath(
            definition.fallbackIcon,
            basePath
        ));
    }
    return icon;
}

function studioCadAddButton(grid, parent, definition, row, column, basePath) {
    var button = new QToolButton(parent);
    button.objectName = "StudioCadButton_" + definition.id;
    button.setIcon(studioCadLoadIcon(definition, basePath));
    button.setIconSize(new QSize(27, 27));
    button.setFixedSize(new QSize(35, 35));
    button.autoRaise = true;
    if (definition.modeButton === true) {
        button.checkable = true;
    }
    var shortcut = isNull(definition.shortcut) ? definition.command : definition.shortcut;
    button.toolTip = definition.title + "  [" + shortcut.toUpperCase() + "]";
    button.statusTip = definition.title;
    button.clicked.connect(studioCadTrigger(definition));
    grid.addWidget(button, row, column);
    return button;
}

function studioCadAddGroup(layout, parent, title, definitions, basePath, fallbackIcon) {
    var label = new QLabel(title, parent);
    label.objectName = "StudioCadGroup_" + title.replace(/[^A-Za-z0-9]/g, "");
    label.styleSheet = "QLabel { color:#f2f2f2; background:#3a3a3a; border-top:1px solid #555555; padding:4px 5px; font-weight:600; }";
    layout.addWidget(label);

    var group = new QWidget(parent);
    var grid = new QGridLayout(group);
    grid.setContentsMargins(4, 3, 4, 5);
    grid.setHorizontalSpacing(2);
    grid.setVerticalSpacing(2);
    for (var i=0; i<definitions.length; i++) {
        if (isNull(definitions[i].fallbackIcon)) {
            definitions[i].fallbackIcon = fallbackIcon;
        }
        studioCadAddButton(grid, group, definitions[i], Math.floor(i / 4), i % 4, basePath);
    }
    layout.addWidget(group);
}

function studioCadBuildPalette(basePath) {
    var appWin = EAction.getMainWindow();
    if (!isNull(StudioCadUI.modeStateTimer)) {
        StudioCadUI.modeStateTimer.stop();
        StudioCadUI.modeStateTimer.deleteLater();
        StudioCadUI.modeStateTimer = undefined;
    }
    var previous = appWin.findChild("StudioCadPaletteDock");
    if (!isNull(previous)) {
        appWin.removeDockWidget(previous);
        previous.close();
        previous.deleteLater();
    }

    var dock = new RDockWidget(qsTr("Studio CAD"), appWin);
    dock.objectName = "StudioCadPaletteDock";
    dock.minimumWidth = 158;
    dock.maximumWidth = 178;
    dock.styleSheet = "QDockWidget { color:#f2f2f2; background:#2b2b2b; } QDockWidget::title { background:#333333; padding:4px; }";

    var scroll = new QScrollArea(dock);
    scroll.objectName = "StudioCadPaletteScroll";
    scroll.widgetResizable = true;
    scroll.frameShape = QFrame.NoFrame;
    scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff);
    scroll.styleSheet = "QScrollArea { background:#2b2b2b; border:0; }";

    var content = new QWidget(scroll);
    content.objectName = "StudioCadPalette";
    content.styleSheet = "QWidget#StudioCadPalette { background:#2b2b2b; } QToolButton { border:1px solid transparent; border-radius:3px; padding:2px; background:transparent; } QToolButton:hover { background:#454545; border-color:#777777; } QToolButton:pressed { background:#1f5268; border-color:#8cc9e8; } QToolButton#StudioCadButton_OrthoOn:checked { background:#087f5b; border:2px solid #7dffb3; } QToolButton#StudioCadButton_Free:checked { background:#a76000; border:2px solid #ffd27a; }";
    var layout = new QVBoxLayout(content);
    layout.setContentsMargins(0, 0, 0, 4);
    layout.setSpacing(0);

    var draw = [
        {id:"Line", title:"Linea continua stile AutoCAD (L)", command:"l", icon:":scripts/Draw/Line/Line2P/Line2P-inverse.svg"},
        {id:"Polyline", title:"Polilinea", command:"pl", icon:":scripts/Pro/Draw/Polyline/DrawPolylinePro/DrawPolylinePro-inverse.svg"},
        {id:"Rectangle", title:"Rettangolo", command:"re", icon:":scripts/Draw/Shape/ShapeRectanglePP/ShapeRectanglePP-inverse.svg"},
        {id:"Circle", title:"Cerchio centro-raggio", command:"cr", icon:":scripts/Draw/Circle/CircleCR/CircleCR-inverse.svg"},
        {id:"Arc3P", title:"Arco per tre punti", command:"a3", icon:":scripts/Draw/Arc/Arc3P/Arc3P-inverse.svg"},
        {id:"Hatch", title:"Tratteggio da selezione", command:"ha", icon:":scripts/Draw/Hatch/HatchFromSelection/HatchFromSelection-inverse.svg"},
        {id:"Text", title:"Testo", command:"te", icon:":scripts/Draw/Text/Text-inverse.svg"},
        {id:"DimAligned", title:"Quota allineata", command:"da", icon:":scripts/Draw/Dimension/DimAligned/DimAligned-inverse.svg"}
    ];

    var modify = [
        {id:"Move", title:"Sposta", command:"mv", icon:":scripts/Modify/Translate/Translate-inverse.svg"},
        {id:"Copy", title:"Copia", command:"co", icon:"copy-cad.svg"},
        {id:"Rotate", title:"Ruota", command:"ro", icon:":scripts/Modify/Rotate/Rotate-inverse.svg"},
        {id:"Scale", title:"Scala per riferimento", command:"sz", icon:":scripts/Modify/Scale/Scale-inverse.svg"},
        {id:"Mirror", title:"Specchia", command:"mi", icon:":scripts/Modify/Mirror/Mirror-inverse.svg"},
        {id:"Offset", title:"Offset", command:"of", icon:":scripts/Pro/Modify/OffsetPro/OffsetPro-inverse.svg"},
        {id:"Trim", title:"Taglia / estendi", command:"tr", icon:":scripts/Modify/Trim/Trim-inverse.svg"},
        {id:"TrimBoth", title:"Taglia entrambe", command:"tm", icon:":scripts/Modify/TrimBoth/TrimBoth-inverse.svg"},
        {id:"Stretch", title:"Stira", command:"ss", icon:":scripts/Pro/Modify/StretchPro/StretchPro-inverse.svg"},
        {id:"Bevel", title:"Cimatura", command:"ch", icon:":scripts/Modify/Bevel/Bevel-inverse.svg"},
        {id:"Round", title:"Raccordo", command:"rn", icon:":scripts/Pro/Modify/RoundPro/RoundPro-inverse.svg"},
        {id:"Explode", title:"Esplodi", command:"xp", icon:":scripts/Modify/Explode/Explode-inverse.svg"},
        {id:"Delete", title:"Cancella", command:"er", icon:":scripts/Edit/Delete/Delete-inverse.svg"},
        {id:"Lengthen", title:"Allunga / accorcia", command:"le", icon:":scripts/Modify/Lengthen/Lengthen-inverse.svg"}
    ];

    var view = [
        {id:"ZoomAuto", title:"Zoom ottimizza", command:"za", icon:":scripts/View/Zoom/AutoZoom/AutoZoom-inverse.svg"},
        {id:"ZoomWindow", title:"Zoom finestra", command:"zw", icon:":scripts/View/Zoom/WindowZoom/WindowZoom-inverse.svg"},
        {id:"Pan", title:"Panoramica", command:"zp", icon:":scripts/View/Zoom/PanZoom/PanZoom-inverse.svg"},
        {id:"Previous", title:"Vista precedente", command:"zv", icon:":scripts/View/Zoom/PreviousView/PreviousView-inverse.svg"},
        {id:"Grid", title:"Griglia", command:"gr", icon:":scripts/View/ToggleGrid/ToggleGrid-inverse.svg"}
    ];

    var orthoSnap = [
        {id:"OrthoOn", title:"ORTO persistente: resta attivo finche non premi LIBERO", command:"eo", target:"ToolButtonRestrictOrthogonal", snapLock:true, restrictionState:"ortho", modeButton:true, icon:":scripts/Snap/RestrictOrthogonal/RestrictOrthogonal-inverse.svg", message:"Studio CAD: modalita ORTO persistente attiva"},
        {id:"Free", title:"LIBERO: disattiva Orto persistente e snap forzato", command:"en", shortcut:"EN + SF", snapLock:false, restrictionState:"free", modeButton:true, steps:[{target:"ToolButtonRestrictOff", command:"en"}, {target:"ToolButtonSnapFree", command:"sf"}], icon:":scripts/Snap/SnapFree/SnapFree-inverse.svg", message:"Studio CAD: modalita LIBERA attiva"},
        {id:"SnapAuto", title:"OSNAP automatico", command:"sa", target:"ToolButtonSnapAuto", icon:":scripts/Snap/SnapAuto/SnapAuto-inverse.svg"},
        {id:"SnapEnd", title:"OSNAP estremita", command:"se", target:"ToolButtonSnapEnd", icon:":scripts/Snap/SnapEnd/SnapEnd-inverse.svg"},
        {id:"SnapMiddle", title:"OSNAP punto medio", command:"sm", target:"ToolButtonSnapMiddle", icon:":scripts/Snap/SnapMiddle/SnapMiddle-inverse.svg"},
        {id:"SnapCenter", title:"OSNAP centro", command:"snapcenter", shortcut:"SNAPCENTER", target:"ToolButtonSnapCenter", icon:":scripts/Snap/SnapCenter/SnapCenter-inverse.svg"},
        {id:"SnapIntersection", title:"OSNAP intersezione", command:"si", target:"ToolButtonSnapIntersection", icon:":scripts/Snap/SnapIntersection/SnapIntersection-inverse.svg"},
        {id:"SnapOnEntity", title:"OSNAP punto piu vicino sull'entita", command:"snaponentity", shortcut:"ST", target:"ToolButtonSnapOnEntity", icon:":scripts/Snap/SnapOnEntity/SnapOnEntity-inverse.svg"},
        {id:"SnapPerpendicular", title:"OSNAP perpendicolare", command:"snapperpendicular", shortcut:"SU", target:"ToolButtonSnapPerpendicular", icon:":scripts/Snap/SnapPerpendicular/SnapPerpendicular-inverse.svg"},
        {id:"SnapTangential", title:"OSNAP tangente", command:"snaptangential", shortcut:"SB", target:"ToolButtonSnapTangential", icon:":scripts/Snap/SnapTangential/SnapTangential-inverse.svg"},
        {id:"SnapReference", title:"OSNAP riferimento", command:"snapreference", shortcut:"SR", target:"ToolButtonSnapReference", icon:":scripts/Snap/SnapReference/SnapReference-inverse.svg"}
    ];

    var docfa = [
        {id:"DocfaCheck", title:"DOCFA: controllo poligoni", command:"dchk", icon:"docfa-check.svg"},
        {id:"DocfaFrame", title:"DOCFA: inserisci cornice", command:"dcorn", icon:"docfa-frame.svg"},
        {id:"DocfaGuide", title:"DOCFA: guida flusso", command:"dguida", icon:"docfa-guide.svg"},
        {id:"DocfaPolygon", title:"DOCFA: poligono classificato", command:"dpol", icon:"docfa-polygon.svg"},
        {id:"DocfaA", title:"DOCFA: A / A1 - vani principali", command:"dpol", category:0, icon:"docfa-a.svg"},
        {id:"DocfaA2", title:"DOCFA: A2 - accessori diretti C/1 e C/6", command:"dpol", category:1, icon:"docfa-a2.svg"},
        {id:"DocfaB", title:"DOCFA: B - accessori indiretti comunicanti", command:"dpol", category:2, icon:"docfa-b.svg"},
        {id:"DocfaC", title:"DOCFA: C - accessori indiretti non comunicanti", command:"dpol", category:3, icon:"docfa-c.svg"},
        {id:"DocfaD", title:"DOCFA: D - balconi comunicanti", command:"dpol", category:4, icon:"docfa-d.svg"},
        {id:"DocfaE", title:"DOCFA: E - balconi non comunicanti", command:"dpol", category:5, icon:"docfa-e.svg"},
        {id:"DocfaF", title:"DOCFA: F - aree scoperte", command:"dpol", category:6, icon:"docfa-f.svg"},
        {id:"DocfaG", title:"DOCFA: G - superfici non rilevanti", command:"dpol", category:7, icon:"docfa-g.svg"}
    ];

    studioCadAddGroup(layout, content, qsTr("Disegna"), draw, basePath, "draw.svg");
    studioCadAddGroup(layout, content, qsTr("Modifica"), modify, basePath, "edit.svg");
    studioCadAddGroup(layout, content, qsTr("Vista"), view, basePath, "view.svg");
    studioCadAddGroup(layout, content, qsTr("Orto / Libero / OSNAP"), orthoSnap, basePath, "snap.svg");
    studioCadAddGroup(layout, content, qsTr("DOCFA"), docfa, basePath, "docfa-guide.svg");
    layout.addStretch(1);

    scroll.setWidget(content);
    dock.setWidget(scroll);
    appWin.addDockWidget(Qt.LeftDockWidgetArea, dock);
    dock.visible = true;
    dock.show();

    // QCAD ripristina il layout dei pannelli agganciati (chiave DockappWindows
    // in QCAD3.conf) DOPO l'init degli add-on. Se quel layout e' stato salvato
    // durante un avvio in cui l'add-on non si era caricato, il ripristino
    // nasconde di nuovo la palette e la situazione si autoconferma a ogni
    // avvio successivo. Un timer a scatto singolo riafferma la visibilita'
    // appena il ripristino e' concluso, cioe' al primo giro di event loop.
    StudioCadUI.paletteShowTimer = new QTimer(appWin);
    StudioCadUI.paletteShowTimer.singleShot = true;
    StudioCadUI.paletteShowTimer.timeout.connect(function() {
        if (!isNull(dock) && !dock.visible) {
            dock.visible = true;
            dock.show();
        }
    });
    StudioCadUI.paletteShowTimer.start(0);

    // Aggiorna l'evidenziazione anche se ORTO / LIBERO vengono attivati con
    // la tastiera o dal menu Snap. Il polling e' leggero e segue il documento
    // corrente quando si passa da una scheda all'altra.
    StudioCadUI.modeStateTimer = new QTimer(appWin);
    StudioCadUI.modeStateTimer.timeout.connect(studioCadRefreshModeButtons);
    StudioCadUI.modeStateTimer.start(300);
    studioCadRefreshModeButtons();

    // La vecchia barra utente orizzontale viene sostituita dal pannello.
    var oldBars = ["UserToolBar1", "UserToolBar2"];
    for (var j=0; j<oldBars.length; j++) {
        var oldBar = appWin.findChild(oldBars[j]);
        if (!isNull(oldBar)) {
            oldBar.visible = false;
            oldBar.hide();
        }
    }
    return dock;
}

StudioCadUI.init = function(basePath) {
    studioCadInstallNumericFocusRouter();

    var actions = RGuiAction.getActions();
    var copyExists = false;
    var orthoExists = false;
    var freeExists = false;
    var lineAction;
    for (var i=0; i<actions.length; i++) {
        if (actions[i].getScriptClass() === "StudioCadCopy") {
            copyExists = true;
        }
        if (actions[i].getScriptClass() === "StudioCadOrtho") {
            orthoExists = true;
        }
        if (actions[i].getScriptClass() === "StudioCadFree") {
            freeExists = true;
        }
        if (actions[i].getScriptClass() === "StudioCadLine") {
            lineAction = actions[i];
        }
    }

    if (!copyExists) {
        var copyAction = new RGuiAction(qsTr("&Copy"), RMainWindowQt.getMainWindow());
        copyAction.setRequiresDocument(true);
        copyAction.setRequiresSelection(true);
        copyAction.setStatusTip(qsTr("Copy selected entities by reference point"));
        copyAction.setScriptFile(basePath + "/StudioCadCopy.js");
        copyAction.setDefaultCommands(["copy", "co"]);
        copyAction.setIcon(basePath + "/icons/copy-cad.svg");
        copyAction.setGroupSortOrder(13100);
        copyAction.setSortOrder(101);
        copyAction.setWidgetNames(["ModifyMenu"]);
    }

    if (!orthoExists) {
        var orthoAction = new RGuiAction(
            qsTr("ORTO persistente"),
            RMainWindowQt.getMainWindow()
        );
        orthoAction.setRequiresDocument(true);
        orthoAction.setStatusTip(qsTr(
            "Attiva la restrizione ortogonale finche non viene scelto LIBERO"
        ));
        orthoAction.setScriptFile(basePath + "/StudioCadOrtho.js");
        orthoAction.setDefaultCommands(["eo", "ortho"]);
        orthoAction.setIcon(basePath + "/icons/snap.svg");
    }

    if (!freeExists) {
        var freeAction = new RGuiAction(
            qsTr("LIBERO"),
            RMainWindowQt.getMainWindow()
        );
        freeAction.setRequiresDocument(true);
        freeAction.setStatusTip(qsTr(
            "Disattiva ORTO persistente e passa allo snap libero"
        ));
        freeAction.setScriptFile(basePath + "/StudioCadFree.js");
        freeAction.setDefaultCommands(["en", "libero"]);
        freeAction.setIcon(basePath + "/icons/snap.svg");
    }

    if (isNull(lineAction)) {
        lineAction = new RGuiAction(
            qsTr("&Linea continua stile AutoCAD"),
            RMainWindowQt.getMainWindow()
        );
    }
    // Riapplica anche a un'azione gia' caricata: consente di aggiornare alias,
    // scorciatoia e script senza riavviare QCAD o duplicare il comando.
    lineAction.setRequiresDocument(true);
    lineAction.setStatusTip(qsTr(
        "Crea linee consecutive separate; muovere il mouse e digitare la distanza"
    ));
    lineAction.setScriptFile(basePath + "/StudioCadLine.js");
    lineAction.setDefaultCommands(["l", "lacad", "lineacad"]);
    lineAction.setDefaultShortcut(new QKeySequence("l"));
    lineAction.setIcon(":scripts/Draw/Line/Line2P/Line2P-inverse.svg");
    lineAction.setGroupSortOrder(12000);
    lineAction.setSortOrder(100);
    lineAction.setWidgetNames(["LineMenu"]);

    // Mantiene vivo il dock: gli oggetti Qt creati da QtScript hanno ownership
    // dello script e, senza un riferimento persistente, il garbage collector
    // può distruggerli subito dopo init anche se sono agganciati alla finestra.
    StudioCadUI.paletteDock = studioCadBuildPalette(basePath);
};
