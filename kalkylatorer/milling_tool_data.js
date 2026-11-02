// =================================================================
// DYNAMIC MILLING TOOL DATA & CALCULATOR LOGIC
// milling_tool_data.js
//
// Pure data and calculation helpers – no DOM manipulation for
// rendering. UI logic lives in Milling_Data_Calculator-Pro.html.
//
// MODEL:
//   Base fz from the table is treated as a reference value for a
//   4-flute standard end mill at full slot.
//
//   Programmed fz = base fz × tool type factor × flute factor × chip thinning
//
//   Chip thinning = √(D / ae)  (applies when ae < 50% of D)
//
//   Effective chip thickness:
//     hm = fz × √(ae / D)
//   This is the inverse of the chip thinning formula, giving the
//   actual average chip thickness the tool sees during cutting.
//
//   Tool type factor:
//     Standard  = 1.00
//     Roughing  = 1.38  (average from CNC Cookbook analysis of 10 brands)
//
//   Flute factor (normalized so z=4 → 1.00):
//     Fewer flutes → higher fz per tooth
//     More flutes  → lower fz per tooth
//
//   Recommended ae:
//     Varies with both material and flute count. More flutes require
//     lower engagement to keep heat and tool load in check.
//     Values are calibrated for allround carbide end mills.
// =================================================================

// --- CONSTANTS ---

const K_1000 = 1000;
const PI = Math.PI;

// =================================================================
// 1. MATERIAL DATA
// =================================================================
const toolData = {
    steel1080: {
        z_base: 4,
        name: "Steel (~1080 N/mm²)",
        trochoidal: {
            vc: 160, ae_percent: 12,
            fz_table: {1:0.002, 2:0.004, 3:0.007, 4:0.010, 5:0.012, 6:0.016, 8:0.022, 10:0.028, 12:0.032, 16:0.044, 20:0.055}
        }
    },
    toolox44: {
        z_base: 4,
        name: "Toolox 44 (~45 HRC)",
        trochoidal: {
            vc: 100, ae_percent: 10,
            fz_table: {1:0.002, 2:0.004, 3:0.006, 4:0.009, 5:0.011, 6:0.014, 8:0.020, 10:0.025, 12:0.030, 16:0.040, 20:0.050}
        }
    },
    steel50hrc: {
        z_base: 4,
        name: "Hardened Steel 50 HRC",
        trochoidal: {
            vc: 80, ae_percent: 6,
            fz_table: {1:0.0015, 2:0.003, 3:0.005, 4:0.007, 5:0.008, 6:0.010, 8:0.013, 10:0.016, 12:0.020, 16:0.027, 20:0.033}
        }
    },
    steel60hrc: {
        z_base: 4,
        name: "Hardened Steel 60 HRC",
        trochoidal: {
            vc: 40, ae_percent: 4,
            fz_table: {1:0.0008, 2:0.0016, 3:0.0024, 4:0.0032, 5:0.004, 6:0.005, 8:0.006, 10:0.008, 12:0.010, 16:0.013, 20:0.017}
        }
    },
    vanadis: {
        z_base: 4,
        name: "Vanadis / Powder Steel",
        trochoidal: {
            vc: 120, ae_percent: 10,
            fz_table: {1:0.002, 2:0.004, 3:0.0065, 4:0.0095, 5:0.0115, 6:0.015, 8:0.021, 10:0.0265, 12:0.031, 16:0.042, 20:0.0525}
        }
    },
    nonferrous: {
        z_base: 4,
        name: "Aluminum / Copper",
        trochoidal: {
            vc: 450, ae_percent: 15,
            fz_table: {1:0.006, 2:0.012, 3:0.018, 4:0.024, 5:0.030, 6:0.038, 8:0.050, 10:0.061, 12:0.070, 16:0.093, 20:0.116}
        }
    }
};

