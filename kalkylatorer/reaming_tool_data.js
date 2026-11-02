// =================================================================
// REAMING DATA FOR REAMING CALCULATOR PRO
// Reaming_tool_data.js
//
// Pure data and calculation helpers – no DOM manipulation for
// rendering. UI logic lives in Reaming_Data_Calculator-Pro.html.
//
// MODEL:
//   Reaming is a finishing operation. The pre-drilled hole should
//   leave a controlled allowance for the reamer to remove.
//
//   Cutting speed Vc is significantly lower than for drilling:
//   - HSS: ~50% of drilling speed
//   - HM (carbide): higher than HSS but still conservative
//
//   Feed (fz) is per tooth, based on the reamer's number of teeth.
//   The feed per revolution (mm/rev) is fz × z.
//
//   Allowance (pre-drill undersize) depends on diameter and material,
//   following Sandvik Coromant guidelines.
//
//   Internal coolant (through-tool) allows higher Vc and feed,
//   especially for deeper holes and difficult materials.
//
//   Vc values are calibrated against Clarkson-Osborn, Sandvik,
//   Tungaloy, Hoffmann Group, Cutwel and Iscar for allround
//   HSS and carbide reamers.
//
//   ALUMINUM NOTE: Aluminum tends to form built-up edge (BUE) in
//   the first few mm of the hole if Vc is too low or feed is too
//   light. The Vc values for aluminum are set high enough to break
//   through the BUE temperature zone, and the HTML shows an
//   additional warning when aluminum is selected.
//
// NOTE: parseValue() and formatDecimal() are intentionally NOT
// declared here – they live in the HTML file to avoid duplicate
// const declarations across <script> tags.
// =================================================================

const K_1000 = 1000;
const PI = Math.PI;

// Safety factors – applied to all values
const VC_SAFETY_FACTOR_HM  = 0.85;
const VC_SAFETY_FACTOR_HSS = 0.90;
const FZ_SAFETY_FACTOR_HM  = 0.85;
const FZ_SAFETY_FACTOR_HSS = 0.90;

// =================================================================
// 1. MATERIAL DATA – HSS REAMERS
// =================================================================
const materialDataHSS = {
    soft_steel: {
        name: "Steel: Soft (< 700 N/mm²)",
        Fm: 1.00,
        Vc: 15,
        vcRange: "15–18 m/min"
    },
    hard_steel: {
        name: "Steel: Hard (> 1100 N/mm²)",
        Fm: 0.85,
        Vc: 12,
        vcRange: "12–14 m/min"
    },
    stainless_austenitic: {
        name: "Stainless: Austenitic (< 850 N/mm²)",
        Fm: 0.80,
        Vc: 8,
        vcRange: "6–8 m/min"
    },
    toolox_44: {
        name: "Steel: Toolox 44 (< 50 HRC)",
        Fm: 0.70,
        Vc: 6,
        vcRange: "5–7 m/min"
    },
    hardened_steel_65: {
        name: "Steel: Hardened (< 65 HRC)",
        Fm: 0.55,
        Vc: 4,
        vcRange: "3–5 m/min"
    },
    aluminium: {
        name: "Aluminum / Copper",
        Fm: 1.60,
        Vc: 25,
        vcRange: "20–30 m/min"
    },
    cast_iron: {
        name: "Cast Iron",
        Fm: 0.85,
        Vc: 15,
        vcRange: "15–20 m/min"
    }
};

// =================================================================
// 2. MATERIAL DATA – HM (CARBIDE) REAMERS
// =================================================================
const materialDataHM = {
    soft_steel: {
        name: "Steel: Soft (< 700 N/mm²)",
        Fm: 1.00,
        Vc: 45,
        vcRange: "40–60 m/min"
    },
    hard_steel: {
        name: "Steel: Hard (> 1100 N/mm²)",
        Fm: 0.85,
        Vc: 25,
        vcRange: "20–30 m/min"
    },
    stainless_austenitic: {
        name: "Stainless: Austenitic (< 850 N/mm²)",
        Fm: 0.80,
        Vc: 25,
        vcRange: "20–40 m/min"
    },
    toolox_44: {
        name: "Steel: Toolox 44 (< 50 HRC)",
        Fm: 0.70,
        Vc: 20,
        vcRange: "15–25 m/min"
    },
    hardened_steel_65: {
        name: "Steel: Hardened (< 65 HRC)",
        Fm: 0.55,
        Vc: 12,
        vcRange: "10–15 m/min"
    },
    aluminium: {
        name: "Aluminum / Copper",
        Fm: 1.60,
        Vc: 180,
        vcRange: "150–200 m/min"
    },
    cast_iron: {
        name: "Cast Iron",
        Fm: 0.85,
        Vc: 50,
        vcRange: "40–60 m/min"
    }
};

