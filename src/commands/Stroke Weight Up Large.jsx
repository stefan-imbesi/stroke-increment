/*
 * Step the stroke weight of the selection up several rungs.
 * Part of Stroke Increment. Bind this to a function key via the Actions panel -
 * see docs/INSTALL.md.
 */

//@target illustrator
//@include "../lib/StrokeIncrement.jsxinc"

StrokeIncrement.run({ direction: 1, magnitude: 'large' });
