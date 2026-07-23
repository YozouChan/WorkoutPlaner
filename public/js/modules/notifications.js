/**
 * modules/notifications.js
 * =========================
 * Browser- & In-App-Benachrichtigungen für Trainingstage.
 *
 * Zweck:
 * - Prüft beim App-Start ob heute ein Trainingstag ist
 * - Sendet eine Browser-Push-Notification (mit Permission-Request)
 * - Zeigt einen In-App-Banner am oberen Rand
 * - Speichert ob die Notification für heute bereits gezeigt wurde
 *
 * Exportierte Funktionen (global auf window.Notifications):
 * - init(dayData)              → void (beim Start aufrufen)
 * - requestPermission()        → Promise<string> ('granted'|'denied'|'default')
 * - showBanner(message, type)  → void (In-App-Banner anzeigen)
 * - hideBanner()               → void
 *
 * localStorage Keys:
 * - 'workout-notif-shown-DATE' → ob Notification für Datum schon gezeigt
 *
 * DOM-Abhängigkeiten:
 * - #notification-banner → Container für In-App-Banner
 *
 * Genutzt von: app.js (_initCalendarPage)
 */

const Notifications = (() => {
  // ============================
  // Konstanten
  // ============================
  const NOTIF_TITLE = '🏋️ WorkoutPlaner';
  const TRAINING_MSG = 'Heute ist Trainingstag! Bist du bereit? 💪';
  const BANNER_DURATION_MS = 6000; // Auto-Close nach 6 Sekunden

  // ============================
  // Private Variablen
  // ============================
  let _bannerEl = null;
  let _autoCloseTimer = null;

  // ============================
  // Private Funktionen
  // ============================

  /**
   * Prüft ob die Benachrichtigung für heute bereits gezeigt wurde.
   * @param {string} dateStr - YYYY-MM-DD
   * @returns {boolean}
   */
  function _wasShownToday(dateStr) {
    try {
      return localStorage.getItem(`workout-notif-shown-${dateStr}`) === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Markiert die Benachrichtigung für heute als gezeigt.
   * @param {string} dateStr - YYYY-MM-DD
   */
  function _markAsShown(dateStr) {
    try {
      localStorage.setItem(`workout-notif-shown-${dateStr}`, 'true');
    } catch {
      // localStorage nicht verfügbar – ignorieren
    }
  }

  /**
   * Sendet eine Browser-Push-Notification wenn Berechtigung vorhanden.
   * @param {string} body - Nachrichtentext
   */
  function _sendBrowserNotification(body) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const notifTitle = window.I18n ? I18n.t('notif_title') : NOTIF_TITLE;
    try {
      new Notification(notifTitle, {
        body,
        icon: '/assets/icon-192.png',
        badge: '/assets/icon-72.png',
        tag: 'training-day',
        renotify: false,
      });
    } catch (err) {
      console.warn('[Notifications] Browser-Notification fehlgeschlagen:', err);
    }
  }

  /**
   * Rendert das In-App-Banner HTML.
   * @param {string} message - Nachrichtentext
   * @param {'training'|'rest'|'info'|'success'} type - Banner-Typ
   * @returns {string}
   */
  function _buildBannerHTML(message, type) {
    const configs = {
      training: {
        icon: '💪',
        gradient: 'from-brand-pink via-brand-purple to-brand-blue',
        textColor: 'text-white',
        btnColor: 'bg-white/20 hover:bg-white/30 text-white',
      },
      rest: {
        icon: '😴',
        gradient: 'from-slate-500 to-slate-600',
        textColor: 'text-white',
        btnColor: 'bg-white/20 hover:bg-white/30 text-white',
      },
      success: {
        icon: '🎉',
        gradient: 'from-green-500 to-emerald-600',
        textColor: 'text-white',
        btnColor: 'bg-white/20 hover:bg-white/30 text-white',
      },
      info: {
        icon: 'ℹ️',
        gradient: 'from-blue-500 to-blue-600',
        textColor: 'text-white',
        btnColor: 'bg-white/20 hover:bg-white/30 text-white',
      },
    };

    const cfg = configs[type] || configs.info;

    return `
      <div
        id="notification-banner-inner"
        class="flex items-center justify-between gap-3 px-5 py-3 rounded-2xl shadow-xl bg-gradient-to-r ${cfg.gradient} ${cfg.textColor} animate-bounce-in backdrop-blur-sm max-w-xl w-full"
        role="alert"
      >
        <div class="flex items-center gap-3">
          <span class="text-2xl flex-shrink-0">${cfg.icon}</span>
          <p class="text-sm font-semibold leading-snug">${message}</p>
        </div>
        <button
          id="banner-close-btn"
          class="${cfg.btnColor} flex-shrink-0 p-1.5 rounded-lg transition-colors"
          title="Schließen"
          aria-label="Benachrichtigung schließen"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `;
  }

  // ============================
  // Öffentliche Funktionen
  // ============================

  /**
   * Initialisiert das Notifications-Modul für den gegebenen Tag.
   * Zeigt Banner und/oder Browser-Notification wenn Trainingstag.
   *
   * @param {object} dayData - DayData-Objekt aus Calendar.getSelectedDay()
   */
  async function init(dayData) {
    if (!dayData) return;
    _bannerEl = document.getElementById('notification-banner');

    // Nur für den heutigen Tag benachrichtigen
    if (!dayData.isToday) return;

    // Nur Trainingstage benachrichtigen (nicht wenn übersprungen/abgeschlossen)
    if (!dayData.isTraining || dayData.isSkipped) return;

    // Heute bereits gezeigt?
    if (_wasShownToday(dayData.date)) return;

    // Kurz warten damit die App erst vollständig geladen ist
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // In-App-Banner anzeigen
    const trainingMsg = window.I18n ? I18n.t('notif_training_msg') : TRAINING_MSG;
    showBanner(trainingMsg, 'training');

    // Browser-Notification versuchen (nur wenn bereits erlaubt)
    if (Notification.permission === 'granted') {
      _sendBrowserNotification(trainingMsg);
    } else if (Notification.permission === 'default') {
      // Berechtigung erst nach einer Nutzer-Interaktion anfragen
      // (wird beim ersten Klick auf den Banner angefragt)
      const bannerInner = document.getElementById('notification-banner-inner');
      if (bannerInner) {
        bannerInner.style.cursor = 'pointer';
        bannerInner.addEventListener('click', async (e) => {
          if (e.target.closest('#banner-close-btn')) return;
          const permission = await requestPermission();
          if (permission === 'granted') {
            _sendBrowserNotification(trainingMsg);
          }
        }, { once: true });
      }
    }

    // Als gezeigt markieren
    _markAsShown(dayData.date);

    console.log(`[Notifications] Trainingstag-Benachrichtigung gezeigt für ${dayData.date}`);
  }

  /**
   * Fragt die Berechtigung für Browser-Notifications an.
   * @returns {Promise<'granted'|'denied'|'default'>}
   */
  async function requestPermission() {
    if (!('Notification' in window)) {
      console.warn('[Notifications] Browser-Notifications werden nicht unterstützt.');
      return 'denied';
    }

    if (Notification.permission === 'granted') return 'granted';

    try {
      const permission = await Notification.requestPermission();
      console.log(`[Notifications] Berechtigung: ${permission}`);
      return permission;
    } catch (err) {
      console.warn('[Notifications] Berechtigung konnte nicht angefragt werden:', err);
      return 'denied';
    }
  }

  /**
   * Zeigt einen In-App-Banner an.
   * @param {string} message - Nachrichtentext
   * @param {'training'|'rest'|'info'|'success'} type - Banner-Typ
   */
  function showBanner(message, type = 'info') {
    _bannerEl = document.getElementById('notification-banner');
    if (!_bannerEl) return;

    // Evtl. laufenden Auto-Close-Timer stoppen
    if (_autoCloseTimer) {
      clearTimeout(_autoCloseTimer);
      _autoCloseTimer = null;
    }

    _bannerEl.innerHTML = _buildBannerHTML(message, type);
    _bannerEl.classList.remove('hidden');

    // Schließen-Button Event
    const closeBtn = document.getElementById('banner-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', hideBanner);
    }

    // Auto-Close
    _autoCloseTimer = setTimeout(hideBanner, BANNER_DURATION_MS);
  }

  /**
   * Blendet den In-App-Banner aus.
   */
  function hideBanner() {
    _bannerEl = document.getElementById('notification-banner');
    if (!_bannerEl) return;

    // Fade-out
    const inner = document.getElementById('notification-banner-inner');
    if (inner) {
      inner.style.opacity = '0';
      inner.style.transform = 'translateY(-8px)';
      inner.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out';
    }

    setTimeout(() => {
      if (_bannerEl) {
        _bannerEl.classList.add('hidden');
        _bannerEl.innerHTML = '';
      }
    }, 220);

    if (_autoCloseTimer) {
      clearTimeout(_autoCloseTimer);
      _autoCloseTimer = null;
    }
  }

  // ============================
  // Public API
  // ============================
  return {
    init,
    requestPermission,
    showBanner,
    hideBanner,
  };
})();

// Global verfügbar machen
window.Notifications = Notifications;
