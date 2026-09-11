/*
 * Step the stroke weight of the selection up several rungs.
 * Part of Stroke Increment. Bind this to a function key via the Actions panel -
 * see docs/INSTALL.md.
 */

//@target illustrator
/*
 * Stroke Increment - engine
 * ExtendScript (ES3) for Adobe Illustrator.
 *
 * Steps the stroke weight of every selected object up or down, recursing into
 * groups and compound paths, and handling point/area text.
 *
 * ES3 only: no JSON, no Array.indexOf/forEach, no String.trim.
 */

//@target illustrator

var StrokeIncrement = (function () {
    var EPSILON = 1e-6;
    var SETTINGS_FOLDER = 'StrokeIncrement';
    var SETTINGS_FILE = 'settings.jsxon';

    var DEFAULTS = {
        // "ladder" | "fixed" | "multiply"
        mode: 'ladder',
        // Units the numbers below are expressed in: "pt" | "mm" | "px" | "in"
        units: 'pt',
        // The snap ladder. Must be ascending. Edit freely.
        ladder: [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 30, 40, 50],
        // How many rungs a "large" press jumps.
        ladderRungsLarge: 3,
        // Used when mode is "fixed".
        fixedStep: 0.25,
        fixedStepLarge: 1,
        // Used when mode is "multiply".
        multiplyFactor: 1.25,
        multiplyFactorLarge: 2,
        // Clamps, in the units above.
        minWidth: 0.05,
        maxWidth: 1000,
        // Give a stroke to objects that currently have none.
        applyToUnstroked: false,
        // Include type objects (uses character attributes).
        includeText: true,
        // Stay quiet when there is nothing to act on, rather than alerting.
        // Strongly recommended: this runs on a hotkey.
        silent: true,
        // Decimal places kept, to stop floating point noise.
        roundTo: 4
    };

    // Keys are quoted: ExtendScript is ES3, where a reserved word such as 'in'
    // is illegal as a bare object key and throws at parse time.
    var PT_PER = { 'pt': 1, 'px': 1, 'mm': 2.834645669291339, 'in': 72, 'cm': 28.34645669291339 };

    function unitToPoints(value, units) {
        var factor = PT_PER[units];
        return value * (factor ? factor : 1);
    }

    function round(value, places) {
        var factor = Math.pow(10, places);
        return Math.round(value * factor) / factor;
    }

    /* ---------------------------------------------------------------- settings */

    function settingsFile() {
        var folder = new Folder(Folder.userData + '/' + SETTINGS_FOLDER);
        if (!folder.exists) folder.create();
        return new File(folder.fsName + '/' + SETTINGS_FILE);
    }

    function readSettings() {
        var settings = {};
        var key;
        for (key in DEFAULTS) {
            if (DEFAULTS.hasOwnProperty(key)) settings[key] = DEFAULTS[key];
        }

        var file = settingsFile();
        if (!file.exists) return settings;

        try {
            file.open('r');
            var raw = file.read();
            file.close();
            var stored = eval('(' + raw + ')');
            for (key in stored) {
                if (stored.hasOwnProperty(key) && DEFAULTS.hasOwnProperty(key)) {
                    settings[key] = stored[key];
                }
            }
        } catch (e) {
            // A corrupt settings file must never block a keypress.
        }
        return settings;
    }

    function serialize(settings) {
        var parts = [];
        var key;
        for (key in DEFAULTS) {
            if (!DEFAULTS.hasOwnProperty(key)) continue;
            var value = settings[key];
            var text;
            if (value instanceof Array) {
                text = '[' + value.join(', ') + ']';
            } else if (typeof value === 'string') {
                text = '"' + value + '"';
            } else {
                text = String(value);
            }
            parts.push('  ' + key + ': ' + text);
        }
        return '{\n' + parts.join(',\n') + '\n}\n';
    }

    function writeSettings(settings) {
        var file = settingsFile();
        file.open('w');
        file.write(serialize(settings));
        file.close();
        return file;
    }

    /* ------------------------------------------------------------ step maths */

    // Ascending ladder of stroke widths, in points.
    function ladderInPoints(settings) {
        var out = [];
        var i;
        for (i = 0; i < settings.ladder.length; i++) {
            out.push(unitToPoints(Number(settings.ladder[i]), settings.units));
        }
        out.sort(function (a, b) { return a - b; });
        return out;
    }

    function stepLadder(current, direction, rungs, ladder) {
        var value = current;
        var i;
        for (i = 0; i < rungs; i++) {
            value = stepLadderOnce(value, direction, ladder);
        }
        return value;
    }

    function stepLadderOnce(current, direction, ladder) {
        var last = ladder.length - 1;
        var i;

        if (direction > 0) {
            for (i = 0; i <= last; i++) {
                if (ladder[i] > current + EPSILON) return ladder[i];
            }
            // Above the top rung: keep climbing by the final gap.
            var topGap = ladder.length > 1 ? ladder[last] - ladder[last - 1] : ladder[last];
            return current + topGap;
        }

        for (i = last; i >= 0; i--) {
            if (ladder[i] < current - EPSILON) return ladder[i];
        }
        // Below the bottom rung: halve, so hairlines stay reachable.
        return current / 2;
    }

    function nextWidth(current, direction, magnitude, settings, ladder) {
        var large = (magnitude === 'large');
        var value;

        if (settings.mode === 'fixed') {
            var step = unitToPoints(large ? settings.fixedStepLarge : settings.fixedStep, settings.units);
            value = current + (direction * step);
        } else if (settings.mode === 'multiply') {
            var factor = large ? settings.multiplyFactorLarge : settings.multiplyFactor;
            value = direction > 0 ? current * factor : current / factor;
        } else {
            value = stepLadder(current, direction, large ? settings.ladderRungsLarge : 1, ladder);
        }

        var min = unitToPoints(settings.minWidth, settings.units);
        var max = unitToPoints(settings.maxWidth, settings.units);
        if (value < min) value = min;
        if (value > max) value = max;

        return round(value, settings.roundTo);
    }

    /* ------------------------------------------------------------- traversal */

    function applyToPathLike(item, direction, magnitude, settings, ladder, counter) {
        if (!item.stroked) {
            if (!settings.applyToUnstroked) return;
            item.stroked = true;
            if (item.strokeWidth === 0) item.strokeWidth = unitToPoints(settings.minWidth, settings.units);
        }
        item.strokeWidth = nextWidth(item.strokeWidth, direction, magnitude, settings, ladder);
        counter.count++;
    }

    function applyToTextRange(range, direction, magnitude, settings, ladder, counter) {
        var attributes = range.characterAttributes;
        var stroked = true;

        try {
            stroked = (attributes.strokeColor.typename !== 'NoColor');
        } catch (e) {
            stroked = true;
        }

        if (!stroked && !settings.applyToUnstroked) return;

        var current = attributes.strokeWeight;
        if (!current || current <= 0) current = unitToPoints(settings.minWidth, settings.units);

        attributes.strokeWeight = nextWidth(current, direction, magnitude, settings, ladder);
        counter.count++;
    }

    function walk(item, direction, magnitude, settings, ladder, counter) {
        var type = item.typename;
        var i;

        if (type === 'PathItem') {
            applyToPathLike(item, direction, magnitude, settings, ladder, counter);
            return;
        }

        if (type === 'CompoundPathItem') {
            for (i = 0; i < item.pathItems.length; i++) {
                applyToPathLike(item.pathItems[i], direction, magnitude, settings, ladder, counter);
            }
            return;
        }

        if (type === 'GroupItem') {
            for (i = 0; i < item.pageItems.length; i++) {
                walk(item.pageItems[i], direction, magnitude, settings, ladder, counter);
            }
            return;
        }

        if (type === 'TextFrame') {
            if (!settings.includeText) return;
            applyToTextRange(item.textRange, direction, magnitude, settings, ladder, counter);
            return;
        }

        // PlacedItem, RasterItem, MeshItem, SymbolItem, PluginItem (blends,
        // envelopes, live shapes built by other plugins) carry no scriptable
        // stroke weight. Leave them untouched rather than guessing.
    }

    /* ------------------------------------------------------------------ run */

    function run(options) {
        if (app.documents.length === 0) return 0;

        var settings = readSettings();
        var direction = (options && options.direction < 0) ? -1 : 1;
        var magnitude = (options && options.magnitude === 'large') ? 'large' : 'normal';
        var ladder = ladderInPoints(settings);
        var counter = { count: 0 };

        var selection = app.activeDocument.selection;
        if (selection === null || selection === undefined) return 0;

        try {
            if (selection.typename === 'TextRange') {
                if (settings.includeText) {
                    applyToTextRange(selection, direction, magnitude, settings, ladder, counter);
                }
            } else {
                var i;
                for (i = 0; i < selection.length; i++) {
                    walk(selection[i], direction, magnitude, settings, ladder, counter);
                }
            }
        } catch (e) {
            if (!settings.silent) {
                alert('Stroke Increment\n' + e.message + (e.line ? '\nLine ' + e.line : ''));
            }
            return counter.count;
        }

        if (counter.count > 0) app.redraw();
        return counter.count;
    }

    return {
        run: run,
        defaults: DEFAULTS,
        readSettings: readSettings,
        writeSettings: writeSettings,
        settingsFile: settingsFile,
        serialize: serialize
    };
})();

StrokeIncrement.run({ direction: 1, magnitude: 'large' });
