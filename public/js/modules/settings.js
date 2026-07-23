/**
 * modules/settings.js
 * ====================
 * Einstellungs-Logik für die Workout-Kalender App.
 *
 * Zweck:
 * - Öffnet das Einstellungs-Modal beim Klick auf das ⚙️ Zahnrad
 * - Bietet Reset-Optionen für Statistik-Zähler
 * - Zeigt Bestätigungsdialog vor dem Zurücksetzen
 *
 * Exportierte Funktionen (global auf window.Settings):
 * - init()                    → void (Event-Listener registrieren)
 * - openSettings()            → void (Modal öffnen)
 * - closeSettings()           → void (Modal schließen)
 *
 * DOM-Abhängigkeiten:
 * - #settings-btn → Zahnrad-Button im Header
 *
 * Abhängigkeiten: components/modal.js, modules/stats.js
 * Genutzt von: app.js
 */

const Settings = (() => {
  // ============================
  // Private Variablen
  // ============================
  let settingsBtn = null;

  // ============================
  // Private Funktionen
  // ============================

  /**
   * Erstellt den HTML-Inhalt des Einstellungs-Modals.
   * @returns {string} HTML-String
   */
  /**
   * Erstellt den HTML-Inhalt des Einstellungs-Modals.
   * @returns {string} HTML-String
   */
  function _buildSettingsContent() {
    const t = (k) => (window.I18n ? I18n.t(k) : k);
    return `
      <div class="space-y-4">

        <!-- Statistik-Übersicht -->
        <div class="p-4 rounded-xl bg-gray-50 dark:bg-surface-dark-tertiary">
          <h4 class="text-sm font-semibold text-text-light-secondary dark:text-text-dark-secondary mb-3 uppercase tracking-wide">
            ${t('settings_stats_section')}
          </h4>
          <div class="grid grid-cols-2 gap-4">
            <div class="text-center p-3 rounded-lg bg-white dark:bg-surface-dark-secondary">
              <div id="settings-completed-count" class="text-2xl font-bold text-green-500">0</div>
              <div class="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">${t('settings_completed')}</div>
            </div>
            <div class="text-center p-3 rounded-lg bg-white dark:bg-surface-dark-secondary">
              <div id="settings-skipped-count" class="text-2xl font-bold text-yellow-500">0</div>
              <div class="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">${t('settings_skipped')}</div>
            </div>
          </div>
        </div>

        <!-- Trennlinie -->
        <hr class="border-gray-200 dark:border-gray-700">

        <!-- Löschen-Optionen -->
        <div>
          <h4 class="text-sm font-semibold text-text-light-secondary dark:text-text-dark-secondary mb-1 uppercase tracking-wide">
            ${t('settings_delete_section')}
          </h4>
          <p class="text-xs text-text-light-secondary dark:text-text-dark-secondary mb-3">
            ${t('settings_delete_desc')}
          </p>
          <div class="space-y-2">

            <!-- Abgeschlossene löschen -->
            <button id="reset-completed-btn" class="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-surface-dark-tertiary hover:bg-gray-100 dark:hover:bg-surface-dark-secondary transition-colors text-left group">
              <div>
                <span class="font-medium text-sm">${t('settings_delete_completed_title')}</span>
                <p class="text-xs text-text-light-secondary dark:text-text-dark-secondary">${t('settings_delete_completed_desc')}</p>
              </div>
              <span class="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm">${t('settings_delete_btn')}</span>
            </button>

            <!-- Übersprungene löschen -->
            <button id="reset-skipped-btn" class="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-surface-dark-tertiary hover:bg-gray-100 dark:hover:bg-surface-dark-secondary transition-colors text-left group">
              <div>
                <span class="font-medium text-sm">${t('settings_delete_skipped_title')}</span>
                <p class="text-xs text-text-light-secondary dark:text-text-dark-secondary">${t('settings_delete_skipped_desc')}</p>
              </div>
              <span class="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm">${t('settings_delete_btn')}</span>
            </button>

            <!-- Alle löschen -->
            <button id="reset-all-btn" class="w-full flex items-center justify-between p-3 rounded-xl bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 border border-red-200/50 dark:border-red-800/30 transition-colors text-left group">
              <div>
                <span class="font-medium text-sm text-red-600 dark:text-red-400">${t('settings_delete_all_title')}</span>
                <p class="text-xs text-red-400 dark:text-red-500">${t('settings_delete_all_desc')}</p>
              </div>
              <span class="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold">${t('settings_delete_btn')}</span>
            </button>

          </div>
        </div>
      </div>
    `;
  }

  /**
   * Bindet Events an die Buttons im Einstellungs-Modal.
   */
  function _bindSettingsEvents() {
    // Kurz warten bis das DOM gerendert ist
    setTimeout(() => {
      const resetCompletedBtn = document.getElementById('reset-completed-btn');
      const resetSkippedBtn = document.getElementById('reset-skipped-btn');
      const resetAllBtn = document.getElementById('reset-all-btn');

      if (resetCompletedBtn) {
        resetCompletedBtn.addEventListener('click', () => _handleReset('completed'));
      }

      if (resetSkippedBtn) {
        resetSkippedBtn.addEventListener('click', () => _handleReset('skipped'));
      }

      if (resetAllBtn) {
        resetAllBtn.addEventListener('click', () => _handleReset('all'));
      }

      // Stats-Werte laden und anzeigen
      _loadStatsIntoModal();
    }, 100);
  }

  /**
   * Lädt aktuelle Stats und zeigt sie im Modal an.
   */
  async function _loadStatsIntoModal() {
    try {
      if (window.Stats) {
        const stats = await Stats.getStats();
        const completedEl = document.getElementById('settings-completed-count');
        const skippedEl = document.getElementById('settings-skipped-count');

        if (completedEl) completedEl.textContent = stats.completedWorkouts || 0;
        if (skippedEl) skippedEl.textContent = stats.skippedWorkouts || 0;
      }
    } catch (e) {
      console.warn('[Settings] Stats konnten nicht geladen werden:', e);
    }
  }

  /**
   * Behandelt Reset-Aktionen mit Bestätigungsdialog.
   * @param {'completed' | 'skipped' | 'all'} type
   */
  async function _handleReset(type) {
    const t = (k) => (window.I18n ? I18n.t(k) : k);
    const messages = {
      completed: {
        title: t('settings_confirm_delete_completed_title'),
        message: t('settings_confirm_delete_completed_msg'),
      },
      skipped: {
        title: t('settings_confirm_delete_skipped_title'),
        message: t('settings_confirm_delete_skipped_msg'),
      },
      all: {
        title: t('settings_confirm_delete_all_title'),
        message: t('settings_confirm_delete_all_msg'),
      },
    };

    const msg = messages[type];

    // Modal schließen bevor Bestätigung kommt
    Modal.close();

    // Kurz warten, dann Bestätigungsdialog
    setTimeout(async () => {
      const confirmed = await Modal.confirm({
        title: msg.title,
        message: msg.message,
        confirmText: t('modal_confirm'),
        cancelText: t('modal_cancel'),
        danger: true,
      });

      if (confirmed) {
        // Stats zurücksetzen (löscht auch die Kalendereinträge auf dem Server)
        if (window.Stats) {
          await Stats.resetStats(type);
        }
        // Kalender und Tagesansicht neu laden
        if (window.Calendar) {
          await Calendar.refresh();
        }
        if (window.DayView) {
          await DayView.refresh();
        }
        console.log(`[Settings] ${type} Daten gelöscht.`);

        // Kurze Erfolgsmeldung, dann Einstellungen wieder öffnen
        setTimeout(() => openSettings(), 300);
      } else {
        // Einstellungen wieder öffnen
        setTimeout(() => openSettings(), 300);
      }
    }, 300);
  }

  // ============================
  // Öffentliche Funktionen
  // ============================

  /**
   * Initialisiert das Settings-Modul.
   * Registriert den Klick-Handler auf den ⚙️ Zahnrad-Button.
   */
  function init() {
    settingsBtn = document.getElementById('settings-btn');

    if (settingsBtn) {
      settingsBtn.addEventListener('click', openSettings);
    }

    console.log('[Settings] Initialisiert.');
  }

  /**
   * Öffnet das Einstellungs-Modal.
   */
  function openSettings() {
    Modal.open({
      title: window.I18n ? I18n.t('settings_title') : '⚙️ Einstellungen',
      content: _buildSettingsContent(),
      size: 'md',
    });

    _bindSettingsEvents();
  }

  /**
   * Schließt das Einstellungs-Modal.
   */
  function closeSettings() {
    Modal.close();
  }

  // ============================
  // Public API
  // ============================
  return {
    init,
    openSettings,
    closeSettings,
  };
})();

// Global verfügbar machen
window.Settings = Settings;
