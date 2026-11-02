// =================================================================
// SLITTING CUTTER DATA & CALCULATOR LOGIC
// Slitting-cutter_tool_data.js
//
// Pure data and calculation helpers – no DOM manipulation for
// rendering. UI logic lives in Slitting-cutter_Data_Calculator-Pro.html.
//
// MODEL:
//   Slitting cutters come in three main variants, all using the
//   SAME fundamental equation:
//     N  = (Vc × 1000) / (π × D)
//     Vf = N × fz × z
//
//   The difference lies in Vc, fz and tooth count:
//
//     1. HSS Slitting Saw        – many teeth (32–180), low fz
//     2. Solid Carbide Saw       – many teeth (32–100), medium fz
//     3. Indexable Insert Cutter – few teeth (5–12), high fz
//
//   Chip thinning uses radial chip thinning (RCTF):
//     RCTF = D / (2 × √(ae × (D - ae)))
//
//   The feed tables are calibrated at ae = 15%, so the applied
//   factor is normalized against the RCTF at 15%:
//     factor(ae) = √(0.15 × 0.85) / √(r × (1 - r))
//
//   where r = ae / 100. This is diameter-independent and gives
//   physically correct results across the entire engagement range.
//   The factor is capped at CHIP_THINNING_MAX to prevent
//   unreasonably high feeds at very low ae.
//
//   FZ_TABLE_FACTOR and FZ_SAFETY_FACTOR apply conservative
//   reductions (HM: 0.90 × 0.85, HSS: 0.95 × 0.90), keeping the
//   final values in the lower half of recommended ranges.
//   The factors are selected per tool type: hss_saw uses the HSS
//   factors, carbide_saw and indexable use the HM factors.
//
//   L/D ratio affects cutting speed and feed — longer overhang
//   reduces both to maintain stability.
//
//   Vc values are calibrated against:
//     - HSS Saw:     ZPS (25–50 m/min), MariTool (24–30 m/min),
//                    RS Online (40–45 m/min for P1.1)
//     - Carbide Saw: APT (70–130 m/min), Re-Bo (100–250),
//                    MariTool (37–61), CTIA (300–500)
//     - Indexable:   Tungaloy EVX (100–180 m/min),
//                    Sandvik CoroCut (~160 m/min for steel),
//                    Iscar TGSF (5–12 inserts)
//
//   fz values are calibrated against:
//     - HSS Saw:     ZPS P.1 (0.03–0.06 mm/tooth for steel),
//                    ZPS P.2 (0.03–0.04 for stainless),
//                    ZPS K.1 (0.04–0.05 for cast iron),
//                    MariTool (0.010–0.046)
//     - Carbide Saw: APT (0.004–0.008), Re-Bo (0.01–0.03),
//                    MariTool (0.005–0.033), CTIA (0.02–0.06)
//     - Indexable:   Tungaloy σ16-20 (0.04–0.055 for steel),
//                    Hoffmann LNET (0.06–0.15)
//
//   All values are conservative starting points for allround
//   tools — the user can override any value manually.
// =================================================================

const K_1000 = 1000;
const PI = Math.PI;

const AE_REFERENCE = 15;
const AE_REFERENCE_RATIO = AE_REFERENCE / 100;
const AE_REFERENCE_RCTF = Math.sqrt(AE_REFERENCE_RATIO * (1 - AE_REFERENCE_RATIO));

// Z-scaling cap set high enough that HSS/Carbide saw blades with
// up to 96 teeth scale proportionally. Above that, additional teeth
// do not reduce fz further.
const Z_SCALING_CAP = 96;
const VF_LIMIT_WARNING = 8000;
const F_REV_LIMIT_WARNING = 3.0;  // mm/rev – warn if too high
const CHIP_THINNING_MAX = 2.5;

// Table lookup factors – applied when reading the raw fz table
const FZ_TABLE_FACTOR_HM  = 0.90;
const FZ_TABLE_FACTOR_HSS = 0.95;

// Runtime safety factors – applied last, on top of all other corrections
const FZ_SAFETY_FACTOR_HM  = 0.85;
const FZ_SAFETY_FACTOR_HSS = 0.90;