// =================================================================
// 2. TOOL TYPE FACTORS
// =================================================================
// Roughing end mills (corncob) have serrated edges that break the
// chip into small segments. This allows higher chip load and
// slightly higher cutting speed.
//
// Sources: CNC Cookbook analysis of 10 tool manufacturers,
// Hobby Machinist. Values are calibrated for allround tools.
// =================================================================
const toolTypeFactors = {
    standard: { fz: 1.00, vc: 1.00, label: 'Standard' },
    roughing: { fz: 1.38, vc: 1.15, label: 'Roughing' }
};

// =================================================================
// 3. FLUTE FACTOR (for fz)
// =================================================================
// Normalized so z=4 → 1.00. Fewer flutes → higher fz per tooth,
// more flutes → lower fz per tooth.
// =================================================================
const fluteFactorByZ = {
    1:  1.50,
    2:  1.25,
    3:  1.10,
    4:  1.00,
    5:  0.95,
    6:  0.90,
    8:  0.80,
    10: 0.75,
    12: 0.70
};

function getFluteFactor(z) {
    if (fluteFactorByZ[z] !== undefined) return fluteFactorByZ[z];
    if (z <= 1) return 1.50;
    if (z >= 12) return 0.70;

    const keys = Object.keys(fluteFactorByZ).map(Number).sort((a, b) => a - b);
    for (let i = 0; i < keys.length - 1; i++) {
        if (z > keys[i] && z < keys[i + 1]) {
            const ratio = (z - keys[i]) / (keys[i + 1] - keys[i]);
            return fluteFactorByZ[keys[i]] + ratio * (fluteFactorByZ[keys[i + 1]] - fluteFactorByZ[keys[i]]);
        }
    }
    return 1.0;
}

// =================================================================
// 4. FLUTE CORRECTION FOR RADIAL ENGAGEMENT (ae)
// =================================================================
// The material's ae_percent is the baseline for a 4-flute tool.
// More flutes = lower engagement required (heat and load increase
// with more cutting edges in the same arc).
//
// Values calibrated for allround carbide end mills.
// =================================================================
const fluteAeCorrection = {
    1:  1.50,
    2:  1.30,
    3:  1.15,
    4:  1.00,
    5:  0.85,
    6:  0.75,
    7:  0.65,
    8:  0.55,
    9:  0.50,
    10: 0.45,
    12: 0.40
};

function getFluteAeCorrection(z) {
    if (fluteAeCorrection[z] !== undefined) return fluteAeCorrection[z];
    if (z <= 1) return 1.50;
    if (z >= 12) return 0.40;

    const keys = Object.keys(fluteAeCorrection).map(Number).sort((a, b) => a - b);
    for (let i = 0; i < keys.length - 1; i++) {
        if (z > keys[i] && z < keys[i + 1]) {
            const ratio = (z - keys[i]) / (keys[i + 1] - keys[i]);
            return fluteAeCorrection[keys[i]] + ratio * (fluteAeCorrection[keys[i + 1]] - fluteAeCorrection[keys[i]]);
        }
    }
    return 1.0;
}

/**
 * Returns the recommended radial engagement (% of D) for a given
 * material and flute count. Based on the material's baseline
 * ae_percent (assumed for 4 flutes) with a correction factor.
 */
function getRecommendedAe(material, z) {
    const baseAe = toolData[material]?.trochoidal?.ae_percent;
    if (baseAe === undefined) return null;
    return baseAe * getFluteAeCorrection(z);
}

// =================================================================
// 5. RAMPING DATA
// =================================================================
const rampDefaults = {
    steel1080:  { defaultAngle: 2.0, baseFactor: 1.8,  minAngle: 1.0, maxAngle: 5.0 },
    toolox44:   { defaultAngle: 2.0, baseFactor: 1.9,  minAngle: 1.0, maxAngle: 3.0 },
    steel50hrc: { defaultAngle: 1.5, baseFactor: 2.25, minAngle: 1.0, maxAngle: 3.0 },
    steel60hrc: { defaultAngle: 1.0, baseFactor: 2.7,  minAngle: 1.0, maxAngle: 2.0 },
    vanadis:    { defaultAngle: 2.0, baseFactor: 1.85, minAngle: 1.0, maxAngle: 3.0 },
    nonferrous: { defaultAngle: 5.0, baseFactor: 1.5,  minAngle: 2.0, maxAngle: 10.0 }
};

