// =================================================================
// DRILLING DATA FOR DRILLING CALCULATOR PRO
// This file contains all raw data for tools and materials.
// Changes to calculations or appearance are made in the HTML file.
// =================================================================

// 1. Feed factor Fd – Carbide (HM)
//    ... (oförändrad)
const FdTableHM_Original = [
    { D: 0.5, '5xD': 0.040, '8xD': 0.035, '12xD': 0.030, '15xD': 0.025 },
    { D: 1.0, '5xD': 0.055, '8xD': 0.045, '12xD': 0.035, '15xD': 0.030 },
    { D: 2.0, '5xD': 0.075, '8xD': 0.065, '12xD': 0.055, '15xD': 0.050 },
    { D: 2.5, '5xD': 0.090, '8xD': 0.075, '12xD': 0.065, '15xD': 0.055 },
    { D: 3.0, '5xD': 0.100, '8xD': 0.080, '12xD': 0.070, '15xD': 0.060 },
    { D: 4.0, '5xD': 0.110, '8xD': 0.100, '12xD': 0.090, '15xD': 0.080 },
    { D: 5.0, '5xD': 0.140, '8xD': 0.120, '12xD': 0.100, '15xD': 0.090 },
    { D: 6.0, '5xD': 0.160, '8xD': 0.140, '12xD': 0.110, '15xD': 0.100 },
    { D: 8.0, '5xD': 0.210, '8xD': 0.180, '12xD': 0.140, '15xD': 0.120 },
    { D: 10.0, '5xD': 0.270, '8xD': 0.240, '12xD': 0.200, '15xD': 0.180 },
    { D: 12.0, '5xD': 0.300, '8xD': 0.270, '12xD': 0.230, '15xD': 0.200 },
    { D: 14.0, '5xD': 0.330, '8xD': 0.290, '12xD': 0.250, '15xD': 0.220 },
    { D: 16.0, '5xD': 0.350, '8xD': 0.310, '12xD': 0.270, '15xD': 0.240 },
    { D: 18.0, '5xD': 0.370, '8xD': 0.320, '12xD': 0.280, '15xD': 0.250 },
    { D: 20.0, '5xD': 0.400, '8xD': 0.350, '12xD': 0.300, '15xD': 0.270 },
    { D: 22.0, '5xD': 0.420, '8xD': 0.370, '12xD': 0.320, '15xD': 0.290 },
    { D: 25.0, '5xD': 0.460, '8xD': 0.400, '12xD': 0.330, '15xD': 0.280 }
];

// 2. Curve adjustment points (HM)
const curveAdjustmentPoints = [
    { D: 2.0, factor: 0.90 }, 
    { D: 3.0, factor: 0.85 }, 
    { D: 6.0, factor: 0.70 }, 
    { D: 8.0, factor: 0.65 }, 
    { D: 11.0, factor: 0.55 }, 
    { D: 13.0, factor: 0.50 }, 
    { D: 18.0, factor: 0.45 } 
];

// 3. Material data for Carbide (HM)
const materialDataHM = {
    "soft_steel": { name: "Steel: Soft (< 1100 N/mm²)", Fm: 1.0, Vc_safe: 80 },
    "hard_steel": { name: "Steel: Hard (> 1100 N/mm²)", Fm: 0.9, Vc_safe: 55 },
    "stainless_austenitic": { name: "Stainless: Austenitic (< 850 N/mm²)", Fm: 0.85, Vc_safe: 40 }, 
    "toolox_44": { name: "Steel: Toolox 44 (< 50 HRC)", Fm: 0.77, Vc_safe: 15 },
    "hardened_steel_65": { name: "Steel: Hardened (<65 HRC)", Fm: 0.6, Vc_safe: 10 },
    "aluminium": { name: "Aluminum / Copper", Fm: 1.4, Vc_safe: 200 }, 
    "cast_iron": { name: "Cast Iron", Fm: 0.85, Vc_safe: 70 }
};

// 4. Material data for HSS (High-Speed Steel)
const materialDataHSS = {
    "soft_steel": { name: "Steel: Soft (< 1100 N/mm²)", Fm: 1.0, Vc_safe: 20 },
    "hard_steel": { name: "Steel: Hard (> 1100 N/mm²)", Fm: 0.9, Vc_safe: 15 },
    "stainless_austenitic": { name: "Stainless: Austenitic (< 850 N/mm²)", Fm: 0.8, Vc_safe: 10 }, 
    "toolox_44": { name: "Steel: Toolox 44 (< 50 HRC)", Fm: 0.7, Vc_safe: 10 },
    "hardened_steel_65": { name: "Steel: Hardened (<65 HRC)", Fm: 0.6, Vc_safe: 5 },
    "aluminium": { name: "Aluminum", Fm: 1.3, Vc_safe: 60 }, 
    "cast_iron": { name: "Cast Iron", Fm: 0.8, Vc_safe: 25 }
};

