/**
 * public/js/app.js
 * ================
 * Haupt-Einstiegspunkt der Frontend-Anwendung.
 *
 * Zweck:
 * - Initialisiert alle Module beim Laden der Seite
 * - Verwaltet die Seiteninitialisierung (Kalender vs. Editor)
 * - Koordiniert die Kommunikation zwischen Modulen
 * - Globale Fehlerbehandlung und Fallback-UI
 *
 * Abhängigkeiten (Module):
 * - modules/api-client.js  → HTTP-Client mit Retry/Offline-Handling
 * - modules/theme.js       → Dark/Light Mode
 * - modules/calendar.js    → Kalender-Logik
 * - modules/workout.js     → Workout-Anzeige
 * - modules/notifications.js → Benachrichtigungen
 * - modules/skip.js        → Trainingstag überspringen
 * - modules/stats.js       → Statistik-Tracking
 * - modules/settings.js    → Einstellungen
 * - modules/editor.js      → Workout-Editor
 * - modules/gifs.js        → GIF-Verwaltung
 *
 * Abhängigkeiten (Komponenten):
 * - components/sidebar.js    → Sidebar-Navigation
 * - components/calendar-bar.js → Kalenderleiste
 * - components/workout-card.js → Workout-Karten
 * - components/day-view.js    → Tagesansicht
 * - components/modal.js       → Modale Dialoge
 * - components/gif-overlay.js → GIF-Overlay
 *
 * Wird geladen in: public/pages/index.html, public/pages/editor.html
 */

// ============================
// Globale Fehlerbehandlung (Frontend)
// ============================

/**
 * Fängt uncaught JS-Fehler ab und zeigt benutzerfreundliche Meldung.
 */
window.onerror = (message, source, lineno, colno, error) => {
  console.error('[App] Uncaught Error:', message, `(${source}:${lineno}:${colno})`);

  // Nur anzeigen wenn kein Netzwerkfehler (der wird von ApiClient behandelt)
  if (window.ApiClient && !message.includes('fetch') && !message.includes('network')) {
    ApiClient.showToast('Ein unerwarteter Fehler ist aufgetreten. Bitte Seite neu laden.', 'error', 8000);
  }
  return false; // Fehler nicht unterdrücken (Konsole weiterhin anzeigen)
};

/**
 * Fängt unbehandelte Promise-Rejections ab.
 */
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  console.error('[App] Unhandled Promise Rejection:', reason);

  // Netzwerkfehler werden von ApiClient.showToast behandelt – nicht doppelt anzeigen
  if (reason?.message?.includes('Offline') || reason?.message?.includes('fetch')) return;

  if (window.ApiClient) {
    ApiClient.showToast(
      reason?.message || 'Unerwarteter Fehler. Bitte Seite neu laden.',
      'error',
      6000
    );
  }
});

// ============================
// App-Initialisierung
// ============================

document.addEventListener('DOMContentLoaded', () => {
  // ============================
  // 0. I18n (Sprache) initialisieren
  // ============================
  if (window.I18n) {
    I18n.init();
    I18n.onChange(() => {
      // Re-render UI components on language change
      const currentPath = window.location.pathname;
      if (currentPath === '/editor' && window.Editor) {
        if (typeof Editor.render === 'function') Editor.render();
        else if (typeof Editor.init === 'function') Editor.init();
      } else if (currentPath === '/leaderboard' && window.Leaderboard) {
        Leaderboard.init();
      } else {
        if (window.Calendar) {
          Calendar.refresh();
        }
        if (window.Stats) Stats.updateDisplay();
      }
      _updateBugReportButtonText();
      const u = localStorage.getItem('username');
      if (u) _initUserDisplay(u);
    });
  }

  const username = localStorage.getItem('username');
  if (!username) {
    _showLoginOverlay();
    return;
  }

  // Benutzer-Anzeige und Logout im Header initialisieren
  _initUserDisplay(username);

  console.log('[App] Workout-Kalender App wird initialisiert...');

  // ============================
  // 1. Sidebar initialisieren
  // ============================
  if (window.Sidebar) {
    Sidebar.init();
  }

  // ============================
  // 2. Theme (Dark/Light Mode) initialisieren
  // ============================
  if (window.Theme) {
    Theme.init();
  }

  // ============================
  // 3. Settings (Zahnrad-Button) initialisieren
  // ============================
  if (window.Settings) {
    Settings.init();
  }

  // ============================
  // 4. Workout-Modul initialisieren
  // ============================
  if (window.Workout) {
    Workout.init();
  }

  // Bugreport-Button initialisieren
  _initBugReportButton();

  // ============================
  // 5. Seitenspezifische Initialisierung
  // ============================
  const currentPath = window.location.pathname;

  if (currentPath === '/editor') {
    _initEditorPage();
  } else if (currentPath === '/leaderboard') {
    _initLeaderboardPage();
  } else {
    _initCalendarPage();
  }

  console.log('[App] Initialisierung abgeschlossen.');
});

