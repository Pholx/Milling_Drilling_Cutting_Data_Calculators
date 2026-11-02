// =================================================================
// FACE MILLING TOOL DATA
// Pure data – no DOM manipulation.
// All UI logic is in Face_Milling_Data_Calculator-Pro.html.
// =================================================================

// Default values per material group.
// vc = Cutting Speed [m/min]
// hm = Desired Chip Thickness [mm]
//
// The order of these entries determines the order in the material
// dropdown (dynamically generated in the HTML file).
const materialData = {
    'P2':  { vc: 176, hm: 0.15, name: 'Steel: Soft (< 1100 N/mm²)' },
    'M1':  { vc: 120, hm: 0.12, name: 'Stainless: Austenitic (< 850 N/mm²)' },
    'P3':  { vc: 96,  hm: 0.12, name: 'Steel: Hard (> 1100 N/mm²)' },
    'T44': { vc: 80,  hm: 0.10, name: 'Steel: Toolox 44 (< 50 HRC)' },
    'K1':  { vc: 240, hm: 0.25, name: 'Cast Iron' },
    'N1':  { vc: 800, hm: 0.30, name: 'Aluminum' }
};

// Recommended radial engagement (ae) per lead angle κ.
// Sources: ISCAR (Andrei Petrilin), Kyocera (Todd Rucker), Sandvik Coromant.
//
//   min / max  – recommended operating range for the given κ
//   default    – auto-filled value when κ is selected
//   hint       – short guidance shown under the ae field
const kappaRanges = {
    '90': {
        min: 50, max: 100, default: 95,
        hint: 'High radial engagement recommended — at least 50% to hit the strong part of the insert edge.'
    },
    '75': {
        min: 40, max: 95, default: 85,
        hint: '80–90% radial engagement recommended for stable shoulder milling.'
    },
    '45': {
        min: 30, max: 90, default: 75,
        hint: '70–80% radial engagement is optimal for chip formation and load distribution.'
    },
    '25': {
        min: 15, max: 50, default: 35,
        hint: 'High feed geometry — keep engagement low (30–40%) for best results.'
    },
    '10': {
        min: 5, max: 25, default: 15,
        hint: 'Extreme high feed — very low engagement (10–20%). Verify the insert grade supports the resulting feed rate.'
    }
};

// Recommended range for round inserts (R).
const radiusRange = {
    min: 20, max: 70, default: 60,
    hint: 'Round inserts handle variable engagement. Keep a<sub>p</sub> below R/2 for optimal chip thinning.'
};