// =================================================================
// KONSTANTER
// Definierar standardvärden för olika materialgrupper
// =================================================================
const materialData = {
    'P2': { vc: 176, hm: 0.15, name: 'Steel: Soft (< 1100 N/mm²)' },
    'M1': { vc: 120, hm: 0.12, name: 'Stainless: Austenitic (< 850 N/mm²)' },
    'P3': { vc: 96,  hm: 0.12, name: 'Steel: Hard (> 1100 N/mm²)' },
    'T44':{ vc: 80,  hm: 0.10, name: 'Steel: Toolox 44 (< 50 HRC)' },
    'K1': { vc: 240, hm: 0.25, name: 'Gjutjärn (Cast Iron)' },
    'N1': { vc:1200, hm: 0.30, name: 'Aluminum' }
};

// Lista över alla Input-ID:n för att enkelt lägga till event-lyssnare
const inputIds = ['vc','hm','D','Z','ap','n_max','kappa','R'];

// =================================================================
// FUNKTIONER FÖR ATT HANTERA INPUT OCH UI
// =================================================================

/** Laddar standard Vc och hm baserat på valt material. */
function loadMaterialData() {
    const sel = document.getElementById('material_group').value;
    document.getElementById('vc').value = materialData[sel].vc;
    document.getElementById('hm').value = materialData[sel].hm;
    calculate();
}

/** Hanterar växling mellan Kappa-vinkel och Rund skär-geometri. */
function toggleGeometry(event) {
    const target = event ? event.target : document.querySelector('.geo-btn.active');
    
    const btns = document.querySelectorAll('.geo-btn');
    btns.forEach(b => b.classList.remove('active'));
    if (target) target.classList.add('active');
    
    const type = target ? target.dataset.geo : 'kappa'; 
    document.getElementById('kappa-input').style.display = type === 'kappa' ? 'block' : 'none';
    document.getElementById('radius-input').style.display = type === 'radius' ? 'block' : 'none';
    
    calculate();
}

// =================================================================
// HUVUDBERÄKNINGSFUNKTION
// =================================================================

function calculate() {
    const results = document.getElementById('results');
    results.classList.remove('ready');

    // 1. Hämta inmatade värden
    const vc = parseFloat(document.getElementById('vc').value) || 0;
    const hm = parseFloat(document.getElementById('hm').value) || 0;
    const D  = parseFloat(document.getElementById('D').value)  || 0;
    const Z  = parseInt(document.getElementById('Z').value)   || 0;
    const ap = parseFloat(document.getElementById('ap').value) || 0;
    const n_max = parseFloat(document.getElementById('n_max').value) || Infinity;
    const geoType = document.querySelector('.geo-btn.active').dataset.geo;

    // Återställ varningar
    document.getElementById('ap-note').textContent = '';
    document.getElementById('radius-warning').textContent = '';
    
    // Validering
    if (!vc || !hm || !D || !Z || D <= 0 || Z <= 0) {
        results.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:20px 0;">Fill in all fields with valid numbers</p>';
        return;
    }

    // 2. Beräkna spindelhastighet (n) - Teoretisk & Maximerad
    let n_theoretical = (vc * 1000) / (Math.PI * D); // n = (Vc * 1000) / (pi * D)
    let n = n_theoretical;
    let capped = false;
    if (n > n_max) { n = n_max; capped = true; }

    // 3. Beräkna matning per tand (fz) med chip thinning-korrigering
    let fz = 0;
    let ae_reco_string; // Dynamisk rekommendation för ae

    if (geoType === 'kappa') {
        const kappa_deg = parseFloat(document.getElementById('kappa').value);
        const kappa_rad = kappa_deg * Math.PI / 180;
        fz = hm / Math.sin(kappa_rad); // fz = hm / sin(kappa)
        
        // Dynamisk ae-rekommendation baserat på Kappa-vinkel
        switch (kappa_deg) {
            case 90: ae_reco_string = '90–100 %'; break; 
            case 75: ae_reco_string = '80–90 %'; break;
            case 45: ae_reco_string = '70–80 %'; break; 
            case 25: ae_reco_string = '30–40 %'; break; 
            case 10: ae_reco_string = '10–20 %'; break; 
            default: ae_reco_string = '60–70 %'; 
        }

    } else if (geoType === 'radius') {
        const R = parseFloat(document.getElementById('R').value) || 0;
        ae_reco_string = '60–70 %'; 

        // Runda skär logik
        if (!R || R <= 0 || !ap) {
            fz = hm;
            document.getElementById('radius-warning').textContent = 'Enter R and ap.';
        } else if (ap > R) {
             fz = hm; 
             document.getElementById('radius-warning').textContent = 'Warning: ap > R → No chip thinning. Consider a lower ap.';
        } else {
            const ratio = ap / R;
            
            if (ratio > 0.5) {
                document.getElementById('radius-warning').textContent = 
                    'Note: ap > 50% av R → Reduced chip thinning efficiency (max ap recommended: 0.4–0.5 * R)';
            }
            
            // Korrekt formel för runda skär: sin(κ_eff) = sqrt( ap / R * (2 - ap/R) )
            const sin_kappa_eff = Math.sqrt(ratio * (2 - ratio));
            fz = hm / sin_kappa_eff;
        }
    }

    // 4. Slutresultat
    const vf = Math.round(fz * Z * n); // Vf = fz * Z * n
    const n_display_formatted = Math.round(n).toLocaleString('sv'); 

    // 5. Visa resultat i HTML
    results.classList.add('ready');
    results.innerHTML = `
        <h2>Cutting Data – Milling</h2>
        
        <div class="result-line"><strong>Spindle Speed [rpm]:</strong> <span class="value ${capped?'capped':''}">${n_display_formatted} ${capped?'*':''}</span></div>
        <div class="result-line"><strong>Feed [mm/min]:</strong> <span class="value">${vf.toLocaleString('sv')}</span></div>
        
        <div class="details-box">
            <p>
                <span class="detail-label">Vc:</span>
                <span class="detail-value">${vc.toFixed(0)} m/min</span>
            </p>
            
            <p>
                <span class="detail-label">fz:</span>
                <span class="detail-value">${fz.toFixed(2)} mm/tooth</span>
            </p>
            
            <p>
                <span class="detail-label">ae:</span>
                <span class="detail-value">${ae_reco_string}</span>
            </p>

            ${capped ? '<p class="warning-text" style="color: var(--danger); margin: 8px 0;">* Spindle speed is capped by Max-RPM</p>' : ''}
        </div>
    `;
}

// =================================================================
// EVENT-LYSSNARE
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Material och diameter uppdaterar standardvärden
    document.getElementById('material_group').addEventListener('change', loadMaterialData);
    
    // 2. Geometriväxlare
    document.querySelectorAll('.geo-btn').forEach(btn => btn.addEventListener('click', toggleGeometry));

    // 3. Övriga inputfält triggar en beräkning direkt vid ändring
    inputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', calculate);
    });
    document.getElementById('kappa').addEventListener('change', calculate); 

    // 4. Tema-växling (Dark Mode)
    const toggle = document.getElementById('themeToggle');
    const updateThemeIcon = () => {
        toggle.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
    };

    toggle.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        updateThemeIcon();
    });
    // Kontrollera systemtema vid laddning
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.classList.add('dark');
    }
    updateThemeIcon();

    // 5. Starta kalkylatorn vid laddning
    loadMaterialData();
    toggleGeometry(null); 
});