/**
 * Initialisiert die Leaderboard-Seite.
 */
async function _initLeaderboardPage() {
  console.log('[App] Leaderboard-Seite wird geladen...');
  if (window.Leaderboard) {
    Leaderboard.init();
  }
}

/**
 * Initialisiert die Kalender-Seite (Startseite).
 * Lädt Kalender, Workout-Daten, Stats und Benachrichtigungen.
 */
async function _initCalendarPage() {
  console.log('[App] Kalender-Seite wird geladen...');

  try {
    // Stats laden und Sidebar-Anzeige aktualisieren
    if (window.Stats) {
      await Stats.init();
    }

    // DayView-Callback registrieren (wird bei Tagesauswahl aufgerufen)
    if (window.Calendar && window.DayView) {
      Calendar.onDaySelected((day) => {
        DayView.render(day);
      });
    }

    // Kalender laden, Kalenderleiste rendern und heutigen Tag anzeigen
    if (window.Calendar) {
      if (window.CalendarBar) {
        const fitDays = CalendarBar.calcDaysPerPage();
        Calendar.setDaysPerPage(fitDays);
      }
      await Calendar.init();
    }

    // Navigation-Events und ResizeObserver initialisieren
    if (window.CalendarBar) {
      CalendarBar.initNavigation();
    }

    // Trainingstag-Benachrichtigung prüfen
    if (window.Notifications && window.Calendar) {
      const today = Calendar.getSelectedDay();
      Notifications.init(today);
    }
  } catch (err) {
    console.error('[App] Fehler beim Laden der Kalender-Seite:', err);
    _showPageError('Kalender konnte nicht geladen werden', err.message);
  }
}

/**
 * Initialisiert die Editor-Seite.
 * Lädt den Workout-Editor mit allen Übungen.
 */
function _initEditorPage() {
  console.log('[App] Editor-Seite wird geladen...');

  try {
    if (window.Editor) {
      Editor.init();
    }
  } catch (err) {
    console.error('[App] Fehler beim Laden des Editors:', err);
    _showPageError('Editor konnte nicht geladen werden', err.message);
  }
}

/**
 * Zeigt eine benutzerfreundliche Fehler-Seite im Hauptbereich an.
 * @param {string} title - Kurze Fehlerbeschreibung
 * @param {string} detail - Technisches Detail (optional)
 */
