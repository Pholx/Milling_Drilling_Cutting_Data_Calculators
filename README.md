# Cutting Data PRO

A web-based cutting data calculator for metal machining. The app works as a PWA (Progressive Web App), can be installed on mobile, tablet and desktop – and works fully offline after the first visit.

## Calculators

| Calculator | Description |
|------------|-------------|
| **Face Milling** | Face milling with kappa angle or round inserts. Chip thinning-based fz calculation. |
| **Drilling** | Drilling with HM/HSS, diameter-dependent feed (Fd), L/D correction, coolant method and pecking recommendation. |
| **Reaming** | Reaming with HM/HSS, through-tool coolant, auto-recommended tooth count and pre-drill allowance (1-40 mm). |
| **Dynamic Milling** | Dynamic/trochoidal milling with ramping, roughing/standard tools and flute-adjusted radial engagement. |
| **Chamfer** | Chamfer milling based on effective diameter (D_eff), chip thinning and finish/std/prod feeds. |
| **T-Slot Milling** | T-slot milling with full slotting or side milling, HM/HSS/indexable tools and L/D correction. |
| **Slitting Cutter** | Slitting with HSS saw blades, solid carbide saws or indexable insert cutters. RCTF chip thinning and L/D correction. |

## Usage

Open the app: **https://pholx.github.io/Milling_Drilling_Cutting_Data_Calculators/**

### Install as app

- **Android (Chrome):** Menu (⋮) → Add to Home screen
- **iPhone/iPad (Safari):** Share icon → Add to Home Screen
- **Desktop (Chrome/Edge):** Click the install icon in the address bar

After the first visit, the app works fully offline.

## How each calculator works

This section explains what each calculator takes into account, how the equations work, and why the result is what it is.

### Common principles

All calculators share the same core equations:

    N  = (Vc × 1000) / (π × D)      Spindle speed [rpm]
    Vf = N × fz × z                  Feed rate [mm/min]

Where:
- **Vc** = cutting speed [m/min] – determined by material and tool type
- **D** = tool diameter [mm]
- **fz** = feed per tooth [mm/z] – determined by tool, diameter, and material
- **z** = number of teeth / flutes

All calculators use **conservative values** calibrated against the lower half of recommended ranges from leading manufacturers (Sandvik Coromant, Kennametal, Iscar, Tungaloy, Erasteel, Hoffmann Group, ZPS, APT, Cutwel, etc.). This ensures stable, allround-friendly cutting – not maximum productivity.

**Safety margins** are applied in two steps:
1. A **table lookup factor** (0.90–0.95) applied when reading the raw fz table
2. A **runtime safety factor** (0.85–0.90) applied to the final fz

For HM tools the combined reduction is ~23%, for HSS ~15%. This keeps every value in the safe lower half of the recommended range.

---

### Face Milling

**Takes into account:** Material group, cutter diameter, number of inserts, insert geometry (fixed rake angle κ or round inserts), radial engagement ae, desired chip thickness hm, machine max RPM.

**Core idea:** The user specifies the desired chip thickness (hm), and the calculator works out the feed per tooth needed to achieve it.

**Equations:**

    K  = sin(κ) × √(ae/D)            Chip thinning factor (kappa inserts)
    K  = √(ap/R × (2 − ap/R)) × √(ae/D)   Chip thinning factor (round inserts)
    fz = hm / K                       Feed per tooth
    Vf = fz × Z × n                   Feed rate

**Why:** When the radial engagement ae is smaller than the cutter diameter (which is almost always the case in face milling), the chip becomes thinner than the feed per tooth. The chip thinning factor K compensates for this – a lower ae gives a thinner chip, so fz must be increased to maintain the desired hm. For round inserts, the effective lead angle is derived from ap and R instead of a fixed κ.

**Result:** Low ae → thin chip → higher fz allowed. High ae → thicker chip → lower fz. The result is a feed rate that produces the desired chip thickness regardless of engagement.

---

### Drilling

**Takes into account:** Tool material (HM/HSS), workpiece material, drill length (L/D), coolant method, drill diameter, machine max RPM.

