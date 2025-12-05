export function gaussJordanElimination(inputMatrix) {
  const matrix = inputMatrix.map(row => row.slice());
  const rows = matrix.length;
  const cols = matrix[0].length;
  const steps = [];
  const EPS = 1e-12;

  function snapshot(desc, math) {
    const matCopy = matrix.map(r => r.slice());
    steps.push({ desc, math, matrix: matCopy });
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
  for (let c = 0; c < cols - 1 && r < rows; c++) {
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
      const math = `(R${r+1} * ${formatNumber(scalar)}) => R${r+1}`;
      snapshot(`Normalize R${r+1}`, math);
    } else {
      snapshot(`Pivot at R${r+1} is already 1`, `R${r+1} stays`);
    }

    for (let i = 0; i < rows; i++) {
      if (i === r) continue;
      const factor = matrix[i][c];
      if (Math.abs(factor) > EPS) {
        addMultipleOfRow(i, r, -factor);
        const math = `(R${i+1} + (${formatNumber(-factor)}) * R${r+1} ) => R${i+1}`;
        snapshot(`Eliminate column ${c+1} in R${i+1}`, math);
      }
    }

    r += 1;
  }

  let singular = false;
  for (let i = 0; i < rows; i++) {
    let allZero = true;
    for (let j = 0; j < cols - 1; j++) {
      if (Math.abs(matrix[i][j]) > EPS) { allZero = false; break; }
    }
    if (allZero && Math.abs(matrix[i][cols - 1]) > EPS) {
      singular = true;
      snapshot(`Inconsistent row found at R${i+1}`, `0 = ${formatNumber(matrix[i][cols-1])}`);
      break;
    }
  }

  const cleanMatrix = matrix.map(row => row.map(val => cleanNumber(val)));

  return {
    steps,
    echelon: cleanMatrix,
    singular
  };
}

function formatNumber(x) {
  if (Math.abs(x) < 1e-10) return '0';
  if (Math.abs(x - Math.round(x)) < 1e-10) return String(Math.round(x));
  return Number.parseFloat(x).toPrecision(8).replace(/\.?0+$/,'');
}

function cleanNumber(x) {
  if (Math.abs(x) < 1e-12) return 0;
  const rounded = Math.round(x * 1e12) / 1e12;
  if (Object.is(rounded, -0)) return 0;
  return rounded;
}
