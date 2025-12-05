export function swapRows(mat, i, j) {
    const tmp = mat[i];
    mat[i] = mat[j];
    mat[j] = tmp;
}

export function cloneMatrix(mat) {
    return mat.map(r => r.slice());
}

export function approxZero(x, eps = 1e-12) {
    return Math.abs(x) < eps;
}

export function fmtNumberNoTrailing(x) {
    if (x === null || x === undefined) return '';
    if (typeof x === 'string') return x;
    if (Number.isInteger(x)) return x.toString();
    return parseFloat(x.toFixed(1)).toString();
}

export function setMatrixInputsDisabled(disabled) {
    const matrix = document.getElementById("matrix") || document.querySelector(".matrix");
    if (!matrix) return;
    const inputs = Array.from(matrix.querySelectorAll('input, textarea, select'));

    inputs.forEach(inp => {
        if (inp.type === "number" || inp.type === "text" || inp.tagName.toLowerCase() === 'textarea' || inp.tagName.toLowerCase() === 'select') {
            if (disabled) {
                if (inp.dataset._wasDisabled === undefined) {
                    inp.dataset._wasDisabled = inp.disabled ? '1' : '0';
                    inp.dataset._wasReadOnly = inp.readOnly ? '1' : '0';
                }
                inp.disabled = true;
                try { inp.readOnly = true; } catch (e) {}
                inp.setAttribute('aria-disabled', 'true');
            } else {
                if (inp.dataset._wasDisabled !== undefined) {
                    inp.disabled = inp.dataset._wasDisabled === '1';
                    delete inp.dataset._wasDisabled;
                } else {
                    inp.disabled = false;
                }
                if (inp.dataset._wasReadOnly !== undefined) {
                    inp.readOnly = inp.dataset._wasReadOnly === '1';
                    delete inp.dataset._wasReadOnly;
                } else {
                    inp.readOnly = false;
                }
                inp.removeAttribute('aria-disabled');
            }
        }
    });
}

export function findStartButton() {
    let btn = document.getElementById("startButton");
    if (btn) return btn;

    btn = document.querySelector('button[onclick="startSolve()"]');
    if (btn) return btn;

    btn = document.querySelector('button.start-solve, button#startSolve, input[type="button"][value="Start Solve"]');
    if (btn) return btn;

    const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'));
    btn = buttons.find(b => {
        const t = (b.textContent || b.value || '').trim().toLowerCase();
        return t === 'start solve' || t === 'start' || t === 'start solve!';
    });
    return btn || null;
}

export function restoreStartButton(startBtn) {
    if (!startBtn) startBtn = findStartButton();
    if (!startBtn) return;

    try {
        startBtn.disabled = false;
        startBtn.removeAttribute('aria-disabled');

        startBtn.style.removeProperty('pointer-events');
        startBtn.style.removeProperty('opacity');

        if (startBtn.dataset._origBg !== undefined) {
            const origBg = startBtn.dataset._origBg || "";
            if (origBg) startBtn.style.setProperty('background-color', origBg, 'important');
            else startBtn.style.removeProperty('background-color');
            delete startBtn.dataset._origBg;
        } else {
            startBtn.style.removeProperty('background-color');
        }

        if (startBtn.dataset._origColor !== undefined) {
            const origColor = startBtn.dataset._origColor || "";
            if (origColor) startBtn.style.setProperty('color', origColor, 'important');
            else startBtn.style.removeProperty('color');
            delete startBtn.dataset._origColor;
        } else {
            startBtn.style.removeProperty('color');
        }

        startBtn.classList.remove('start-disabled');
    } catch (e) {
        console.warn('restoreStartButton warning:', e);
    }
}
