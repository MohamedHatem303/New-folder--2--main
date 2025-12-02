// app.js - entry point controller
import { MAX } from './constants.js';
import { generateMatrix, matrixInputHandler, matrixInputKeydown, readMainMatrix } from './input-parser.js';
import { setMatrixInputsDisabled, findStartButton, restoreStartButton } from './matrix-utils.js';
import { gaussianEliminationMedium, backSubstitute } from './gaussian-solver.js';
import { gaussJordanElimination } from './gauss-jordan-solver.js';
import { renderVerboseSteps, renderFinalMatrix, generateVariablesList, markError, resetError } from './dom-renderer.js';
import { invertMatrixWithSteps } from './inverse-solver.js';

// expose functions to preserve old API and onclick compatibility
window.generateMatrix = generateMatrix;
// updated: accept optional noAugmented flag so Inverse can create n x n (no RHS)
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

// expose internal restore to input-parser if needed
window.__restoreStartButton = restoreStartButton;
window.__fillStepMatrices = window.fillStepMatrices;

export function startSolve() {
    const matrix = readMainMatrix();
    if (!matrix) return;

    // قفل كل خانات المصفوفة (تظل مقفولة بعد الحل)
    setMatrixInputsDisabled(true);

    // تعطيل زرار الاستارت + مظهر رمادي
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
        // determine selected method from radio buttons (name="choice")
        const methodRadio = document.querySelector('input[name="choice"]:checked');
        const methodId = methodRadio ? methodRadio.id : 'Gaussian-r';

        // update final form label according to chosen method
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

        // ----- INVERSE BRANCH -----
        if (methodId === 'Inverse-r') {
            // matrix may be either n x n (only A) or n x (n+1) (augmented [A | b]).
            const rows = matrix.length;
            const cols = matrix[0] ? matrix[0].length : 0;

            // determine A: if cols === rows => use all columns; if cols === rows + 1 => drop last (RHS)
            if (!(cols === rows || cols === rows + 1)) {
                // not square / not augmented in expected shape
                renderVerboseSteps([]); // clear previous
                renderFinalMatrix([]);  // clear previous
                generateVariablesList(null, "Matrix must be square (n x n) to compute inverse. Ensure input is n × n or n × (n+1) augmented.");
                const stepsContainer = document.getElementById("stepsContainer");
                if (stepsContainer) stepsContainer.classList.remove("d-none");
                const finalSection = document.getElementById("finalSection");
                if (finalSection) finalSection.classList.remove("d-none");
                return;
            }

            const A = matrix.map(r => r.slice(0, rows)); // take first n columns as A

const { steps, inverse, singular } = invertMatrixWithSteps(A);
// mark steps so dom-renderer knows these are inverse-steps (show A / I labels)
if (Array.isArray(steps)) {
  steps.forEach(s => { s._isInverse = true; });
}

            renderVerboseSteps(steps);

            if (singular || !inverse) {
                renderFinalMatrix([]); // nothing to show
                generateVariablesList(null, "Matrix is singular or nearly singular — inverse does not exist.");
            } else {
                renderFinalMatrix(inverse);
                // keep final text blank (no extra "Inverse matrix shown above.")
            }

            const stepsContainer = document.getElementById("stepsContainer");
            if (stepsContainer) stepsContainer.classList.remove("d-none");
            const finalSection = document.getElementById("finalSection");
            if (finalSection) finalSection.classList.remove("d-none");
            return;
        }
        // ----- END INVERSE BRANCH -----

        // GAUSS-JORDAN branch (unchanged logic)
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
            // GAUSSIAN elimination branch (unchanged logic)
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
        // note: inputs remain locked and start button disabled until clearValues() is called
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

// Switch (modal -> main) and back
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

    // find UI elements
    const methodRadio = document.querySelector('input[name="choice"]:checked');
    const methodId = methodRadio ? methodRadio.id : null;

    const matrixEl = document.getElementById("matrix");
    const varsList = document.getElementById("variablesList");
    const startBtn = findStartButton && typeof findStartButton === 'function' ? findStartButton() : document.getElementById('startButton');
    const clearBtn = document.querySelector('button[onclick="clearValues()"]');

    // defensive cleanup: remove any transient clones we created earlier
    document.querySelectorAll('.edit-size-btn').forEach(b => b.remove());
    const prevEdit = document.getElementById('editSizeOnlyBtn');
    if (prevEdit) prevEdit.remove();

   // try to locate the ORIGINAL Edit Size button (heuristic: has onclick that calls back() OR visible text "Edit Size")
let originalEditBtn = null;
document.querySelectorAll('button').forEach(b => {
  try {
    const onclick = b.getAttribute && b.getAttribute('onclick');
    const text = (b.textContent || b.value || '').trim().toLowerCase();
    // accept either explicit back() onclick or button text "edit size"
    if ((onclick && onclick.includes('back(')) || text === 'edit size') {
      originalEditBtn = b;
    }
  } catch (e) {}
});


    // -------- Case: Inverse chosen but matrix is rectangular --------
    if (methodId === 'Inverse-r' && eq !== vars) {
        // clear matrix area
        if (matrixEl) matrixEl.innerHTML = "";

        // hide Start & Clear
        if (startBtn) startBtn.style.display = "none";
        if (clearBtn) clearBtn.style.display = "none";

        // hide ORIGINAL edit button in its original place (so only clone appears under message)
        if (originalEditBtn) originalEditBtn.style.display = "none";

        // append message first (with bottom padding)
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

            // create SINGLE clone of original under the message (visible)
            if (originalEditBtn) {
                const clone = originalEditBtn.cloneNode(true);
                clone.id = 'editSizeOnlyBtn';
                clone.classList.add('edit-size-btn');

                // override behavior: on click -> reload the page (only for this clone)
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
                // fallback: create one simple button (shouldn't normally run if html has the button)
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

        // show steps/final sections so message is visible
        const stepsContainer = document.getElementById("stepsContainer");
        if (stepsContainer) stepsContainer.classList.remove("d-none");
        const finalSection = document.getElementById("finalSection");
        if (finalSection) finalSection.classList.remove("d-none");

        return;
    }

    // -------- Normal path (square or other methods): show original buttons --------
    const noAugmented = (methodId === 'Inverse-r');

    // ensure Start & Clear visible
    if (startBtn) startBtn.style.display = "";
    if (clearBtn) clearBtn.style.display = "";

    // remove any transient clones just in case
    document.querySelectorAll('.edit-size-btn').forEach(b => b.remove());
    const prevById2 = document.getElementById('editSizeOnlyBtn');
    if (prevById2) prevById2.remove();

    // show ORIGINAL Edit Size if present
    if (originalEditBtn) {
        originalEditBtn.style.display = "";
    }

    // generate matrix (with optional noAugmented)
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

    // hide steps/final until we run solver
    const stepsContainer = document.getElementById("stepsContainer");
    if (stepsContainer) stepsContainer.classList.add("d-none");
    const finalSection = document.getElementById("finalSection");
    if (finalSection) finalSection.classList.add("d-none");
}

// back()
export function back() {
    const mainEl = document.getElementById("main");
    const model = document.getElementById("model");
    if (model && mainEl) {
        model.classList.replace("d-none", "d-block");
        mainEl.classList.replace("d-block", "d-none");
    }

    const stepsContainer = document.getElementById("stepsContainer");
    if (stepsContainer) stepsContainer.classList.add("d-none");
    const finalSection = document.getElementById("finalSection");
    if (finalSection) finalSection.classList.add("d-none");
    const varsList = document.getElementById("variablesList");
    if (varsList) varsList.innerHTML = "";

    // restore Start & Clear buttons visibility (in case they were hidden)
    const startBtn = findStartButton && typeof findStartButton === 'function' ? findStartButton() : document.getElementById('startButton');
    if (startBtn) startBtn.style.display = "";

    const clearBtn = document.querySelector('button[onclick="clearValues()"]');
    if (clearBtn) clearBtn.style.display = "";

    // remove transient clones if any
    document.querySelectorAll('.edit-size-btn').forEach(b => b.remove());
    const prevEdit = document.getElementById('editSizeOnlyBtn');
    if (prevEdit) prevEdit.remove();

    // make sure original Edit Size (if present) is visible again
    document.querySelectorAll('button').forEach(b => {
        try {
            const onclick = b.getAttribute && b.getAttribute('onclick');
            if (onclick && onclick.includes('back(')) {
                b.style.display = "";
            }
        } catch (e) {}
    });

    // restore submit state on modal
    setTimeout(() => {
        try { updateSubmitState(); } catch (e) {}
    }, 0);
}

// modal keyboard helpers
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
    // NOTE: Enter handling moved to global capture listener so we can centralize ready-check
  }

  eq.addEventListener('keydown', onKey);
  vars.addEventListener('keydown', onKey);
}

