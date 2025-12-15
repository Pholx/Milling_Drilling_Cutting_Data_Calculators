const K_1000 = 1000;
const PI = Math.PI;

const parseValue = (id, defaultValue = 0) => {
    const value = parseFloat(document.getElementById(id).value);
    return isNaN(value) ? defaultValue : value;
};
    
const formatDecimal = (num, fixed) => {
    // Formats number to a fixed decimal count and removes trailing zeros
    return num.toFixed(fixed).replace(/\.?0+$/, ""); 
};

// START: FZ TABLES
const fzTablesHM = {
    steel1080: {
        tslot_full: {10:0.040,12:0.048,16:0.060,20:0.075,25:0.085,30:0.090,40:0.100,50:0.110,60:0.118,80:0.130,100:0.140,125:0.148,150:0.155},
        tslot_side: {10:0.075,12:0.090,16:0.115,20:0.140,25:0.155,30:0.170,40:0.190,50:0.210,60:0.225,80:0.250,100:0.270,125:0.285,150:0.300}
    },
    toolox44: {
        tslot_full: {10:0.028,12:0.035,16:0.045,20:0.055,25:0.062,30:0.068,40:0.075,50:0.085,60:0.092,80:0.102,100:0.110,125:0.116,150:0.122},
        tslot_side: {10:0.055,12:0.065,16:0.085,20:0.105,25:0.115,30:0.125,40:0.145,50:0.160,60:0.172,80:0.190,100:0.205,125:0.215,150:0.225}
    },
    steel50hrc: {
        tslot_full: {10:0.018,12:0.022,16:0.028,20:0.036,25:0.040,30:0.045,40:0.050,50:0.055,60:0.060,80:0.068,100:0.074,125:0.080,150:0.085},
        tslot_side: {10:0.040,12:0.048,16:0.060,20:0.075,25:0.085,30:0.095,40:0.105,50:0.120,60:0.130,80:0.145,100:0.158,125:0.168,150:0.178}
    },
    vanadis: {
        tslot_full: {10:0.022,12:0.027,16:0.035,20:0.045,25:0.050,30:0.055,40:0.062,50:0.070,60:0.076,80:0.085,100:0.092,125:0.098,150:0.103},
        tslot_side: {10:0.055,12:0.065,16:0.085,20:0.105,25:0.120,30:0.135,40:0.150,50:0.165,60:0.178,80:0.198,100:0.215,125:0.228,150:0.240}
    },
    nonferrous: {
        tslot_full: {10:0.12,12:0.15,16:0.20,20:0.25,25:0.28,30:0.32,40:0.36,50:0.40,60:0.44,80:0.50,100:0.55,125:0.60,150:0.64},
        tslot_side: {10:0.20,12:0.25,16:0.32,20:0.40,25:0.45,30:0.50,40:0.55,50:0.60,60:0.65,80:0.75,100:0.83,125:0.90,150:0.96}
    }
};
// END: FZ TABLES

