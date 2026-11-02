// =================================================================
// T-SLOT MILLING TOOL DATA & CALCULATOR LOGIC
// T-slot_Milling_tool_data.js
//
// Pure data and calculation helpers – no DOM manipulation for
// rendering. UI logic lives in T-slot_Milling_Data_Calculator-Pro.html.
//
// MODEL:
//   T-slot cutters come in three main variants, all using the
//   SAME fundamental equation:
//     N  = (Vc × 1000) / (π × D)
//     Vf = N × fz × z
//
//     1. HSS T-Slot Cutter        – moderate Vc, moderate fz
//     2. Solid Carbide T-Slot     – higher Vc, higher fz
//     3. Indexable Insert T-Slot  – highest Vc, few inserts, high fz
//
//   Two modes:
//     Full Slotting (ae = 100%)   – 20% fz reduction, no chip thinning
//     Side Milling (low ae)       – RCTF chip thinning applies
//
//   Chip thinning uses radial chip thinning (RCTF):
//     RCTF = D / (2 × √(ae × (D - ae)))
//
//   The tslot_side table is calibrated at ae = 15%, so the applied
//   factor is normalized against the RCTF at 15%:
//     factor(ae) = √(0.15 × 0.85) / √(r × (1 - r))
//
//   where r = ae / 100. The factor is capped at CHIP_THINNING_MAX.
//
//   FZ_TABLE_FACTOR and FZ_SAFETY_FACTOR apply conservative
//   reductions (HM: 0.90 × 0.85, HSS: 0.95 × 0.90). hss_solid uses
//   HSS factors; hm_solid and hm_indexable use HM factors.
//
//   L/D ratio affects cutting speed and feed — longer overhang
//   reduces both. Full slotting uses a milder correction since
//   the radial engagement is already 100%.
//
//   Z-scaling: feed per tooth is reduced as the number of teeth
//   increases, but the scaling is capped at Z_SCALING_CAP.
//
//   Vc values are calibrated against:
//     - HSS:      ZPS, Erasteel, Hahn-Kolb, Toolineo
//     - HM solid: Erasteel, Kennametal KTMS, Ingersoll, CTIA
//     - Indexable: Kennametal KTMS, Ingersoll, Iscar Tangslot,
//                  Sandvik CoroCut (lower half of the range)
// =================================================================

const K_1000 = 1000;
const PI = Math.PI;

const AE_REFERENCE = 15;
const AE_REFERENCE_RATIO = AE_REFERENCE / 100;
const AE_REFERENCE_RCTF = Math.sqrt(AE_REFERENCE_RATIO * (1 - AE_REFERENCE_RATIO));

const FULL_SLOT_FACTOR = 0.80;
const Z_SCALING_CAP = 12;
const VF_LIMIT_WARNING = 8000;
const CHIP_THINNING_MAX = 2.0;

const FZ_TABLE_FACTOR_HM  = 0.90;
const FZ_TABLE_FACTOR_HSS = 0.95;
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

function getChipThinningFactor(aePercent) {
    let r = aePercent / 100;
    if (r <= 0) return 1.0;
    if (r > 0.5) r = 0.5;
    const factor = AE_REFERENCE_RCTF / Math.sqrt(r * (1 - r));
    return Math.min(factor, CHIP_THINNING_MAX);
}

