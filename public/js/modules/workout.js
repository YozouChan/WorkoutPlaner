/**
 * modules/workout.js
 * ===================
 * Workout-Abschluss-Logik und Fortschritts-Tracking.
 *
 * Zweck:
 * - Prüft ob alle Übungen eines Trainingstags abgehakt sind
 * - Markiert Workout als abgeschlossen → API POST /api/calendar/complete
 * - Löst Erfolgs-GIF-Overlay aus
 * - Verwaltet Übungs-Fortschritt in localStorage
 * - Stellt Hilfsfunktionen für Fortschrittsberechnung bereit
 *
 * Exportierte Funktionen (global auf window.Workout):
 * - init()                                → void
 * - getProgress(date, phases)            → { total, checked, percent, isComplete }
 * - getCheckedExercises(date)            → object (exerciseId → boolean)
 * - saveCheckedExercises(date, checked)  → void
 * - toggleExercise(date, exerciseId, phases) → Promise<{ checked, isComplete }>
 * - completeWorkout(date)                → Promise<boolean>
 *
 * localStorage Keys:
 * - 'workout-checked-YYYY-MM-DD' → { [exerciseId]: boolean }
 *
 * Abhängigkeiten: API /api/calendar/complete, modules/stats.js, components/gif-overlay.js
 * Genutzt von: components/day-view.js, app.js
 */

const Workout = (() => {
  // ============================
  // Private Variablen
  // ============================
  let _completingInProgress = false;

  // ============================
  // Private Funktionen
  // ============================

  /**
   * Sendet die Abschluss-Meldung an den Server.
   * @param {string} date - YYYY-MM-DD
   * @returns {Promise<boolean>}
   */
  async function _postComplete(date) {
    try {
      await ApiClient.post('/api/calendar/complete', { date }, { clientOptions: { silent: true } });
      return true;
    } catch (err) {
      if (err.status === 400) {
        // Bereits abgeschlossen – kein Fehler
        return true;
      }
      console.error('[Workout] Fehler beim Abschließen:', err);
      return false;
    }
  }

  /**
   * Zeigt die Erfolgs-Sequenz: GIF-Overlay → Stats aktualisieren → Kalender aktualisieren.
   * @param {string} date
   */
  async function _runCompletionSequence(date) {
    // 1. GIF-Overlay anzeigen (Glückliches Anime-Girl)
    if (window.GifOverlay) {
      GifOverlay.showHappy();
    }

    // 2. Stats in der Sidebar aktualisieren
    if (window.Stats) {
      await Stats.init();
    }

    // 3. Kalender neu laden (Tag als abgeschlossen markieren)
    if (window.Calendar) {
      await Calendar.refresh();
    }

    console.log(`[Workout] Workout ${date} erfolgreich abgeschlossen! 🎉`);
  }

  // ============================
  // Öffentliche Funktionen
  // ============================

  /**
   * Initialisiert das Workout-Modul.
   */
  function init() {
    console.log('[Workout] Initialisiert.');
  }

  /**
   * Berechnet den Fortschritt für einen Tag.
   * @param {string} date - YYYY-MM-DD
   * @param {Array} phases - Workout-Phasen (aus /api/workout)
   * @returns {{ total: number, checked: number, percent: number, isComplete: boolean }}
   */
  function getProgress(date, phases) {
    if (!phases || !phases.length) return { total: 0, checked: 0, percent: 0, isComplete: false };

    const checkedExercises = getCheckedExercises(date);
    let total = 0;
    let checked = 0;

    for (const phase of phases) {
      for (const exercise of phase.exercises) {
        total++;
        if (checkedExercises[exercise.id]) checked++;
      }
    }

    const percent = total > 0 ? Math.round((checked / total) * 100) : 0;
    const isComplete = total > 0 && checked === total;

    return { total, checked, percent, isComplete };
  }

  /**
   * Lädt den abgehakten Zustand für ein Datum aus localStorage.
   * @param {string} date - YYYY-MM-DD
   * @returns {object} { [exerciseId]: boolean }
   */
  function getCheckedExercises(date) {
    try {
      const raw = localStorage.getItem(`workout-checked-${date}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  /**
   * Speichert den abgehakten Zustand für ein Datum in localStorage.
   * @param {string} date - YYYY-MM-DD
   * @param {object} checked - { [exerciseId]: boolean }
   */
  function saveCheckedExercises(date, checked) {
    try {
      localStorage.setItem(`workout-checked-${date}`, JSON.stringify(checked));
    } catch (err) {
      console.warn('[Workout] Checked-State konnte nicht gespeichert werden:', err);
    }
  }

  /**
   * Toggled eine einzelne Übung und prüft ob das Workout komplett ist.
   * Löst ggf. die Abschluss-Sequenz aus.
   *
   * @param {string} date - YYYY-MM-DD
   * @param {string} exerciseId - ID der Übung
   * @param {Array} phases - Workout-Phasen (für Fortschrittsberechnung)
   * @returns {Promise<{ checked: object, isComplete: boolean }>}
   */
  async function toggleExercise(date, exerciseId, phases) {
    const checked = getCheckedExercises(date);
    checked[exerciseId] = !checked[exerciseId];
    saveCheckedExercises(date, checked);

    const { isComplete } = getProgress(date, phases);

    // Wenn alle erledigt: Abschluss-Sequenz starten
    if (isComplete && !_completingInProgress) {
      _completingInProgress = true;
      const success = await completeWorkout(date);
      _completingInProgress = false;

      if (success) {
        await _runCompletionSequence(date);
      }
    }

    return { checked, isComplete };
  }

  /**
   * Markiert ein Workout als abgeschlossen auf dem Server.
   * @param {string} date - YYYY-MM-DD
   * @returns {Promise<boolean>} Erfolg
   */
  async function completeWorkout(date) {
    const success = await _postComplete(date);

    if (success) {
      console.log(`[Workout] ${date} an Server als abgeschlossen gemeldet.`);
    }

    return success;
  }

  // ============================
  // Public API
  // ============================
  return {
    init,
    getProgress,
    getCheckedExercises,
    saveCheckedExercises,
    toggleExercise,
    completeWorkout,
  };
})();

// Global verfügbar machen
window.Workout = Workout;
