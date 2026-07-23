/**
 * modules/skip.js
 * ================
 * Logik zum Überspringen von Trainingstagen.
 *
 * Zweck:
 * - Zeigt einen Dialog zur Auswahl des Grundes (Muskelkater vs. Faulheit)
 * - Sendet Skip-Anfrage an die API: POST /api/calendar/skip
 * - Zeigt das passende Anime-Girl Overlay (traurig / aufmunternd)
 * - Aktualisiert Statistiken und Kalender
 * - Verschiebt den Trainingsplan (nächster Tag wird Trainingstag)
 *
 * Exportierte Funktionen (global auf window.Skip):
 * - showSkipDialog(date) → void  (Öffnet den Auswahl-Dialog)
 * - skipDay(date, reason) → Promise<boolean>  (Führt den Skip durch)
 * - getSkipHistory() → Array<{date, reason}>  (Gibt übersprungene Tage zurück)
 *
 * Abhängigkeiten:
 * - API: POST /api/calendar/skip  (body: { date, reason })
 * - API: GET  /api/state          (zum Lesen der Skip-History)
 * - components/gif-overlay.js    (für GIF-Anzeige)
 * - components/modal.js          (für den Dialog)
 * - modules/stats.js             (Stats aktualisieren)
 * - modules/calendar.js          (Kalender neu laden)
 *
 * Genutzt von: components/day-view.js
 */