**Core idea:** Drilling uses a **feed per revolution (Fn)**, not feed per tooth. The feed is adjusted by a diameter factor Fd (larger drills take more feed) and a material factor Fm (machinability).

**Equations:**

    Fd_base  = interpolated from table based on diameter
    Fd       = Fd_base × coolantFd         (HM only)
    Fn       = Fm × Fd                     Feed per revolution [mm/rev]
    Vc_eff   = Vc_safe × lengthFactor × coolantVc
    n        = (Vc_eff × 1000) / (π × D)
    Vf       = Fn × n                      Feed rate [mm/min]

**Why:**
- **Fd (diameter factor)** captures that larger drills need more feed per revolution. Values are interpolated from a table calibrated for allround carbide and HSS drills.
- **Curve adjustment** (HM only) reduces Fd for larger drills, because carbide is more brittle and needs a gentler entry.
- **Length factor** reduces Vc for longer drills (5xD → 100%, 8xD → 85%, 12xD → 70%, 15xD → 60%) to prevent deflection and vibration.
- **Coolant factor** (HM only) reduces both Vc and Fd when drilling without through-coolant channels – chip evacuation becomes critical at higher L/D.
- **Fm (material factor)** accounts for machinability differences between materials.

**Pecking recommendation:** For HSS and for HM without through-coolant, the calculator recommends a peck depth range based on material and L/D. With through-coolant HM, pecking is unnecessary ("Through") because chips are continuously evacuated.

**Result:** A safe combination of spindle speed and feed rate, with the correct Fd factor for the diameter and the correct Vc reduction for the drill length and cooling method.

---

### Reaming

**Takes into account:** Tool material (HM/HSS), workpiece material, internal coolant (yes/no), reamer diameter, number of teeth, machine max RPM.

**Core idea:** Reaming is a finishing operation. Cutting speeds are significantly lower than for drilling (about 50% for HSS, higher for carbide). The calculator also recommends the pre-drill hole size and the reaming allowance.

**Equations:**

    Vc_eff   = Vc_base × coolantVcFactor × vcSafety
    n        = (Vc_eff × 1000) / (π × D)
    fz_eff   = fz_base × fzSafety × coolantFzFactor
    fn       = fz_eff × z                  Feed per revolution [mm/rev]
    Vf       = n × fn

**Why:**
- **Vc values** are calibrated against Clarkson-Osborn, Sandvik, Tungaloy, Hoffmann and Cutwel for allround reamers.
- **Coolant bonus** (internal coolant): ×1.10 on Vc, ×1.05 on fz. Internal coolant improves chip evacuation and allows slightly higher values.
- **Safety factors** (HM: 0.85, HSS: 0.90) keep values conservative.
- **fz per tooth** is interpolated from a diameter-based table and adjusted by the number of teeth.

**Pre-drill allowance:** Based on Sandvik Coromant guidelines, the calculator recommends a pre-drill hole range (min–max) so the reamer removes the correct amount of material. Too little allowance causes rubbing and wear; too much causes chatter.

**Aluminum warning:** When aluminum is selected, an extra note is shown recommending high cutting speed, generous feed and kerosene or high-pressure coolant to prevent built-up edge (BUE) in the first millimeters of the hole.

**Result:** Spindle speed, feed rate, pre-drill hole range and reaming allowance – all in one view.

---

### Dynamic Milling (Trochoidal)

**Takes into account:** Material, cutter diameter, tool type (standard/roughing), number of flutes, radial engagement ae, ramping angle, machine max RPM.

**Core idea:** Dynamic milling uses low radial engagement (often 5–15% of D) with high feed rates. Chip thinning compensation is essential. The calculator also provides separate feeds for roughing, finishing and helical ramping.

**Equations:**

    ChipThinning = √(D / ae)               (applies when ae < 50% of D)
    fz_adj       = fz_base × toolFactor × fluteFactor
    fz_korr      = fz_adj × ChipThinning
    hm           = fz_korr × √(ae/D)       Effective chip thickness
    Vf_normal    = n × fz_korr × z
    Vf_ramp      = Vf_normal / rampFactor

