// =================================================================
// HELICAL CHAMFER DATA CALCULATOR PRO LOGIC
// Helical-Chamfer_tool_data.js
// v6 – Engagement-based RPM + Physical Ramp Compensation
// =================================================================

const K_1000 = 1000;
const PI = Math.PI;
const RCTF_MAX = 4.0; 

const toolData = {
    steel1080: { name: "Steel (~1080 N/mm²)", helical: { vc: 140, fz_table: {1:0.004, 2:0.008, 3:0.014, 4:0.020, 5:0.025, 6:0.032, 8:0.045, 10:0.055, 12:0.065, 16:0.085, 20:0.105}, consFactor: 0.90, aggFactor: 1.15 } },
    stainless_austenitic: { name: "Stainless Steel (e.g. 304/316)", helical: { vc: 80, fz_table: {1:0.006, 2:0.010, 3:0.016, 4:0.024, 5:0.030, 6:0.038, 8:0.050, 10:0.062, 12:0.072, 16:0.096, 20:0.120}, consFactor: 0.90, aggFactor: 1.10 } },
    toolox44: { name: "Toolox 44 (~45 HRC)", helical: { vc: 90, fz_table: {1:0.005, 2:0.010, 3:0.016, 4:0.023, 5:0.028, 6:0.036, 8:0.050, 10:0.062, 12:0.075, 16:0.100, 20:0.125}, consFactor: 0.90, aggFactor: 1.10 } },
    steel50hrc: { name: "Hardened Steel 50 HRC", helical: { vc: 70, fz_table: {1:0.004, 2:0.008, 3:0.013, 4:0.018, 5:0.022, 6:0.028, 8:0.038, 10:0.048, 12:0.056, 16:0.075, 20:0.092}, consFactor: 0.90, aggFactor: 1.05 } },
    vanadis: { name: "Vanadis / Powder Steel", helical: { vc: 100, fz_table: {1:0.005, 2:0.010, 3:0.016, 4:0.023, 5:0.028, 6:0.036, 8:0.050, 10:0.062, 12:0.075, 16:0.100, 20:0.125}, consFactor: 0.90, aggFactor: 1.10 } },
    nonferrous: { name: "Aluminum / Copper", helical: { vc: 350, fz_table: {1:0.012, 2:0.024, 3:0.036, 4:0.048, 5:0.060, 6:0.076, 8:0.100, 10:0.122, 12:0.140, 16:0.186, 20:0.232}, consFactor: 0.85, aggFactor: 1.20 } }
};

const parseValue = (id, defaultValue = 0) => {
    const el = document.getElementById(id);
    return el ? (isNaN(parseFloat(el.value)) ? defaultValue : parseFloat(el.value)) : defaultValue;
};

const formatDecimal = (num, fixed) => {
    const s = num.toFixed(fixed);
    return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
};

const createResultLine = (label, value, className = '') => `
    <div class="result-line">
        <strong>${label}</strong> <span class="value ${className}">${value}</span>
    </div>
`;
const createDetailLine = (label, value, unit) => `
    <p><strong>${label}</strong> <span>${value}${unit ? ' <sub>' + unit + '</sub>' : ''}</span></p>
`;

let userEdited = { vc: false, fz: false, z: false };

function getFzDefault(fz_table, D) {
    const keys = Object.keys(fz_table).map(Number).sort((a, b) => a - b);
    if (keys.length === 0) return 0.01;
    if (fz_table[D] !== undefined) return fz_table[D];
    if (D <= keys[0]) return fz_table[keys[0]];
    if (D >= keys[keys.length - 1]) return fz_table[keys[keys.length - 1]];
    for (let i = 0; i < keys.length - 1; i++) {
        if (D > keys[i] && D < keys[i + 1]) {
            return fz_table[keys[i]] + (D - keys[i]) * (fz_table[keys[i + 1]] - fz_table[keys[i]]) / (keys[i + 1] - keys[i]);
        }
    }
    return fz_table[keys[0]];
}

// Tvåvägssynk mellan Vinkel och Pitch
function syncRamping(source) {
    const R_path = parseValue('pathRadius');
    if (R_path <= 0) return;
    
    const C_path = 2 * PI * R_path;
    
    if (source === 'angle') {
        const angle = parseValue('rampAngle');
        const pitch = C_path * Math.tan(angle * PI / 180);
        document.getElementById('zPitch').value = formatDecimal(pitch, 3);
    } else if (source === 'pitch') {
        const pitch = parseValue('zPitch');
        const angle = Math.atan(pitch / C_path) * 180 / PI;
        document.getElementById('rampAngle').value = formatDecimal(angle, 2);
    }
}

