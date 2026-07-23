/**
 * modules/stats.js
 * =================
 * Statistik-Tracking für Workout-Fortschritt.
 *
 * Zweck:
 * - Lädt abgeschlossene/übersprungene Workout-Zähler vom Server
 * - Berechnet Streak (aufeinanderfolgende Trainingstage ohne Skip)
 * - Berechnet Erfolgsquote (completed / (completed + skipped))
 * - Aktualisiert die Statistik-Anzeige in Sidebar und Header-Banner
 * - Bietet Reset-Funktionalität (einzeln oder alle)
 *
 * Exportierte Funktionen (global auf window.Stats):
 * - init()              → Promise<void>  (Laden + Display)
 * - getStats()          → Promise<{completedWorkouts, skippedWorkouts}>
 * - getStreak()         → Promise<number>  (Aktuelle Tages-Streak)
 * - resetStats(type)    → Promise<void>
 *   type: 'completed' | 'skipped' | 'all'
 * - updateDisplay()     → Promise<void>  (Alle Anzeige-Elemente aktualisieren)
 *
 * DOM-Elemente (optional, kein Fehler wenn fehlend):
 * - #stats-completed          → Sidebar: Abgeschlossene Workouts
 * - #stats-skipped            → Sidebar: Übersprungene Workouts
 * - #header-stats-completed   → Header-Banner: Abgeschlossene Workouts
 * - #header-stats-skipped     → Header-Banner: Übersprungene Workouts
 * - #header-stats-streak      → Header-Banner: Streak-Tage
 * - #header-stats-progress    → Header-Banner: Erfolgsquote
 *
 * Abhängigkeiten: API /api/stats, /api/stats/reset, /api/state
 * Genutzt von: modules/workout.js, modules/skip.js, modules/settings.js, app.js
 */

