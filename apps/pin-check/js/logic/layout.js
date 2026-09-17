/**
 * Pure geometry: turns a connector definition into {pin, x, y} positions in
 * a 0-100 percentage coordinate space (so ui/diagram.js can drop them
 * straight into an SVG viewBox="0 0 100 100" — no DOM, fully unit-testable).
 * Three shapes are supported (see data/connectors.js): 'grid' (rows×cols,
 * for header/rectangular connectors), 'dsub' (a staggered two-row layout
 * matching classic D-Sub connectors), and 'circular' (pins evenly spaced
 * around a circle, for circular/MIL-style connectors). A connector picks
 * one of these three by name — adding a new connector never needs new
 * layout code, only one of these shapes plus its pin list.
 */
const MARGIN = 14;
const SPAN = 100 - MARGIN * 2;

/** `count` positions evenly spaced across the margin-to-margin span. */
function evenPositions(count) {
  if (count <= 1) return [50];
  const step = SPAN / (count - 1);
  return Array.from({ length: count }, (_, i) => MARGIN + step * i);
}

function gridLayout({ rows, cols, pins }) {
  const xs = evenPositions(cols);
  const ys = evenPositions(rows);
  return pins.map((pin, i) => ({
    pin,
    x: xs[i % cols],
    y: ys[Math.floor(i / cols)]
  }));
}

function dsubLayout({ topRow, bottomRow, pins }) {
  const topXs = evenPositions(topRow);
  // The classic D-Sub look: each bottom pin sits centered between two
  // adjacent top pins. That only lines up exactly when bottomRow is
  // topRow-1 (the standard case, e.g. DB9's 5+4) — for any other
  // combination we fall back to independently even-spacing the bottom
  // row, which still reads fine as a staggered two-row connector.
  const bottomXs = bottomRow === topRow - 1
    ? Array.from({ length: bottomRow }, (_, i) => (topXs[i] + topXs[i + 1]) / 2)
    : evenPositions(bottomRow);

  const topY = 34;
  const bottomY = 66;
  const top = pins.slice(0, topRow).map((pin, i) => ({ pin, x: topXs[i], y: topY }));
  const bottom = pins.slice(topRow, topRow + bottomRow).map((pin, i) => ({ pin, x: bottomXs[i], y: bottomY }));
  return top.concat(bottom);
}

function circularLayout({ pins }) {
  const n = pins.length;
  const cx = 50, cy = 50, r = 34;
  return pins.map((pin, i) => {
    const angle = (-90 + (360 / n) * i) * (Math.PI / 180);
    return { pin, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
}

/** {pin, x, y}[] (x/y in 0-100 percent) for any connector, regardless of shape. */
export function computeLayout(connector) {
  if (!connector || !connector.pins || !connector.pins.length) return [];
  switch (connector.shape) {
    case 'dsub': return dsubLayout(connector);
    case 'circular': return circularLayout(connector);
    case 'grid':
    default: return gridLayout(connector);
  }
}