function updateStandardValues() {
    const mat = document.getElementById('material').value;
    const D = parseValue('diameter');
    const data = toolData[mat]?.helical;
    
    if (data && D > 0) {
        if (!userEdited.vc) document.getElementById('vc').value = data.vc;
        if (!userEdited.fz) document.getElementById('fzInitial').value = formatDecimal(getFzDefault(data.fz_table, D), 4);
    }
    syncRamping('pitch');
    calculate();
}

// ============================================================
// HUVUDKALKYL – v6
// ============================================================
function calculate() {
    const D_tool = parseValue('diameter');
    const z = Math.round(parseValue('z', 1));
    const D_hole = parseValue('holeDiameter');
    const R_path = parseValue('pathRadius');
    const D_pre = parseValue('preDrillDiameter');
    const angle = parseValue('chamferAngle', 45);          // halv vinkel
    const Vc = parseValue('vc');
    const fz_base = parseValue('fzInitial');
    const maxRpm = parseValue('maxRpm');
    const pitch = parseValue('zPitch');
    const rampAngle = parseValue('rampAngle');
    
    const resultsBox = document.getElementById('results');

    if (D_tool <= 0 || Vc <= 0 || z <= 0 || fz_base <= 0 || D_hole <= 0 || R_path <= 0) {
        resultsBox.classList.remove('ready');
        resultsBox.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:20px 0;">Vänligen fyll i giltiga värden.</p>';
        return;
    }

    if (D_pre >= D_hole) {
        resultsBox.classList.remove('ready');
        resultsBox.innerHTML = '<p class="warning-text" style="text-align:center;">Fel: Förborrningen är större än eller lika stor som det slutgiltiga hålet.</p>';
        return;
    }

    resultsBox.classList.add('ready');

    const R_h = D_hole / 2;
    const R_p = D_pre / 2;
    const R_c = R_path;

    // GEOMETRISK SPÄRR 1 – spetsen når inte in
    if (R_c > R_p) {
        resultsBox.innerHTML = `<p class="warning-text" style="text-align:center; font-size:1.1rem;">
            <strong>Krasch-varning!</strong><br>
            Banradien (R<sub>path</sub>) är för stor.<br>
            Fasfräsens spets når inte in till förborrningens kant och kommer lämna en oslipad klack i botten.<br>
            <em>Max tillåten banradie = ${formatDecimal(R_p, 2)} mm.</em>
        </p>`;
        return;
    }

    // GEOMETRISK SPÄRR 2 – verktyget för litet
    const r_top = R_h - R_c; 
    if (r_top * 2 > D_tool) {
        resultsBox.innerHTML = `<p class="warning-text" style="text-align:center; font-size:1.1rem;">
            <strong>Krasch-varning!</strong><br>
            Verktyget är för litet.<br>
            För att nå ut till D${D_hole} med en banradie på ${R_c} krävs det att fräsen är minst D${formatDecimal(r_top * 2, 1)}.<br>
            <em>Öka verktygets diameter eller öka banradien.</em>
        </p>`;
        return;
    }

    // ---------- AUTO-DETECTION AV INGREPP ----------
    const r_bottom = r_top - (R_h - R_p);           // = R_p - R_c
    const D_eff = r_top + r_bottom;                 // genomsnittlig engagemangsdiameter
    const Z_cs = r_top / Math.tan(angle * PI / 180); // teoretiskt tip-djup

    // Skalfaktor (när man skär närmare spetsen)
    const f_scale = D_eff / D_tool; 

    // ---------- SPÅNFÖRTUNNING ----------
    const ae = R_h - R_p;
    let rctf = 1.0;
    if (ae < D_eff / 2) {
        rctf = Math.min(D_eff / (2 * Math.sqrt(ae * (D_eff - ae))), RCTF_MAX);
    }
    const actf = 1 / Math.sin(angle * PI / 180);

    // ---------- FYSIKALISK RAMP-KOMPENSERING (v6) ----------
    // 1. Path-length compensation (ren geometri)
    //    Verktygscentrum går en längre väg per varv → 1/cos(α)
    // 2. Mild extra faktor för den axiella lastkomponenten
    const rampRad = rampAngle * PI / 180;
    const pathLengthComp = 1 / Math.cos(rampRad);
    const axialLoadExtra = 1 + (Math.sin(rampRad) * 0.35);   // mild extra
    const rampReduction = pathLengthComp * axialLoadExtra;

    // Effektiv matning per tand
    const fz_eff = (fz_base * f_scale * rctf * actf) / rampReduction;

    // ---------- RPM & SKÄRHASTIGHET (v6 – baserat på max engagemang) ----------
    // Använd den största diametern som faktiskt skär (2 × r_top)
    // så att den programmerade Vc stämmer bättre med verkligheten
    const D_engagement = r_top * 2;
    let n = (Vc * K_1000) / (PI * D_engagement);
    let n_capped = false;
    if (maxRpm > 0 && n > maxRpm) {
        n = maxRpm;
        n_capped = true;
    }
    const N_Result = Math.round(n);

    // Actual Vc vid skäret (ska nu ligga mycket nära den angivna Vc)
    const actualVc_at_cut = (N_Result * PI * D_engagement) / K_1000;

    // ---------- MATNINGSHASTIGHET ----------
    const Vf_contour = Math.round(N_Result * fz_eff * z);
    const compFactor = (R_c * 2) / D_hole;
    let Vf_center = Math.round(Vf_contour * compFactor);
    
    const matData = toolData[document.getElementById('material').value]?.helical;
    let Vf_center_conservative = Math.round(Vf_center * (matData?.consFactor ?? 0.90));
    let Vf_center_aggressive = Math.round(Vf_center * (matData?.aggFactor ?? 1.15));

    if (Vf_center_aggressive > Vf_contour) Vf_center_aggressive = Math.round(Vf_contour);
    if (Vf_center_conservative > Vf_center_aggressive) Vf_center_conservative = Vf_center_aggressive;

    const Vf_z = Math.round(N_Result * pitch);

    // ---------- RITA RESULTAT ----------
    let resultHTML = '';
    resultHTML += createResultLine('Required Z-Depth (Theoretical Tip) [mm]:', formatDecimal(Z_cs, 3), 'ramp-value');
    resultHTML += createResultLine('Spindle Speed N [rpm]:', N_Result, n_capped ? 'capped' : '');
    resultHTML += createResultLine('Programmed Feed – Conservative [mm/min]:', Vf_center_conservative, 'ramp-value');
    resultHTML += createResultLine('Programmed Feed – Aggressive [mm/min]:', Vf_center_aggressive, 'ramp-value');
    resultHTML += createResultLine('Z-Axis Drop Rate (Vf_z) [mm/min]:', Vf_z);
    
    resultHTML += `<div class="details-box">`;
    resultHTML += createDetailLine('Engagement Ø (max at surface):', formatDecimal(D_engagement, 2), 'mm');
    resultHTML += createDetailLine('Auto D<sub>eff</sub> (Avg Engagement):', formatDecimal(D_eff, 2), 'mm');
    resultHTML += createDetailLine('Effective Size Factor (D<sub>eff</sub> / D):', `× ${formatDecimal(f_scale, 2)}`, '');
    resultHTML += createDetailLine('Base fz:', formatDecimal(fz_base, 4), 'mm/z');
    resultHTML += createDetailLine('Radial Thinning (RCTF):', `× ${formatDecimal(rctf, 2)}`, '');
    resultHTML += createDetailLine(`Axial Thinning (${angle}°):`, `× ${formatDecimal(actf, 2)}`, '');
    resultHTML += createDetailLine(`Ramp Comp (path + axial):`, `÷ ${formatDecimal(rampReduction, 2)}`, '');
    resultHTML += createDetailLine('Programmed fz:', formatDecimal(fz_eff, 3), 'mm/z');
    resultHTML += createDetailLine('Circular Comp Factor:', `× ${formatDecimal(compFactor, 3)}`, '');
    resultHTML += createDetailLine('Actual Max Vc (at cut):', formatDecimal(actualVc_at_cut, 0), 'm/min');
    resultHTML += `</div>`;

    if (n_capped) resultHTML += `<p class="warning-text">* Spindle speed limited by machine max RPM</p>`;
    
    resultsBox.innerHTML = resultHTML;
}

// ============================================================
// EVENT LISTENERS
// ============================================================
function setupEventListeners() {
    ['vc','fzInitial','maxRpm','z', 'chamferAngle', 'diameter', 'holeDiameter', 'pathRadius', 'preDrillDiameter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                if (id === 'vc') userEdited.vc = true;
                if (id === 'fzInitial') userEdited.fz = true;
                if (id === 'z') userEdited.z = true;
                
                // Om banradien ändras ligger pitchen kvar låst, och vinkeln räknas om
                if (id === 'pathRadius') {
                    syncRamping('pitch');
                }
                
                calculate();
            });
        }
    });

    // Tvåvägssynk mellan Vinkel och Pitch
    document.getElementById('rampAngle').addEventListener('input', () => {
        syncRamping('angle');
        calculate();
    });
    
    document.getElementById('zPitch').addEventListener('input', () => {
        syncRamping('pitch');
        calculate();
    });

    document.getElementById('material').addEventListener('change', () => {
        userEdited.fz = false;
        updateStandardValues();
    });
}