const parseValue = (id, defaultValue = 0) => {
    const value = parseFloat(document.getElementById(id).value);
    return isNaN(value) ? defaultValue : value;
};

const formatDecimal = (num, fixed) => {
    const s = num.toFixed(fixed);
    return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
};

/**
 * RCTF (Radial Chip Thinning Factor) för Sågklingor / Spårfräsar
 * Referensen är alltid 100% (Slotting). Vid ae < 100% tunnas spånan ut
 * rent geometriskt (maximum hex sjunker), vilket gör att vi kan öka 
 * matningen (fz) för att behålla samma skärtryck och spåntjocklek.
 */
function getChipThinningFactor(aePercent) {
    let r = aePercent / 100;
    
    if (r <= 0 || r >= 1) return 1.0;
    
    // Om ae överstiger 50% når skäret centrumlinjen och spånan får sin 
    // fulla teoretiska tjocklek (hex = fz). Ingen höjning tillåts.
    if (r >= 0.5) return 1.0;

    // För ae < 50% används standardformeln för radiell förtunning (1 / sin(kappa))
    // sin(kappa_eff) = 2 * sqrt(ae/D * (1 - ae/D))
    const sinKappaEff = 2 * Math.sqrt(r * (1 - r));
    const factor = 1.0 / sinKappaEff;

    return Math.min(factor, CHIP_THINNING_MAX);
}

// =================================================================
// 1. MATERIAL DATA – per tool type
// =================================================================

// ---------------------------------------------------------------
// 1a. HSS SLITTING SAW (Slotting/100% ae baseline)
// ---------------------------------------------------------------
const hssSawMaterials = {
    steel1080: { vc: 30, fz: {10:0.010,20:0.014,32:0.018,40:0.020,50:0.022,63:0.024,80:0.026,100:0.029,125:0.031,150:0.034} },
    steel_hard: { vc: 25, fz: {10:0.008,20:0.011,32:0.014,40:0.016,50:0.018,63:0.019,80:0.021,100:0.022,125:0.024,150:0.026} },
    toolox44: { vc: 15, fz: {10:0.006,20:0.009,32:0.011,40:0.013,50:0.014,63:0.014,80:0.016,100:0.018,125:0.019,150:0.021} },
    steel50hrc: { vc: 12, fz: {10:0.005,20:0.006,32:0.008,40:0.010,50:0.010,63:0.011,80:0.012,100:0.014,125:0.014,150:0.016} },
    steel60hrc: { vc: 7, fz: {10:0.002,20:0.003,32:0.004,40:0.005,50:0.006,63:0.006,80:0.007,100:0.008,125:0.009,150:0.010} },
    stainless_austenitic: { vc: 20, fz: {10:0.009,20:0.014,32:0.017,40:0.019,50:0.020,63:0.022,80:0.025,100:0.027,125:0.029,150:0.031} },
    cast_iron: { vc: 22, fz: {10:0.014,20:0.020,32:0.026,40:0.029,50:0.031,63:0.034,80:0.037,100:0.040,125:0.044,150:0.047} },
    nonferrous: { vc: 150, fz: {10:0.024,20:0.034,32:0.042,40:0.046,50:0.050,63:0.056,80:0.062,100:0.069,125:0.075,150:0.082} }
};