**Why:**
- **Chip thinning**: low ae → thin chip → higher fz needed to keep the cut efficient (and to avoid rubbing).
- **Tool type factor**: roughing (corncob) end mills can take 38% higher chip load and run 15% faster because the serrated edges break the chip.
- **Flute factor**: fewer flutes → higher fz per tooth (each tooth has more room). More flutes → lower fz.
- **Flute-corrected ae**: the calculator adjusts the recommended radial engagement based on flute count. More flutes require lower engagement to keep heat and cutting forces in check.
- **Ramp feed factor**: ramping at a steeper angle requires a lower feed to keep the tool load reasonable.

**Result:** Four feed rates (roughing, finishing, ramp, plus spindle speed) so the user can plan a complete trochoidal operation.

---

### Chamfer

**Takes into account:** Material, tool included angle (θ), desired chamfer width, extra Z depth, cutting speed, base fz, number of flutes, machine max RPM.

**Core idea:** The calculator uses the **effective diameter at engagement (D_eff)** – the largest diameter of the tool actually in contact with the material – instead of the tool's nominal tip diameter (which is assumed to be pointed, D_tip = 0).

**Equations:**

    Z_req    = chamfer_size / tan(θ/2)      Z-depth for the chamfer width
    Z_total  = Z_req + extra_Z              Total Z-depth
    D_eff    = 2 × Z_total × tan(θ/2)       Effective diameter at surface
    ae       = chamfer_size                 Radial engagement
    ChipThinning = min(√(D_eff / ae), 2.0)  Chip thinning factor
    Vf_finish = n × fz_bas × 0.6 × z
    Vf_std    = n × fz_bas × z
    Vf_prod   = n × fz_bas × ChipThinning × z

**Why:**
- **D_eff matters** because a 90° pointed tool engaged 1 mm into the material has an effective diameter of 2 mm at the surface, not 10 mm or 20 mm like a catalog diameter. Chip thinning and spindle speed must be based on the real cutting diameter.
- **Extra Z depth** increases D_eff → higher chip thinning factor → higher feed allowed.
- **Three feed rates** are provided: a conservative "finish" feed (60% of base), a standard feed for internal work, and a productive "prod" feed that uses chip thinning compensation for external chamfers.

**Result:** A targeted cutting speed and three feed rates for different finish requirements, all based on the actual engagement geometry rather than the tool's nominal size.

---

### T-Slot Milling

**Takes into account:** Mode (full slotting or side milling), tool type (HSS, solid carbide, indexable insert), cutter diameter, material, radial engagement (side milling only), tool overhang, cutting speed, base fz, number of flutes, machine max RPM.

**Core idea:** Two completely different cutting situations share the same tool:
- **Full Slotting (ae = 100%)**: the tool is buried in the material, chip evacuation is critical, fz is reduced by 20%, and no chip thinning applies.
- **Side Milling (ae 5–30%)**: the tool cuts on the side, chip thinning applies, and higher feed per tooth is allowed.

**Equations:**

    Side milling:
      factor(ae) = √(0.15 × 0.85) / √(r × (1 − r))    RCTF normalized to ae=15%
      fz_eff     = fz_base × toolFactor × fzCorrection × safety × ChipThinning

    Full slotting:
      fz_eff     = fz_base × toolFactor × fzCorrection × safety × 0.80

**Why:**
- **Tool type factor**: HSS, solid carbide and indexable insert cutters have different fz tables because they use different feed strategies (indexable with few inserts → high fz per tooth).
- **L/D correction**: overhang >2.5×D reduces Vc and fz. Full slotting uses a milder correction than side milling because the tool is already at full engagement.
- **Full slot factor (0.80)**: 20% reduction to manage chip evacuation and heat in the closed slot.
- **Chip thinning (side milling)**: same principle as face milling. Low ae gives a thinner chip, so fz must be increased.

**Result:** Two different cutting strategies depending on whether the user is cutting a slot or taking a side cut. The tool badge (HM/HSS) updates automatically.

---

### Slitting Cutter