// =================================================================
// 1. HSS T-SLOT CUTTER
// =================================================================
// Sources: ZPS, Erasteel, Hahn-Kolb, Toolineo.
// Full slotting fz reduced ~20% vs previous version to match
// Toolineo's DIN 851 recommended feed per tooth for standard
// HSS T-slot cutters.
// ---------------------------------------------------------------
const hssSolidMaterials = {
    steel1080: { z_base: 6, name: "Steel: Soft (~1080 N/mm²)",
        tslot_full: { vc: 20, fz_table: {10:0.027,12:0.033,16:0.040,20:0.051,25:0.058,30:0.061,40:0.067,50:0.074,60:0.080,80:0.087,100:0.094,125:0.100,150:0.105} },
        tslot_side: { vc: 35, fz_table: {10:0.064,12:0.076,16:0.097,20:0.118,25:0.131,30:0.143,40:0.160,50:0.176,60:0.190,80:0.210,100:0.227,125:0.240,150:0.252} } },
    steel_hard: { z_base: 6, name: "Steel: Hard (> 1080 N/mm²)",
        tslot_full: { vc: 22, fz_table: {10:0.024,12:0.029,16:0.035,20:0.045,25:0.050,30:0.054,40:0.059,50:0.065,60:0.070,80:0.077,100:0.083,125:0.088,150:0.092} },
        tslot_side: { vc: 35, fz_table: {10:0.056,12:0.067,16:0.085,20:0.104,25:0.115,30:0.126,40:0.141,50:0.155,60:0.167,80:0.185,100:0.200,125:0.211,150:0.222} } },
    toolox44: { z_base: 6, name: "Toolox 44 (~45 HRC)",
        tslot_full: { vc: 15, fz_table: {10:0.019,12:0.024,16:0.030,20:0.038,25:0.042,30:0.046,40:0.051,50:0.058,60:0.062,80:0.068,100:0.074,125:0.078,150:0.082} },
        tslot_side: { vc: 15, fz_table: {10:0.047,12:0.055,16:0.072,20:0.089,25:0.097,30:0.106,40:0.122,50:0.134,60:0.144,80:0.160,100:0.173,125:0.181,150:0.190} } },
    steel50hrc: { z_base: 6, name: "Hardened Steel 50 HRC",
        tslot_full: { vc: 8, fz_table: {10:0.013,12:0.014,16:0.019,20:0.024,25:0.027,30:0.030,40:0.034,50:0.038,60:0.040,80:0.046,100:0.050,125:0.054,150:0.058} },
        tslot_side: { vc: 14, fz_table: {10:0.034,12:0.041,16:0.050,20:0.064,25:0.072,30:0.080,40:0.089,50:0.101,60:0.109,80:0.122,100:0.133,125:0.142,150:0.150} } },
    steel60hrc: { z_base: 6, name: "Hardened Steel 60 HRC",
        tslot_full: { vc: 5, fz_table: {10:0.008,12:0.010,16:0.013,20:0.015,25:0.018,30:0.019,40:0.021,50:0.024,60:0.026,80:0.029,100:0.032,125:0.034,150:0.037} },
        tslot_side: { vc: 8, fz_table: {10:0.022,12:0.025,16:0.032,20:0.040,25:0.046,30:0.050,40:0.056,50:0.064,60:0.070,80:0.078,100:0.084,125:0.090,150:0.095} } },
    stainless_austenitic: { z_base: 6, name: "Stainless: Austenitic (< 850 N/mm²)",
        tslot_full: { vc: 25, fz_table: {10:0.021,12:0.025,16:0.030,20:0.038,25:0.043,30:0.046,40:0.050,50:0.055,60:0.060,80:0.066,100:0.070,125:0.075,150:0.078} },
        tslot_side: { vc: 20, fz_table: {10:0.048,12:0.057,16:0.073,20:0.089,25:0.098,30:0.107,40:0.120,50:0.132,60:0.143,80:0.158,100:0.170,125:0.180,150:0.189} } },
    cast_iron: { z_base: 6, name: "Cast Iron",
        tslot_full: { vc: 25, fz_table: {10:0.026,12:0.031,16:0.038,20:0.049,25:0.055,30:0.058,40:0.064,50:0.071,60:0.076,80:0.084,100:0.090,125:0.096,150:0.100} },
        tslot_side: { vc: 30, fz_table: {10:0.061,12:0.072,16:0.093,20:0.113,25:0.125,30:0.137,40:0.153,50:0.169,60:0.182,80:0.201,100:0.217,125:0.230,150:0.242} } },
    nonferrous: { z_base: 6, name: "Aluminum / Copper",
        tslot_full: { vc: 90, fz_table: {10:0.067,12:0.084,16:0.112,20:0.140,25:0.157,30:0.179,40:0.202,50:0.224,60:0.246,80:0.280,100:0.308,125:0.336,150:0.358} },
        tslot_side: { vc: 110, fz_table: {10:0.140,12:0.175,16:0.224,20:0.280,25:0.315,30:0.350,40:0.385,50:0.420,60:0.455,80:0.525,100:0.581,125:0.630,150:0.672} } }
};

