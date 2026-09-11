/*
 * ExtendScript is ES3; Node is not. Node will therefore run code that
 * Illustrator refuses to parse, and a parse error fires at load time, before
 * any assertion in engine.test.js could reach it.
 *
 * This lints src/ and dist/ for ES3 violations Node would not flag.
 * tests/ is excluded: it only ever runs under Node.
 */
const fs = require('fs');
const path = require('path');

// ES3 reserved words plus ES3's future-reserved list. ExtendScript rejects
// these as unquoted property names.
const RESERVED = `
break case catch continue default delete do else finally for function if in
instanceof new return switch this throw try typeof var void while with
abstract boolean byte char class const debugger double enum export extends
final float goto implements import int interface long native package private
protected public short static super synchronized throws transient volatile
`.trim().split(/\s+/);

const BANNED = [
  [/\bJSON\s*\./, 'JSON is not available in ExtendScript'],
  [/\.forEach\s*\(/, 'Array.prototype.forEach is ES5'],
  [/\.indexOf\s*\(/, 'Array.prototype.indexOf is ES5 (String.indexOf is fine, but avoid)'],
  [/\.trim\s*\(/, 'String.prototype.trim is ES5'],
  [/\bObject\.keys\s*\(/, 'Object.keys is ES5'],
  [/\bArray\.isArray\s*\(/, 'Array.isArray is ES5'],
  [/\b(?:const|let)\s+[A-Za-z_$]/, 'const/let are not ES3 — use var'],
  [/=>/, 'arrow functions are not ES3'],
  [/`/, 'template literals are not ES3'],
  [/,\s*[}\]]/, 'trailing comma in a literal'],
];

// An unquoted reserved word used as an object-literal key: `{ in: 72` or `, in: 72`.
const RESERVED_KEY = new RegExp(`[{,]\\s*(${RESERVED.join('|')})\\s*:`);

function filesIn(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return filesIn(full, ext);
    return entry.name.endsWith(ext) ? [full] : [];
  });
}

const root = path.join(__dirname, '..');
const targets = [
  ...filesIn(path.join(root, 'src'), '.jsxinc'),
  ...filesIn(path.join(root, 'src'), '.jsx'),
  ...filesIn(path.join(root, 'dist'), '.jsx'),
];

let problems = 0;

for (const file of targets) {
  const rel = path.relative(root, file);
  const lines = fs.readFileSync(file, 'utf8').split('\n');

  lines.forEach((line, i) => {
    // Strip whole-line comments; good enough for this codebase.
    const code = line.replace(/^\s*(\/\/|\*|\/\*).*$/, '');
    if (!code.trim()) return;

    const reservedKey = code.match(RESERVED_KEY);
    if (reservedKey) {
      problems++;
      console.log(`  FAIL  ${rel}:${i + 1} — reserved word '${reservedKey[1]}' used as an unquoted object key`);
      console.log(`        ${code.trim()}`);
    }

    for (const [pattern, why] of BANNED) {
      if (pattern.test(code)) {
        problems++;
        console.log(`  FAIL  ${rel}:${i + 1} — ${why}`);
        console.log(`        ${code.trim()}`);
      }
    }
  });
}

console.log(
  problems === 0
    ? `\nES3 lint: clean across ${targets.length} file(s)\n`
    : `\nES3 lint: ${problems} problem(s) across ${targets.length} file(s)\n`
);
process.exit(problems === 0 ? 0 : 1);
