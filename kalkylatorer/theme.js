/**
 * theme.js
 * Huvudskript för Cutting Data PRO. Hanterar:
 *  1. Tema (ljust/mörkt) – sätts på <html> för att undvika FOUC.
 *  2. Service Worker-registrering (PWA) – körs på alla sidor.
 *
 * Användning: <script src="theme.js"></script> eller
 *             <script src="kalkylatorer/theme.js"></script>
 *             i slutet av <body>.
 * Kräver: <button id="themeToggle"> i HTML (valfritt).
 *
 * Sätt DEBUG = true för att se loggning i webbläsarkonsolen.
 * console.error visas alltid (oavsett DEBUG) för att underlätta felsökning.
 */
(function () {
    'use strict';

    // =============================================================
    // 0. SPARA EGEN SÖKVÄG
    // document.currentScript är bara satt UNDER själva skript-
    // exekveringen. När vi senare (i en DOMContentLoaded-callback)
    // behöver veta var theme.js ligger, är den redan nollställd.
    // Därför fångar vi src:en här, direkt.
    // =============================================================
    const SELF_SRC = (document.currentScript && document.currentScript.src) || '';

    const DEBUG = false;

    // Logghjälpare – håller konsolen ren i produktion
    const log  = (...args) => { if (DEBUG) console.log('[App]', ...args); };
    const warn = (...args) => { if (DEBUG) console.warn('[App]', ...args); };

    // =============================================================
    // 1. TEMA-HANTERING
    // =============================================================
    const STORAGE_KEY = 'theme';
    const DARK_CLASS = 'dark';

    /**
     * Läser in sparat tema eller faller tillbaka på systemets preferens.
     * @returns {'dark'|'light'}
     */
    function getPreferredTheme() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved === 'dark' || saved === 'light') return saved;
        } catch (e) { /* localStorage kan vara blockerat */ }
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    /**
     * Applicerar tema på <html>.
     * @param {'dark'|'light'} theme
     */
    function applyTheme(theme) {
        document.documentElement.classList.toggle(DARK_CLASS, theme === 'dark');
    }

    /**
     * Uppdaterar ikonen på temaknappen.
     */
    function updateIcon() {
        const toggle = document.getElementById('themeToggle');
        if (!toggle) return;
        toggle.textContent = document.documentElement.classList.contains(DARK_CLASS) ? '☀️' : '🌙';
    }

    /**
     * Växlar mellan ljust och mörkt tema och sparar valet.
     */
    function toggleTheme() {
        const isDark = document.documentElement.classList.toggle(DARK_CLASS);
        try {
            localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
        } catch (e) { /* ignorera */ }
        updateIcon();
    }

    /**
     * Kopplar klickhändelse till temaknappen (om den finns).
     */
    function wireToggleButton() {
        const toggle = document.getElementById('themeToggle');
        if (!toggle || toggle.dataset.themeWired === 'true') return;
        toggle.dataset.themeWired = 'true';
        toggle.addEventListener('click', toggleTheme);
    }

    /**
     * Initierar tema vid sidladdning.
     */
    function initTheme() {
        applyTheme(getPreferredTheme());
        updateIcon();
        wireToggleButton();
    }

    // =============================================================
    // 2. SERVICE WORKER-REGISTRERING (PWA)
    // =============================================================
    /**
     * Registrerar service workern. Sökvägen beräknas utifrån
     * SELF_SRC (theme.js placering), så den fungerar oavsett om
     * sidan ligger i roten eller i kalkylatorer/.
     */
    function registerServiceWorker() {
        if (!('serviceWorker' in navigator)) return;

        if (!SELF_SRC) {
            warn('Kan inte bestämma SW-sökväg – hoppar över registrering.');
            return;
        }

        // theme.js ligger i kalkylatorer/, SW ligger i appens rot.
        const swUrl = new URL('../service-worker.js', SELF_SRC).href;

        navigator.serviceWorker.register(swUrl)
            .then(registration => {
                log('ServiceWorker registrerad. Scope:', registration.scope);
            })
            .catch(error => {
                // Fel visas alltid – användaren bör veta om offline-stödet inte fungerar
                console.error('[App] ServiceWorker-registrering misslyckades:', error);
            });
    }

    // =============================================================
    // 3. INITIERING
    // =============================================================
    function init() {
        initTheme();
        registerServiceWorker();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();