// =================================================================
// 2. SOLID CARBIDE T-SLOT CUTTER
// =================================================================
// Sources: Erasteel, Kennametal KTMS, Ingersoll, CTIA.
// ---------------------------------------------------------------
const hmSolidMaterials = {
    steel1080: { z_base: 8, name: "Steel: Soft (~1080 N/mm²)",
        tslot_full: { vc: 85, fz_table: {10:0.058,12:0.070,16:0.086,20:0.108,25:0.122,30:0.130,40:0.144,50:0.158,60:0.170,80:0.187,100:0.202,125:0.214,150:0.223} },
        tslot_side: { vc: 160, fz_table: {10:0.108,12:0.130,16:0.166,20:0.202,25:0.223,30:0.245,40:0.274,50:0.302,60:0.324,80:0.360,100:0.389,125:0.410,150:0.432} } },
    steel_hard: { z_base: 8, name: "Steel: Hard (> 1080 N/mm²)",
        tslot_full: { vc: 85, fz_table: {10:0.050,12:0.060,16:0.076,20:0.095,25:0.107,30:0.114,40:0.126,50:0.139,60:0.149,80:0.164,100:0.176,125:0.187,150:0.196} },
        tslot_side: { vc: 150, fz_table: {10:0.095,12:0.114,16:0.145,20:0.176,25:0.196,30:0.215,40:0.240,50:0.265,60:0.284,80:0.316,100:0.341,125:0.360,150:0.378} } },
    toolox44: { z_base: 8, name: "Toolox 44 (~45 HRC)",
        tslot_full: { vc: 80, fz_table: {10:0.041,12:0.050,16:0.065,20:0.079,25:0.089,30:0.098,40:0.108,50:0.122,60:0.132,80:0.146,100:0.158,125:0.167,150:0.175} },
        tslot_side: { vc: 85, fz_table: {10:0.079,12:0.094,16:0.122,20:0.151,25:0.166,30:0.180,40:0.209,50:0.230,60:0.247,80:0.274,100:0.295,125:0.310,150:0.324} } },
    steel50hrc: { z_base: 8, name: "Hardened Steel 50 HRC",
        tslot_full: { vc: 55, fz_table: {10:0.026,12:0.031,16:0.041,20:0.052,25:0.058,30:0.065,40:0.072,50:0.079,60:0.086,80:0.098,100:0.107,125:0.115,150:0.122} },
        tslot_side: { vc: 70, fz_table: {10:0.058,12:0.070,16:0.086,20:0.108,25:0.122,30:0.137,40:0.151,50:0.173,60:0.187,80:0.209,100:0.228,125:0.242,150:0.257} } },
    steel60hrc: { z_base: 8, name: "Hardened Steel 60 HRC",
        tslot_full: { vc: 30, fz_table: {10:0.016,12:0.020,16:0.026,20:0.034,25:0.037,30:0.042,40:0.047,50:0.052,60:0.056,80:0.064,100:0.070,125:0.074,150:0.079} },
        tslot_side: { vc: 38, fz_table: {10:0.036,12:0.043,16:0.055,20:0.067,25:0.077,30:0.086,40:0.095,50:0.109,60:0.118,80:0.131,100:0.143,125:0.151,150:0.160} } },
    stainless_austenitic: { z_base: 8, name: "Stainless: Austenitic (< 850 N/mm²)",
        tslot_full: { vc: 85, fz_table: {10:0.043,12:0.052,16:0.065,20:0.082,25:0.092,30:0.097,40:0.108,50:0.119,60:0.128,80:0.140,100:0.151,125:0.161,150:0.168} },
        tslot_side: { vc: 130, fz_table: {10:0.082,12:0.097,16:0.125,20:0.151,25:0.168,30:0.184,40:0.205,50:0.227,60:0.244,80:0.270,100:0.292,125:0.308,150:0.324} } },
    cast_iron: { z_base: 8, name: "Cast Iron",
        tslot_full: { vc: 130, fz_table: {10:0.066,12:0.079,16:0.100,20:0.125,25:0.140,30:0.149,40:0.166,50:0.182,60:0.196,80:0.215,100:0.232,125:0.246,150:0.257} },
        tslot_side: { vc: 145, fz_table: {10:0.125,12:0.149,16:0.191,20:0.232,25:0.257,30:0.282,40:0.314,50:0.348,60:0.373,80:0.414,100:0.448,125:0.472,150:0.497} } },
    nonferrous: { z_base: 8, name: "Aluminum / Copper",
        tslot_full: { vc: 600, fz_table: {10:0.12,12:0.15,16:0.20,20:0.25,25:0.28,30:0.32,40:0.36,50:0.40,60:0.44,80:0.50,100:0.55,125:0.60,150:0.64} },
        tslot_side: { vc: 900, fz_table: {10:0.20,12:0.25,16:0.32,20:0.40,25:0.45,30:0.50,40:0.55,50:0.60,60:0.65,80:0.75,100:0.83,125:0.90,150:0.96} } }
};