// ---------------------------------------------------------------
// 1b. SOLID CARBIDE SAW (Slotting/100% ae baseline)
// ---------------------------------------------------------------
const carbideSawMaterials = {
    steel1080: { vc: 120, fz: {10:0.005,20:0.007,32:0.009,40:0.010,50:0.010,63:0.011,80:0.012,100:0.013,125:0.014,150:0.015} },
    steel_hard: { vc: 100, fz: {10:0.004,20:0.006,32:0.007,40:0.008,50:0.009,63:0.009,80:0.010,100:0.010,125:0.011,150:0.012} },
    toolox44: { vc: 70, fz: {10:0.003,20:0.005,32:0.006,40:0.006,50:0.006,63:0.007,80:0.008,100:0.009,125:0.010,150:0.010} },
    steel50hrc: { vc: 55, fz: {10:0.002,20:0.003,32:0.004,40:0.005,50:0.005,63:0.006,80:0.006,100:0.006,125:0.007,150:0.008} },
    steel60hrc: { vc: 30, fz: {10:0.002,20:0.002,32:0.002,40:0.002,50:0.003,63:0.003,80:0.003,100:0.004,125:0.005,150:0.005} },
    stainless_austenitic: { vc: 90, fz: {10:0.003,20:0.005,32:0.006,40:0.007,50:0.007,63:0.009,80:0.009,100:0.010,125:0.010,150:0.012} },
    cast_iron: { vc: 110, fz: {10:0.006,20:0.009,32:0.010,40:0.012,50:0.012,63:0.014,80:0.015,100:0.016,125:0.018,150:0.020} },
    nonferrous: { vc: 500, fz: {10:0.010,20:0.014,32:0.018,40:0.020,50:0.022,63:0.023,80:0.027,100:0.030,125:0.033,150:0.036} }
};

// ---------------------------------------------------------------
// 1c. INDEXABLE INSERT CUTTER (Slotting/100% ae baseline)
// ---------------------------------------------------------------
const indexableMaterials = {
    steel1080: { vc: 160, fz: {50:0.054,63:0.058,80:0.070,100:0.080,125:0.090,150:0.101} },
    steel_hard: { vc: 130, fz: {50:0.044,63:0.049,80:0.058,100:0.066,125:0.075,150:0.084} },
    toolox44: { vc: 85, fz: {50:0.034,63:0.037,80:0.044,100:0.050,125:0.057,150:0.064} },
    steel50hrc: { vc: 65, fz: {50:0.026,63:0.029,80:0.034,100:0.040,125:0.046,150:0.050} },
    steel60hrc: { vc: 40, fz: {50:0.016,63:0.018,80:0.021,100:0.025,125:0.028,150:0.031} },
    stainless_austenitic: { vc: 100, fz: {50:0.049,63:0.053,80:0.062,100:0.071,125:0.080,150:0.089} },
    cast_iron: { vc: 180, fz: {50:0.064,63:0.070,80:0.083,100:0.096,125:0.107,150:0.120} },
    nonferrous: { vc: 600, fz: {50:0.090,63:0.098,80:0.116,100:0.134,125:0.152,150:0.170} }
};

// =================================================================
// 2. TOOL TYPE REGISTRY
// =================================================================
const toolTypeRegistry = {
    hss_saw: {
        name: "HSS Slitting Saw",
        badge: "HSS",
        baseZ: 48,
        factorHM: false,
        aeRange: { min: 5, max: 25, default: 15,
            hint: "Recommended ae for HSS slitting saws: 5–25% of D." },
        defaults: { maxRpm: 4000, overhang: 30, diameter: 63 },
        materials: hssSawMaterials
    },
    carbide_saw: {
        name: "Solid Carbide Saw",
        badge: "HM",
        baseZ: 48,
        factorHM: true,
        aeRange: { min: 5, max: 25, default: 15,
            hint: "Recommended ae for solid carbide saws: 5–25% of D." },
        defaults: { maxRpm: 6000, overhang: 30, diameter: 63 },
        materials: carbideSawMaterials
    },
    indexable: {
        name: "Indexable Insert Cutter",
        badge: "HM",
        baseZ: 8,
        factorHM: true,
        aeRange: { min: 8, max: 30, default: 20,
            hint: "Recommended ae for indexable cutters: 8–30% of D." },
        defaults: { maxRpm: 4000, overhang: 40, diameter: 63 },
        materials: indexableMaterials
    }
};

// =================================================================
// 3. L/D RATIO CORRECTION
// =================================================================
const ldCorrection = {
    'mild': {vc: 0.75, fz: 0.90},
    '5xD':  {vc: 0.40, fz: 0.70},
    '8xD':  {vc: 0.20, fz: 0.40},
    '12xD': {vc: 0.15, fz: 0.30},
    '15xD': {vc: 0.10, fz: 0.20}
};