// ----- start: submit readiness logic (eq/vars + radio) -----
function isReadyToSubmit() {
  const eqInput = document.getElementById('Equations');
  const varInput = document.getElementById('Variables');

  const eqVal = eqInput ? parseInt(eqInput.value.trim(), 10) : 0;
  const varVal = varInput ? parseInt(varInput.value.trim(), 10) : 0;

  const radios = Array.from(document.querySelectorAll('input[type="radio"][name="choice"]'));
  const anyRadioChecked = radios.some(r => r.checked);

  // ready only if both eq and vars are valid integers > 0 and one radio is chosen
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

  // listen to changes on eq/vars
  if (eqInput) {
    eqInput.addEventListener('input', updateSubmitState);
    eqInput.addEventListener('change', updateSubmitState);
  }
  if (varInput) {
    varInput.addEventListener('input', updateSubmitState);
    varInput.addEventListener('change', updateSubmitState);
  }

  // radios
  document.querySelectorAll('input[type="radio"][name="choice"]').forEach(r => {
    r.addEventListener('change', updateSubmitState);
  });

  // initial state
  updateSubmitState();
}

// ensure that when user goes back to modal we disable submit until they re-select valid inputs
const originalBack = window.back;
window.back = function(...args) {
  try { originalBack.apply(this, args); } catch (e) { console.error(e); }
  // small timeout to allow DOM changes
  setTimeout(updateSubmitState, 0);
};