function _showPageError(title, detail = '') {
  const container = document.getElementById('day-view') || document.getElementById('editor-content');
  if (!container) return;

  const isDev = window.location.hostname === 'localhost';
  container.innerHTML = `
    <div class="flex flex-col items-center justify-center py-20 text-center animate-fade-in-up">
      <div class="text-6xl mb-6">⚠️</div>
      <h3 class="text-xl font-bold text-red-400 mb-2">${title}</h3>
      <p class="text-text-light-secondary dark:text-text-dark-secondary mb-6 max-w-sm">
        Bitte lade die Seite neu. Falls das Problem weiter besteht, prüfe ob der Server läuft.
      </p>
      ${isDev && detail ? `
        <details class="text-xs text-gray-400 mb-4 max-w-sm text-left bg-gray-100 dark:bg-surface-dark-tertiary p-3 rounded-lg">
          <summary class="cursor-pointer font-medium mb-1">Technische Details</summary>
          <code>${detail}</code>
        </details>
      ` : ''}
      <button onclick="window.location.reload()"
              class="btn-brand px-6 py-3 text-sm">
        🔄 Seite neu laden
      </button>
    </div>
  `;
}

/**
 * Liste prägnanter Wörter für die Passphrase-Generierung.
 */
const PASSPHRASE_WORDS = [
  'sonne', 'berg', 'fluss', 'baum', 'wolke', 'vogel', 'traum', 'stern', 'licht', 'wind',
  'feuer', 'ozean', 'wald', 'insel', 'mond', 'wiese', 'welle', 'komet', 'stein', 'pfad',
  'see', 'blume', 'himmel', 'funke', 'nacht', 'schatten', 'schnee', 'regen', 'blitz', 'donner',
  'kristall', 'drache', 'tiger', 'loewe', 'falke', 'adler', 'kompass', 'anker', 'segel', 'rubin'
];

/**
 * Generiert eine zufällige Passphrase aus genau 10 Wörtern.
 * @returns {string} 10 durch Leerzeichen getrennte Wörter
 */
function _generate10WordPassphrase() {
  const pool = [...PASSPHRASE_WORDS];
  const selected = [];
  for (let i = 0; i < 10; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    selected.push(pool.splice(idx, 1)[0]);
  }
  return selected.join(' ');
}

/**
 * Initialisiert das Benutzer-Anzeige-Element und den Abmelde-Button.
 * @param {string} username
 */
function _initUserDisplay(username) {
  const userDisplay = document.getElementById('user-display');
  const usernameDisplay = document.getElementById('username-display');
  const logoutBtn = document.getElementById('logout-btn');

  if (userDisplay) {
    userDisplay.classList.remove('hidden');
    userDisplay.classList.add('flex');
  }
  if (usernameDisplay) {
    usernameDisplay.textContent = username;
  }
  if (logoutBtn) {
    if (window.I18n) {
      logoutBtn.textContent = I18n.t('header_logout');
      logoutBtn.setAttribute('title', I18n.t('header_logout_title'));
    }
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('username');
      localStorage.removeItem('passphrase');
      window.location.reload();
    });
  }
}

/**
 * Zeigt ein ganzflächiges Anmelde-Overlay an.
 */