// START: CALIBRATED DATA 2025
const dataByToolMaterial = {
    hm: { // Carbide 
        steel1080: {z_base:8, name:"Steel (~1080 N/mm²)", 
                        tslot_full: {vc:75,  fz_table: fzTablesHM.steel1080.tslot_full},
                        tslot_side: {vc:160, fz_table: fzTablesHM.steel1080.tslot_side}},
        toolox44: {z_base:8, name:"Toolox 44 (~45 HRC)", 
                        tslot_full: {vc:55,  fz_table: fzTablesHM.toolox44.tslot_full},
                        tslot_side: {vc:100, fz_table: fzTablesHM.toolox44.tslot_side}},
        steel50hrc: {z_base:8, name:"Hardened Steel 50 HRC", 
                        tslot_full: {vc:35,  fz_table: fzTablesHM.steel50hrc.tslot_full},
                        tslot_side: {vc:80,  fz_table: fzTablesHM.steel50hrc.tslot_side}},
        vanadis: {z_base:8, name:"Vanadis / Powder Steel (~60 HRC)", 
                        tslot_full: {vc:45,  fz_table: fzTablesHM.vanadis.tslot_full},
                        tslot_side: {vc:90,  fz_table: fzTablesHM.vanadis.tslot_side}},
        nonferrous: {z_base:8, name:"Aluminum / Copper", 
                        tslot_full: {vc:600, fz_table: fzTablesHM.nonferrous.tslot_full},
                        tslot_side: {vc:900, fz_table: fzTablesHM.nonferrous.tslot_side}}
    },
    // HSS-datan är utkommenterad eftersom variabeln fzTablesHSS saknas, 
    // vilket orsakar ett fatalt fel och stoppar hela skriptet.
    /*
    hss: { // High Speed Steel 
        steel1080: {z_base:8, name:"Steel (~1080 N/mm²)", 
                        tslot_full: {vc:25, fz_table: fzTablesHSS.steel1080.tslot_full},
                        tslot_side: {vc:35, fz_table: fzTablesHSS.steel1080.tslot_side}},
        toolox44: {z_base:8, name:"Toolox 44 (~45 HRC)", 
                        tslot_full: {vc:15, fz_table: fzTablesHSS.toolox44.tslot_full},
                        tslot_side: {vc:22, fz_table: fzTablesHSS.toolox44.tslot_side}},
        steel50hrc: {z_base:8, name:"Hardened Steel 50 HRC", 
                        tslot_full: {vc:8, fz_table: fzTablesHSS.steel50hrc.tslot_full},
                        tslot_side: {vc:14, fz_table: fzTablesHSS.steel50hrc.tslot_side}},
        vanadis: {z_base:8, name:"Vanadis / Powder Steel (~60 HRC)", 
                        tslot_full: {vc:18, fz_table: fzTablesHSS.vanadis.tslot_full},
                        tslot_side: {vc:28, fz_table: fzTablesHSS.vanadis.tslot_side}},
        nonferrous: {z_base:8, name:"Aluminum / Copper", 
                        tslot_full: {vc:90, fz_table: fzTablesHSS.nonferrous.tslot_full},
                        tslot_side: {vc:130, fz_table: fzTablesHSS.nonferrous.tslot_side}}
    }
    */
};
// END: CALIBRATED DATA 2025

let userEdited = {vc:false, fz:false, z:false, ae:false, ap:false, r:false, overhang:false}; 

function getCurrentMode() {
    return document.querySelector('input[name="calcMode"]:checked').value;
}
    
function getCurrentToolMaterial() {
    return document.getElementById('toolMaterial').value;
}

function generateDiameterOptions() {
    const select = document.getElementById('diameter');
    select.innerHTML = '';
    
    [10, 12, 16, 20].forEach(d => {
        select.options.add(new Option(`${d} mm`, d, false, d === 10)); 
    });

    for (let d = 25; d <= 50; d += 5) {
        select.options.add(new Option(`${d} mm`, d));
    }
    
    // Extended range up to 150 mm
    for (let d = 60; d <= 150; d += 10) {
        select.options.add(new Option(`${d} mm`, d));
    }
}

function generateMaterialOptions() {
    const select = document.getElementById('material');
    select.innerHTML = '';
    // Kontrollera om data finns för det valda materialet (HM i detta fall, då HSS är utkommenterat)
    const materials = dataByToolMaterial.hm || {}; 

    for (const key in materials) {
        if (materials.hasOwnProperty(key)) {
            const name = materials[key].name;
            const option = new Option(name, key);
            if (key === 'steel1080') option.selected = true;
            select.options.add(option);
        }
    }
}