function getLdTier(ratio) {
    if (ratio <= 2.5) return null;
    if (ratio <= 4)   return 'mild';
    if (ratio <= 6)   return '5xD';
    if (ratio <= 8)   return '8xD';
    if (ratio <= 12)  return '12xD';
    return '15xD';
}

// =================================================================
// 4. STATE TRACKING
// =================================================================
let userEdited = {vc:false, fz:false, z:false, ae:false, overhang:false, maxRpm:false};

function getCurrentToolType() {
    return document.getElementById('toolType').value;
}

function getCurrentToolTypeData() {
    return toolTypeRegistry[getCurrentToolType()];
}

function updateToolBadge() {
    const badge = document.getElementById('toolBadge');
    if (!badge) return;
    const tt = getCurrentToolTypeData();
    badge.textContent = tt.badge;
    badge.className = `tool-badge tool-${tt.badge.toLowerCase()}`;
}

// =================================================================
// 5. DYNAMIC DROPDOWNS
// =================================================================
function generateMaterialOptions() {
    const select = document.getElementById('material');
    select.innerHTML = '';
    const tt = getCurrentToolTypeData();
    const materials = tt.materials;

    const names = {
        steel1080: "Steel: Soft (~1080 N/mm²)",
        steel_hard: "Steel: Hard (> 1080 N/mm²)",
        toolox44: "Toolox 44 (~45 HRC)",
        steel50hrc: "Hardened Steel 50 HRC",
        steel60hrc: "Hardened Steel 60 HRC",
        stainless_austenitic: "Stainless: Austenitic (< 850 N/mm²)",
        cast_iron: "Cast Iron",
        nonferrous: "Aluminum / Copper"
    };

    for (const key in materials) {
        if (materials.hasOwnProperty(key)) {
            const option = new Option(names[key] || key, key);
            if (key === 'steel1080') option.selected = true;
            select.options.add(option);
        }
    }
}

// =================================================================
// 6. FEED PER TOOTH DEFAULT – linear interpolation
// =================================================================
function getFzDefault(fz_table, D) {
    const keys = Object.keys(fz_table).map(Number).sort((a, b) => a - b);
    if (keys.length === 0) return 0.01;

    if (fz_table[D] !== undefined) return fz_table[D];
    if (D <= keys[0]) return fz_table[keys[0]];
    if (D >= keys[keys.length - 1]) return fz_table[keys[keys.length - 1]];

    for (let i = 0; i < keys.length - 1; i++) {
        const D1 = keys[i];
        const D2 = keys[i + 1];
        if (D > D1 && D < D2) {
            const fz1 = fz_table[D1];
            const fz2 = fz_table[D2];
            return fz1 + (D - D1) * (fz2 - fz1) / (D2 - D1);
        }
    }
    return fz_table[keys[0]];
}

// =================================================================
// 7. RECOMMENDED NUMBER OF TEETH
// =================================================================
function getRecommendedZ(D, toolType) {
    if (toolType === 'indexable') {
        if (D <= 40) return 6;
        if (D <= 63) return 8;
        if (D <= 100) return 10;
        return 12;
    }
    if (D <= 20) return 32;
    if (D <= 40) return 40;
    if (D <= 63) return 48;
    if (D <= 100) return 64;
    return 80;
}

