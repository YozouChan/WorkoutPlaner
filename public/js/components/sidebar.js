/**
 * components/sidebar.js
 * ======================
 * Seitenleisten-Menü-Komponente.
 *
 * Zweck:
 * - Steuert die Mobile-Sidebar (öffnen/schließen via Hamburger-Menü)
 * - Verwaltet den aktiven Menüpunkt (visuell hervorgehoben)
 * - Schließt Sidebar beim Klick auf den Overlay oder einen Menüpunkt (Mobile)
 *
 * Exportierte Funktionen (global auf window.Sidebar):
 * - init()                          → void (Event-Listener registrieren)
 * - setActiveMenuItem(pageName)     → void (Menüpunkt als aktiv markieren)
 * - open()                          → void (Mobile-Sidebar öffnen)
 * - close()                         → void (Mobile-Sidebar schließen)
 * - toggle()                        → void (Mobile-Sidebar umschalten)
 *
 * DOM-Abhängigkeiten:
 * - #sidebar                → Sidebar-Element
 * - #sidebar-toggle         → Hamburger-Button (Mobile)
 * - #sidebar-overlay        → Overlay hinter Sidebar (Mobile)
 * - #sidebar-nav .sidebar-item → Menüpunkte
 *
 * CSS-Klassen: .sidebar-item, .sidebar-item.active (definiert in input.css)
 * Genutzt von: app.js
 */

const Sidebar = (() => {
  // ============================
  // Private Variablen
  // ============================
  let sidebarEl = null;
  let toggleBtn = null;
  let overlayEl = null;
  let menuItems = [];
  let isOpen = false;

  // ============================
  // Private Funktionen
  // ============================

  /**
   * Registriert alle Event-Listener für Sidebar-Interaktionen.
   */
  function _bindEvents() {
    // Hamburger-Button: Sidebar öffnen/schließen (Mobile)
    if (toggleBtn) {
      toggleBtn.addEventListener('click', toggle);
    }

    // Overlay: Sidebar schließen bei Klick außerhalb (Mobile)
    if (overlayEl) {
      overlayEl.addEventListener('click', close);
    }

    // Menüpunkte: Aktiven Zustand setzen
    menuItems.forEach((item) => {
      item.addEventListener('click', (e) => {
        const pageName = item.getAttribute('data-page');
        setActiveMenuItem(pageName);

        // Mobile: Sidebar nach Navigation schließen
        if (window.innerWidth < 1024) {
          close();
        }
      });
    });

    // Escape-Taste: Sidebar schließen (Mobile)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    });

    // Window Resize: Sidebar-State zurücksetzen
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 1024) {
        // Desktop: Sidebar immer sichtbar, Overlay verstecken
        overlayEl?.classList.add('hidden');
        isOpen = false;
      }
    });
  }

  /**
   * Aktualisiert den Hamburger-Button-Icon-Zustand.
   * @param {boolean} open - Ob die Sidebar offen ist
   */
  function _updateToggleIcon(open) {
    if (!toggleBtn) return;

    const svg = toggleBtn.querySelector('svg');
    if (!svg) return;

    if (open) {
      // X-Icon für Schließen
      svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>';
    } else {
      // Hamburger-Icon für Öffnen
      svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>';
    }
  }

  // ============================
  // Öffentliche Funktionen
  // ============================

  /**
   * Initialisiert die Sidebar-Komponente.
   * Sucht DOM-Elemente und registriert Event-Listener.
   */
  function init() {
    sidebarEl = document.getElementById('sidebar');
    toggleBtn = document.getElementById('sidebar-toggle');
    overlayEl = document.getElementById('sidebar-overlay');
    menuItems = document.querySelectorAll('#sidebar-nav .sidebar-item');

    if (!sidebarEl) {
      console.warn('[Sidebar] #sidebar Element nicht gefunden.');
      return;
    }

    _bindEvents();

    // Aktiven Menüpunkt anhand der aktuellen URL setzen
    const currentPath = window.location.pathname;
    if (currentPath === '/editor') {
      setActiveMenuItem('editor');
    } else if (currentPath === '/leaderboard') {
      setActiveMenuItem('leaderboard');
    } else {
      setActiveMenuItem('calendar');
    }

    console.log('[Sidebar] Initialisiert.');
  }

  /**
   * Setzt den aktiven Menüpunkt visuell hervor.
   * @param {string} pageName - Name der Seite ('calendar' | 'editor')
   */
  function setActiveMenuItem(pageName) {
    menuItems.forEach((item) => {
      const itemPage = item.getAttribute('data-page');

      if (itemPage === pageName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  /**
   * Öffnet die Sidebar (nur relevant auf Mobile < 1024px).
   */
  function open() {
    if (!sidebarEl) return;

    sidebarEl.classList.remove('-translate-x-full');
    sidebarEl.classList.add('translate-x-0');
    overlayEl?.classList.remove('hidden');
    isOpen = true;
    _updateToggleIcon(true);

    // Hintergrund-Scroll verhindern
    document.body.style.overflow = 'hidden';
  }

  /**
   * Schließt die Sidebar (nur relevant auf Mobile < 1024px).
   */
  function close() {
    if (!sidebarEl) return;

    sidebarEl.classList.add('-translate-x-full');
    sidebarEl.classList.remove('translate-x-0');
    overlayEl?.classList.add('hidden');
    isOpen = false;
    _updateToggleIcon(false);

    // Hintergrund-Scroll wiederherstellen
    document.body.style.overflow = '';
  }

  /**
   * Schaltet die Sidebar um (öffnen ↔ schließen).
   */
  function toggle() {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }

  // ============================
  // Public API
  // ============================
  return {
    init,
    setActiveMenuItem,
    open,
    close,
    toggle,
  };
})();

// Global verfügbar machen
window.Sidebar = Sidebar;