// Function to get default feed per tooth (fz) based on diameter (D)
function getFzDefault(data, D) {
    const fz_table_keys = Object.keys(data.fz_table).map(Number).sort((a, b) => a - b);
    
    if (data.fz_table[D]) return data.fz_table[D];
    
    // Find nearest smaller diameter in the table
    const nearestD = fz_table_keys.filter(key => key <= D).pop();
    if (nearestD) return data.fz_table[nearestD];
    
    // If D is smaller than the smallest key (e.g., D=6, smallest key 10)
    return data.fz_table[fz_table_keys[0]] || 0.01; 
}

function updateDefaultValues() {
    const toolMat = getCurrentToolMaterial();
    const mat = document.getElementById('material').value;
    const D = parseValue('diameter');
    const mode = getCurrentMode();
    
    updateUIForMode(mode);

    const d = dataByToolMaterial[toolMat]?.[mat]?.[mode];
    if (!d || D <= 0) return;
    
    // --- Dynamic Z Default Logic ---
    let recommendedZ = 4; // Default for side milling (standard end mill)
    if (mode === 'tslot_full') {
        // T-Slot cutters: more flutes = better stability in full slotting
        if (D <= 16) recommendedZ = 6;
        else if (D <= 32) recommendedZ = 8;
        else recommendedZ = 10;
    } 

    // Update recommended Z display
    document.getElementById('recommendedZ').textContent = recommendedZ;

    let currentZ = parseValue('z');
    if (!userEdited.z) {
         currentZ = recommendedZ;
         document.getElementById('z').value = currentZ; 
    }

    // Update Vc with default value if not user-edited
    if (!userEdited.vc) document.getElementById('vc').value = d.vc;
    
    // --- FZ SCALING LOGIC ---
    const fz_default_from_table = getFzDefault(d, D);
    const dataForMaterial = dataByToolMaterial[toolMat][mat];
    
    // Use 4 as base-Z for side milling (standard end mill) and database value (8) for full slotting
    const baseZ = (mode === 'tslot_side') ? 4 : dataForMaterial.z_base;

    if (!userEdited.fz) {
        // Scale fz based on base-Z and selected/recommended Z
        const scaledFz = fz_default_from_table * (baseZ / currentZ); 
        document.getElementById('fzInitial').value = formatDecimal(scaledFz, 4);
    }
    
    // Reset side milling values if switching to side milling and not user-edited
    if (mode === 'tslot_side') {
        if (parseValue('aePercent') === 100 || !userEdited.ae) {
            document.getElementById('aePercent').value = 10;
        }
        if (!userEdited.ap) {
             document.getElementById('ap').value = 5;
        }
        if (!userEdited.r) {
             document.getElementById('cornerRadius').value = 0.5;
        }
        if (!userEdited.overhang) {
             document.getElementById('overhang').value = 30;
        }
    }
    
    calculate();
}

function updateUIForMode(mode) {
    const isFull = mode === 'tslot_full';
    
    // Header Text
    document.getElementById('headerSubtext').textContent = 
        isFull ? 'T-Slot Full Slotting (100% Radial Engagement)' : 'T-Slot Side Milling (Low Radial Load)';
    
    // Input fields relevant only for Side Milling
    document.getElementById('aePercentGroup').style.display = isFull ? 'none' : 'block';
    document.getElementById('apGroup').style.display = isFull ? 'none' : 'block';
    
    // Result details to hide/show in Full Slotting
    document.getElementById('aeValueDetail').style.display = isFull ? 'none' : 'flex';
    document.getElementById('apFactorDetail').style.display = isFull ? 'none' : 'flex';
    // Removed fzScalingExplanation from HTML, no need to show/hide here.

    // RPM Limitation (L/D) is always visible
    document.getElementById('rpmLimitDetail').style.display = 'flex';
    
    if (isFull) {
        document.getElementById('aePercent').value = 100;
    }
}
    
// Calculate RPM Reduction Factor based on L/D ratio
function getRpmReductionFactor(L, D) {
    const ratio = L / D;
    if (ratio <= 3) return 1.0; 
    // Aggressive factor to warn against high L/D
    const factor = Math.pow(1 / ratio, 1.5) * Math.pow(3, 1.5); 
    return Math.max(0.2, Math.min(1.0, factor)); 
}