// =================================================================
// 6. AE HINTS
// =================================================================
const aeHints = {
    steel1080:  'Trochoidal strategy — low engagement keeps heat and tool load under control.',
    toolox44:   'Toolox 44 — moderate engagement balances productivity and tool life.',
    steel50hrc: 'Hardened steel — low engagement reduces heat and tool wear.',
    steel60hrc: 'Very hard steel — very low engagement is required for safety.',
    vanadis:    'Powder steel — moderate engagement gives stable cutting.',
    nonferrous: 'Aluminum/copper — higher engagement possible due to softer material.'
};

// =================================================================
// 7. HELPER FUNCTIONS
// =================================================================

const parseValue = (id, defaultValue = 0) => {
    const value = parseFloat(document.getElementById(id).value);
    return isNaN(value) ? defaultValue : value;
};

const formatDecimal = (num, fixed) => {
    const s = num.toFixed(fixed);
    return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
};

const createResultLine = (label, value, className = '') => `
    <div class="result-line">
        <strong>${label}</strong> 
        <span class="value ${className}">${value}</span>
    </div>
`;

const createDetailLine = (label, value, unit) => `
    <p>
        <strong>${label}</strong>
        <span>${value}${unit ? ' <sub>' + unit + '</sub>' : ''}</span>
    </p>
`;

// =================================================================
// 8. STANDARD VALUES & RAMPING LOGIC
// =================================================================

function updateRampAngleOptions(material) {
    const rampData = rampDefaults[material];
    const min = rampData.minAngle;
    const max = rampData.maxAngle;
    const select = document.getElementById('rampAngle');
    
    Array.from(select.options).forEach(option => {
        const angle = parseFloat(option.value);
        option.style.display = (angle >= min && angle <= max) ? '' : 'none';
    });

    const currentAngle = parseValue('rampAngle');
    if (!userEdited.rampAngle || currentAngle < min || currentAngle > max) {
        select.value = rampData.defaultAngle.toFixed(1);
        userEdited.rampAngle = false;
    }
}

function updateStandardValues() {
    const mat = document.getElementById('material').value;
    const D = parseValue('diameter');
    const z = parseValue('z', 4);
    const d = toolData[mat]?.trochoidal;
    
    if (!d || D <= 0) return;

    if (!userEdited.vc) document.getElementById('vc').value = d.vc;
    if (!userEdited.fz) document.getElementById('fzInitial').value = formatDecimal(d.fz_table[D] || 0.032, 4);
    if (!userEdited.z) document.getElementById('z').value = toolData[mat].z_base;
    if (!userEdited.ae) {
        const recAe = getRecommendedAe(mat, z);
        if (recAe !== null) document.getElementById('aePercent').value = formatDecimal(recAe, 1);
    }
    
    updateRampAngleOptions(mat);
    updateAeHint(mat);
    
    calculate();
}

/**
 * Called when the flute count changes. Resets ae to the recommended
 * value for the new flute count (based on material).
 */
function onFluteCountChange() {
    const mat = document.getElementById('material').value;
    const z = parseValue('z', 4);
    const recAe = getRecommendedAe(mat, z);
    if (recAe !== null) {
        document.getElementById('aePercent').value = formatDecimal(recAe, 1);
    }
    updateAeHint(mat);
    calculate();
}

// =================================================================
// 9. RAMP FEED CALCULATION
// =================================================================
function calculateRampFactor(material, selectedAngle) {
    const r = rampDefaults[material];
    const baseFactor = r.baseFactor;
    const diff = selectedAngle - r.defaultAngle;
    
    let factor = baseFactor + diff * 0.15;
    return Math.max(1.3, Math.min(3.5, factor));
}