const Skip = (() => {
  // ============================
  // Private Funktionen
  // ============================

  /**
   * Baut den HTML-Inhalt des Skip-Dialogs.
   * @param {string} date - YYYY-MM-DD
   * @returns {string}
   */
  /**
   * Baut den HTML-Inhalt des Skip-Dialogs.
   * @param {string} date - YYYY-MM-DD
   * @returns {string}
   */
  function _buildDialogContent(date) {
    const t = (k) => (window.I18n ? I18n.t(k) : k);
    return `
      <div class="space-y-4">
        <p class="text-text-light-secondary dark:text-text-dark-secondary text-sm leading-relaxed">
          ${t('skip_modal_desc')}
        </p>

        <div class="space-y-3">
          <!-- Option: Auszeit/Urlaub -->
          <button
            id="skip-reason-vacation"
            data-date="${date}"
            data-reason="vacation"
            class="skip-reason-btn w-full text-left p-4 rounded-xl border-2 border-transparent
                   bg-sky-50 dark:bg-sky-900/20 hover:border-sky-400
                   transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] group"
          >
            <div class="flex items-center gap-3">
              <span class="text-3xl">🏖️</span>
              <div>
                <div class="font-semibold text-sky-700 dark:text-sky-300 group-hover:text-sky-600">
                  ${t('skip_reason_vacation_title')}
                </div>
                <div class="text-xs text-sky-600/70 dark:text-sky-400/70 mt-0.5">
                  ${t('skip_reason_vacation_desc')}
                </div>
              </div>
            </div>
          </button>

          <!-- Option: Muskelkater -->
          <button
            id="skip-reason-soreness"
            data-date="${date}"
            data-reason="soreness"
            class="skip-reason-btn w-full text-left p-4 rounded-xl border-2 border-transparent
                   bg-amber-50 dark:bg-amber-900/20 hover:border-amber-400
                   transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] group"
          >
            <div class="flex items-center gap-3">
              <span class="text-3xl">🤕</span>
              <div>
                <div class="font-semibold text-amber-700 dark:text-amber-300 group-hover:text-amber-600">
                  ${t('skip_reason_soreness_title')}
                </div>
                <div class="text-xs text-amber-600/70 dark:text-amber-400/70 mt-0.5">
                  ${t('skip_reason_soreness_desc')}
                </div>
              </div>
            </div>
          </button>

          <!-- Option: Zu heiß -->
          <button
            id="skip-reason-heat"
            data-date="${date}"
            data-reason="heat"
            class="skip-reason-btn w-full text-left p-4 rounded-xl border-2 border-transparent
                   bg-orange-50 dark:bg-orange-900/20 hover:border-orange-400
                   transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] group"
          >
            <div class="flex items-center gap-3">
              <span class="text-3xl">🥵</span>
              <div>
                <div class="font-semibold text-orange-700 dark:text-orange-300 group-hover:text-orange-600">
                  ${t('skip_reason_heat_title')}
                </div>
                <div class="text-xs text-orange-600/70 dark:text-orange-400/70 mt-0.5">
                  ${t('skip_reason_heat_desc')}
                </div>
              </div>
            </div>
          </button>

          <!-- Option: Faulheit -->
          <button
            id="skip-reason-laziness"
            data-date="${date}"
            data-reason="laziness"
            class="skip-reason-btn w-full text-left p-4 rounded-xl border-2 border-transparent
                   bg-blue-50 dark:bg-blue-900/20 hover:border-blue-400
                   transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] group"
          >
            <div class="flex items-center gap-3">
              <span class="text-3xl">😴</span>
              <div>
                <div class="font-semibold text-blue-700 dark:text-blue-300 group-hover:text-blue-600">
                  ${t('skip_reason_laziness_title')}
                </div>
                <div class="text-xs text-blue-600/70 dark:text-blue-400/70 mt-0.5">
                  ${t('skip_reason_laziness_desc')}
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Sendet die Skip-Anfrage an den Server.
   * @param {string} date - YYYY-MM-DD
   * @param {string} reason - 'soreness' | 'laziness'
   * @returns {Promise<boolean>}
   */
  async function _postSkip(date, reason) {
    try {
      await ApiClient.post('/api/calendar/skip', { date, reason }, { clientOptions: { silent: true } });
      return true;
    } catch (err) {
      if (err.status === 400) {
        console.warn('[Skip] Tag wurde bereits übersprungen.');
        return true;
      }
      console.error('[Skip] Fehler beim Überspringen:', err);
      return false;
    }
  }

  /**
   * Führt die komplette Skip-Sequenz durch nach Benutzerauswahl.
   * @param {string} date - YYYY-MM-DD
   * @param {string} reason - 'soreness' | 'laziness'
   */
  async function _runSkipSequence(date, reason) {
    // 1. Modal schließen
    if (window.Modal) {
      Modal.close();
    }

    // Kurze Pause für Animation
    await new Promise((resolve) => setTimeout(resolve, 250));

    // 2. API-Call
    const success = await _postSkip(date, reason);

    if (!success) {
      console.error('[Skip] Skip-API-Call fehlgeschlagen.');
      return;
    }

    // 3. Passendes GIF-Overlay anzeigen
    if (window.GifOverlay) {
      if (reason === 'soreness') {
        GifOverlay.showEncouraging(); // Aufmunterndes GIF für Muskelkater (Streak freeze)
      } else if (reason === 'vacation') {
        GifOverlay.showEncouraging(); // Aufmunterndes GIF für Urlaub (Streak freeze)
      } else if (reason === 'heat') {
        GifOverlay.showHot(); // Hitze-GIF für "Zu heiß"
      } else {
        GifOverlay.showSad(); // Trauriges GIF für Faulheit
      }
    }

    // 4. Stats aktualisieren
    if (window.Stats) {
      await Stats.init();
    }

    // 5. Kalender neu laden (Plan verschiebt sich)
    if (window.Calendar) {
      await Calendar.refresh();
    }

    // 6. Tagesansicht aktualisieren (zeigt "übersprungen")
    if (window.DayView) {
      await DayView.refresh();
    }

    console.log(`[Skip] Tag ${date} übersprungen (Grund: ${reason}) ✅`);
  }

  // ============================
  // Öffentliche Funktionen
  // ============================

  /**
   * Zeigt den Skip-Dialog mit Grund-Auswahl.
   * @param {string} date - YYYY-MM-DD
   */
  function showSkipDialog(date) {
    if (!window.Modal) {
      console.warn('[Skip] Modal-Komponente nicht verfügbar.');
      return;
    }

    Modal.open({
      title: window.I18n ? I18n.t('skip_modal_title') : '⏭️ Trainingstag überspringen',
      content: _buildDialogContent(date),
      size: 'sm',
    });

    // Event-Listener für die Grund-Buttons (mit leichtem Delay für DOM-Rendering)
    setTimeout(() => {
      const reasonBtns = document.querySelectorAll('.skip-reason-btn');
      reasonBtns.forEach((btn) => {
        btn.addEventListener('click', async () => {
          const btnDate = btn.getAttribute('data-date');
          const reason = btn.getAttribute('data-reason');

          // Button optisch als ausgewählt markieren
          reasonBtns.forEach((b) => b.classList.remove('border-green-400', 'scale-[1.02]'));
          btn.classList.add('border-green-400', 'opacity-75');
          btn.disabled = true;

          // Skip-Sequenz starten
          await _runSkipSequence(btnDate, reason);
        });
      });
    }, 50);
  }

  /**
   * Führt den Skip-Vorgang direkt durch (ohne Dialog).
   * @param {string} date - YYYY-MM-DD
   * @param {string} reason - 'soreness' | 'laziness'
   * @returns {Promise<boolean>}
   */
  async function skipDay(date, reason) {
    if (!['soreness', 'heat', 'laziness', 'vacation'].includes(reason)) {
      console.error('[Skip] Ungültiger Grund:', reason);
      return false;
    }
    await _runSkipSequence(date, reason);
    return true;
  }

  /**
   * Gibt die Liste der übersprungenen Tage zurück.
   * @returns {Promise<Array<{date: string, reason: string}>>}
   */
  async function getSkipHistory() {
    try {
      const state = await ApiClient.get('/api/state');
      return state.skippedDays || [];
    } catch {
      return [];
    }
  }

  // ============================
  // Public API
  // ============================
  return {
    showSkipDialog,
    skipDay,
    getSkipHistory,
  };
})();

// Global verfügbar machen
window.Skip = Skip;