function calculate() {
    const D = parseValue('diameter');
    const Vc = parseValue('vc');
    let fz_initial = parseValue('fzInitial');
    const z = Math.round(parseValue('z', 1));
    const maxRpmMachine = parseValue('maxRpm');
    const mode = getCurrentMode();
    const aePercent = parseValue('aePercent');
    const ap = parseValue('ap');
    const R = parseValue('cornerRadius', 0);
    const L = parseValue('overhang');

    if (D <= 0 || Vc <= 0 || z <= 0 || fz_initial <= 0 || aePercent <= 0) {
        const notAvailable = 'N/A';
        document.getElementById('nResult').textContent = notAvailable;
        document.getElementById('vfResult').textContent = notAvailable;
        document.getElementById('fzEffectiveResult').innerHTML = '-'; 
        document.getElementById('fzTotalPerRevResult').innerHTML = '-'; 
        document.getElementById('vcValue').textContent = '-';
        document.getElementById('aePercentValue').textContent = '-';
        document.getElementById('apFactorResult').textContent = '-';
        document.getElementById('rpmLimitFactorResult').textContent = '-';
        return;
    }

    // 1. Spindle Speed (N) - Before L/D limitation
    let N_calculated = (Vc * K_1000) / (PI * D);
    
    // 1b. RPM Limitation due to Overhang (L/D)
    let rpm_limit_factor = 1.0;
    if (L > 0 && mode === 'tslot_side') { 
         rpm_limit_factor = getRpmReductionFactor(L, D);
         N_calculated = N_calculated * rpm_limit_factor;
    }
    
    // 1c. Final RPM (Limited by Machine Max RPM)
    let N_final = N_calculated;
    if (maxRpmMachine > 0 && N_final > maxRpmMachine) N_final = maxRpmMachine;
    
    
    let fz_effektiv_pre_ap = fz_initial;
    let ap_factor = 1.0; 
    
    // 2. Chip Thinning (fz) correction (Only in Side Milling)
    if (mode === 'tslot_side' && aePercent < 100 && aePercent > 0.1) {
        const ae_mm = D * aePercent / 100;
        const ae_ratio = aePercent / 100;

        // Chip Thinning Formula with Corner Radius (R)
        const numerator = Math.sqrt(ae_mm * (D - ae_mm));
        const denominator = (D / 2) + R * (ae_ratio - 1);
        
        if (denominator > 0) {
            const k_korr = numerator / denominator;
            fz_effektiv_pre_ap = fz_initial / k_korr;
        } else {
             // Fallback
             fz_effektiv_pre_ap = fz_initial * 2; 
        }
    }
    
    // 3. Adjustment for Axial Depth of Cut (ap) (Only in Side Milling)
    if (mode === 'tslot_side' && ap > 0) {
        // Updated limit: More realistic limit (15% of D) instead of 5%
        const max_ap_default = D * 0.15; 
        if (ap > max_ap_default) {
            // Factor that reduces Vf when ap/D becomes too large
            ap_factor = 1.0 / (1.0 + 0.5 * (ap / max_ap_default - 1)); 
            ap_factor = Math.max(0.3, Math.min(1.0, ap_factor)); 
        }
    }
    
    // *** NY LOGIK: Inkludera ap_factor i den effektiva matningen ***
    let fz_effektiv_final = fz_effektiv_pre_ap;
    if (mode === 'tslot_side') {
        fz_effektiv_final = fz_effektiv_pre_ap * ap_factor;
    }
    
    // 4. Feed Rate (Vf)
    // Vf = N * fz_effektiv_final * z
    let Vf = Math.round(N_final * fz_effektiv_final * z); 
    // OBS: Ingen separat ap-faktor appliceras på Vf här, eftersom den redan är inbakad i fz_effektiv_final.

    // NY BERÄKNING: Total Effective Fz per Revolution
    const F_per_rev = fz_effektiv_final * z;

    // 5. Output
    document.getElementById('nResult').textContent = Math.round(N_final);
    document.getElementById('vfResult').textContent = Vf;
    
    // FZ DISPLAY LOGIC: 
    const fz_effektiv_display = formatDecimal(fz_effektiv_final, 3);
    
    // Output 1: Effective Fz per tooth (mm/z)
    document.getElementById('fzEffectiveResult').innerHTML = fz_effektiv_display + ' <sub>mm/z</sub>';
    
    // Output 2: Total Effective Fz per Revolution (mm/rev) (NY)
    document.getElementById('fzTotalPerRevResult').innerHTML = formatDecimal(F_per_rev, 2) + ' <sub>mm/rev</sub>';


    document.getElementById('vcValue').innerHTML = Vc + ' <sub>m/min</sub>';
    
    const ae_mm = D * aePercent / 100;
    document.getElementById('aePercentValue').innerHTML = formatDecimal(ae_mm, 3) + ' <sub>mm</sub> (' + aePercent + '%)';
    
    if (mode === 'tslot_side') {
        // ap_factor visas fortfarande här (men används inte separat i Vf-beräkningen längre)
        document.getElementById('apFactorResult').innerHTML = formatDecimal(ap_factor, 2); 
    } else {
        document.getElementById('apFactorResult').innerHTML = '1.00';
    }

    // Updated L/D display logic for RPM Limitation
    const ld_ratio = L / D;
    let rpmLimitDisplay = `${formatDecimal(rpm_limit_factor * 100, 0)}% (L/D=${formatDecimal(ld_ratio, 1)})`;

    if (mode === 'tslot_full' && L > 0) {
         // Show 100% in Full Slotting even if L/D is high, as the reduction is inactive in this mode (conservative)
         rpmLimitDisplay = `100% (L/D=${formatDecimal(ld_ratio, 1)})`;
    } else if (L === 0) {
        rpmLimitDisplay = 'N/A';
    }

    document.getElementById('rpmLimitFactorResult').innerHTML = rpmLimitDisplay;
}