// =================================================================
// 8. DEFAULT VALUES
// =================================================================
function updateDefaultValues() {
    const tt = getCurrentToolTypeData();
    const toolTypeKey = getCurrentToolType();
    const mat = document.getElementById('material').value;
    const D = parseValue('diameter');

    updateToolBadge();

    if (!userEdited.maxRpm) {
        document.getElementById('maxRpm').value = tt.defaults.maxRpm;
    }
    if (!userEdited.overhang) {
        document.getElementById('overhang').value = tt.defaults.overhang;
    }

    const matData = tt.materials[mat];
    if (!matData || D <= 0) {
        calculate();
        return;
    }

    if (!userEdited.z) {
        const recommendedZ = getRecommendedZ(D, toolTypeKey);
        document.getElementById('z').value = recommendedZ;
    }

    if (!userEdited.vc) document.getElementById('vc').value = matData.vc;

    const currentZ = parseValue('z', 8);

    const tableFactor = tt.factorHM ? FZ_TABLE_FACTOR_HM : FZ_TABLE_FACTOR_HSS;
    const fz_default_from_table = getFzDefault(matData.fz, D) * tableFactor;
    const baseZ = tt.baseZ;

    if (!userEdited.fz) {
        const effectiveZ = Math.min(currentZ, Z_SCALING_CAP);
        const scaledFz = fz_default_from_table * (baseZ / effectiveZ);
        document.getElementById('fzInitial').value = formatDecimal(scaledFz, 4);
    }

    if (!userEdited.ae) {
        document.getElementById('aePercent').value = tt.aeRange.default;
    }

    updateAeHint();
    calculate();
}

function updateAeHint() {
    const hintEl = document.getElementById('aeHint');
    if (!hintEl) return;
    const tt = getCurrentToolTypeData();
    hintEl.textContent = tt.aeRange.hint;
}

function updateOverhangHint(D, L) {
    const hintEl = document.getElementById('overhangHint');
    if (!hintEl) return;

    if (!D || !L || D <= 0) {
        hintEl.textContent = 'Enter tool overhang to see L/D ratio.';
        return;
    }

    const ratio = L / D;
    const tier = getLdTier(ratio);

    if (tier === null) {
        hintEl.textContent = `L/D ratio: ${formatDecimal(ratio, 1)} — rigid setup, no reduction applied.`;
    } else {
        const factor = ldCorrection[tier];
        const vcPct = Math.round(factor.vc * 100);
        const fzPct = Math.round(factor.fz * 100);
        hintEl.textContent = `L/D ratio: ${formatDecimal(ratio, 1)} — Vc to ${vcPct}%, fz to ${fzPct}%.`;
    }
}

