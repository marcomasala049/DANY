/**
 * Arithmetic expression evaluation shared by the scientific calculator and
 * the quick engineering calculator. Both widgets accept a restricted math
 * syntax (digits, operators, parentheses, known function names) and reject
 * anything else before ever calling Function(), which keeps this a plain
 * expression evaluator rather than a generic code-execution surface.
 */

const SAFE_EXPRESSION = /^[0-9+\-*/().%\sA-Za-z_.]+$/;

function compile(expression, paramNames, paramValues) {
  if (!SAFE_EXPRESSION.test(expression)) {
    throw new Error('Invalid or unsafe expression');
  }
  // eslint-disable-next-line no-new-func -- restricted charset validated above
  return Function(...paramNames, 'return ' + expression)(...paramValues);
}

const DEGREE_TRIG = {
  sinD: x => Math.sin(x * Math.PI / 180),
  cosD: x => Math.cos(x * Math.PI / 180),
  tanD: x => Math.tan(x * Math.PI / 180),
  asinD: x => Math.asin(x) * 180 / Math.PI,
  acosD: x => Math.acos(x) * 180 / Math.PI,
  atanD: x => Math.atan(x) * 180 / Math.PI
};

/**
 * Evaluates an expression typed into the scientific calculator.
 * Supports π, e, ^ (power), √(), log() [base 10], ln(), abs(), inv() (1/x)
 * and trig functions that follow the given angle mode ('DEG' or 'RAD').
 */
export function evaluateScientific(expression, angleMode = 'DEG') {
  let s = expression
    .replaceAll('π', 'Math.PI')
    .replace(/\be\b/g, 'Math.E')
    .replaceAll('^', '**')
    .replace(/√\(/g, 'Math.sqrt(')
    .replace(/log\(/g, 'Math.log10(')
    .replace(/ln\(/g, 'Math.log(')
    .replace(/abs\(/g, 'Math.abs(')
    .replace(/inv\(/g, '(1/');

  s = angleMode === 'DEG'
    ? s.replace(/sin\(/g, 'sinD(').replace(/cos\(/g, 'cosD(').replace(/tan\(/g, 'tanD(')
      .replace(/asin\(/g, 'asinD(').replace(/acos\(/g, 'acosD(').replace(/atan\(/g, 'atanD(')
    : s.replace(/sin\(/g, 'Math.sin(').replace(/cos\(/g, 'Math.cos(').replace(/tan\(/g, 'Math.tan(')
      .replace(/asin\(/g, 'Math.asin(').replace(/acos\(/g, 'Math.acos(').replace(/atan\(/g, 'Math.atan(');

  s = s.replace(/,/g, '.');

  return compile(s, Object.keys(DEGREE_TRIG), Object.values(DEGREE_TRIG));
}

/**
 * Evaluates an expression typed into the quick engineering calculator.
 * Simpler than the scientific one: trig is always in radians, and both
 * "pi" and "π" are accepted.
 */
export function evaluateQuick(expression) {
  const s = expression
    .replace(/,/g, '.')
    .replace(/π/g, 'Math.PI')
    .replace(/\bpi\b/gi, 'Math.PI')
    .replace(/\be\b/g, 'Math.E')
    .replace(/sqrt\(/g, 'Math.sqrt(')
    .replace(/sin\(/g, 'Math.sin(')
    .replace(/cos\(/g, 'Math.cos(')
    .replace(/tan\(/g, 'Math.tan(')
    .replace(/log\(/g, 'Math.log10(')
    .replace(/ln\(/g, 'Math.log(')
    .replace(/abs\(/g, 'Math.abs(')
    .replace(/\^/g, '**');

  return compile(s, [], []);
}

/** Formats a scientific-calculator result, rejecting non-finite values. */
export function formatScientific(value) {
  if (!isFinite(value)) throw new Error('Non-finite result');
  return String(Number(value.toFixed(12)));
}

/** Formats a quick-calculator result, rejecting non-finite values. */
export function formatQuick(value) {
  if (!isFinite(value)) throw new Error('Non-finite result');
  return Number(value.toPrecision(12));
}
