const { loadEngine, path_, compound, group, text, raster } = require('./harness');

let passed = 0;
let failed = 0;

function check(label, actual, expected) {
  const ok = Math.abs(actual - expected) < 1e-9;
  if (ok) { passed++; console.log(`  ok    ${label}`); }
  else { failed++; console.log(`  FAIL  ${label} — got ${actual}, expected ${expected}`); }
}

function checkEq(label, actual, expected) {
  const ok = actual === expected;
  if (ok) { passed++; console.log(`  ok    ${label}`); }
  else { failed++; console.log(`  FAIL  ${label} — got ${actual}, expected ${expected}`); }
}

// Steps `item` once and returns its resulting stroke width.
function step(item, direction, magnitude, settingsLiteral) {
  const box = loadEngine(settingsLiteral);
  box.app.activeDocument.selection = Array.isArray(item) ? item : [item];
  box.engine.run({ direction, magnitude });
  return box;
}

console.log('\nSnap ladder — default 0.25 0.5 0.75 1 1.5 2 3 4 5 6 8 10 12 16 20 24 30 40 50');
{
  const cases = [
    [1, 1, 1.5], [1.5, 1, 2], [2, 1, 3], [0.5, 1, 0.75],
    [1, -1, 0.75], [2, -1, 1.5], [0.75, -1, 0.5],
  ];
  for (const [from, dir, want] of cases) {
    const p = path_(from);
    step(p, dir);
    check(`${from}pt ${dir > 0 ? 'up' : 'down'} → ${want}`, p.strokeWidth, want);
  }
}

console.log('\nOff-ladder values snap to the nearest rung in the travel direction');
{
  const up = path_(1.2); step(up, 1);
  check('1.2pt up → 1.5', up.strokeWidth, 1.5);
  const down = path_(1.2); step(down, -1);
  check('1.2pt down → 1', down.strokeWidth, 1);
  const odd = path_(3.7); step(odd, -1);
  check('3.7pt down → 3', odd.strokeWidth, 3);
}

console.log('\nBeyond the ladder');
{
  const above = path_(50); step(above, 1);
  check('50pt up → 60 (continues by the final gap)', above.strokeWidth, 60);
  const below = path_(0.25); step(below, -1);
  check('0.25pt down → 0.125 (halves)', below.strokeWidth, 0.125);
}

console.log('\nClamping');
{
  const low = path_(0.06); step(low, -1);
  check('0.06pt down clamps at min 0.05', low.strokeWidth, 0.05);
  const high = path_(1000); step(high, 1);
  check('1000pt up clamps at max 1000', high.strokeWidth, 1000);
}

console.log('\nLarge press jumps 3 rungs');
{
  const up = path_(1); step(up, 1, 'large');
  check('1pt up large → 3', up.strokeWidth, 3);
  const down = path_(6); step(down, -1, 'large');
  check('6pt down large → 3', down.strokeWidth, 3);
}

console.log('\nTraversal');
{
  const a = path_(1), b = path_(2);
  step([a, b], 1);
  check('multi-selection steps each object from its own weight (a)', a.strokeWidth, 1.5);
  check('multi-selection steps each object from its own weight (b)', b.strokeWidth, 3);

  const inner = path_(1);
  step(group(group(inner)), 1);
  check('recurses through nested groups', inner.strokeWidth, 1.5);

  const c1 = path_(2), c2 = path_(2);
  step(compound(c1, c2), 1);
  check('recurses into compound paths (first)', c1.strokeWidth, 3);
  check('recurses into compound paths (second)', c2.strokeWidth, 3);

  const unstroked = path_(1, false);
  step(unstroked, 1);
  check('leaves unstroked objects alone by default', unstroked.strokeWidth, 1);
  checkEq('does not switch a stroke on', unstroked.stroked, false);

  const box = loadEngine();
  box.app.activeDocument.selection = [raster()];
  checkEq('skips objects with no scriptable stroke', box.engine.run({ direction: 1 }), 0);
}

console.log('\nType');
{
  const t = text(1);
  step(t, 1);
  check('point/area text steps via character attributes', t.textRange.characterAttributes.strokeWeight, 1.5);

  const noStroke = text(1, false);
  step(noStroke, 1);
  check('text with no stroke colour is left alone', noStroke.textRange.characterAttributes.strokeWeight, 1);

  const box = loadEngine();
  const range = text(2).textRange;
  box.app.activeDocument.selection = range;      // Type tool selection
  box.engine.run({ direction: 1 });
  check('a TextRange selection is handled', range.characterAttributes.strokeWeight, 3);
}

console.log('\nOther modes (via a settings file)');
{
  const fixed = path_(1);
  step(fixed, 1, 'normal', '{ mode: "fixed", fixedStep: 0.25 }');
  check('fixed mode: 1pt up → 1.25', fixed.strokeWidth, 1.25);

  const multiply = path_(2);
  step(multiply, 1, 'normal', '{ mode: "multiply", multiplyFactor: 1.5 }');
  check('multiply mode: 2pt up → 3', multiply.strokeWidth, 3);

  const mm = path_(2.834645669291339);   // exactly 1mm
  step(mm, 1, 'normal', '{ units: "mm", ladder: [0.5, 1, 2, 3] }');
  check('mm units: 1mm up → 2mm in points', mm.strokeWidth, 5.6693);

  const custom = path_(1);
  step(custom, 1, 'normal', '{ ladder: [1, 7, 9] }');
  check('a custom ladder is honoured', custom.strokeWidth, 7);

  const corrupt = path_(1);
  step(corrupt, 1, 'normal', 'this is not valid javascript {{{');
  check('a corrupt settings file falls back to defaults', corrupt.strokeWidth, 1.5);
}

console.log('\nGuards');
{
  const box = loadEngine();
  box.app.documents.length = 0;
  checkEq('no open document → no-op', box.engine.run({ direction: 1 }), 0);

  const empty = loadEngine();
  empty.app.activeDocument.selection = [];
  checkEq('empty selection → no-op', empty.engine.run({ direction: 1 }), 0);

  const none = loadEngine();
  none.app.activeDocument.selection = null;
  checkEq('null selection → no-op', none.engine.run({ direction: 1 }), 0);
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