// =================================================================
// 10. MAIN CALCULATION
// =================================================================

function calculate() {
    const D = parseValue('diameter');
    const Vc = parseValue('vc');
    const fz_initial = parseValue('fzInitial');
    const z = Math.round(parseValue('z', 1));
    const aePercent = parseValue('aePercent');
    const maxRpm = parseValue('maxRpm');
    const material = document.getElementById('material').value;
    const toolType = document.getElementById('toolType').value;
    const selectedRampAngle = parseValue('rampAngle');
    
    const resultsBox = document.getElementById('results');
    const aeWarningElement = document.getElementById('aeWarning');

    if (D <= 0 || Vc <= 0 || z <= 0 || fz_initial <= 0 || aePercent <= 0) {
        resultsBox.classList.remove('ready');
        resultsBox.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:20px 0;">Please enter valid cutting data to calculate results.</p>';
        aeWarningElement.style.display = 'none';
        return;
    }

    resultsBox.classList.add('ready');

    // Tool factors
    const toolFactors = toolTypeFactors[toolType];
    const fluteFactor = getFluteFactor(z);
    const combinedToolFactor = toolFactors.fz * fluteFactor;

    // Spindle speed
    const vc_effective = Vc * toolFactors.vc;
    let n = (vc_effective * K_1000) / (PI * D);
    let n_capped = false;
    let actualVc = vc_effective;

    if (maxRpm > 0 && n > maxRpm) {
        n = maxRpm;
        n_capped = true;
        actualVc = (n * PI * D) / K_1000;
    }
    const N_Result = Math.round(n);
    const N_Class = n_capped ? 'capped' : '';

    // Roughing
    const ae_raw = D * aePercent / 100;
    const ae = Math.max(ae_raw, 0.000001);

    const fz_adjusted = fz_initial * combinedToolFactor;

    let chipThinningFactor = 1.0;
    let fz_korr = fz_adjusted;

    if (aePercent >= 50) {
		chipThinningFactor = 1.0;
		aeWarningElement.textContent = 'WARNING: Stepover ae ≥ 50%. Chip thinning correction is disabled — this is not a trochoidal operation.';
		aeWarningElement.style.display = 'block';
	} else if (ae_raw > 0 && ae_raw < D) {
        // 1. Exakt fysikalisk formel för radiell spånförtunning (RCTF)
        let exactFactor = D / (2 * Math.sqrt(ae * (D - ae)));
        
        // 2. HSM-Boost (Termisk kompensation)
        // Eftersom ingreppet är litet hinner skäret kylas ner. Källorna (Seco/Sandvik) 
        // rekommenderar att man övermatar med ca 50-60% utöver den rent geometriska 
        // spånförtunningen för att verktyget ska klippa och inte "gneta" (rubbing).
        let hsmBoost = 1.55; 
        
        let dynamicFactor = exactFactor * hsmBoost;
        
        // Spärr (Max 3.5) för att skydda budgetverktyg vid extremt lågt ae
        chipThinningFactor = Math.min(dynamicFactor, 3.5); 
        fz_korr = fz_adjusted * chipThinningFactor;
        aeWarningElement.style.display = 'none';
    }
    
    // Effective chip thickness (hm)
    // hm = fz × √(ae/D)  — the inverse of the chip thinning formula
    const hm_effective = fz_korr * ((2 * Math.sqrt(ae * (D - ae))) / D);
    
    const Vf_normal = Math.round(n * fz_korr * z);

    // Finishing
    const fz_finish_base = 0.005 * D;
    let finish_factor = 1.0;
    if (material === 'steel50hrc') finish_factor = 0.90;
    if (material === 'steel60hrc') finish_factor = 0.80;
    const fz_finish_korr = fz_finish_base * finish_factor;
    const Vf_finish = Math.round(n * fz_finish_korr * z);

    // Ramping
    const rampFactor = calculateRampFactor(material, selectedRampAngle);
    const Vf_ramp = Math.round(Vf_normal / rampFactor);

    // Toolpath radius
    const R_min_safe = D / 2;

    // Render
    let resultHTML = '';

    resultHTML += createResultLine('Spindle Speed N [rpm]:', N_Result, N_Class);
    resultHTML += createResultLine('Roughing Feed (Straight) [mm/min]:', Vf_normal);
    resultHTML += createResultLine('Finishing Feed [mm/min]:', Vf_finish); 
    resultHTML += createResultLine(`Ramping ${selectedRampAngle.toFixed(1)}° Helical [mm/min]:`, Vf_ramp, 'ramp-value');
    
    resultHTML += `<div class="details-box">`;
    resultHTML += createDetailLine('Programmed fz:', formatDecimal(fz_korr, 3), 'mm/z');
    resultHTML += createDetailLine('Effective hm:', formatDecimal(hm_effective, 4), 'mm');
    resultHTML += createDetailLine('Base fz:', formatDecimal(fz_initial, 4), 'mm/z');
    resultHTML += createDetailLine('Tool type factor:', `× ${formatDecimal(toolFactors.fz, 2)} (${toolFactors.label})`, '');
    resultHTML += createDetailLine('Flute factor:', `× ${formatDecimal(fluteFactor, 2)} (z=${z})`, '');
    resultHTML += createDetailLine('Chip thinning:', `× ${formatDecimal(chipThinningFactor, 2)}`, '');
    resultHTML += createDetailLine('Finishing fz:', formatDecimal(fz_finish_korr, 3), 'mm/z');
    resultHTML += createDetailLine('Stepover ae:', aePercent + ' %', `(${formatDecimal(ae_raw, 2)} mm)`);
    resultHTML += createDetailLine('Toolpath Radius (Min Safe):', '≥ ' + formatDecimal(R_min_safe, 2), 'mm'); 
    resultHTML += createDetailLine('Ramp Feed Factor:', formatDecimal(rampFactor, 2), '×');
    resultHTML += createDetailLine('Cutting Speed Vc:', formatDecimal(actualVc, 0), 'm/min');
    resultHTML += `</div>`;

    if (n_capped) {
        resultHTML += `<p class="warning-text">* Limited by machine max RPM</p>`;
    }

    resultsBox.innerHTML = resultHTML;
}

