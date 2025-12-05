import { MAX } from './constants.js';
import { generateMatrix, matrixInputHandler, matrixInputKeydown, readMainMatrix } from './input-parser.js';
import { setMatrixInputsDisabled, findStartButton, restoreStartButton } from './matrix-utils.js';
import { gaussianEliminationMedium, backSubstitute } from './gaussian-solver.js';
import { gaussJordanElimination } from './gauss-jordan-solver.js';
import { renderVerboseSteps, renderFinalMatrix, generateVariablesList, markError, resetError } from './dom-renderer.js';
import { invertMatrixWithSteps } from './inverse-solver.js';

window.generateMatrix = generateMatrix;
window.fillStepMatrices = function(rows, vars, noAugmented = false) {
    const mainMatrix = document.getElementById("matrix");
    if (!mainMatrix) return;
    const mainRows = Array.from(mainMatrix.querySelectorAll("li"));

    const stepsContainer = document.getElementById("stepsContainer");
    if (stepsContainer) stepsContainer.innerHTML = "";

    const finalContainer = document.getElementById("finalMatrix");
    if (!finalContainer) return;
    finalContainer.innerHTML = "";

    const cols = noAugmented ? vars : (vars + 1);

    for (let i = 0; i < rows; i++) {
        const li = document.createElement("li");
        li.className = "d-flex justify-content-center mb-2";
        for (let j = 0; j < cols; j++) {
            const inp = document.createElement("input");
            inp.type = "number";
            inp.disabled = true;
            inp.className = "border border-2 border-black rounded-2 mx-1 p-1 text-center";

            const mainInp = (mainRows[i] && mainRows[i].querySelectorAll("input")[j]) ? mainRows[i].querySelectorAll("input")[j] : null;
            if (mainInp && mainInp.value !== "") inp.value = mainInp.value;

            li.appendChild(inp);
        }
        finalContainer.appendChild(li);
    }
};

window.startSolve = startSolve;
window.clearValues = clearValues;
window.Switch = Switch;
window.back = back;

window.__restoreStartButton = restoreStartButton;
window.__fillStepMatrices = window.fillStepMatrices;

export function startSolve() {
    const matrix = readMainMatrix();
    if (!matrix) return;

    setMatrixInputsDisabled(true);

    const startBtn = findStartButton();
    if (startBtn) {
        if (startBtn.dataset._origBg === undefined) {
            startBtn.dataset._origBg = startBtn.style.backgroundColor || "";
        }
        if (startBtn.dataset._origColor === undefined) {
            startBtn.dataset._origColor = startBtn.style.color || "";
        }
        startBtn.classList.remove('bg-black', 'text-white', 'btn-primary', 'start-enabled');
        startBtn.disabled = true;
        startBtn.setAttribute('aria-disabled', 'true');
        startBtn.style.setProperty('background-color', '#e0e0e0', 'important');
        startBtn.style.setProperty('color', '#6b6b6b', 'important');
        startBtn.style.setProperty('pointer-events', 'none', 'important');
        startBtn.style.setProperty('opacity', '1', 'important');
        startBtn.classList.add('start-disabled');
    }

    try {
        const methodRadio = document.querySelector('input[name="choice"]:checked');
        const methodId = methodRadio ? methodRadio.id : 'Gaussian-r';

        const finalLabel = document.getElementById("finalFormLabel");
        if (finalLabel) {
            if (methodId === 'Jordan-r') {
                finalLabel.textContent = "Reduced Row Echelon Form";
            } else if (methodId === 'Inverse-r') {
                finalLabel.textContent = "Inverse Matrix";
            } else {
                finalLabel.textContent = "Row Echelon Form";
            }
        }

        if (methodId === 'Inverse-r') {
            const rows = matrix.length;
            const cols = matrix[0] ? matrix[0].length : 0;

            if (!(cols === rows || cols === rows + 1)) {
                renderVerboseSteps([]);
                renderFinalMatrix([]);
                generateVariablesList(null, "Matrix must be square (n x n) to compute inverse. Ensure input is n × n or n × (n+1) augmented.");
                const stepsContainer = document.getElementById("stepsContainer");
                if (stepsContainer) stepsContainer.classList.remove("d-none");
                const finalSection = document.getElementById("finalSection");
                if (finalSection) finalSection.classList.remove("d-none");
                return;
            }

            const A = matrix.map(r => r.slice(0, rows));

            const { steps, inverse, singular } = invertMatrixWithSteps(A);
            if (Array.isArray(steps)) {
              steps.forEach(s => { s._isInverse = true; });
            }

            renderVerboseSteps(steps);

            if (singular || !inverse) {
                renderFinalMatrix([]);
                generateVariablesList(null, "Matrix is singular or nearly singular — inverse does not exist.");
            } else {
                renderFinalMatrix(inverse);
            }

            const stepsContainer = document.getElementById("stepsContainer");
            if (stepsContainer) stepsContainer.classList.remove("d-none");
            const finalSection = document.getElementById("finalSection");
            if (finalSection) finalSection.classList.remove("d-none");
            return;
        }

        if (methodId === 'Jordan-r') {
            const { steps, echelon, singular } = gaussJordanElimination(matrix);

            renderVerboseSteps(steps);
            renderFinalMatrix(echelon);

            if (singular) {
                generateVariablesList(null, "The system may be singular or inconsistent.");
                const stepsContainer = document.getElementById("stepsContainer");
                if (stepsContainer) stepsContainer.classList.remove("d-none");
                const finalSection = document.getElementById("finalSection");
                if (finalSection) finalSection.classList.remove("d-none");
                return;
            }

            const values = echelon.map(row => row[row.length - 1]);
            generateVariablesList(values, "");
        } else {
            const { steps, echelon, singular } = gaussianEliminationMedium(matrix);

            renderVerboseSteps(steps);
            renderFinalMatrix(echelon);

            if (singular) {
                generateVariablesList(null, "The system may be singular or inconsistent.");
                const stepsContainer = document.getElementById("stepsContainer");
                if (stepsContainer) stepsContainer.classList.remove("d-none");
                const finalSection = document.getElementById("finalSection");
                if (finalSection) finalSection.classList.remove("d-none");
                return;
            }

            const values = backSubstitute(echelon);
            generateVariablesList(values, "");
        }

        const stepsContainer = document.getElementById("stepsContainer");
        if (stepsContainer) stepsContainer.classList.remove("d-none");
        const finalSection = document.getElementById("finalSection");
        if (finalSection) finalSection.classList.remove("d-none");

    } catch (err) {
        console.error(err);
        markError('An unexpected error occurred while solving.');
    } finally {
    }
}