// 5. Feed factor Fd – HSS (Reducerad med ~15% för ökad stabilitet)
const FdTableHSS = [
    { D: 0.5, '5xD': 0.024, '8xD': 0.020, '12xD': 0.017, '15xD': 0.014 },
    { D: 1.0, '5xD': 0.026, '8xD': 0.023, '12xD': 0.019, '15xD': 0.015 },
    { D: 2.0, '5xD': 0.036, '8xD': 0.031, '12xD': 0.026, '15xD': 0.020 },
    { D: 2.5, '5xD': 0.042, '8xD': 0.036, '12xD': 0.030, '15xD': 0.024 },
    { D: 3.0, '5xD': 0.044, '8xD': 0.038, '12xD': 0.031, '15xD': 0.026 },
    { D: 4.0, '5xD': 0.048, '8xD': 0.041, '12xD': 0.034, '15xD': 0.027 },
    { D: 5.0, '5xD': 0.054, '8xD': 0.046, '12xD': 0.038, '15xD': 0.031 },
    { D: 6.0, '5xD': 0.089, '8xD': 0.077, '12xD': 0.064, '15xD': 0.051 },
    { D: 8.0, '5xD': 0.119, '8xD': 0.102, '12xD': 0.085, '15xD': 0.068 },
    { D: 10.0, '5xD': 0.137, '8xD': 0.117, '12xD': 0.098, '15xD': 0.078 },
    { D: 12.0, '5xD': 0.167, '8xD': 0.143, '12xD': 0.119, '15xD': 0.095 },
    { D: 14.0, '5xD': 0.184, '8xD': 0.158, '12xD': 0.132, '15xD': 0.105 },
    { D: 16.0, '5xD': 0.196, '8xD': 0.168, '12xD': 0.140, '15xD': 0.112 },
    { D: 18.0, '5xD': 0.208, '8xD': 0.179, '12xD': 0.149, '15xD': 0.119 },
    { D: 20.0, '5xD': 0.220, '8xD': 0.189, '12xD': 0.157, '15xD': 0.126 },
    { D: 22.0, '5xD': 0.226, '8xD': 0.194, '12xD': 0.162, '15xD': 0.129 },
    { D: 25.0, '5xD': 0.226, '8xD': 0.194, '12xD': 0.162, '15xD': 0.129 }
];

// 6. Length factors for cutting speed (Vc)
//    Base penalty for longer drills (deflection, vibration).
//    Assumes through-coolant drilling (default).
const lengthFactors = {
    '5xD': 1.00,
    '8xD': 0.85,
    '12xD': 0.70,
    '15xD': 0.60
};

// 7. Coolant method factors
//    Without coolant channels, chip evacuation becomes critical at higher
//    L/D ratios. Applied as additional multipliers on top of lengthFactors
//    for Vc, and separately on Fd.
//
//    with_channel    = through-coolant drill (default). No penalty.
//    without_channel = external flood cooling only. Penalty increases
//                      with depth because chips cannot escape.
const coolantFactors = {
    'with_channel': {
        Vc: { '5xD': 1.00, '8xD': 1.00, '12xD': 0.95, '15xD': 0.90 },
        Fd: { '5xD': 1.00, '8xD': 1.00, '12xD': 0.90, '15xD': 0.85 }
    },
    'without_channel': {
        Vc: { '5xD': 0.95, '8xD': 0.85, '12xD': 0.75, '15xD': 0.65 },
        Fd: { '5xD': 0.90, '8xD': 0.80, '12xD': 0.65, '15xD': 0.55 }
    }
};

// 8. Pecking depth recommendation
//    Recommended peck depth (max) as a multiple of drill diameter.
//    Applied only when drilling without through-coolant channels.
//    The value is also adjusted by L/D — deeper holes require smaller pecks.
const peckFactors = {
    'soft_steel': 1.0,
    'hard_steel': 1.0,
    'stainless_austenitic': 0.5,
    'toolox_44': 0.5,
    'hardened_steel_65': 0.3,
    'aluminium': 1.0,
    'cast_iron': 1.5
};

const peckLengthFactors = {
    '5xD': 1.0,
    '8xD': 0.8,
    '12xD': 0.6,
    '15xD': 0.5
};