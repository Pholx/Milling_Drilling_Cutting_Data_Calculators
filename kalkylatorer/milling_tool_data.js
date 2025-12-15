// =================================================================
// MILLING TOOL DATA & CALCULATOR LOGIC
// milling_tool_data.js
// =================================================================

// --- KONSTANTER OCH DATA ---

const K_1000 = 1000;
const PI = Math.PI;

// Standarddata för olika material och diametrar (fz = feed per tooth)
const toolData = {
    steel1080: {z_base:4, name:"Steel (~1080 N/mm²)", trochoidal:{vc:200, ae_percent:10, fz_table:{1:0.002,2:0.004,3:0.007,4:0.010,5:0.012,6:0.016,8:0.022,10:0.028,12:0.032,16:0.044,20:0.055}}},
    toolox44:  {z_base:4, name:"Toolox 44 (~45 HRC)",  trochoidal:{vc:100, ae_percent:8,  fz_table:{1:0.002,2:0.004,3:0.006,4:0.009,5:0.011,6:0.014,8:0.020,10:0.025,12:0.030,16:0.040,20:0.050}}},
    steel50hrc:{z_base:4, name:"Hardened Steel 50 HRC",trochoidal:{vc:80,  ae_percent:5,  fz_table:{1:0.0015,2:0.003,3:0.005,4:0.007,5:0.008,6:0.010,8:0.013,10:0.016,12:0.020,16:0.027,20:0.033}}},
    steel60hrc:{z_base:4, name:"Hardened Steel 60 HRC",trochoidal:{vc:40,  ae_percent:3,  fz_table:{1:0.0008,2:0.0016,3:0.0024,4:0.0032,5:0.004,6:0.005,8:0.006,10:0.008,12:0.010,16:0.013,20:0.017}}},
    vanadis:   {z_base:4, name:"Vanadis / Powder Steel",trochoidal:{vc:150, ae_percent:8,  fz_table:{1:0.002,2:0.004,3:0.0065,4:0.0095,5:0.0115,6:0.015,8:0.021,10:0.0265,12:0.031,16:0.042,20:0.0525}}},
    nonferrous:{z_base:4, name:"Aluminum / Copper",    trochoidal:{vc:450, ae_percent:10, fz_table:{1:0.006,2:0.012,3:0.018,4:0.024,5:0.030,6:0.038,8:0.050,10:0.061,12:0.070,16:0.093,20:0.116}}}
};

// Data för rampning (startvinkel, basfaktor för matningsreduktion, min/max vinkel)
const rampDefaults = {
    steel1080:  { defaultAngle: 2.0, baseFactor: 1.8, minAngle: 1.0, maxAngle: 5.0 }, 
    toolox44:   { defaultAngle: 2.0, baseFactor: 1.9, minAngle: 1.0, maxAngle: 3.0 }, 
    steel50hrc: { defaultAngle: 1.5, baseFactor: 2.25, minAngle: 1.0, maxAngle: 3.0 },
    steel60hrc: { defaultAngle: 1.0, baseFactor: 2.7, minAngle: 1.0, maxAngle: 2.0 }, 
    vanadis:    { defaultAngle: 2.0, baseFactor: 1.85, minAngle: 1.0, maxAngle: 3.0 },
    nonferrous: { defaultAngle: 5.0, baseFactor: 1.5, minAngle: 2.0, maxAngle: 10.0 } 
};

// Håller reda på om användaren har ändrat standardvärden
let userEdited = {vc:false, fz:false, z:false, ae:false, rampAngle:false};


// --- HJÄLPFUNKTIONER ---

// Läser in numeriskt värde från ett HTML-element
const parseValue = (id, defaultValue = 0) => {
    const value = parseFloat(document.getElementById(id).value);
    return isNaN(value) ? defaultValue : value;
};

// Formaterar ett tal till en sträng med angivet antal decimaler, tar bort onödiga nollor
const formatDecimal = (num, fixed) => {
    return num.toFixed(fixed).replace(/\.?0+$/, "");
};

// Skapar en resultatrad i HTML
const createResultLine = (label, value, className = '') => `
    <div class="result-line">
        <strong>${label}</strong> 
        <span class="value ${className}">${value}</span>
    </div>
`;