// =================================================================
// 3. FEED PER TOOTH (fz) – BASE VALUES
// =================================================================
// Values are calibrated against Iscar and Cutwel recommendations
// for allround reamers, then adjusted for consistency.
// =================================================================
const fzTableHSS = [
    { D: 1.0,  fz: 0.011 },
    { D: 2.0,  fz: 0.017 },
    { D: 3.0,  fz: 0.022 },
    { D: 4.0,  fz: 0.028 },
    { D: 5.0,  fz: 0.033 },
    { D: 6.0,  fz: 0.039 },
    { D: 8.0,  fz: 0.050 },
    { D: 10.0, fz: 0.060 },
    { D: 12.0, fz: 0.072 },
    { D: 16.0, fz: 0.088 },
    { D: 20.0, fz: 0.105 },
    { D: 25.0, fz: 0.121 },
    { D: 30.0, fz: 0.132 },
    { D: 40.0, fz: 0.154 }
];

const fzTableHM = [
    { D: 1.0,  fz: 0.010 },
    { D: 2.0,  fz: 0.014 },
    { D: 3.0,  fz: 0.019 },
    { D: 4.0,  fz: 0.024 },
    { D: 5.0,  fz: 0.030 },
    { D: 6.0,  fz: 0.036 },
    { D: 8.0,  fz: 0.046 },
    { D: 10.0, fz: 0.054 },
    { D: 12.0, fz: 0.066 },
    { D: 16.0, fz: 0.084 },
    { D: 20.0, fz: 0.096 },
    { D: 25.0, fz: 0.114 },
    { D: 30.0, fz: 0.126 },
    { D: 40.0, fz: 0.144 }
];

// =================================================================
// 4. RECOMMENDED NUMBER OF TEETH (z)
// =================================================================
function getRecommendedTeeth(D) {
    if (D <= 2)   return 4;
    if (D <= 4)   return 5;
    if (D <= 8)   return 6;
    if (D <= 12)  return 6;
    if (D <= 20)  return 8;
    if (D <= 30)  return 8;
    return 10;
}

// =================================================================
// 5. REAMING ALLOWANCE (PRE-DRILL UNDERSIZE)
// =================================================================
// Tuffa material (rostfritt, hårt stål) kräver mindre arbetsmån.
function getAllowance(D, materialKey) {
    const isToughMaterial = ['hard_steel', 'stainless_austenitic', 'toolox_44', 'hardened_steel_65'].includes(materialKey);
    
    // Grundvärden (mjuka material)
    let min, max;
    if (D <= 3)      { min = 0.10; max = 0.20; }
    else if (D <= 5) { min = 0.10; max = 0.20; }
    else if (D <= 10){ min = 0.15; max = 0.25; }
    else if (D <= 20){ min = 0.20; max = 0.30; }
    else if (D <= 30){ min = 0.25; max = 0.40; }
    else             { min = 0.35; max = 0.50; }

    // Halvera arbetsmånen för tuffa material (avrunda snyggt)
    if (isToughMaterial) {
        min = Math.max(0.10, Math.round((min * 0.6) * 100) / 100);
        max = Math.max(0.15, Math.round((max * 0.6) * 100) / 100);
    }
    
    return { min, max };
}

// =================================================================
// 6. INTERPOLATION HELPERS
// =================================================================
function interpolateTable(table, D) {
    const keys = table.map(r => r.D).sort((a, b) => a - b);
    if (D <= keys[0]) return table[0];
    if (D >= keys[keys.length - 1]) return table[table.length - 1];

    for (let i = 0; i < keys.length - 1; i++) {
        const D1 = keys[i];
        const D2 = keys[i + 1];
        if (D >= D1 && D <= D2) {
            const row1 = table.find(r => r.D === D1);
            const row2 = table.find(r => r.D === D2);
            const ratio = (D - D1) / (D2 - D1);
            return {
                D: D,
                fz: row1.fz + ratio * (row2.fz - row1.fz)
            };
        }
    }
    return table[table.length - 1];
}

function getFzFromTable(D, toolType) {
    const table = toolType === 'HM' ? fzTableHM : fzTableHSS;
    return interpolateTable(table, D).fz;
}