// ----- end: submit readiness logic -----

// Global Enter capture: if Enter pressed, only allow Switch when ready; otherwise prevent
// Global Enter capture: handle Enter both in modal and on main screen.
// - If modal inputs are ready -> call Switch() (open main).
// - Else if modal hidden and main visible and start button enabled -> call startSolve().
// - Otherwise prevent default and guide focus.
// Global Enter: Always trigger startSolve(), if start button is enabled
document.addEventListener('keydown', function(e) {
  if (e.key !== 'Enter') return;

  const modelEl = document.getElementById('model');
  const mainEl = document.getElementById('main');

  const modalVisible = modelEl ? modelEl.classList.contains('d-block') : false;
  const mainVisible = mainEl ? mainEl.classList.contains('d-block') : false;

  // If modal is visible -> treat Enter as submit (Switch) when ready
  if (modalVisible) {
    if (isReadyToSubmit()) {
      e.preventDefault();
      e.stopPropagation();
      try { Switch(); } catch (err) { console.error(err); }
      return;
    }

    // modal visible but not ready -> prevent and guide focus
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

  // If modal is hidden and main visible -> treat Enter as startSolve when start button enabled
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

  // Fallback: if neither modal nor main detected, do nothing special
}, true);


document.addEventListener('DOMContentLoaded', function () {
  setupModelKeyboard();
  setupSubmitLogic();
});