// =================================================================
// 3. INDEXABLE INSERT T-SLOT CUTTER
// =================================================================
// Sources: Kennametal KTMS, Ingersoll, Iscar Tangslot, Sandvik.
// Few inserts (4-6 typical), high fz per tooth.
// Vc and fz are calibrated to the lower half of the Kennametal
// KTMS and Ingersoll ranges for stable, allround-friendly cutting.
// fz reduced ~30% vs previous version to bring feed per revolution
// closer to Kennametal's recommended 0.10-0.15 mm/rev when using
// 4-5 inserts.
// ---------------------------------------------------------------
const hmIndexableMaterials = {
    steel1080: { z_base: 5, name: "Steel: Soft (~1080 N/mm²)",
        tslot_full: { vc: 110, fz_table: {10:0.028,12:0.032,16:0.042,20:0.052,25:0.057,30:0.063,40:0.070,50:0.076,60:0.081,80:0.088,100:0.095,125:0.102,150:0.108} },
        tslot_side: { vc: 130, fz_table: {10:0.039,12:0.046,16:0.059,20:0.072,25:0.080,30:0.088,40:0.098,50:0.106,60:0.113,80:0.124,100:0.133,125:0.143,150:0.151} } },
    steel_hard: { z_base: 5, name: "Steel: Hard (> 1080 N/mm²)",
        tslot_full: { vc: 95, fz_table: {10:0.024,12:0.027,16:0.036,20:0.043,25:0.048,30:0.053,40:0.060,50:0.064,60:0.069,80:0.075,100:0.081,125:0.086,150:0.091} },
        tslot_side: { vc: 110, fz_table: {10:0.033,12:0.039,16:0.050,20:0.061,25:0.068,30:0.074,40:0.083,50:0.090,60:0.097,80:0.105,100:0.113,125:0.121,150:0.127} } },
    toolox44: { z_base: 5, name: "Toolox 44 (~45 HRC)",
        tslot_full: { vc: 75, fz_table: {10:0.018,12:0.021,16:0.027,20:0.033,25:0.036,30:0.041,40:0.045,50:0.048,60:0.052,80:0.057,100:0.061,125:0.066,150:0.069} },
        tslot_side: { vc: 85, fz_table: {10:0.025,12:0.029,16:0.038,20:0.046,25:0.052,30:0.057,40:0.063,50:0.068,60:0.073,80:0.080,100:0.085,125:0.092,150:0.097} } },
    steel50hrc: { z_base: 5, name: "Hardened Steel 50 HRC",
        tslot_full: { vc: 50, fz_table: {10:0.011,12:0.013,16:0.017,20:0.021,25:0.023,30:0.025,40:0.028,50:0.030,60:0.032,80:0.035,100:0.038,125:0.041,150:0.043} },
        tslot_side: { vc: 60, fz_table: {10:0.015,12:0.018,16:0.024,20:0.029,25:0.032,30:0.035,40:0.039,50:0.043,60:0.046,80:0.050,100:0.054,125:0.057,150:0.060} } },
    steel60hrc: { z_base: 5, name: "Hardened Steel 60 HRC",
        tslot_full: { vc: 25, fz_table: {10:0.007,12:0.008,16:0.010,20:0.013,25:0.014,30:0.015,40:0.017,50:0.018,60:0.020,80:0.021,100:0.023,125:0.025,150:0.026} },
        tslot_side: { vc: 32, fz_table: {10:0.010,12:0.011,16:0.014,20:0.018,25:0.020,30:0.021,40:0.024,50:0.026,60:0.027,80:0.030,100:0.032,125:0.035,150:0.036} } },
    stainless_austenitic: { z_base: 5, name: "Stainless: Austenitic (< 850 N/mm²)",
        tslot_full: { vc: 85, fz_table: {10:0.020,12:0.023,16:0.029,20:0.036,25:0.041,30:0.044,40:0.049,50:0.053,60:0.057,80:0.063,100:0.067,125:0.071,150:0.076} },
        tslot_side: { vc: 100, fz_table: {10:0.027,12:0.032,16:0.041,20:0.051,25:0.057,30:0.062,40:0.069,50:0.074,60:0.080,80:0.088,100:0.094,125:0.101,150:0.106} } },
    cast_iron: { z_base: 5, name: "Cast Iron",
        tslot_full: { vc: 130, fz_table: {10:0.032,12:0.038,16:0.049,20:0.060,25:0.067,30:0.074,40:0.081,50:0.088,60:0.095,80:0.103,100:0.111,125:0.119,150:0.125} },
        tslot_side: { vc: 150, fz_table: {10:0.046,12:0.053,16:0.069,20:0.083,25:0.093,30:0.102,40:0.113,50:0.123,60:0.132,80:0.144,100:0.155,125:0.166,150:0.175} } },
    nonferrous: { z_base: 5, name: "Aluminum / Copper",
        tslot_full: { vc: 500, fz_table: {10:0.056,12:0.065,16:0.084,20:0.103,25:0.114,30:0.126,40:0.140,50:0.151,60:0.162,80:0.178,100:0.190,125:0.204,150:0.215} },
        tslot_side: { vc: 650, fz_table: {10:0.078,12:0.091,16:0.118,20:0.144,25:0.160,30:0.176,40:0.196,50:0.211,60:0.228,80:0.249,100:0.267,125:0.285,150:0.301} } }
};

