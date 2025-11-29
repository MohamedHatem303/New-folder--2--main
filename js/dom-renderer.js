// dom-renderer.js
import { fmtNumberNoTrailing } from './matrix-utils.js';
import { variableNames } from './constants.js';

export function markError(el) { if (el) el.classList.add("error-border"); }
export function resetError(el) { if (el) el.classList.remove("error-border"); }

export function renderVerboseSteps(steps) {
    const container = document.getElementById("stepsContainer");
    if (!container) return;
    container.innerHTML = "";

    steps.forEach((s, idx) => {
        const section = document.createElement("section");
        section.className = "my-3 border border-2 border-black rounded-2 p-3";

        const stepLabel = document.createElement("div");
        stepLabel.style.textAlign = "left";
        stepLabel.style.fontWeight = "700";
        stepLabel.style.marginBottom = "6px";
        stepLabel.innerText = `Step ${idx+1}:`;
        section.appendChild(stepLabel);

        const mathBlock = document.createElement("div");
        mathBlock.style.textAlign = "left";
        mathBlock.style.fontFamily = "ui-monospace, monospace";
        mathBlock.style.fontSize = "18px";
        mathBlock.style.fontWeight = "700";
        mathBlock.style.whiteSpace = "pre";
        mathBlock.style.marginBottom = "8px";
        mathBlock.innerText = s.math && s.math.length ? s.math : (s.desc || "");
        section.appendChild(mathBlock);

        const caption = document.createElement("div");
        caption.style.textAlign = "center";
        caption.style.marginBottom = "8px";
        caption.innerHTML = `<strong>Matrix after step ${idx+1}</strong>`;
        section.appendChild(caption);

        const wrapper = document.createElement("div");
        wrapper.className = "d-flex justify-content-center";
        wrapper.style.marginTop = "6px";
        wrapper.style.width = "100%";

        const mat = Array.isArray(s.matrix) ? s.matrix : [];
        if (!mat.length) {
            section.appendChild(wrapper);
            container.appendChild(section);
            return;
        }

        const cols = mat[0].length;

        // ========= INVERSE ONLY =========
        if (s._isInverse && cols % 2 === 0) {
            const mid = cols / 2;

            const hWrapper = document.createElement("div");
            hWrapper.className = "d-flex justify-content-center";
            hWrapper.style.gap = "40px";
            hWrapper.style.width = "100%";

            // LEFT BLOCK (A)
            const leftBlock = document.createElement("div");
            leftBlock.style.display = "flex";
            leftBlock.style.flexDirection = "column";
            leftBlock.style.alignItems = "center";

            const ALabel = document.createElement("div");
            ALabel.innerHTML = `<span style="font-weight:800; font-size:18px;">A</span>`;
            ALabel.style.marginBottom = "8px";
            leftBlock.appendChild(ALabel);

            const leftUl = document.createElement("ul");
            leftUl.className = "list-unstyled";
            mat.forEach(row => {
                const li = document.createElement("li");
                li.className = "d-flex justify-content-center mb-2";
                for (let j = 0; j < mid; j++) {
                    const inp = document.createElement("input");
                    inp.type = "text";
                    inp.disabled = true;
                    inp.className = "border border-2 border-black rounded-2 mx-1 p-1 text-center";
                    inp.value = fmtNumberNoTrailing(row[j]);
                    li.appendChild(inp);
                }
                leftUl.appendChild(li);
            });
            leftBlock.appendChild(leftUl);

            // RIGHT BLOCK (I)
            const rightBlock = document.createElement("div");
            rightBlock.style.display = "flex";
            rightBlock.style.flexDirection = "column";
            rightBlock.style.alignItems = "center";

            const ILabel = document.createElement("div");
            ILabel.innerHTML = `<span style="font-weight:800; font-size:18px;">I</span>`;
            ILabel.style.marginBottom = "8px";
            rightBlock.appendChild(ILabel);

            const rightUl = document.createElement("ul");
            rightUl.className = "list-unstyled";
            mat.forEach(row => {
                const li = document.createElement("li");
                li.className = "d-flex justify-content-center mb-2";
                for (let j = mid; j < cols; j++) {
                    const inp = document.createElement("input");
                    inp.type = "text";
                    inp.disabled = true;
                    inp.className = "border border-2 border-black rounded-2 mx-1 p-1 text-center";
                    inp.value = fmtNumberNoTrailing(row[j]);
                    li.appendChild(inp);
                }
                rightUl.appendChild(li);
            });
            rightBlock.appendChild(rightUl);

            hWrapper.appendChild(leftBlock);
            hWrapper.appendChild(rightBlock);

            wrapper.appendChild(hWrapper);
            section.appendChild(wrapper);
            container.appendChild(section);
            return;
        }

        // ========= NORMAL — NO SPLIT =========
        const ul = document.createElement("ul");
        ul.className = "list-unstyled";

        mat.forEach(row => {
            const li = document.createElement("li");
            li.className = "d-flex justify-content-center mb-2";

            row.forEach(val => {
                const inp = document.createElement("input");
                inp.type = "text";
                inp.disabled = true;
                inp.className = "border border-2 border-black rounded-2 mx-1 p-1 text-center";
                inp.value = fmtNumberNoTrailing(val);
                li.appendChild(inp);
            });

            ul.appendChild(li);
        });

        wrapper.appendChild(ul);
        section.appendChild(wrapper);
        container.appendChild(section);
    });
}

export function renderFinalMatrix(mat) {
    const finalContainer = document.getElementById("finalMatrix");
    if (!finalContainer) return;
    finalContainer.innerHTML = "";

    const ul = document.createElement("ul");
    ul.className = "list-unstyled";

    mat.forEach(row => {
        const li = document.createElement("li");
        li.className = "d-flex justify-content-center mb-2";

        row.forEach(v => {
            const inp = document.createElement("input");
            inp.type = "text";
            inp.disabled = true;
            inp.className = "border border-2 border-black rounded-2 mx-1 p-1 text-center";
            inp.value = fmtNumberNoTrailing(v);
            li.appendChild(inp);
        });

        ul.appendChild(li);
    });

    finalContainer.appendChild(ul);
}

export function generateVariablesList(valuesArray, note) {
    const list = document.getElementById("variablesList");
    list.innerHTML = "";

    const ul = document.createElement("ul");

    if (valuesArray === null) {
        const li = document.createElement("li");
        li.innerHTML = `<h4>${note}</h4>`;
        ul.appendChild(li);
    } else {
        valuesArray.forEach((v, i) => {
            const li = document.createElement("li");
            li.innerHTML = `<h2>${variableNames[i]} = ${v}</h2>`;
            ul.appendChild(li);
        });
    }

    list.appendChild(ul);
}
