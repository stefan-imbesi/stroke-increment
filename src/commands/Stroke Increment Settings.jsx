/*
 * Stroke Increment - Settings
 * Edit the step behaviour without touching any code. Writes to
 * ~/Library/Application Support/StrokeIncrement/settings.jsxon (macOS) or the
 * Windows equivalent, which every Stroke Increment command reads at run time.
 */

//@target illustrator
//@include "../lib/StrokeIncrement.jsxinc"

(function () {
    var MODES = ['ladder', 'fixed', 'multiply'];
    var MODE_LABELS = ['Snap ladder', 'Fixed increment', 'Multiply / divide'];
    var UNITS = ['pt', 'px', 'mm', 'cm', 'in'];

    var settings = StrokeIncrement.readSettings();

    function indexOf(list, value) {
        for (var i = 0; i < list.length; i++) {
            if (list[i] === value) return i;
        }
        return 0;
    }

    function parseLadder(text) {
        var pieces = text.replace(/[\r\n\t]+/g, ',').split(/[,\s]+/);
        var out = [];
        for (var i = 0; i < pieces.length; i++) {
            var n = parseFloat(pieces[i]);
            if (!isNaN(n) && n > 0) out.push(n);
        }
        out.sort(function (a, b) { return a - b; });
        return out;
    }

    function toNumber(text, fallback) {
        var n = parseFloat(text);
        return isNaN(n) ? fallback : n;
    }

    var dialog = new Window('dialog', 'Stroke Increment - Settings');
    dialog.orientation = 'column';
    dialog.alignChildren = ['fill', 'top'];
    dialog.spacing = 10;
    dialog.margins = 16;

    function labelledRow(parent, labelText, width) {
        var row = parent.add('group');
        row.orientation = 'row';
        row.alignChildren = ['left', 'center'];
        var label = row.add('statictext', undefined, labelText);
        label.preferredSize.width = width || 150;
        return row;
    }

    // --- behaviour -----------------------------------------------------------
    var behaviour = dialog.add('panel', undefined, 'Behaviour');
    behaviour.orientation = 'column';
    behaviour.alignChildren = ['fill', 'top'];
    behaviour.margins = 14;
    behaviour.spacing = 8;

    var modeRow = labelledRow(behaviour, 'Step mode');
    var modeList = modeRow.add('dropdownlist', undefined, MODE_LABELS);
    modeList.selection = indexOf(MODES, settings.mode);
    modeList.preferredSize.width = 180;

    var unitRow = labelledRow(behaviour, 'Values are in');
    var unitList = unitRow.add('dropdownlist', undefined, UNITS);
    unitList.selection = indexOf(UNITS, settings.units);
    unitList.preferredSize.width = 180;

    // --- ladder --------------------------------------------------------------
    var ladderPanel = dialog.add('panel', undefined, 'Snap ladder');
    ladderPanel.orientation = 'column';
    ladderPanel.alignChildren = ['fill', 'top'];
    ladderPanel.margins = 14;
    ladderPanel.spacing = 8;

    ladderPanel.add('statictext', undefined, 'Weights to snap between, separated by commas.');
    var ladderField = ladderPanel.add('edittext', undefined, settings.ladder.join(', '), { multiline: true });
    ladderField.preferredSize.height = 56;

    var rungRow = labelledRow(ladderPanel, 'Large press jumps');
    var rungField = rungRow.add('edittext', undefined, String(settings.ladderRungsLarge));
    rungField.preferredSize.width = 60;
    rungRow.add('statictext', undefined, 'rungs');

    // --- fixed / multiply ----------------------------------------------------
    var otherPanel = dialog.add('panel', undefined, 'Fixed and multiply modes');
    otherPanel.orientation = 'column';
    otherPanel.alignChildren = ['fill', 'top'];
    otherPanel.margins = 14;
    otherPanel.spacing = 8;

    var fixedRow = labelledRow(otherPanel, 'Fixed step / large');
    var fixedField = fixedRow.add('edittext', undefined, String(settings.fixedStep));
    fixedField.preferredSize.width = 60;
    var fixedLargeField = fixedRow.add('edittext', undefined, String(settings.fixedStepLarge));
    fixedLargeField.preferredSize.width = 60;

    var multiplyRow = labelledRow(otherPanel, 'Multiply by / large');
    var multiplyField = multiplyRow.add('edittext', undefined, String(settings.multiplyFactor));
    multiplyField.preferredSize.width = 60;
    var multiplyLargeField = multiplyRow.add('edittext', undefined, String(settings.multiplyFactorLarge));
    multiplyLargeField.preferredSize.width = 60;

    // --- limits --------------------------------------------------------------
    var limitsPanel = dialog.add('panel', undefined, 'Limits and scope');
    limitsPanel.orientation = 'column';
    limitsPanel.alignChildren = ['fill', 'top'];
    limitsPanel.margins = 14;
    limitsPanel.spacing = 8;

    var limitRow = labelledRow(limitsPanel, 'Min / max weight');
    var minField = limitRow.add('edittext', undefined, String(settings.minWidth));
    minField.preferredSize.width = 60;
    var maxField = limitRow.add('edittext', undefined, String(settings.maxWidth));
    maxField.preferredSize.width = 60;

    var textCheck = limitsPanel.add('checkbox', undefined, 'Include type objects');
    textCheck.value = settings.includeText;

    var unstrokedCheck = limitsPanel.add('checkbox', undefined, 'Add a stroke to objects that have none');
    unstrokedCheck.value = settings.applyToUnstroked;

    var silentCheck = limitsPanel.add('checkbox', undefined, 'Stay silent on errors (recommended for hotkeys)');
    silentCheck.value = settings.silent;

    // --- buttons -------------------------------------------------------------
    var buttons = dialog.add('group');
    buttons.orientation = 'row';
    buttons.alignment = ['fill', 'top'];

    var resetButton = buttons.add('button', undefined, 'Reset to defaults');
    var spacer = buttons.add('group');
    spacer.alignment = ['fill', 'fill'];
    var cancelButton = buttons.add('button', undefined, 'Cancel', { name: 'cancel' });
    var saveButton = buttons.add('button', undefined, 'Save', { name: 'ok' });

    resetButton.onClick = function () {
        var d = StrokeIncrement.defaults;
        modeList.selection = indexOf(MODES, d.mode);
        unitList.selection = indexOf(UNITS, d.units);
        ladderField.text = d.ladder.join(', ');
        rungField.text = String(d.ladderRungsLarge);
        fixedField.text = String(d.fixedStep);
        fixedLargeField.text = String(d.fixedStepLarge);
        multiplyField.text = String(d.multiplyFactor);
        multiplyLargeField.text = String(d.multiplyFactorLarge);
        minField.text = String(d.minWidth);
        maxField.text = String(d.maxWidth);
        textCheck.value = d.includeText;
        unstrokedCheck.value = d.applyToUnstroked;
        silentCheck.value = d.silent;
    };

    if (dialog.show() !== 1) return;

    var ladder = parseLadder(ladderField.text);
    if (ladder.length < 2) {
        alert('The snap ladder needs at least two values. Nothing was saved.');
        return;
    }

    settings.mode = MODES[modeList.selection.index];
    settings.units = UNITS[unitList.selection.index];
    settings.ladder = ladder;
    settings.ladderRungsLarge = Math.max(1, Math.round(toNumber(rungField.text, 3)));
    settings.fixedStep = toNumber(fixedField.text, settings.fixedStep);
    settings.fixedStepLarge = toNumber(fixedLargeField.text, settings.fixedStepLarge);
    settings.multiplyFactor = toNumber(multiplyField.text, settings.multiplyFactor);
    settings.multiplyFactorLarge = toNumber(multiplyLargeField.text, settings.multiplyFactorLarge);
    settings.minWidth = toNumber(minField.text, settings.minWidth);
    settings.maxWidth = toNumber(maxField.text, settings.maxWidth);
    settings.includeText = textCheck.value;
    settings.applyToUnstroked = unstrokedCheck.value;
    settings.silent = silentCheck.value;

    var file = StrokeIncrement.writeSettings(settings);
    alert('Saved.\n\n' + file.fsName);
})();
