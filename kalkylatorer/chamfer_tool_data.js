// =================================================================
// CHAMFER MILLING TOOL DATA & CALCULATOR LOGIC
// Chamfer_tool_data.js
//
// Pure data and calculation helpers – no DOM manipulation for
// rendering. UI logic lives in Chamfer_Data_Calculator-Pro.html.
//
// MODEL:
//   The tool is assumed to be pointed (D_tip = 0).
//   The user specifies the desired chamfer width (horizontal dimension)
//   and how much extra the tool plunges in Z beyond what the width requires.
//
//   Z_req    = chamfer_size / tan(θ/2)     (Z-depth to reach the chamfer width)
//   Z_total  = Z_req + extra_Z             (total Z-depth)
//   D_eff    = 2 × Z_total × tan(θ/2)      (diameter at engagement at the surface)
//
//   D_eff simplifies to: D_eff = 2 × chamfer_size + 2 × extra_Z × tan(θ/2)
//
//   ae = chamfer_size                       (radial engagement in the side direction)
//   ChipThinning = min(√(D_eff / ae) × axial_factor, 1.55)  (cap sänkt för stabila allround-data)
//
//   Vf_finish = n × fz_bas × FINISH_FACTOR × z   (fine surface finish)
//   Vf_std    = n × fz_bas × z                    (base feed)
//   Vf_prod   = n × fz_bas × ChipThinning × z    (aggressive)
// =================================================================

// =================================================================
// 1. CONSTANTS
// =================================================================
const K_1000 = 1000;
const PI = Math.PI;
const CHIP_THINNING_MAX = 1.55; // Cap for the chip thinning factor
const FINISH_FACTOR = 0.6;     // Reduction factor for finish feed

// =================================================================
// 2. MATERIAL DATA AND FZ TABLES
// =================================================================
// Vc values are calibrated against recommendations from Tungaloy,
// BIG Daishowa and Ingersoll for solid carbide in chamfer milling.
//
// The fz table is structured as {diameter: fz} where the diameter is
// the effective diameter (D_eff) at engagement. Interpolation is
// linear between the points.
// =================================================================
const toolData = {
    steel1080: {
        z_base: 4, name: "Steel (~1080 N/mm²)", vc: 150,
        fz_table: {0:0.000, 1:0.010, 2:0.018, 3:0.025, 4:0.033, 5:0.041, 6:0.049, 8:0.062, 10:0.075, 12:0.087, 16:0.108, 20:0.128}
    },
    toolox44: {
        z_base: 4, name: "Toolox 44 (~45 HRC)", vc: 80,
        fz_table: {0:0.000, 1:0.008, 2:0.015, 3:0.021, 4:0.027, 5:0.032, 6:0.038, 8:0.048, 10:0.057, 12:0.065, 16:0.082, 20:0.098}
    },
    steel50hrc: {
        z_base: 4, name: "Hardened Steel 50 HRC", vc: 50,
        fz_table: {0:0.000, 1:0.006, 2:0.011, 3:0.015, 4:0.019, 5:0.023, 6:0.027, 8:0.033, 10:0.038, 12:0.045, 16:0.055, 20:0.065}
    },
    steel60hrc: {
        z_base: 4, name: "Hardened Steel 60 HRC", vc: 30,
        fz_table: {0:0.000, 1:0.003, 2:0.005, 3:0.008, 4:0.010, 5:0.012, 6:0.014, 8:0.018, 10:0.021, 12:0.025, 16:0.030, 20:0.036}
    },
    vanadis: {
        z_base: 4, name: "Vanadis / Powder Steel (soft)", vc: 100,
        fz_table: {0:0.000, 1:0.007, 2:0.013, 3:0.018, 4:0.023, 5:0.027, 6:0.032, 8:0.041, 10:0.048, 12:0.055, 16:0.070, 20:0.083}
    },
    nonferrous: {
        z_base: 3, name: "Aluminum / Copper", vc: 600,
        fz_table: {0:0.000, 1:0.020, 2:0.040, 3:0.060, 4:0.080, 5:0.100, 6:0.120, 8:0.150, 10:0.180, 12:0.200, 16:0.250, 20:0.300}
    },
    cast_iron: {
        z_base: 4, name: "Cast Iron", vc: 100,
        fz_table: {0:0.000, 1:0.008, 2:0.015, 3:0.021, 4:0.027, 5:0.033, 6:0.040, 8:0.052, 10:0.062, 12:0.072, 16:0.090, 20:0.108}
    }
};

// =================================================================
// 3. HELPER FUNCTIONS
// =================================================================

