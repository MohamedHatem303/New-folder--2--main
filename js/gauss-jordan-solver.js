// gauss-jordan-solver.js
// Exports: gaussJordanElimination(matrix)
// Input: augmented matrix as array of arrays (numbers) e.g. [[2,1,5],[3,4,6],...]
// Output: { steps, echelon, singular }
//  - steps: [{ desc, math, matrix }]
//  - echelon: final RREF matrix (augmented)
//  - singular: boolean (true if inconsistent or no unique pivots)

export function gaussJordanElimination(inputMatrix) {
  // deep copy
  const matrix = inputMatrix.map(row => row.slice());
  const rows = matrix.length;
  const cols = matrix[0].length; // includes augmented column
  const steps = [];
  const EPS = 1e-12;

  function snapshot(desc, math) {
    // deep copy of matrix for rendering
    const matCopy = matrix.map(r => r.slice());
    steps.push({ desc, math, matrix: matCopy });
  }

  // helper: swap rows
  function swap(i, j) {
    const tmp = matrix[i];
    matrix[i] = matrix[j];
    matrix[j] = tmp;
  }

  // helper: multiply row by scalar
  function multiplyRow(i, scalar) {
    for (let c = 0; c < cols; c++) matrix[i][c] *= scalar;
  }

  // helper: add scalar * row src to row dest
  function addMultipleOfRow(dest, src, scalar) {
    for (let c = 0; c < cols; c++) matrix[dest][c] += scalar * matrix[src][c];
  }

  let r = 0; // current row
  for (let c = 0; c < cols - 1 && r < rows; c++) { // last column is augmented
    // find pivot (max absolute) in column c at or below r
    let pivotRow = r;
    let maxAbs = Math.abs(matrix[r][c]);
    for (let i = r + 1; i < rows; i++) {
      const val = Math.abs(matrix[i][c]);
      if (val > maxAbs) { maxAbs = val; pivotRow = i; }
    }

    if (maxAbs <= EPS) {
      // no pivot in this column
      continue;
    }

    if (pivotRow !== r) {
      swap(pivotRow, r);
      snapshot(`Swap R${r+1} ↔ R${pivotRow+1}`, `R${r+1} <-> R${pivotRow+1}`);
    }

    // normalize pivot row so pivot = 1
    const pivot = matrix[r][c];
    if (Math.abs(pivot - 1) > EPS) {
      const scalar = 1 / pivot;
      multiplyRow(r, scalar);
      // format math: (Rr * 1/pivot)
      const math = `(R${r+1} * ${formatNumber(scalar)}) => R${r+1}`;
      snapshot(`Normalize R${r+1}`, math);
    } else {
      snapshot(`Pivot at R${r+1} is already 1`, `R${r+1} stays`);
    }

    // eliminate all other rows (both above and below) in column c
    for (let i = 0; i < rows; i++) {
      if (i === r) continue;
      const factor = matrix[i][c];
      if (Math.abs(factor) > EPS) {
        // R_i = R_i - factor * R_r  (since pivot is 1)
        addMultipleOfRow(i, r, -factor);
        const math = `(R${i+1} + (${formatNumber(-factor)}) * R${r+1} ) => R${i+1}`;
        snapshot(`Eliminate column ${c+1} in R${i+1}`, math);
      }
    }

    r += 1;
  }

  // At this point matrix should be in RREF-like form (within numerical tolerance).
  // Check for inconsistency: a row with all zeros in coeffs but non-zero in augmented column
  let singular = false;
  for (let i = 0; i < rows; i++) {
    let allZero = true;
    for (let j = 0; j < cols - 1; j++) {
      if (Math.abs(matrix[i][j]) > EPS) { allZero = false; break; }
    }
    if (allZero && Math.abs(matrix[i][cols - 1]) > EPS) {
      singular = true; // 0 = nonzero  -> inconsistent
      snapshot(`Inconsistent row found at R${i+1}`, `0 = ${formatNumber(matrix[i][cols-1])}`);
      break;
    }
  }

  // NOTE: removed the explicit "Final RREF" snapshot so final RREF won't appear as last step.
  // final matrix will still be returned as `echelon` and rendered by renderFinalMatrix.

  // ensure numbers are cleaned (turn -0 to 0, round small floating errors)
  const cleanMatrix = matrix.map(row => row.map(val => cleanNumber(val)));

  return {
    steps,
    echelon: cleanMatrix,
    singular
  };
}

// helper: pretty format number for math strings (avoid long floats)
function formatNumber(x) {
  if (Math.abs(x) < 1e-10) return '0';
  if (Math.abs(x - Math.round(x)) < 1e-10) return String(Math.round(x));
  // limit to 8 significant digits max for readability
  return Number.parseFloat(x).toPrecision(8).replace(/\.?0+$/,'');
}

function cleanNumber(x) {
  // remove tiny floating point noise
  if (Math.abs(x) < 1e-12) return 0;
  // round to e.g. 12 decimal places to avoid long floats
  const rounded = Math.round(x * 1e12) / 1e12;
  // convert -0 -> 0
  if (Object.is(rounded, -0)) return 0;
  return rounded;
}