export function clearValues() {
    const matrix = document.getElementById("matrix");
    if (matrix) matrix.querySelectorAll("input").forEach(i => i.value = "");

    setMatrixInputsDisabled(false);
    restoreStartButton();

    const stepsContainer = document.getElementById("stepsContainer");
    if (stepsContainer) stepsContainer.classList.add("d-none");
    const finalSection = document.getElementById("finalSection");
    if (finalSection) finalSection.classList.add("d-none");
    const varsList = document.getElementById("variablesList");
    if (varsList) varsList.innerHTML = "";
}

export function Switch() {
    const eqInput = document.getElementById("Equations");
    const varInput = document.getElementById("Variables");

    const eq = Number(eqInput.value);
    const vars = Number(varInput.value);

    resetError(eqInput);
    resetError(varInput);

    let error = false;
    if (!Number.isInteger(eq) || eq <= 0 || eq > MAX) { markError(eqInput); error = true; }
    if (!Number.isInteger(vars) || vars <= 0 || vars > MAX) { markError(varInput); error = true; }
    if (error) return;

    const mainEl = document.getElementById("main");
    const model = document.getElementById("model");
    if (model && mainEl) {
        model.classList.replace("d-block", "d-none");
        mainEl.classList.replace("d-none", "d-block");
    }

    const methodRadio = document.querySelector('input[name="choice"]:checked');
    const methodId = methodRadio ? methodRadio.id : null;

    const matrixEl = document.getElementById("matrix");
    const varsList = document.getElementById("variablesList");
    const startBtn = findStartButton && typeof findStartButton === 'function' ? findStartButton() : document.getElementById('startButton');
    const clearBtn = document.querySelector('button[onclick="clearValues()"]');

    document.querySelectorAll('.edit-size-btn').forEach(b => b.remove());
    const prevEdit = document.getElementById('editSizeOnlyBtn');
    if (prevEdit) prevEdit.remove();

    let originalEditBtn = null;
    document.querySelectorAll('button').forEach(b => {
      try {
        const onclick = b.getAttribute && b.getAttribute('onclick');
        const text = (b.textContent || b.value || '').trim().toLowerCase();
        if ((onclick && onclick.includes('back(')) || text === 'edit size') {
          originalEditBtn = b;
        }
      } catch (e) {}
    });

    if (methodId === 'Inverse-r' && eq !== vars) {
        if (matrixEl) matrixEl.innerHTML = "";

        if (startBtn) startBtn.style.display = "none";
        if (clearBtn) clearBtn.style.display = "none";

        if (originalEditBtn) originalEditBtn.style.display = "none";

        if (varsList) {
            const existingMsg = varsList.querySelector('.rect-inverse-msg');
            if (existingMsg) existingMsg.remove();

            const msg = document.createElement('div');
            msg.className = 'rect-inverse-msg';
            msg.style.textAlign = 'center';
            msg.style.padding = '12px';
            msg.style.paddingBottom = '20px';
            msg.innerHTML = `
              <h4 style="margin:0 0 10px 0;">Cannot compute inverse for a rectangular matrix</h4>
              <p style="margin:0 0 12px 0;">The matrix must be square (n × n). Please go back and adjust the dimensions.</p>
            `;
            varsList.appendChild(msg);

            if (originalEditBtn) {
                const clone = originalEditBtn.cloneNode(true);
                clone.id = 'editSizeOnlyBtn';
                clone.classList.add('edit-size-btn');

                clone.onclick = function(e) {
                    e.preventDefault();
                    location.reload();
                };

                const wrapper = document.createElement('div');
                wrapper.style.textAlign = 'center';
                wrapper.style.marginTop = '8px';
                wrapper.appendChild(clone);
                varsList.appendChild(wrapper);
                clone.style.display = "";
            } else {
                const btn = document.createElement('button');
                btn.id = 'editSizeOnlyBtn';
                btn.className = 'btn btn-secondary edit-size-btn';
                btn.textContent = 'Edit Size';
                btn.onclick = function(e) {
                    e.preventDefault();
                    location.reload();
                };
                const wrapper = document.createElement('div');
                wrapper.style.textAlign = 'center';
                wrapper.style.marginTop = '8px';
                wrapper.appendChild(btn);
                varsList.appendChild(wrapper);
            }
        }

        const stepsContainer = document.getElementById("stepsContainer");
        if (stepsContainer) stepsContainer.classList.remove("d-none");
        const finalSection = document.getElementById("finalSection");
        if (finalSection) finalSection.classList.remove("d-none");

        return;
    }

    const noAugmented = (methodId === 'Inverse-r');

    if (startBtn) startBtn.style.display = "";
    if (clearBtn) clearBtn.style.display = "";

    document.querySelectorAll('.edit-size-btn').forEach(b => b.remove());
    const prevById2 = document.getElementById('editSizeOnlyBtn');
    if (prevById2) prevById2.remove();

    if (originalEditBtn) {
        originalEditBtn.style.display = "";
    }

    try {
        generateMatrix(eq, vars, noAugmented);
    } catch (e) {
        try { generateMatrix(eq, vars); } catch (err) { console.error('generateMatrix failed', err); }
    }

    try {
        window.fillStepMatrices(eq, vars, noAugmented);
    } catch (e) {
        try { window.fillStepMatrices(eq, vars); } catch (err) { console.error(err); }
    }

    const stepsContainer = document.getElementById("stepsContainer");
    if (stepsContainer) stepsContainer.classList.add("d-none");
    const finalSection = document.getElementById("finalSection");
    if (finalSection) finalSection.classList.add("d-none");
}