/**
 * Interpolates the base fz value based on D_eff.
 */
function getFzFromTable(material, D_eff) {
    const table = toolData[material].fz_table;
    const keys = Object.keys(table).map(Number).sort((a, b) => a - b);

    if (D_eff <= keys[1]) return table[keys[1]];

    for (let i = 1; i < keys.length; i++) {
        const D1 = keys[i];
        const D2 = keys[i + 1];

        if (D_eff === D1) return table[D1];

        if (D_eff > D1 && D_eff < D2) {
            const fz1 = table[D1];
            const fz2 = table[D2];
            return fz1 + (D_eff - D1) * (fz2 - fz1) / (D2 - D1);
        }
    }
    return table[keys[keys.length - 1]];
}

// =================================================================
// 4. CALCULATION LOGIC
// =================================================================

/**
 * Calculates the Z-depth required to achieve the desired chamfer width
 * (without extra depth).
 */
function calculateRequiredZ(chamfer_size, angle) {
    const radians = (angle / 2) * (PI / 180);
    return chamfer_size / Math.tan(radians);
}

/**
 * Calculates the effective diameter (D_eff) at the material's surface.
 */
function calculateDeff(chamfer_size, angle, extraZ) {
    const radians = (angle / 2) * (PI / 180);
    return 2 * chamfer_size + 2 * extraZ * Math.tan(radians);
}

/**
 * Calculates the chip thinning factor.
 * - Radiell del: mer konservativ formel
 * - Axial del: behålls
 * - Extra dämpning på mycket små faser (C < 1.2 mm)
 * - Cap sänkt till 1.55
 */
function calculateChipThinning(D_eff, chamfer_size, angle) {
    if (chamfer_size <= 0) return 1.0;

    // 1. Radiell faktor – mer konservativ än √(D/ae)
    //    Använder en dämpad version som inte rusar upp lika fort
    const radial_raw = Math.sqrt(D_eff / chamfer_size);
    const radial_factor = 1 + (radial_raw - 1) * 0.75;   // dämpar ökningen

    // 2. Axial faktor (approach angle)
    const half_angle_rad = (angle / 2) * (Math.PI / 180);
    const axial_factor = 1 / Math.cos(half_angle_rad);

    // 3. Extra dämpning på små faser (vanligaste problematiska fallet)
    let size_factor = 1.0;
    if (chamfer_size < 0.8) {
        size_factor = 0.85;          // mycket små faser
    } else if (chamfer_size < 1.3) {
        size_factor = 0.92;          // vanliga 1 mm-faser
    }

    const total_factor = radial_factor * axial_factor * size_factor;

    return Math.min(total_factor, CHIP_THINNING_MAX);
}

/**
 * Runs all calculations.
 */
function runCalculations(chamfer_size, angle, extraZ, Vc, fz_bas, z, maxRpm) {
    let isCapped = false;
    let actualVc = Vc;

    // 1. Z-depth and D_eff
    const Z_req = calculateRequiredZ(chamfer_size, angle);
    const Z_total = Z_req + extraZ;
    const D_eff = calculateDeff(chamfer_size, angle, extraZ);

	// 2. ae and chip thinning
    const ae = chamfer_size;
    const chip_thinning = calculateChipThinning(D_eff, chamfer_size, angle);

    // 3. Spindle speed (N)
    let n_calculated = (Vc * K_1000) / (PI * D_eff);
    let n = n_calculated;

    if (maxRpm > 0 && n_calculated > maxRpm) {
        n = maxRpm;
        isCapped = true;
        actualVc = (n * PI * D_eff) / K_1000;
    }

    // 4. Finish feed (fine surface finish)
    const fz_finish = fz_bas * FINISH_FACTOR;
    const Vf_finish = Math.round(n * fz_finish * z);

    // 5. Std feed (no chip thinning)
    const fz_std = fz_bas;
    const Vf_std = Math.round(n * fz_std * z);

    // 6. Prod feed (chip thinning)
    const fz_prod = fz_bas * chip_thinning;
    const Vf_prod = Math.round(n * fz_prod * z);

    return {
        D_eff: D_eff,
        Z_req: Z_req,
        Z_total: Z_total,
        ae: ae,
        chip_thinning: chip_thinning,
        n: n,
        isCapped: isCapped,
        fz_finish: fz_finish,
        Vf_finish: Vf_finish,
        fz_std: fz_std,
        Vf_std: Vf_std,
        fz_prod: fz_prod,
        Vf_prod: Vf_prod,
        actualVc: actualVc
    };
}