/**
 * modules/leaderboard.js
 * =====================
 * Modul zur Steuerung und Anzeige der globalen Leaderboards.
 *
 * Zweck:
 * - Lädt die Bestenlisten vom API-Endpunkt /api/leaderboard
 * - Rendert das Streak-Leaderboard (Qualifikation ab Streak >= 3)
 * - Rendert das Gesamt-Workouts Leaderboard
 * - Hebt das eigene Benutzerprofil mit ⭐ und Akzentfarbe hervor
 *
 * Exportiert auf window.Leaderboard:
 * - init() → void
 * - loadAndRender() → Promise<void>
 */

const LeaderboardModule = (() => {
  // DOM-Elemente
  let summaryEl = null;
  let streakTbody = null;
  let completedTbody = null;

  /**
   * Erzeugt das Rank-Badge / Icon für die Plätze 1, 2, 3 oder den Rang-Text.
   * @param {number} rank
   * @returns {string} HTML-String
   */
  function _formatRank(rank) {
    if (rank === 1) {
      return '<span class="text-base sm:text-lg" title="1. Platz">🥇</span>';
    }
    if (rank === 2) {
      return '<span class="text-base sm:text-lg" title="2. Platz">🥈</span>';
    }
    if (rank === 3) {
      return '<span class="text-base sm:text-lg" title="3. Platz">🥉</span>';
    }
    return `<span class="font-semibold text-text-light-secondary dark:text-text-dark-secondary">#${rank}</span>`;
  }

  /**
   * Rendert die Zusammenfassungs-Karte für den aktuellen Nutzer.
   * @param {Object} currentUser
   */
  /**
   * Rendert die Zusammenfassungs-Karte für den aktuellen Nutzer.
   * @param {Object} currentUser
   */
  function _renderSummary(currentUser) {
    if (!summaryEl || !currentUser) return;
    const t = (k, p) => (window.I18n ? I18n.t(k, p) : k);
    const isEn = window.I18n && I18n.getLanguage() === 'en';

    const streakRankText = currentUser.streakRank
      ? `<span class="text-brand-purple font-bold">#${currentUser.streakRank}</span>`
      : `<span class="text-gray-400 font-normal">${isEn ? `Not ranked (Streak ${currentUser.streak}/3)` : `Nicht qualifiziert (Streak ${currentUser.streak}/3)`}</span>`;

    const completedRankText = currentUser.completedRank
      ? `<span class="text-brand-purple font-bold">#${currentUser.completedRank}</span>`
      : `<span class="text-gray-400 font-normal">${isEn ? `No rank (${currentUser.completedWorkouts} Workouts)` : `Kein Platz (${currentUser.completedWorkouts} Workouts)`}</span>`;

    summaryEl.innerHTML = `
      <div class="card-glass p-6 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-brand-purple/10 border border-brand-purple/20">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-brand-purple/20 flex items-center justify-between p-3 text-2xl">
              ⭐
            </div>
            <div>
              <h3 class="text-lg font-bold flex items-center gap-2">
                <span>${isEn ? `Hello, ${currentUser.username || 'Athlete'}!` : `Hallo, ${currentUser.username || 'Sportler'}!`}</span>
                <span class="text-xs px-2 py-0.5 rounded-full bg-brand-purple text-white font-semibold">${t('lb_you')}</span>
              </h3>
              <p class="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-0.5">
                ${isEn ? 'Here is your current rank in the community leaderboards.' : 'Hier ist deine aktuelle Platzierung in den Community-Bestenlisten.'}
              </p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 text-center md:text-right border-t md:border-t-0 border-gray-200/50 dark:border-gray-700/30 pt-3 md:pt-0">
            <div class="p-2.5 rounded-xl bg-white/40 dark:bg-surface-dark-tertiary/40">
              <span class="block text-xs text-text-light-secondary dark:text-text-dark-secondary">${t('lb_summary_streak_rank')}</span>
              <span class="text-sm font-semibold">${streakRankText}</span>
            </div>
            <div class="p-2.5 rounded-xl bg-white/40 dark:bg-surface-dark-tertiary/40">
              <span class="block text-xs text-text-light-secondary dark:text-text-dark-secondary">${t('lb_summary_workout_rank')}</span>
              <span class="text-sm font-semibold">${completedRankText}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Rendert eine Leaderboard-Tabelle.
   * @param {HTMLElement} tbodyEl
   * @param {Array} list
   * @param {string} scoreLabel
   * @param {string} scoreKey
   * @param {string} emptyMessage
   */
  function _renderTable(tbodyEl, list, scoreLabel, scoreKey, emptyMessage) {
    if (!tbodyEl) return;
    const t = (k) => (window.I18n ? I18n.t(k) : k);

    if (!list || list.length === 0) {
      tbodyEl.innerHTML = `
        <tr>
          <td colspan="3" class="py-6 text-center text-xs text-text-light-secondary dark:text-text-dark-secondary italic">
            ${emptyMessage}
          </td>
        </tr>
      `;
      return;
    }

    tbodyEl.innerHTML = list
      .map((entry) => {
        const isSelf = entry.isSelf;
        const rowClass = isSelf
          ? 'bg-brand-purple/15 dark:bg-brand-purple/20 font-semibold border-l-4 border-brand-purple text-text-light dark:text-text-dark'
          : 'border-b border-gray-200/50 dark:border-gray-700/30 hover:bg-gray-50/50 dark:hover:bg-surface-dark-tertiary/30 transition-colors';

        const userDisplay = isSelf
          ? `<span class="flex items-center gap-1.5 font-bold text-brand-purple dark:text-purple-300">
               <span>⭐</span>
               <span>${entry.username}</span>
               <span class="text-[10px] px-1.5 py-0.5 rounded bg-brand-purple/20 text-brand-purple dark:text-purple-300 ml-1">${t('lb_you')}</span>
             </span>`
          : `<span class="font-medium">${entry.username}</span>`;

        return `
          <tr class="${rowClass}">
            <td class="py-3 px-3 text-center">${_formatRank(entry.rank)}</td>
            <td class="py-3 px-3">${userDisplay}</td>
            <td class="py-3 px-3 text-right font-bold">${entry[scoreKey]} ${scoreLabel}</td>
          </tr>
        `;
      })
      .join('');
  }

  /**
   * Lädt die Daten vom Server und aktualisiert das UI.
   */
  async function loadAndRender() {
    try {
      const data = await ApiClient.get('/api/leaderboard');
      if (!data) return;

      const t = (k) => (window.I18n ? I18n.t(k) : k);
      const isEn = window.I18n && I18n.getLanguage() === 'en';

      _renderSummary(data.currentUser);

      _renderTable(
        streakTbody,
        data.streakLeaderboard,
        isEn ? 'Days' : 'Tage',
        'streak',
        t('lb_empty_streak')
      );

      _renderTable(
        completedTbody,
        data.completedLeaderboard,
        'Workouts',
        'completedWorkouts',
        t('lb_empty_workout')
      );

      console.log('[Leaderboard] Daten erfolgreich gerendert.');
    } catch (err) {
      console.error('[Leaderboard] Fehler beim Laden:', err.message);
    }
  }

  /**
   * Initialisiert das Leaderboard-Modul.
   */
  function init() {
    summaryEl = document.getElementById('leaderboard-summary');
    streakTbody = document.getElementById('streak-tbody');
    completedTbody = document.getElementById('completed-tbody');

    if (!streakTbody || !completedTbody) {
      console.warn('[Leaderboard] Tabellen-Elemente nicht gefunden.');
      return;
    }

    loadAndRender();
    console.log('[Leaderboard] Modul initialisiert.');
  }

  return {
    init,
    loadAndRender,
  };
})();

// Global verfügbar machen
window.Leaderboard = LeaderboardModule;
