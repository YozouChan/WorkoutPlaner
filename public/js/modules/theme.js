/**
 * modules/theme.js
 * =================
 * Dark/Light Mode Toggle-Logik.
 *
 * Zweck:
 * - Schaltet zwischen Dark und Light Mode um
 * - Speichert die Präferenz in localStorage
 * - Erkennt die System-Präferenz (prefers-color-scheme)
 * - Fügt/entfernt die 'dark' CSS-Klasse auf <html>
 *
 * Exportierte Funktionen (global auf window.Theme):
 * - init()        → void (beim Seitenstart aufrufen)
 * - toggle()      → void (beim Klick auf Toggle-Button)
 * - getTheme()    → 'dark' | 'light'
 * - setTheme(t)   → void (Theme manuell setzen)
 *
 * localStorage Key: 'workout-calendar-theme'
 *
 * DOM-Abhängigkeiten:
 * - <html>           → Erhält/verliert die 'dark' Klasse
 * - #theme-toggle    → Toggle-Button im Header
 *
 * Genutzt von: app.js, index.html, editor.html
 */

const Theme = (() => {
  // ============================
  // Konstanten
  // ============================
  const STORAGE_KEY = 'workout-calendar-theme';
  const DARK = 'dark';
  const LIGHT = 'light';

  // ============================
  // Private Variablen
  // ============================
  let currentTheme = LIGHT;
  let toggleBtn = null;

  // ============================
  // Private Funktionen
  // ============================

  /**
   * Ermittelt das initiale Theme basierend auf:
   * 1. localStorage (Nutzer-Präferenz)
   * 2. System-Präferenz (prefers-color-scheme)
   * 3. Fallback: Light Mode
   * @returns {'dark' | 'light'}
   */
  function _getInitialTheme() {
    // 1. Gespeicherte Präferenz prüfen
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === DARK || saved === LIGHT) {
      return saved;
    }

    // 2. System-Präferenz prüfen
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return DARK;
    }

    // 3. Fallback
    return LIGHT;
  }

  /**
   * Wendet das Theme auf das DOM an.
   * - Setzt/entfernt die 'dark' Klasse auf <html>
   * - Aktualisiert den Toggle-Button visuell
   * @param {string} theme - 'dark' oder 'light'
   */
  function _applyTheme(theme) {
    const htmlEl = document.documentElement;

    if (theme === DARK) {
      htmlEl.classList.add(DARK);
    } else {
      htmlEl.classList.remove(DARK);
    }

    currentTheme = theme;
  }

  /**
   * Speichert die Theme-Präferenz in localStorage.
   * @param {string} theme - 'dark' oder 'light'
   */
  function _saveTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      console.warn('[Theme] localStorage nicht verfügbar:', e);
    }
  }

  /**
   * Registriert Event-Listener.
   */
  function _bindEvents() {
    // Toggle-Button Klick
    if (toggleBtn) {
      toggleBtn.addEventListener('click', toggle);
    }

    // System-Präferenz Änderung beobachten
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        // Nur anwenden, wenn der Nutzer keine eigene Präferenz gesetzt hat
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) {
          const newTheme = e.matches ? DARK : LIGHT;
          _applyTheme(newTheme);
        }
      });
    }
  }

  // ============================
  // Öffentliche Funktionen
  // ============================

  /**
   * Initialisiert das Theme-Modul.
   * Setzt das initiale Theme und registriert Events.
   */
  function init() {
    toggleBtn = document.getElementById('theme-toggle');

    // Initiales Theme ermitteln und sofort anwenden
    const initialTheme = _getInitialTheme();
    _applyTheme(initialTheme);

    _bindEvents();

    console.log(`[Theme] Initialisiert mit Theme: ${currentTheme}`);
  }

  /**
   * Schaltet zwischen Dark und Light Mode um.
   */
  function toggle() {
    const newTheme = currentTheme === DARK ? LIGHT : DARK;
    _applyTheme(newTheme);
    _saveTheme(newTheme);

    console.log(`[Theme] Gewechselt zu: ${newTheme}`);
  }

  /**
   * Gibt das aktuelle Theme zurück.
   * @returns {'dark' | 'light'}
   */
  function getTheme() {
    return currentTheme;
  }

  /**
   * Setzt das Theme manuell.
   * @param {'dark' | 'light'} theme
   */
  function setTheme(theme) {
    if (theme !== DARK && theme !== LIGHT) {
      console.warn(`[Theme] Ungültiges Theme: ${theme}`);
      return;
    }
    _applyTheme(theme);
    _saveTheme(theme);
  }

  // ============================
  // Public API
  // ============================
  return {
    init,
    toggle,
    getTheme,
    setTheme,
  };
})();

// Global verfügbar machen
window.Theme = Theme;