// =================================================================
// 4. TOOL TYPE REGISTRY
// =================================================================
const toolTypeRegistry = {
    hss_solid: {
        name: "HSS T-Slot Cutter",
        badge: "HSS",
        baseZ: 6,
        factorHM: false,
        defaults: { maxRpm: 4000, overhang: 30 },
        materials: hssSolidMaterials
    },
    hm_solid: {
        name: "Solid Carbide T-Slot Cutter",
        badge: "HM",
        baseZ: 8,
        factorHM: true,
        defaults: { maxRpm: 8000, overhang: 30 },
        materials: hmSolidMaterials
    },
    hm_indexable: {
        name: "Indexable Insert T-Slot Cutter",
        badge: "HM",
        baseZ: 5,
        factorHM: true,
        defaults: { maxRpm: 4000, overhang: 40 },
        materials: hmIndexableMaterials
    }
};

// =================================================================
// 5. L/D RATIO CORRECTION
// =================================================================
const ldCorrection = {
    'mild': {vc: 0.75, fz: 0.90},
    '5xD':  {vc: 0.40, fz: 0.70},
    '8xD':  {vc: 0.20, fz: 0.40},
    '12xD': {vc: 0.15, fz: 0.30},
    '15xD': {vc: 0.10, fz: 0.20}
};