// =================================================================
// 9. CALCULATION
// =================================================================
function calculate() {
    const tt = getCurrentToolTypeData();
    const D = parseValue('diameter');
    const Vc = parseValue('vc');
    let fz_initial = parseValue('fzInitial');
    const z = Math.round(parseValue('z', 8));
    const maxRpmMachine = parseValue('maxRpm');
    const aePercent = parseValue('aePercent');
    const L = parseValue('overhang');

    const resultsEl = document.getElementById('results');

    if (D <= 0 || Vc <= 0 || z <= 0 || fz_initial <= 0) {
        resultsEl.classList.remove('ready');
        resultsEl.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:20px 0;">Please enter valid cutting data to calculate results.</p>';
        return;
    }

    if (aePercent <= 0 || aePercent > 100) {
        resultsEl.classList.remove('ready');
        resultsEl.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:20px 0;">Radial engagement must be between 1% and 100%.</p>';
        return;
    }

    resultsEl.classList.add('ready');

    const safetyFactor = tt.factorHM ? FZ_SAFETY_FACTOR_HM : FZ_SAFETY_FACTOR_HSS;

    const ld_ratio = (D > 0 && L > 0) ? L / D : 0;
    const ld_tier = getLdTier(ld_ratio);

    let vc_correction = 1.0;
    let fz_correction = 1.0;

    if (ld_tier) {
        vc_correction = ldCorrection[ld_tier].vc;
        fz_correction = ldCorrection[ld_tier].fz;
    }

    const vc_effective = Vc * vc_correction;
    let N_calculated = (vc_effective * K_1000) / (PI * D);

    let N_final = N_calculated;
    let capped = false;
    let actualVc = vc_effective;
    if (maxRpmMachine > 0 && N_final > maxRpmMachine) {
        N_final = maxRpmMachine;
        capped = true;
        actualVc = (N_final * PI * D) / K_1000;
    }

    let fz_effective = fz_initial * fz_correction * safetyFactor;

    let chipThinningFactor = 1.0;
    if (aePercent > 0) {
        chipThinningFactor = getChipThinningFactor(aePercent);
        fz_effective = fz_effective * chipThinningFactor;
    }

    const r = Math.min(aePercent / 100, 0.5);
    const sinKappaEff = 2 * Math.sqrt(r * (1 - r));
    const hm = fz_effective * sinKappaEff;

    const Vf = Math.round(N_final * fz_effective * z);
    const F_per_rev = fz_effective * z;
    const ae_mm = D * aePercent / 100;

    updateOverhangHint(D, L);
    updateAeHint();

    let rpmLimitDisplay;
    if (ld_tier) {
        rpmLimitDisplay = `${Math.round(vc_correction * 100)}% (L/D=${formatDecimal(ld_ratio, 1)})`;
    } else if (ld_ratio > 0) {
        rpmLimitDisplay = `None (L/D=${formatDecimal(ld_ratio, 1)})`;
    } else {
        rpmLimitDisplay = '—';
    }

    const highVfWarning = Vf > VF_LIMIT_WARNING;
    const highFRevWarning = F_per_rev > F_REV_LIMIT_WARNING;

    resultsEl.innerHTML = `
        <h2>Results</h2>
        <div class="result-line"><strong>Spindle Speed N [rpm]:</strong> <span class="value ${capped ? 'capped' : ''}">${Math.round(N_final)}</span></div>
        <div class="result-line"><strong>Feed Rate V<sub>f</sub> [mm/min]:</strong> <span class="value">${Vf}</span></div>

        <div class="details-box">
            <p><strong>Effective f<sub>z</sub>:</strong><span>${formatDecimal(fz_effective, 4)} <sub>mm/z</sub></span></p> 
            <p><strong>Chip Thickness h<sub>m</sub>:</strong><span>${formatDecimal(hm, 4)} <sub>mm</sub></span></p>
            <p><strong>Effective f<sub>z</sub>/Rev:</strong><span>${formatDecimal(F_per_rev, 2)} <sub>mm/rev</sub></span></p>
            <p><strong>Radial Engagement a<sub>e</sub>:</strong><span>${formatDecimal(ae_mm, 3)} <sub>mm</sub> (${aePercent}%)</span></p>
            <p><strong>Chip Thinning (RCTF):</strong><span>× ${formatDecimal(chipThinningFactor, 2)}</span></p>
            <p><strong>Safety Factor:</strong><span>× ${formatDecimal(safetyFactor, 2)}</span></p>
            <p><strong>Cutting Speed Vc:</strong><span>${formatDecimal(actualVc, 0)} <sub>m/min</sub></span></p>
            <p><strong>RPM Limitation (L/D):</strong><span>${rpmLimitDisplay}</span></p>
        </div>

        ${capped ? '<p class="warning-text">* Limited by machine max RPM</p>' : ''}
        ${highVfWarning ? '<p class="warning-text">* High feed rate — verify that machine and tooling can handle this feed.</p>' : ''}
        ${highFRevWarning ? '<p class="warning-text">* High feed per revolution — verify that the saw blade can handle this chip load.</p>' : ''}
    `;
}

// =================================================================
// 10. EVENT LISTENERS
// =================================================================
document.addEventListener('DOMContentLoaded', () => {

    generateMaterialOptions();

    const calcInputs = document.querySelectorAll('input, select');

    calcInputs.forEach(el => el.addEventListener('input', () => {
        if (el.id==='vc') userEdited.vc = true;
        if (el.id==='fzInitial') userEdited.fz = true;
        if (el.id==='z') userEdited.z = true;
        if (el.id==='aePercent') userEdited.ae = true; 
        if (el.id==='overhang') userEdited.overhang = true;
        if (el.id==='maxRpm') userEdited.maxRpm = true;

        calculate();
    }));

    document.getElementById('toolType').addEventListener('change', () => {
        userEdited = {vc:false, fz:false, z:false, ae:false, overhang:false, maxRpm:false};
        generateMaterialOptions();
        updateDefaultValues();
    });
    document.getElementById('material').addEventListener('change', updateDefaultValues);
    document.getElementById('diameter').addEventListener('change', updateDefaultValues);

    updateDefaultValues();
});