function _showLoginOverlay() {
  // Eventuellen doppelten Overlay-Aufbau verhindern
  if (document.getElementById('login-overlay')) return;

  const t = (k, p) => (window.I18n ? I18n.t(k, p) : k);
  const defaultPassphrase = _generate10WordPassphrase();

  const loginHTML = `
    <div id="login-overlay" class="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-brand-purple/20 via-surface-light to-blue-500/20 dark:from-brand-purple/20 dark:via-surface-dark dark:to-blue-900/20 backdrop-blur-md">
      <div class="w-full max-w-lg p-8 rounded-3xl bg-white/85 dark:bg-surface-dark-secondary/85 border border-gray-200/50 dark:border-gray-700/50 shadow-2xl backdrop-blur-xl animate-fade-in-up text-center">
        <div class="text-6xl mb-4 animate-bounce">🏋️</div>
        <h2 class="text-3xl font-extrabold mb-2 text-gradient-brand bg-gradient-brand bg-clip-text text-transparent">
          ${t('login_title')}
        </h2>
        <p class="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-6">
          ${t('login_subtitle')}
        </p>
        <form id="login-form" class="space-y-4 text-left">
          <div>
            <label for="login-username" class="block text-xs font-semibold uppercase tracking-wider text-text-light-secondary dark:text-text-dark-secondary mb-1">
              ${t('login_username_label')}
            </label>
            <input
              type="text"
              id="login-username"
              name="username"
              autocomplete="username"
              required
              placeholder="${t('login_username_placeholder')}"
              pattern="[a-zA-Z0-9_-]{1,30}"
              class="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-surface-dark/60 text-text-light dark:text-text-dark focus:ring-2 focus:ring-brand-purple focus:border-transparent outline-none transition-all duration-200 text-sm font-medium"
            />
          </div>
          <div>
            <div class="flex items-center justify-between mb-1">
              <label for="login-passphrase" class="block text-xs font-semibold uppercase tracking-wider text-text-light-secondary dark:text-text-dark-secondary">
                ${t('login_passphrase_label')}
              </label>
              <button
                type="button"
                id="regen-passphrase-btn"
                class="text-xs text-brand-purple hover:underline font-semibold flex items-center gap-1"
              >
                🔄 ${t('login_regen_passphrase')}
              </button>
            </div>
            <div class="relative flex items-center">
              <input
                type="password"
                id="login-passphrase"
                name="password"
                autocomplete="current-password"
                required
                value="${defaultPassphrase}"
                placeholder="${t('login_passphrase_placeholder')}"
                class="w-full pl-4 pr-10 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-surface-dark/60 text-text-light dark:text-text-dark focus:ring-2 focus:ring-brand-purple focus:border-transparent outline-none transition-all duration-200 text-xs font-mono"
              />
              <button
                type="button"
                id="toggle-passphrase-btn"
                title="Passwort anzeigen / verbergen"
                class="absolute right-3 p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none text-sm transition-colors"
              >
                👁️
              </button>
            </div>
            <p class="text-[11px] text-text-light-secondary dark:text-text-dark-secondary mt-1">
              ℹ️ ${t('login_help')}
            </p>
          </div>
          <button
            type="submit"
            class="w-full py-3.5 px-6 rounded-xl font-semibold text-white bg-gradient-brand hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-lg hover:shadow-purple-500/30 text-sm mt-2"
          >
            ${t('login_button')}
          </button>
        </form>
        <div id="login-error" class="mt-4 text-sm font-medium text-red-500 hidden"></div>
      </div>
    </div>
  `;

  // Overlay an den Body anhängen
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = loginHTML;
  const overlayEl = tempDiv.firstElementChild;
  document.body.appendChild(overlayEl);

  // Event-Listener
  const form = document.getElementById('login-form');
  const userInput = document.getElementById('login-username');
  const passInput = document.getElementById('login-passphrase');
  const regenBtn = document.getElementById('regen-passphrase-btn');
  const toggleBtn = document.getElementById('toggle-passphrase-btn');
  const errorDiv = document.getElementById('login-error');

  if (toggleBtn && passInput) {
    toggleBtn.addEventListener('click', () => {
      const isPassword = passInput.type === 'password';
      passInput.type = isPassword ? 'text' : 'password';
      toggleBtn.textContent = isPassword ? '🙈' : '👁️';
    });
  }

  if (regenBtn && passInput) {
    regenBtn.addEventListener('click', () => {
      passInput.value = _generate10WordPassphrase();
    });
  }

  if (form && userInput && passInput && errorDiv) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = userInput.value.trim();
      const passphrase = passInput.value.trim();
      if (!username || !passphrase) return;

      const words = passphrase.split(/\s+/).filter(Boolean);
      if (words.length !== 10) {
        errorDiv.textContent = t('login_err_passphrase', { count: words.length });
        errorDiv.classList.remove('hidden');
        return;
      }

      try {
        errorDiv.classList.add('hidden');
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, passphrase }),
        });

        const data = await response.json();
        if (response.ok && data.success) {
          localStorage.setItem('username', data.username);
          localStorage.setItem('passphrase', data.passphrase);
          document.body.removeChild(overlayEl);
          window.location.reload();
        } else {
          errorDiv.textContent = data.message || 'Login failed';
          errorDiv.classList.remove('hidden');
        }
      } catch (err) {
        errorDiv.textContent = err.message || 'Error logging in';
        errorDiv.classList.remove('hidden');
      }
    });
  }
}