document.addEventListener('DOMContentLoaded', () => {
    
    generateDiameterOptions();
    generateMaterialOptions();
    
    const calcInputs = document.querySelectorAll('input, select');
    
    calcInputs.forEach(el => el.addEventListener('input', () => {
        // Set userEdited flag to true when user changes an input
        if (el.id==='vc') userEdited.vc = true;
        if (el.id==='fzInitial') userEdited.fz = true;
        if (el.id==='z') userEdited.z = true;
        if (el.id==='aePercent' && getCurrentMode() !== 'tslot_full') userEdited.ae = true; 
        if (el.id==='ap') userEdited.ap = true;
        if (el.id==='cornerRadius') userEdited.r = true;
        if (el.id==='overhang') userEdited.overhang = true;
        
        calculate();
    }));
    
    document.getElementById('toolMaterial').addEventListener('change', updateDefaultValues);
    document.getElementById('material').addEventListener('change', updateDefaultValues);
    document.getElementById('diameter').addEventListener('change', updateDefaultValues);
    
    document.querySelectorAll('input[name="calcMode"]').forEach(radio => {
        radio.addEventListener('change', () => {
            // Reset userEdited flags (except shared ones) when mode changes
            userEdited = {vc:userEdited.vc, fz:userEdited.fz, z:false, ae:false, ap:false, r:false, overhang:false}; 
            updateDefaultValues();
        });
    });
    
    updateDefaultValues();
});

// Theme Toggle Logic
const toggle = document.getElementById('themeToggle');
    
const updateThemeIcon = () => {
    if (document.body.classList.contains('dark')) {
        toggle.textContent = '☀️';
    } else {
        toggle.textContent = '🌙';
    }
};

toggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    updateThemeIcon();
});

if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.body.classList.add('dark');
}
updateThemeIcon();