// Skapar en detaljrad i detaljboxen
const createDetailLine = (label, value, unit) => `
    <p>
        <strong>${label}</strong>
        <span>${value} <sub>${unit}</sub></span>
    </p>
`;


// --- LOGIK FÖR STANDARDVÄRDEN & RAMPNING ---

// Begränsar de tillgängliga rampvinklarna baserat på valt material
function updateRampAngleOptions(material) {
    const rampData = rampDefaults[material];
    const min = rampData.minAngle;
    const max = rampData.maxAngle;
    const select = document.getElementById('rampAngle');
    
    Array.from(select.options).forEach(option => {
        const angle = parseFloat(option.value);
        if (angle >= min && angle <= max) {
            option.style.display = ''; 
        } else {
            option.style.display = 'none';
        }
    });

    // Sätter defaultvärde om det valda värdet ligger utanför min/max
    const currentAngle = parseValue('rampAngle');
    if (!userEdited.rampAngle || currentAngle < min || currentAngle > max) {
        select.value = rampData.defaultAngle.toFixed(1);
        userEdited.rampAngle = false;
    }
}

// Uppdaterar Vc, fz, z, och ae baserat på valt material/diameter, om användaren inte har ändrat dem manuellt
function updateStandardValues() {
    const mat = document.getElementById('material').value;
    const D = parseValue('diameter');
    const d = toolData[mat]?.trochoidal;
    
    if (!d || D <= 0) return;

    if (!userEdited.vc) document.getElementById('vc').value = d.vc;
    if (!userEdited.fz) document.getElementById('fzInitial').value = formatDecimal(d.fz_table[D] || 0.032, 4);
    if (!userEdited.z) document.getElementById('z').value = toolData[mat].z_base;
    if (!userEdited.ae) document.getElementById('aePercent').value = d.ae_percent;
    
    updateRampAngleOptions(mat); 
    
    calculate();
}

// Beräknar faktorn för matningsreduktion vid rampning
function calculateRampFactor(material, selectedAngle) {
    const r = rampDefaults[material];
    const baseFactor = r.baseFactor;
    const diff = selectedAngle - r.defaultAngle;
    
    // Faktor: Reducerar matningen (större faktor = lägre Vf) vid brantare vinkel
    let factor = baseFactor + diff * 0.15; 

    return Math.max(1.3, Math.min(3.5, factor)); // Klämmer värdet
}


// --- HUVUDBERÄKNINGS-FUNKTION ---

