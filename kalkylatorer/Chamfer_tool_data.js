/**
 * Chamfer_tool_data.js
 * * Innehåller alla konstanter, materialdata och beräkningslogik 
 * för Chamfer Milling Calculator Pro.
 * * OBS: Denna fil ska INTE innehålla någon DOM-manipulation (t.ex. document.getElementById).
 * Gränssnittslogiken finns i HTML-filen.
 */

// =================================================================
// 1. KONSTANTER
// =================================================================
const K_1000 = 1000;
const PI = Math.PI;
const PRODUCTION_FACTOR = 1.5; // Faktor för "Production" Vf

// =================================================================
// 2. MATERIALDATA OCH FZ-TABELLER
// =================================================================
const toolData = {
    // Värden: {z_base, vc, fz_table: {D_eff: fz_bas}}
    steel1080: {z_base:4, name:"Steel (~1080 N/mm²)", vc:150, fz_table:{0:0.000,1:0.010,2:0.018,3:0.025,4:0.032,5:0.038,6:0.045,8:0.055,10:0.065,12:0.075,16:0.095,20:0.115}},
    toolox44: {z_base:4, name:"Toolox 44 (~45 HRC)", vc:80, fz_table:{0:0.000,1:0.008,2:0.015,3:0.021,4:0.027,5:0.032,6:0.038,8:0.048,10:0.057,12:0.065,16:0.082,20:0.098}},
    steel50hrc:{z_base:4, name:"Hardened Steel 50 HRC", vc:60, fz_table:{0:0.000,1:0.006,2:0.011,3:0.015,4:0.019,5:0.023,6:0.027,8:0.033,10:0.038,12:0.045,16:0.055,20:0.065}},
    steel60hrc:{z_base:4, name:"Hardened Steel 60 HRC", vc:30, fz_table:{0:0.000,1:0.003,2:0.005,3:0.008,4:0.010,5:0.012,6:0.014,8:0.018,10:0.021,12:0.025,16:0.030,20:0.036}},
    vanadis: {z_base:4, name:"Vanadis / Powder Steel", vc:100, fz_table:{0:0.000,1:0.008,2:0.015,3:0.021,4:0.027,5:0.032,6:0.038,8:0.048,10:0.057,12:0.065,16:0.082,20:0.098}},
    nonferrous:{z_base:3, name:"Aluminum / Copper", vc:350, fz_table:{0:0.000,1:0.020,2:0.040,3:0.060,4:0.080,5:0.100,6:0.120,8:0.150,10:0.180,12:0.200,16:0.250,20:0.300}}
};

// =================================================================
// 3. HJÄLPFUNKTIONER (som beror på toolData)
// =================================================================

/**
 * Interpolerar det basala fz-värdet baserat på Effective Diameter (D_eff).
 * @param {string} material - Materialnyckel.
 * @param {number} D_eff - Effektiv diameter i mm.
 * @returns {number} Det interpolerade basala fz-värdet (fz_bas).
 */
function getFzFromTable(material, D_eff) {
    const table = toolData[material].fz_table;
    const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
    
    if (D_eff <= keys[1]) return table[keys[1]]; 

    for (let i = 1; i < keys.length; i++) {
        const D1 = keys[i];
        const D2 = keys[i + 1];
        
        if (D_eff === D1) return table[D1];
        
        // Linjär interpolering
        if (D_eff > D1 && D_eff < D2) {
            const fz1 = table[D1];
            const fz2 = table[D2];
            return fz1 + (D_eff - D1) * (fz2 - fz1) / (D2 - D1);
        }
    }
    return table[keys[keys.length - 1]];
}


// =================================================================
// 4. BERÄKNINGSLOGIK
// =================================================================

/**
 * Beräknar den effektiva diametern (D_eff).
 * @param {number} D_tip - Spetsdiameter.
 * @param {number} fasVinkel - Fasvinkel i grader (theta).
 * @param {number} ap - Axiellt skärdjup (fasdjup).
 * @returns {number} D_eff i mm.
 */
function calculateDeff(D_tip, fasVinkel, ap) {
    if (fasVinkel === 90) return D_tip + 2 * ap; 
    const radianer = fasVinkel * (PI / 180);
    // Formel: D_eff = D_tip + ap * tan(theta)
    return D_tip + (ap * Math.tan(radianer)); 
}

/**
 * Beräknar matningsreduktionsfaktorn (Rf) baserat på axiellt skärdjup (ap).
 * @param {number} ap - Axiellt skärdjup.
 * @returns {number} Reduktionsfaktor (1.0 till 0.8).
 */
function calculateRf(ap) {
    const ap_threshold = 1.0; 
    const reduction_rate = 0.05; 
    const max_reduction = 0.20; 
    
    if (ap <= ap_threshold) return 1.0;
    
    let reduction = reduction_rate * (ap - ap_threshold);
    reduction = Math.min(reduction, max_reduction);
    
    return 1.0 - reduction;
}

/**
 * Kör alla beräkningar och returnerar resultaten i ett objekt.
 * @param {number} D_tip - Spetsdiameter.
 * @param {number} fasVinkel - Fasvinkel.
 * @param {number} ap - Fasdjup.
 * @param {number} Vc - Skärhastighet (Önskad).
 * @param {number} fz_bas - Basal matning per tand.
 * @param {number} z - Antal skär.
 * @param {number} maxRpm - Maximala varvtal.
 * @returns {object} Ett objekt med alla beräknade värden, inklusive actualVc.
 */
function runCalculations(D_tip, fasVinkel, ap, Vc, fz_bas, z, maxRpm) {
    let isCapped = false;
    let actualVc = Vc; // KRITISK RAD: Sätt initialt till önskat Vc

    // 1. Beräkna D_eff
    const D_eff = calculateDeff(D_tip, fasVinkel, ap);

    // 2. Beräkna Varvtal (N)
    let n_calculated = (Vc * K_1000) / (PI * D_eff); 
    let n = n_calculated;

    if (maxRpm > 0 && n_calculated > maxRpm) {
        n = maxRpm;
        isCapped = true;
        // Beräkna det faktiska Vc som används vid Max RPM
        actualVc = (n * PI * D_eff) / K_1000;
    }

    // 3. Beräkna Matningsreduktion (Rf)
    const Rf_standard = calculateRf(ap);

    // 4. Beräkna Korrigerad fz (Standard)
    const fz_korr_standard = fz_bas * Rf_standard; 
    
    // 5. Beräkna Matning (Vf) Standard/Internal
    const Vf_standard = Math.round(n * fz_korr_standard * z);
    
    // 6. Beräkna Korrigerad fz (Production)
    const fz_korr_prod = fz_korr_standard * PRODUCTION_FACTOR;

    // 7. Beräkna Matning (Vf) Production/External
    const Vf_prod = Math.round(n * fz_korr_prod * z); 
    
    return {
        D_eff: D_eff,
        n: n,
        isCapped: isCapped,
        Rf_standard: Rf_standard,
        fz_korr_standard: fz_korr_standard,
        Vf_standard: Vf_standard,
        fz_korr_prod: fz_korr_prod,
        Vf_prod: Vf_prod,
        actualVc: actualVc // KRITISK RAD: Returnera det faktiska Vc-värdet
    };
}