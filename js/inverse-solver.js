export function invertMatrixWithSteps(inputMatrix) {
  const EPS = 1e-12;

  const n = inputMatrix.length;
  if (n === 0) return { steps: [], inverse: [], singular: true };
  for (let i = 0; i < n; i++) {
    if (!Array.isArray(inputMatrix[i]) || inputMatrix[i].length !== n) {
      throw new Error('invertMatrixWithSteps: input must be square n x n matrix');
    }
  }

  const matrix = inputMatrix.map((r, i) => {
    const copy = r.slice();
    for (let j = 0; j < n; j++) copy.push(i === j ? 1 : 0);
    return copy;
  });

  const rows = n;
  const cols = 2 * n;
  const steps = [];

  function snapshot(desc, math) {
    steps.push({
      desc: desc || '',
      math: math || '',
      matrix: matrix.map(r => r.slice())
    });
  }

  function swap(i, j) {
    const tmp = matrix[i];
    matrix[i] = matrix[j];
    matrix[j] = tmp;
  }

  function multiplyRow(i, scalar) {
    for (let c = 0; c < cols; c++) matrix[i][c] *= scalar;
  }

  function addMultipleOfRow(dest, src, scalar) {
    for (let c = 0; c < cols; c++) matrix[dest][c] += scalar * matrix[src][c];
  }

  let r = 0;
  for (let c = 0; c < n && r < rows; c++) {
    let pivotRow = r;
    let maxAbs = Math.abs(matrix[r][c]);
    for (let i = r + 1; i < rows; i++) {
      const val = Math.abs(matrix[i][c]);
      if (val > maxAbs) { maxAbs = val; pivotRow = i; }
    }

    if (maxAbs <= EPS) {
      continue;
    }

    if (pivotRow !== r) {
      swap(pivotRow, r);
      snapshot(`Swap R${r+1} ↔ R${pivotRow+1}`, `R${r+1} <-> R${pivotRow+1}`);
    }

    const pivot = matrix[r][c];
    if (Math.abs(pivot - 1) > EPS) {
      const scalar = 1 / pivot;
      multiplyRow(r, scalar);
      snapshot(`Normalize R${r+1}`, `(R${r+1} * ${Number.parseFloat(scalar.toPrecision(8))}) => R${r+1}`);
    } else {
      snapshot(`Pivot at R${r+1} is already 1`, `R${r+1} stays`);
    }

    for (let i = 0; i < rows; i++) {
      if (i === r) continue;
      const factor = matrix[i][c];
      if (Math.abs(factor) > EPS) {
        addMultipleOfRow(i, r, -factor);
        snapshot(`Eliminate column ${c+1} in R${i+1}`, `(R${i+1} + (${Number.parseFloat((-factor).toPrecision(8))}) * R${r+1}) => R${i+1}`);
      }
    }

    r += 1;
  }

  let singular = false;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const val = matrix[i][j];
      if (i === j) {
        if (Math.abs(val - 1) > 1e-8) { singular = true; break; }
      } else {
        if (Math.abs(val) > 1e-8) { singular = true; break; }
      }
    }
    if (singular) break;
  }

  function cleanNumber(x) {
    if (Math.abs(x) < 1e-12) return 0;
    const rounded = Math.round(x * 1e12) / 1e12;
    if (Object.is(rounded, -0)) return 0;
    return rounded;
  }

  if (singular) {
    return { steps, inverse: null, singular: true };
  }

  const inverse = matrix.map(row => row.slice(n, cols).map(cleanNumber));
  return { steps, inverse, singular: false };
}