**Takes into account:** Tool type (HSS saw, solid carbide saw, indexable insert cutter), cutter diameter, material, radial engagement ae, tool overhang, cutting speed, base fz, number of teeth, machine max RPM.

**Core idea:** Slitting cutters run at low radial engagement (5–30% of D), which makes chip thinning important. Three tool types share the same equation but use different Vc and fz tables because they have very different tooth counts and tooth geometries.

**Equations:**

    ChipThinning = √(0.15 × 0.85) / √(r × (1 − r))    RCTF normalized to ae=15%
    fz_eff       = fz_base × fzCorrection × safety × ChipThinning
    hm           = fz_eff × sin(κ_eff)                 Effective chip thickness
    Vf           = N × fz_eff × z

**Why:**
- **HSS saw blades** have many teeth (32–180), low fz per tooth, and run at lower cutting speeds.
- **Solid carbide saws** have many teeth (32–100) and run at higher cutting speeds – sharper, harder, and more brittle.
- **Indexable insert cutters** have few inserts (4–12) and much higher fz per tooth because each tooth does more work.
- **RCTF chip thinning**: the same non-linear factor as T-slot side milling. The effect is strongest at low ae – going from 15% to 10% engagement gives a larger feed increase than going from 25% to 20%.
- **L/D correction**: long overhang (thin blade + long reach) is especially critical for slitting – the blade deflects easily, so Vc and fz drop sharply above L/D = 2.5.

**Result:** Tool-specific Vc and fz that respect the physical realities of each slitting tool type, with chip thinning, L/D correction and safety margins applied.

---

## Technical structure

    .
    |-- index.html                     Start page with calculator list
    |-- manifest.json                  PWA configuration
    |-- service-worker.js              Offline caching (cache-first)
    |-- icon-*.png                     App icons (72-512 px)
    |-- README.md                      This file
    |-- kalkylatorer/
        |-- style.css                  Shared styling (light/dark theme)
        |-- theme.js                   Theme switching + SW registration
        |-- *_Data_Calculator-Pro.html Calculator HTML + UI logic
        |-- *_tool_data.js             Data and calculation logic

### Architecture

- **theme.js** handles light/dark theme (stored in localStorage) and registers the service worker. The theme is applied to the html element before the page is rendered to avoid FOUC (flash of unstyled content).
- **service-worker.js** uses a cache-first strategy with network fallback. All resources are cached on the first visit and served offline thereafter.
- **Each calculator** is a standalone HTML file with its own UI logic. All data and calculation functions live in a separate tool_data.js file. The HTML file handles the DOM, the tool_data file handles the math – no DOM manipulation happens in the data files.

### Cutting data principles

- **Conservative values** – all Vc and fz values are calibrated against the lower half of recommended ranges from leading manufacturers (Sandvik Coromant, Kennametal, Iscar, Tungaloy, Erasteel, Hoffmann Group, ZPS, APT, Cutwel, etc.).
- **Safety margins** – most calculators apply multiple safety factors (table factor + runtime safety factor) to ensure stable and safe cutting for allround tools.
- **Chip thinning** – where relevant (face milling, side milling, chamfer, slitting) compensation is applied for thinner chips at low radial engagement, with a cap to prevent unreasonable values.
- **L/D correction** – longer overhang reduces Vc and fz to avoid deflection and vibration.

## Maintenance

### Update the cache

When you change any file in the cache list (or update the app files) – bump CACHE_NAME in service-worker.js:

    const CACHE_NAME = 'cutting-data-pro-cache-v1.45.20';

This ensures that the users' cached version is cleared and replaced.

### Debug mode

Set DEBUG = true in theme.js and service-worker.js to see logging in the browser console:

- DevTools → Application → Service Workers
- DevTools → Console

### Adding a new calculator

1. Create NyKalkylator_Data_Calculator-Pro.html in kalkylatorer/
2. Create NyKalkylator_tool_data.js in kalkylatorer/
3. Add both files to urlsToCache in service-worker.js
4. Add a new a-tag with class="calc-item" in index.html
5. Bump CACHE_NAME

## Created by

Jimmy Rauhala