const Stats = (() => {
  // ============================
  // Private Variablen
  // ============================
  let _stats = { completedWorkouts: 0, skippedWorkouts: 0 };
  let _streak = 0;

  // Meilensteine: [Tage, Emoji, Titel, Untertitel]
  const MILESTONES = [
    [3, '🌱', '3 Tage am Stück!', 'Du hast deinen ersten kleinen Streak! Weiter so!'],
    [7, '⭐', 'Eine ganze Woche!', 'Eine Woche durchgehalten – das ist beeindruckend!'],
    [14, '🔥', '2 Wochen Streak!', 'Du bist eine Kraftmaschine! Kein Aufhalten mehr!'],
    [21, '🏅', '21 Tage – Gewohnheit!', 'Wissenschaft sagt: 21 Tage = neue Gewohnheit. Du hast es!'],
    [30, '🥇', 'Ein ganzer Monat!', '30 Tage Streak! Du bist absolut unaufhaltsam!'],
    [50, '🏆', '50 Tage Legend!', 'Legendenstatus erreicht! 50 Tage am Stück!'],
    [100, '👑', '100 Tage Grandmaster!', 'Du bist ein absoluter Grandmaster! 100 Tage!'],
  ];

  const MILESTONE_KEY = 'streak-last-milestone';

  // ============================
  // Private Hilfsfunktionen
  // ============================

  /**
   * Formatiert ein Date-Objekt als YYYY-MM-DD in der lokalen Zeitzone.
   * @param {Date} d
   * @returns {string} YYYY-MM-DD
   */
  function _toLocalDateString(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }


  /**
   * Prüft ob ein Streak-Meilenstein erreicht wurde und zeigt ggf. ein Overlay.
   * @param {number} streak - Aktuelle Streak
   */
  function _checkAndShowMilestone(streak) {
    if (streak <= 0) return;

    const lastMilestone = parseInt(localStorage.getItem(MILESTONE_KEY)) || 0;

    // Höchsten fälligen Meilenstein finden
    const due = MILESTONES.filter(([days]) => days <= streak && days > lastMilestone);
    if (due.length === 0) return;

    const [days, emoji, title, subtitle] = due[due.length - 1];

    // Meilenstein als gesehen markieren
    localStorage.setItem(MILESTONE_KEY, days);

    // Konfetti-Overlay rendern
    const container = document.getElementById('modal-container');
    if (!container) return;

    container.innerHTML = `
      <div
        id="milestone-overlay"
        class="fixed inset-0 z-[9999] flex items-center justify-center p-6"
        style="background: rgba(0,0,0,0.75); backdrop-filter: blur(8px);"
      >
        <div
          class="relative z-10 max-w-sm w-full text-center animate-bounce-in"
          style="background: linear-gradient(135deg, #f59e0b22, #ec489922);
                 border: 1px solid #f59e0b55;
                 border-radius: 24px;
                 padding: 2.5rem;
                 backdrop-filter: blur(16px);"
        >
          <div class="text-8xl mb-4 animate-bounce">${emoji}</div>
          <div class="inline-block px-3 py-1 rounded-full text-xs font-bold mb-3"
               style="background: linear-gradient(135deg, #f59e0b, #ec4899); color: white;">
            🔥 ${days}-Tage-Meilenstein!
          </div>
          <h2 class="text-2xl font-extrabold text-white mb-2">${title}</h2>
          <p class="text-white/80 text-sm mb-6 leading-relaxed">${subtitle}</p>
          <button
            id="milestone-close-btn"
            class="px-6 py-3 rounded-full text-white font-semibold text-sm transition-all duration-200 hover:scale-105 active:scale-95"
            style="background: linear-gradient(135deg, #f59e0b, #ec4899);"
          >
            Weiter geht's! 💪
          </button>
          <p class="text-white/40 text-xs mt-3">Du rockst absolut!</p>
        </div>
      </div>
    `;

    // Konfetti starten (nutzt GifOverlay intern)
    document.body.style.overflow = 'hidden';

    const closeBtn = document.getElementById('milestone-close-btn');
    const overlay = document.getElementById('milestone-overlay');

    const closeMilestone = () => {
      if (overlay) {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.3s ease-out';
        setTimeout(() => {
          container.innerHTML = '';
          document.body.style.overflow = '';
        }, 300);
      }
    };

    if (closeBtn) closeBtn.addEventListener('click', closeMilestone);
    if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) closeMilestone(); });

    // Auto-close nach 8 Sekunden
    setTimeout(closeMilestone, 8000);

    console.log(`[Stats] 🎉 Meilenstein erreicht: ${days} Tage Streak!`);
  }

  /**
   * Berechnet die aktuelle Streak (aufeinanderfolgende abgeschlossene Trainingstage).
   * Liest den State vom Server und zählt wie viele Tage in Folge (rückwärts von heute)
   * abgeschlossen wurden, ohne Unterbrechung durch einen übersprungenen oder
   * ausgelassenen Trainingstag.
   * @returns {Promise<number>}
   */
  async function _calculateStreak() {
    try {
      const state = await ApiClient.get('/api/state');

      const completedDays = new Set(state.completedDays || []);
      const skippedDaysMap = {};
      for (const s of (state.skippedDays || [])) {
        skippedDaysMap[s.date] = s.reason;
      }

      // Rückwärts von gestern aus zählen (heute könnte noch laufen)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let streak = 0;
      let dayOffset = 0;

      // Auch heute zählen falls schon abgeschlossen
      const todayStr = _toLocalDateString(today);
      if (completedDays.has(todayStr)) {
        streak = 1;
        dayOffset = 1;
      }

      // Rückwärts iterieren
      for (let i = dayOffset; i < 90; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = _toLocalDateString(date);

        if (completedDays.has(dateStr)) {
          streak++;
        } else if (skippedDaysMap[dateStr] !== undefined) {
          const reason = skippedDaysMap[dateStr];
          if (reason === 'vacation' || reason === 'soreness') {
            // Freeze: Streak bricht nicht ab, dieser Tag zählt aber nicht als Training
            continue;
          } else {
            // laziness, heat → Streak bricht ab
            break;
          }
        }
        // Pausentag (kein Training erwartet) → Streak läuft weiter
      }

      return streak;
    } catch {
      return 0;
    }
  }

  /**
   * Berechnet die Erfolgsquote in Prozent.
   * @param {number} completed
   * @param {number} skipped
   * @returns {number} 0-100
   */
  function _calculateSuccessRate(completed, skipped) {
    const total = completed + skipped;
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  }

  /**
   * Setzt den Text eines DOM-Elements, falls vorhanden.
   * @param {string} id
   * @param {string} text
   */
  function _setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  /**
   * Animiert eine Zahl (Count-up Effekt).
   * @param {string} id - Element-ID
   * @param {number} targetValue
   * @param {string} [suffix=''] - z.B. ' Tage' oder '%'
   */
  function _animateNumber(id, targetValue, suffix = '') {
    const el = document.getElementById(id);
    if (!el) return;

    const currentValue = parseInt(el.textContent) || 0;
    if (currentValue === targetValue) return;

    const duration = 600;
    const steps = 20;
    const stepTime = duration / steps;
    const stepValue = (targetValue - currentValue) / steps;

    let current = currentValue;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current += stepValue;

      if (step >= steps) {
        clearInterval(timer);
        el.textContent = targetValue + suffix;
      } else {
        el.textContent = Math.round(current) + suffix;
      }
    }, stepTime);
  }

  // ============================
  // Öffentliche Funktionen
  // ============================

  /**
   * Lädt die aktuellen Stats vom Server.
   * @returns {Promise<{completedWorkouts: number, skippedWorkouts: number}>}
   */
  async function getStats() {
    try {
      _stats = await ApiClient.get('/api/stats');
      return _stats;
    } catch (err) {
      console.error('[Stats] Fehler beim Laden der Stats:', err);
      return _stats;
    }
  }

  /**
   * Gibt die aktuelle Streak zurück (gecacht aus letztem init/updateDisplay).
   * @returns {number}
   */
  function getStreak() {
    return _streak;
  }

  /**
   * Setzt Statistik-Zähler zurück.
   * @param {'completed' | 'skipped' | 'all'} type
   */
  async function resetStats(type) {
    try {
      const data = await ApiClient.post('/api/stats/reset', { type });
      _stats = data.stats;
      await updateDisplay();
      console.log(`[Stats] ${type} zurückgesetzt.`);
    } catch (err) {
      console.error('[Stats] Fehler beim Zurücksetzen:', err);
    }
  }

  /**
   * Aktualisiert alle Statistik-Anzeige-Elemente (Sidebar + Header-Banner).
   * Berechnet Streak und Erfolgsquote und animiert die Zahlen.
   */
  async function updateDisplay() {
    // Stats laden falls nötig
    if (_stats.completedWorkouts === undefined) {
      await getStats();
    }

    // Streak berechnen
    _streak = await _calculateStreak();

    // Rekord-Streak aus State laden
    let recordStreak = 0;
    try {
      const state = await ApiClient.get('/api/state');
      recordStreak = state.streak?.record || 0;
      // Falls die berechnete Streak höher ist als der gespeicherte Record, nehmen wir den berechneten
      if (_streak > recordStreak) recordStreak = _streak;
    } catch { /* ignorieren */ }

    // Meilenstein prüfen
    _checkAndShowMilestone(_streak);

    const completed = _stats.completedWorkouts || 0;
    const skipped = _stats.skippedWorkouts || 0;
    const successRate = _calculateSuccessRate(completed, skipped);

    const t = (k, p) => (window.I18n ? I18n.t(k, p) : k);

    // ── Sidebar ──
    _setText('stats-completed', completed);
    _setText('stats-skipped', skipped);

    // ── Header-Banner (mit Animation) ──
    _animateNumber('header-stats-completed', completed);
    _animateNumber('header-stats-skipped', skipped);
    _animateNumber('header-stats-streak', _streak, '');
    _setText('header-stats-progress', t('stats_progress', { n: successRate }));

    // Rekord-Streak anzeigen (falls Element existiert)
    _setText('header-stats-record', recordStreak > 0 ? t('stats_record', { n: recordStreak }) : '');

    // Streak-Emoji-Boost bei hoher Streak
    const streakEl = document.getElementById('header-stats-streak');
    if (streakEl && _streak >= 7) {
      streakEl.closest?.('div')?.classList.add('ring-2', 'ring-orange-400', 'ring-offset-1');
    }
  }

  /**
   * Initialisiert das Stats-Modul.
   * Lädt Stats und aktualisiert alle Anzeige-Elemente.
   */
  async function init() {
    await getStats();
    await updateDisplay();
    console.log('[Stats] Initialisiert.', _stats, 'Streak:', _streak);
  }

  // ============================
  // Public API
  // ============================
  return {
    init,
    getStats,
    getStreak,
    resetStats,
    updateDisplay,
  };
})();

// Global verfügbar machen
window.Stats = Stats;