const ldCorrectionFullSlot = {
    'mild': {vc: 0.90, fz: 0.95},
    '5xD':  {vc: 0.80, fz: 0.85},
    '8xD':  {vc: 0.70, fz: 0.75},
    '12xD': {vc: 0.60, fz: 0.65},
    '15xD': {vc: 0.50, fz: 0.55}
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
// 6. STATE TRACKING
// =================================================================
let userEdited = {vc:false, fz:false, z:false, ae:false, overhang:false, maxRpm:false};

// Remembers the user's last ae value while Full Slotting is active
// (where ae is locked to 100%), so it can be restored when switching
// back to Side Milling.
let savedAeValue = AE_REFERENCE;

function getCurrentMode() {
    return document.querySelector('input[name="calcMode"]:checked').value;
}

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
// 7. DYNAMIC DROPDOWNS
// =================================================================
function generateMaterialOptions() {
    const select = document.getElementById('material');
    select.innerHTML = '';
    const tt = getCurrentToolTypeData();
    const materials = tt.materials;

    for (const key in materials) {
        if (materials.hasOwnProperty(key)) {
            const option = new Option(materials[key].name, key);
            if (key === 'steel1080') option.selected = true;
            select.options.add(option);
        }
    }
}

// =================================================================
// 8. FEED PER TOOTH DEFAULT – linear interpolation
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
// 9. RECOMMENDED NUMBER OF FLUTES
// =================================================================
function getRecommendedZ(D, toolTypeKey, mode) {
    if (toolTypeKey === 'hm_indexable') {
        // Indexable T-slot cutters have few inserts
        if (D <= 40) return 4;
        if (D <= 80) return 5;
        if (D <= 120) return 6;
        return 8;
    }
    // HSS and solid carbide T-slot cutters
    if (mode === 'tslot_full') {
        if (D <= 16) return 6;
        if (D <= 32) return 8;
        return 10;
    }
    return 4;
}

// =================================================================
// 10. DEFAULT VALUES
// =================================================================
function updateDefaultValues() {
    const tt = getCurrentToolTypeData();
    const toolTypeKey = getCurrentToolType();
    const mat = document.getElementById('material').value;
    const D = parseValue('diameter');
    const mode = getCurrentMode();

    updateUIForMode(mode);
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

    // Recommended flutes
    let currentZ = parseValue('z', 4);
    if (!userEdited.z) {
        currentZ = getRecommendedZ(D, toolTypeKey, mode);
        document.getElementById('z').value = currentZ;
    }

    // Mode-specific data
    const modeData = matData[mode];
    if (!modeData) {
        calculate();
        return;
    }

    if (!userEdited.vc) document.getElementById('vc').value = modeData.vc;

    // Table factor + z-scaling
    const tableFactor = tt.factorHM ? FZ_TABLE_FACTOR_HM : FZ_TABLE_FACTOR_HSS;
    const fz_default_from_table = getFzDefault(modeData.fz_table, D) * tableFactor;
    const baseZ = (mode === 'tslot_side') ? 4 : tt.baseZ;

    if (!userEdited.fz) {
        const effectiveZ = Math.min(currentZ, Z_SCALING_CAP);
        const scaledFz = fz_default_from_table * (baseZ / effectiveZ);
        document.getElementById('fzInitial').value = formatDecimal(scaledFz, 4);
    }

    // NOTE: savedAeValue is handled by updateUIForMode() and the
    // aePercent event listener. Do NOT reset it here, or the user's
    // custom ae value would be lost when changing material/diameter.

    calculate();
}

// =================================================================
// Hides/shows input groups based on the current mode.
// The ae field stays visible at all times (no layout shift), but is
// disabled and shown at 100% during Full Slotting. The user's last
// Side Milling value is remembered and restored when switching back.
// =================================================================
function updateUIForMode(mode) {
    const isFull = mode === 'tslot_full';

    document.getElementById('headerSubtext').textContent =
        isFull ? 'Full Slotting (100% Radial Engagement)' : 'Side Milling (Low Radial Load)';

    const aeGroup = document.getElementById('aePercentGroup');
    const aeInput = document.getElementById('aePercent');

    if (isFull) {
        // Save current ae value before locking to 100
        const current = parseFloat(aeInput.value);
        if (!isNaN(current) && current > 0 && current < 100) {
            savedAeValue = current;
        }
        aeInput.value = 100;
        aeInput.disabled = true;
        aeGroup.classList.add('disabled');
    } else {
        aeInput.disabled = false;
        aeGroup.classList.remove('disabled');
        // Restore the user's last Side Milling value
        aeInput.value = savedAeValue;
    }
}

// =================================================================
// Updates the small hint text under the overhang field.
// =================================================================
function updateOverhangHint(D, L, mode) {
    const hintEl = document.getElementById('overhangHint');
    if (!hintEl) return;

    if (!D || !L || D <= 0) {
        hintEl.textContent = 'Enter tool overhang to see L/D ratio.';
        return;
    }

    const ratio = L / D;
    const tier = getLdTier(ratio);
    const isFull = mode === 'tslot_full';

    if (tier === null) {
        hintEl.textContent = `L/D ratio: ${formatDecimal(ratio, 1)} — rigid setup, no reduction applied.`;
    } else {
        const factor = isFull ? ldCorrectionFullSlot[tier] : ldCorrection[tier];
        const vcPct = Math.round(factor.vc * 100);
        const fzPct = Math.round(factor.fz * 100);
        const modeLabel = isFull ? 'Full slotting' : 'Side milling';
        hintEl.textContent = `L/D ratio: ${formatDecimal(ratio, 1)} — ${modeLabel}: Vc to ${vcPct}%, fz to ${fzPct}%.`;
    }
}

// =================================================================
// 11. CALCULATION
// =================================================================
function calculate() {
    const tt = getCurrentToolTypeData();
    const D = parseValue('diameter');
    const Vc = parseValue('vc');
    let fz_initial = parseValue('fzInitial');
    const z = Math.round(parseValue('z', 1));
    const maxRpmMachine = parseValue('maxRpm');
    const mode = getCurrentMode();
    const aePercent = parseValue('aePercent');
    const L = parseValue('overhang');

    const resultsEl = document.getElementById('results');

    if (D <= 0 || Vc <= 0 || z <= 0 || fz_initial <= 0) {
        resultsEl.classList.remove('ready');
        resultsEl.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:20px 0;">Please enter valid cutting data to calculate results.</p>';
        return;
    }

    if (mode === 'tslot_side' && (aePercent <= 0 || aePercent > 100)) {
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
        if (mode === 'tslot_side') {
            vc_correction = ldCorrection[ld_tier].vc;
            fz_correction = ldCorrection[ld_tier].fz;
        } else {
            vc_correction = ldCorrectionFullSlot[ld_tier].vc;
            fz_correction = ldCorrectionFullSlot[ld_tier].fz;
        }
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

    // Base effective fz: L/D × safety factor
    let fz_effective = fz_initial * fz_correction * safetyFactor;

    let chipThinningFactor = 1.0;
    if (mode === 'tslot_side' && aePercent > 0) {
        chipThinningFactor = getChipThinningFactor(aePercent);
        fz_effective = fz_effective * chipThinningFactor;
    }

    if (mode === 'tslot_full') {
        fz_effective = fz_effective * FULL_SLOT_FACTOR;
    }

    // Chip thickness (hm)
    let hm;
    if (mode === 'tslot_full') {
        hm = fz_effective;
    } else {
        const r = Math.min(aePercent / 100, 0.5);
        const sinKappaEff = 2 * Math.sqrt(r * (1 - r));
        hm = fz_effective * sinKappaEff;
    }

    const Vf = Math.round(N_final * fz_effective * z);
    const F_per_rev = fz_effective * z;
    const ae_mm = mode === 'tslot_side' ? D * aePercent / 100 : D;

    updateOverhangHint(D, L, mode);

    let rpmLimitDisplay;
    if (ld_tier) {
        rpmLimitDisplay = `${Math.round(vc_correction * 100)}% (L/D=${formatDecimal(ld_ratio, 1)})`;
    } else if (ld_ratio > 0) {
        rpmLimitDisplay = `None (L/D=${formatDecimal(ld_ratio, 1)})`;
    } else {
        rpmLimitDisplay = '—';
    }

    const highVfWarning = Vf > VF_LIMIT_WARNING;

    // Only show coolant note in Full Slotting mode — side milling is
    // less prone to chip packing, so the note would just add noise.
    const coolantNote = (mode === 'tslot_full')
        ? '<p class="warning-text">* Full slotting requires excellent chip evacuation — use air blast or high-pressure coolant.</p>'
        : '';

    resultsEl.innerHTML = `
        <h2>Results</h2>
        <div class="result-line"><strong>Spindle Speed N [rpm]:</strong> <span class="value ${capped ? 'capped' : ''}">${Math.round(N_final)}</span></div>
        <div class="result-line"><strong>Feed Rate V<sub>f</sub> [mm/min]:</strong> <span class="value">${Vf}</span></div>

        <div class="details-box">
            <p><strong>Effective f<sub>z</sub>:</strong><span>${formatDecimal(fz_effective, 3)} <sub>mm/z</sub></span></p>
            <p><strong>Chip Thickness h<sub>m</sub>:</strong><span>${formatDecimal(hm, 4)} <sub>mm</sub></span></p>
            <p><strong>Effective f<sub>z</sub>/Rev:</strong><span>${formatDecimal(F_per_rev, 2)} <sub>mm/rev</sub></span></p>
            <p style="display:${mode === 'tslot_full' ? 'none' : 'flex'};"><strong>Radial Engagement a<sub>e</sub>:</strong><span>${formatDecimal(ae_mm, 3)} <sub>mm</sub> (${aePercent}%)</span></p>
            <p style="display:${mode === 'tslot_full' ? 'none' : 'flex'};"><strong>Chip Thinning (RCTF):</strong><span>× ${formatDecimal(chipThinningFactor, 2)}</span></p>
            <p><strong>Safety Factor:</strong><span>× ${formatDecimal(safetyFactor, 2)}</span></p>
            <p><strong>Cutting Speed Vc:</strong><span>${formatDecimal(actualVc, 0)} <sub>m/min</sub></span></p>
            <p><strong>RPM Limitation (L/D):</strong><span>${rpmLimitDisplay}</span></p>
        </div>

        ${capped ? '<p class="warning-text">* Limited by machine max RPM</p>' : ''}
        ${coolantNote}
        ${highVfWarning ? '<p class="warning-text">* High feed rate — verify that machine and tooling can handle this feed. Chip evacuation may be a problem.</p>' : ''}
    `;
}

// =================================================================
// 12. EVENT LISTENERS
// =================================================================
document.addEventListener('DOMContentLoaded', () => {

    generateMaterialOptions();

    const calcInputs = document.querySelectorAll('input, select');

    calcInputs.forEach(el => el.addEventListener('input', () => {
        if (el.id==='vc') userEdited.vc = true;
        if (el.id==='fzInitial') userEdited.fz = true;
        if (el.id==='z') userEdited.z = true;
        if (el.id==='aePercent') {
            userEdited.ae = true;
            const v = parseFloat(el.value);
            if (!isNaN(v) && v > 0 && v < 100) {
                savedAeValue = v;
            }
        }
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

    document.querySelectorAll('input[name="calcMode"]').forEach(radio => {
        radio.addEventListener('change', () => {
            userEdited = {vc:userEdited.vc, fz:userEdited.fz, z:false, ae:false, overhang:false, maxRpm:userEdited.maxRpm};
            updateDefaultValues();
        });
    });

    updateDefaultValues();
});