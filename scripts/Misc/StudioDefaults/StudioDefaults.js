/**
 * Profilo iniziale Studio per QCAD Professional.
 *
 * Le preferenze restano in un add-on separato dalle palette: cosi' il profilo
 * puo' essere aggiornato o rimosso senza modificare i comandi DOCFA originali.
 */
function StudioDefaults() {
}

StudioDefaults.init = function() {
    RSettings.setValue("Language/UiLanguage", "it");

    RSettings.setValue("UnitSettings/Unit", RS.Meter);
    RSettings.setValue("UnitSettings/Measurement", 1);
    RSettings.setValue("UnitSettings/PaperUnit", 4);
    RSettings.setValue("SaveAs/Filter", "R15 [2000/LT2000] DXF Disegno [OpenDesign] (*.dxf)");

    RSettings.setValue("Bevel/Length1", 0);
    RSettings.setValue("Bevel/Length2", 0);
    RSettings.setValue("AutoZoom/Commands", "zoomauto, za, ze, zo, z0");

    RSettings.setValue("Scale/Commands", "scale, sz, sc");
    RSettings.setValue("Scale/UseDialog", false);
    RSettings.setValue("ScaleOptions/FactorByMouse", true);
    RSettings.setValue("ScaleOptions/FactorX", 1);
    RSettings.setValue("ScaleOptions/FactorY", 1);

    RSettings.setValue("Translate/Commands", "move, mv, m");
    RSettings.setValue("Translate/UseDialog", false);
    RSettings.setValue("TranslateOptions/Mode", "DeleteOriginal");

    RSettings.setValue("Rotate/Commands", "rotate, ro");
    RSettings.setValue("Rotate/UseDialog", false);
    RSettings.setValue("Rotate/AngleByMouse", true);
    RSettings.setValue("RotateOptions/Mode", "DeleteOriginal");

    RSettings.setValue("Mirror/UseDialog", false);
    RSettings.setValue("MirrorOptions/Mode", "DeleteOriginal");
    RSettings.setValue("TranslateRotate/UseDialog", false);
    RSettings.setValue("TranslateRotateOptions/Mode", "DeleteOriginal");
    RSettings.setValue("GraphicsViewColors/RelativeZeroColor", new RColor(162, 36, 36, 0));
};
