// =================================================================
// DRILLING DATA FOR DRILLING CALCULATOR PRO
// Denna fil innehåller all rådata för verktyg och material.
// Förändringar i beräkningar eller utseende görs i HTML-filen.
// =betala inte för någonting här.
// =================================================================


// 1. Matningsfaktor Fd - Hårdmetall (HM)
//    Detta är BASVÄRDET för matning (feed per revolution, Fn) i [mm/varv].
//    Dessa värden justeras sedan nedåt av en "Kurvjustering" (se sektion 2)
//    och av "Materialfaktorn" (se sektion 3) för att få det slutliga fz.
//
//    D: Borrdiameter i [mm].
//    5xD, 8xD, 12xD, 15xD: Matningsvärdet för respektive borrlängd i [mm/varv].
const FdTableHM_Original = [
    // D [mm], 5xD,   8xD,   12xD,  15xD
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


// 2. Kurvjusteringspunkter för HM (Diameterberoende reduktion)
//    Denna faktor används på HM-matningsvärden för att justera matningen 
//    baserat på borrdiametern (D). Detta är bra eftersom större borrar 
//    ofta har högre periferihastighet, vilket kan kräva lägre Fn.
//
//    D: Diameter där justeringen ska ske.
//    factor: Reduktionsfaktor (1.0 = ingen reduktion).
//    Exempel: Vid D=6.0 sänks matningen till 70% av basvärdet.
const curveAdjustmentPoints = [
    { D: 2.0, factor: 0.90 }, 
    { D: 3.0, factor: 0.85 }, 
    { D: 6.0, factor: 0.70 }, 
    { D: 8.0, factor: 0.65 }, 
    { D: 11.0, factor: 0.55 }, 
    { D: 13.0, factor: 0.50 }, 
    { D: 18.0, factor: 0.45 } 
];


// 3. Materialdata för Hårdmetall (HM)
//    Innehåller inställningar för olika materialgrupper vid användning av HM-borrar.
//
//    NYCKEL (t.ex. "soft_steel"): Används internt av kalkylatorn. Ändra ej.
//    name: Namn som visas i Material-dropdown i HTML-filen.
//    Fm: Materialfaktor (Matningsfaktor). Justerar matningen ytterligare. 
//        (1.0 är referensstål, Aluminium har t.ex. 1.913x högre matning).
//    Vc_safe: Skärhastighet (Vc) i [m/min]. Används för att beräkna varvtal (n).
const materialDataHM = {
    "soft_steel": { name: "Steel: Soft (< 1100 N/mm²)", Fm: 1.0, Vc_safe: 90 },
    "hard_steel": { name: "Steel: Hard (> 1100 N/mm²)", Fm: 0.9, Vc_safe: 60 },
    "toolox_44": { name: "Steel: Toolox 44 (< 50 HRC)", Fm: 0.77, Vc_safe: 25 },
    "stainless_austenitic": { name: "Stainless: Austenitic (< 850 N/mm²)", Fm: 0.9, Vc_safe: 20 },
    "hardened_steel_65": { name: "Steel: Hardened (<65 HRC)", Fm: 0.6, Vc_safe: 10 },
    "aluminium": { name: "Aluminum", Fm: 1.913, Vc_safe: 300 }
};


// 4. Materialdata för HSS (High-Speed Steel)
//    Samma struktur och förklaringar som materialDataHM, men med HSS-specifika värden.
const materialDataHSS = {
    "soft_steel": { name: "Steel: Soft (< 1100 N/mm²)", Fm: 1.0, Vc_safe: 20 },
    "hard_steel": { name: "Steel: Hard (> 1100 N/mm²)", Fm: 0.9, Vc_safe: 15 },
    "toolox_44": { name: "Steel: Toolox 44 (< 50 HRC)", Fm: 0.7, Vc_safe: 10 },
    "stainless_austenitic": { name: "Stainless: Austenitic (< 850 N/mm²)", Fm: 0.8, Vc_safe: 12 },
    "hardened_steel_65": { name: "Steel: Hardened (<65 HRC)", Fm: 0.6, Vc_safe: 5 },
    "aluminium": { name: "Aluminum", Fm: 1.4, Vc_safe: 60 }
};

// 5. Matningsfaktor Fd - HSS (High-Speed Steel)
//    Basmatningsvärden för HSS-borrar i [mm/varv].
//    OBS: Dessa värden justeras INTE av Kurvjusteringsfaktorn (sektion 2).
const FdTableHSS = [
    { D: 0.5, '5xD': 0.028, '8xD': 0.024, '12xD': 0.020, '15xD': 0.016 },
    { D: 1.0, '5xD': 0.031, '8xD': 0.027, '12xD': 0.022, '15xD': 0.018 },
    { D: 2.0, '5xD': 0.042, '8xD': 0.036, '12xD': 0.030, '15xD': 0.024 },
    { D: 2.5, '5xD': 0.049, '8xD': 0.042, '12xD': 0.035, '15xD': 0.028 },
    { D: 3.0, '5xD': 0.052, '8xD': 0.045, '12xD': 0.037, '15xD': 0.030 },
    { D: 4.0, '5xD': 0.056, '8xD': 0.048, '12xD': 0.040, '15xD': 0.032 },
    { D: 5.0, '5xD': 0.063, '8xD': 0.054, '12xD': 0.045, '15xD': 0.036 },
    { D: 6.0, '5xD': 0.105, '8xD': 0.090, '12xD': 0.075, '15xD': 0.060 },
    { D: 8.0, '5xD': 0.140, '8xD': 0.120, '12xD': 0.100, '15xD': 0.080 },
    { D: 10.0, '5xD': 0.161, '8xD': 0.138, '12xD': 0.115, '15xD': 0.092 },
    { D: 12.0, '5xD': 0.196, '8xD': 0.168, '12xD': 0.140, '15xD': 0.112 },
    { D: 14.0, '5xD': 0.217, '8xD': 0.186, '12xD': 0.155, '15xD': 0.124 },
    { D: 16.0, '5xD': 0.231, '8xD': 0.198, '12xD': 0.165, '15xD': 0.132 },
    { D: 18.0, '5xD': 0.245, '8xD': 0.210, '12xD': 0.175, '15xD': 0.140 },
    { D: 20.0, '5xD': 0.259, '8xD': 0.222, '12xD': 0.185, '15xD': 0.148 },
    { D: 22.0, '5xD': 0.266, '8xD': 0.228, '12xD': 0.190, '15xD': 0.152 },
    { D: 25.0, '5xD': 0.266, '8xD': 0.228, '12xD': 0.190, '15xD': 0.152 }
];