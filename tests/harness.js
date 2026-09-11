/*
 * Runs the ExtendScript engine under Node against fake Illustrator objects.
 * The engine is ES3 and touches host globals (app, File, Folder) only from
 * inside functions, so it evaluates cleanly once those are stubbed.
 */
const fs = require('fs');
const path = require('path');

const ENGINE = path.join(__dirname, '..', 'src', 'lib', 'StrokeIncrement.jsxinc');

function loadEngine(settingsLiteral) {
  const source = fs.readFileSync(ENGINE, 'utf8');

  const sandbox = {
    written: null,
    Folder: function () { this.exists = true; this.fsName = '/fake'; },
    File: function () {
      this.exists = settingsLiteral !== undefined;
      this.fsName = '/fake/settings.jsxon';
      this.open = () => true;
      this.read = () => settingsLiteral;
      this.close = () => true;
      this.write = (text) => { sandbox.written = text; };
    },
    app: { documents: { length: 1 }, activeDocument: { selection: null }, redraw() {} },
  };
  sandbox.Folder.userData = '/fake';

  const factory = new Function(
    'app', 'File', 'Folder', 'alert',
    source + '\nreturn StrokeIncrement;'
  );

  sandbox.engine = factory(sandbox.app, sandbox.File, sandbox.Folder, (m) => { sandbox.alerted = m; });
  return sandbox;
}

/* ---- fake Illustrator DOM ---- */

const path_ = (strokeWidth, stroked = true) => ({
  typename: 'PathItem', stroked, strokeWidth,
});

const compound = (...paths) => ({
  typename: 'CompoundPathItem', pathItems: paths,
});

const group = (...items) => ({
  typename: 'GroupItem', pageItems: items,
});

const text = (strokeWeight, hasStroke = true) => ({
  typename: 'TextFrame',
  textRange: {
    typename: 'TextRange',
    characterAttributes: {
      strokeWeight,
      strokeColor: { typename: hasStroke ? 'RGBColor' : 'NoColor' },
    },
  },
});

const raster = () => ({ typename: 'RasterItem' });

module.exports = { loadEngine, path_, compound, group, text, raster };