export function back() {
    const stepsContainer = document.getElementById("stepsContainer");
    if (stepsContainer) stepsContainer.classList.add("d-none");
    const finalSection = document.getElementById("finalSection");
    if (finalSection) finalSection.classList.add("d-none");
    const varsList = document.getElementById("variablesList");
    if (varsList) varsList.innerHTML = "";

    const startBtn = findStartButton && typeof findStartButton === 'function' ? findStartButton() : document.getElementById('startButton');
    if (startBtn) startBtn.style.display = "";

    const clearBtn = document.querySelector('button[onclick="clearValues()"]');
    if (clearBtn) clearBtn.style.display = "";

    document.querySelectorAll('.edit-size-btn').forEach(b => b.remove());
    const prevEdit = document.getElementById('editSizeOnlyBtn');
    if (prevEdit) prevEdit.remove();

    document.querySelectorAll('button').forEach(b => {
        try {
            const onclick = b.getAttribute && b.getAttribute('onclick');
            if (onclick && onclick.includes('back(')) {
                b.style.display = "";
            }
        } catch (e) {}
    });

    setTimeout(() => {
        try { updateSubmitState(); } catch (e) {}
    }, 0);
}

function setupModelKeyboard() {
  const eq = document.getElementById('Equations');
  const vars = document.getElementById('Variables');

  if (!eq || !vars) return;

  function onKey(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (document.activeElement === eq) {
        vars.focus();
        try { vars.select(); } catch {}
      } else {
        eq.focus();
        try { eq.select(); } catch {}
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (document.activeElement === vars) {
        eq.focus();
        try { eq.select(); } catch {}
      } else {
        vars.focus();
        try { vars.select(); } catch {}
      }
    }
  }

  eq.addEventListener('keydown', onKey);
  vars.addEventListener('keydown', onKey);
}