// =================================================================
// 11. UI STATE TRACKING
// =================================================================

let userEdited = {vc: false, fz: false, z: false, ae: false, rampAngle: false};

function updateAeHint(material) {
    const hintEl = document.getElementById('aeHint');
    if (!hintEl) return;
    const z = parseValue('z', 4);
    const recAe = getRecommendedAe(material, z);
    const baseHint = aeHints[material] || '';
    if (recAe !== null) {
        hintEl.textContent = `${baseHint} Recommended ae for ${z} flutes: ${formatDecimal(recAe, 1)} %.`;
    } else {
        hintEl.textContent = baseHint;
    }
}

// =================================================================
// 12. INITIALIZATION
// =================================================================

function setupEventListeners() {
    ['vc','fzInitial','aePercent','maxRpm'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', () => {
            if (id === 'vc') userEdited.vc = true;
            if (id === 'fzInitial') userEdited.fz = true;
            if (id === 'aePercent') userEdited.ae = true;
            calculate();
        });
    });

    // Flute count: reset ae to recommended for the new flute count
    document.getElementById('z').addEventListener('input', () => {
        userEdited.z = true;
        onFluteCountChange();
    });

    document.getElementById('material').addEventListener('change', updateStandardValues);
    document.getElementById('diameter').addEventListener('change', updateStandardValues);
    document.getElementById('toolType').addEventListener('change', calculate);
    document.getElementById('rampAngle').addEventListener('change', () => {
        userEdited.rampAngle = true;
        calculate();
    });
}