function calculate() {
    const D = parseValue('diameter');
    const Vc = parseValue('vc');
    const fz_initial = parseValue('fzInitial');
    const z = Math.round(parseValue('z', 1));
    const aePercent = parseValue('aePercent');
    const maxRpm = parseValue('maxRpm');
    const material = document.getElementById('material').value;
    const selectedRampAngle = parseValue('rampAngle');
    
    const resultsBox = document.getElementById('resultsBox');
    const aeWarningElement = document.getElementById('aeWarning');
    const missingInput = document.getElementById('missingInput');

    // 1. INPUT VALIDERING
    if (D <= 0 || Vc <= 0 || z <= 0 || fz_initial <= 0 || aePercent <= 0) {
        resultsBox.classList.remove('ready');
        missingInput.style.display = 'block';
        document.getElementById('resultContent').innerHTML = ''; // Rensa gamla resultat
        aeWarningElement.style.display = 'none';
        return;
    }

    resultsBox.classList.add('ready');
    missingInput.style.display = 'none';

    // 2. SPINDELVARVTAL (N)
    let n = (Vc * K_1000) / (PI * D);
    let n_capped = false;
    if (maxRpm > 0 && n > maxRpm) {
        n = maxRpm;
        n_capped = true;
    }
    const N_Result = Math.round(n);
    const N_Class = n_capped ? 'capped' : '';

    // 3. GROVFRÄSNING (ROUGHING)
    const ae_raw = D * aePercent / 100;
    const ae = Math.max(ae_raw, 0.000001); 

    // Chip Thinning Correction (korrigering av fz baserat på radialt ingrepp)
    let fz_korr = fz_initial;
    if (aePercent > 50) {
        fz_korr = fz_initial; // Inaktivera korrigering
        aeWarningElement.textContent = 'WARNING: Stepover ae > 50%. Chip thinning correction is disabled.';
        aeWarningElement.style.display = 'block';
    } else if (ae_raw > 0 && ae_raw < D) {
        fz_korr = fz_initial * Math.sqrt(D / ae);
        aeWarningElement.style.display = 'none';
    } else {
        aeWarningElement.style.display = 'none';
    }
    
    // Matningshastighet (Feed rate)
    const Vf_normal = Math.round(n * fz_korr * z);

    // 4. FINISH-FRÄSNING
    // Finishing fz är enklare, baseras på 0.005 * D, justerat för hårda material
    let fz_finish_base = 0.005 * D; 
    let finish_factor = 1.0; 

    if (material === 'steel50hrc') finish_factor = 0.90;
    if (material === 'steel60hrc') finish_factor = 0.80;

    const fz_finish_korr = fz_finish_base * finish_factor;
    const Vf_finish = Math.round(n * fz_finish_korr * z);

    // 5. RAMPNING
    const rampFactor = calculateRampFactor(material, selectedRampAngle);
    const Vf_ramp = Math.round(Vf_normal / rampFactor);

    // 6. ÖVRIGA DETALJER
    const R_min_safe = (D * aePercent) / 200; // Minsta säkra radien

    // 7. RENDERING AV RESULTAT
    let resultHTML = '';

    // Huvudresultat
    resultHTML += createResultLine('Spindle Speed [rpm]:', N_Result, N_Class);
    resultHTML += createResultLine('Roughing Feed (Straight) [mm/min]:', Vf_normal);
    resultHTML += createResultLine('Finishing Feed [mm/min]:', Vf_finish); 
    resultHTML += createResultLine(`Ramping ${selectedRampAngle.toFixed(1)}° Helical [mm/min]:`, Vf_ramp, 'ramp-value');
    
    // Detaljbox
    resultHTML += `<div class="details-box">`;
    resultHTML += createDetailLine('Roughing fz (Corrected):', formatDecimal(fz_korr, 3), 'mm/z');
    resultHTML += createDetailLine('Finishing fz (Base):', formatDecimal(fz_finish_korr, 3), 'mm/z');
    resultHTML += createDetailLine('Stepover ae:', aePercent + ' %', `(${formatDecimal(ae_raw, 2)} mm)`);
    resultHTML += createDetailLine('Toolpath Radius (Min Safe):', '≥' + formatDecimal(R_min_safe, 2), 'mm'); 
    resultHTML += createDetailLine('Vc:', Vc, 'm/min');
    resultHTML += `</div>`;

    document.getElementById('resultContent').innerHTML = resultHTML;
}


// --- INITIERING OCH HÄNDELSEHANTERING ---

function setupEventListeners() {
    // Lyssnar på alla input- och select-fält
    document.querySelectorAll('input, select').forEach(el => el.addEventListener('input', () => {
        // Markera fält som redigerats manuellt för att inte skriva över dem med standardvärden
        if (el.id==='vc') userEdited.vc = true;
        if (el.id==='fzInitial') userEdited.fz = true;
        if (el.id==='z') userEdited.z = true;
        if (el.id==='aePercent') userEdited.ae = true;
        if (el.id==='rampAngle') userEdited.rampAngle = true;
        calculate();
    }));
    
    // Lyssnar på material- och diameterbyte för att uppdatera standardvärden
    document.getElementById('material').addEventListener('change', updateStandardValues);
    document.getElementById('diameter').addEventListener('change', updateStandardValues);
}

// Tema-hantering (Dark Mode)
const themeToggle = document.getElementById('themeToggle');
const updateThemeIcon = () => {
    themeToggle.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
};

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    updateThemeIcon();
});

// Kontrollerar systemets färgtema vid laddning
function checkSystemTheme() {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.classList.add('dark');
    }
    updateThemeIcon();
}

// Körs när sidan laddats klart
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkSystemTheme();
    updateStandardValues(); // Beräknar initiala resultat baserat på defaultvärden
});