function isReadyToSubmit() {
  const eqInput = document.getElementById('Equations');
  const varInput = document.getElementById('Variables');

  const eqVal = eqInput ? parseInt(eqInput.value.trim(), 10) : 0;
  const varVal = varInput ? parseInt(varInput.value.trim(), 10) : 0;

  const radios = Array.from(document.querySelectorAll('input[type="radio"][name="choice"]'));
  const anyRadioChecked = radios.some(r => r.checked);

  return Number.isInteger(eqVal) && eqVal > 0 && Number.isInteger(varVal) && varVal > 0 && anyRadioChecked;
}

function updateSubmitState() {
  const btn = document.getElementById('modalSubmit');
  if (!btn) return;

  if (isReadyToSubmit()) {
    btn.disabled = false;
    btn.style.opacity = '';
  } else {
    btn.disabled = true;
    btn.style.opacity = '0.6';
  }
}

function setupSubmitLogic() {
  const eqInput = document.getElementById('Equations');
  const varInput = document.getElementById('Variables');

  if (eqInput) {
    eqInput.addEventListener('input', updateSubmitState);
    eqInput.addEventListener('change', updateSubmitState);
  }
  if (varInput) {
    varInput.addEventListener('input', updateSubmitState);
    varInput.addEventListener('change', updateSubmitState);
  }

  document.querySelectorAll('input[type="radio"][name="choice"]').forEach(r => {
    r.addEventListener('change', updateSubmitState);
  });

  updateSubmitState();
}

const originalBack = window.back;
window.back = function(...args) {
  try { originalBack.apply(this, args); } catch (e) { console.error(e); }
  setTimeout(updateSubmitState, 0);
};

document.addEventListener('keydown', function(e) {
  if (e.key !== 'Enter') return;

  const modelEl = document.getElementById('model');
  const mainEl = document.getElementById('main');

  const modalVisible = modelEl ? modelEl.classList.contains('d-block') : false;
  const mainVisible = mainEl ? mainEl.classList.contains('d-block') : false;

  if (modalVisible) {
    if (isReadyToSubmit()) {
      e.preventDefault();
      e.stopPropagation();
      try { Switch(); } catch (err) { console.error(err); }
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const radios = Array.from(document.querySelectorAll('input[type="radio"][name="choice"]'));
    const anyRadioChecked = radios.some(r => r.checked);
    if (!anyRadioChecked) {
      const firstRadio = radios[0];
      if (firstRadio) firstRadio.focus({ preventScroll: true });
      return;
    }

    const eqInput = document.getElementById('Equations');
    const varInput = document.getElementById('Variables');
    const eqVal = eqInput ? parseInt(eqInput.value.trim(), 10) : NaN;
    const varVal = varInput ? parseInt(varInput.value.trim(), 10) : NaN;
    if (!Number.isInteger(eqVal) || eqVal <= 0) {
      if (eqInput) eqInput.focus({ preventScroll: true });
    } else if (!Number.isInteger(varVal) || varVal <= 0) {
      if (varInput) varInput.focus({ preventScroll: true });
    }
    return;
  }

  if (mainVisible) {
    const startBtn = findStartButton && typeof findStartButton === 'function' ? findStartButton() : document.getElementById('startSolve');
    if (startBtn && !startBtn.disabled) {
      e.preventDefault();
      e.stopPropagation();
      try { startSolve(); } catch (err) { console.error(err); }
      return;
    } else {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  }
}, true);

document.addEventListener('DOMContentLoaded', function () {
  setupModelKeyboard();
  setupSubmitLogic();
});