/**
 * Initialisiert den Bugreport-Button und Modal-Handler.
 */
function _initBugReportButton() {
  const bugBtn = document.getElementById('bugreport-btn');
  if (bugBtn) {
    bugBtn.addEventListener('click', _openBugReportModal);
  }
  _updateBugReportButtonText();
}

/**
 * Aktualisiert den Text des Bugreport-Buttons basierend auf der aktuellen Sprache.
 */
function _updateBugReportButtonText() {
  const bugBtn = document.getElementById('bugreport-btn');
  if (!bugBtn) return;
  const label = bugBtn.querySelector('span:not(.text-base)');
  if (label && window.I18n) {
    label.textContent = I18n.t('bug_report_btn');
  }
  if (window.I18n) {
    bugBtn.setAttribute('title', I18n.t('bug_report_btn'));
  }
}

/**
 * Öffnet den Modal-Dialog für den Bugreport.
 */
function _openBugReportModal() {
  if (!window.Modal) {
    if (window.ApiClient) {
      ApiClient.showToast('Modal component unavailable.', 'error');
    }
    return;
  }

  const t = (k) => (window.I18n ? I18n.t(k) : k);

  Modal.open({
    title: t('bug_report_title'),
    content: `
      <form id="bugreport-form" onsubmit="_submitBugReport(event)" class="space-y-4">
        <p class="text-xs text-text-light-secondary dark:text-text-dark-secondary">
          ${t('bug_report_desc')}
        </p>
        <div>
          <textarea
            id="bugreport-description"
            rows="4"
            required
            placeholder="${t('bug_report_placeholder')}"
            class="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark focus:ring-2 focus:ring-brand-purple focus:border-transparent outline-none transition-all duration-200 text-xs resize-none"
          ></textarea>
        </div>
        <div id="bugreport-error" class="text-xs font-medium text-red-500 hidden"></div>
        <div class="flex items-center justify-end gap-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/30">
          <button
            type="button"
            onclick="Modal.close()"
            class="px-4 py-2 rounded-xl text-xs font-semibold text-text-light-secondary dark:text-text-dark-secondary hover:bg-gray-100 dark:hover:bg-surface-dark-tertiary transition-all duration-200"
          >
            ${t('modal_cancel')}
          </button>
          <button
            type="submit"
            id="bugreport-submit-btn"
            class="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-brand hover:scale-105 active:scale-95 transition-all duration-200 shadow-md"
          >
            📤 ${t('bug_report_send')}
          </button>
        </div>
      </form>
    `,
  });
}

/**
 * Verarbeitet das Absenden des Bugreports.
 * @param {Event} event
 */
async function _submitBugReport(event) {
  if (event) event.preventDefault();

  const textarea = document.getElementById('bugreport-description');
  const errorEl = document.getElementById('bugreport-error');
  const submitBtn = document.getElementById('bugreport-submit-btn');

  const description = textarea ? textarea.value.trim() : '';
  if (!description) {
    if (errorEl) {
      errorEl.textContent = 'Bitte gib eine Fehlerbeschreibung ein.';
      errorEl.classList.remove('hidden');
    }
    return;
  }

  try {
    if (errorEl) errorEl.classList.add('hidden');
    if (submitBtn) submitBtn.disabled = true;

    const res = await ApiClient.post('/api/bugreport', {
      description,
      pageUrl: window.location.href,
    });

    if (window.Modal) {
      Modal.close();
    }

    if (window.ApiClient) {
      ApiClient.showToast(res.message || 'Bugreport gespeichert!', 'success', 4000);
    }
  } catch (err) {
    if (errorEl) {
      errorEl.textContent = err.message || 'Fehler beim Senden des Berichts.';
      errorEl.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}
window._submitBugReport = _submitBugReport;
