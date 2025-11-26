// app.js - entry point controller
import { MAX } from './constants.js';
import { generateMatrix, matrixInputHandler, matrixInputKeydown, readMainMatrix } from './input-parser.js';
import { setMatrixInputsDisabled, findStartButton, restoreStartButton } from './matrix-utils.js';
import { gaussianEliminationMedium, backSubstitute } from './gaussian-solver.js';
import { gaussJordanElimination } from './gauss-jordan-solver.js'; // <-- new import
import { renderVerboseSteps, renderFinalMatrix, generateVariablesList, markError, resetError } from './dom-renderer.js';

// expose functions to preserve old API and onclick compatibility
window.generateMatrix = generateMatrix;
window.fillStepMatrices = function(rows, vars) {
    // create final matrix UI snapshot (same behavior as original fillStepMatrices)
    const mainMatrix = document.getElementById("matrix");
    if (!mainMatrix) return;
    const mainRows = Array.from(mainMatrix.querySelectorAll("li"));

    const stepsContainer = document.getElementById("stepsContainer");
    if (stepsContainer) stepsContainer.innerHTML = "";

    const finalContainer = document.getElementById("finalMatrix");
    if (!finalContainer) return;
    finalContainer.innerHTML = "";

    for (let i = 0; i < rows; i++) {
        const li = document.createElement("li");
        li.className = "d-flex justify-content-center mb-2";
        for (let j = 0; j < vars + 1; j++) {
            const inp = document.createElement("input");
            inp.type = "number";
            inp.disabled = true;
            inp.className = "border border-2 border-black rounded-2 mx-1 p-1 text-center";

            const mainInp = mainRows[i].querySelectorAll("input")[j];
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

    // قفل كل خانات المصفوفة (تظل مقفولة بعد الحل كما طلبت)
    setMatrixInputsDisabled(true);

    // تعطيل زرار الاستارت + لونه رمادي فاتح (مع حفظ الألوان الأصلية)
    const startBtn = findStartButton();
    if (startBtn) {
        // حفظ الستايلات الأصلية لو مش مخزنة
        if (startBtn.dataset._origBg === undefined) {
            startBtn.dataset._origBg = startBtn.style.backgroundColor || "";
        }
        if (startBtn.dataset._origColor === undefined) {
            startBtn.dataset._origColor = startBtn.style.color || "";
        }

        // نوقف أي كلاس يوحّد الخلفية الداكنة (مثل tailwind bg-black) عند القفل
        startBtn.classList.remove('bg-black', 'text-white', 'btn-primary', 'start-enabled');

        // فعل disabled
        startBtn.disabled = true;
        startBtn.setAttribute('aria-disabled', 'true');

        // تعيين اللونين inline وبـ important لكي يغلبوا أي قواعد CSS خارجية
        startBtn.style.setProperty('background-color', '#e0e0e0', 'important'); // رمادي فاتح
        startBtn.style.setProperty('color', '#6b6b6b', 'important');            // نص رمادي
        startBtn.style.setProperty('pointer-events', 'none', 'important');       // منع النقر
        startBtn.style.setProperty('opacity', '1', 'important');

        // أضف كلاس حالة مقفل (اختياري لكنه مفيد للـ CSS)
        startBtn.classList.add('start-disabled');
    }

    try {
        // determine selected method from radio buttons (name="choice")
        const methodRadio = document.querySelector('input[name="choice"]:checked');
        const methodId = methodRadio ? methodRadio.id : 'Gaussian-r';

        // update final form label according to chosen method
        const finalLabel = document.getElementById("finalFormLabel");
        if (finalLabel) {
            finalLabel.textContent =
                methodId === 'Jordan-r'
                    ? "Reduced Row Echelon Form"
                    : "Row Echelon Form";
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
        // ملاحظة مهمة: بناءً على طلبك، لن نُعيد تمكين الحقول أو زر Start هنا —
        // العناصر ستبقى مقفولة والزر سيبقى رمادي/disabled إلى أن تستدعي دالة إعادة تهيئة/إعادة ضبط منفصلة.
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

    if (!Number.isInteger(eq) || eq <= 0 || eq > MAX) {
        markError(eqInput);
        error = true;
    }

    if (!Number.isInteger(vars) || vars <= 0 || vars > MAX) {
        markError(varInput);
        error = true;
    }

    if (error) return;

    const mainEl = document.getElementById("main");
    const model = document.getElementById("model");

    if (model && mainEl) {
        model.classList.replace("d-block", "d-none");
        mainEl.classList.replace("d-none", "d-block");
    }

    generateMatrix(eq, vars);
    window.fillStepMatrices(eq, vars);

    const stepsContainer = document.getElementById("stepsContainer");
    if (stepsContainer) stepsContainer.classList.add("d-none");
    const finalSection = document.getElementById("finalSection");
    if (finalSection) finalSection.classList.add("d-none");
}

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
