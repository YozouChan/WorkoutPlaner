/**
 * components/day-view.js
 * =======================
 * Tagesansicht: Zeigt den Inhalt eines ausgewählten Tages.
 *
 * Zweck:
 * - Trainingstag: Zeigt den Workout-Plan mit allen Übungen als Karten
 * - Pausentag: Zeigt "Heute ist Ruhetag 😴" Nachricht
 * - Übersprungener Tag: Info über den Skip
 * - Abgeschlossener Tag: Erfolgsanzeige
 * - Enthält den "Trainingstag überspringen" Button
 * - Zeigt Fortschrittsanzeige (X von Y Übungen erledigt)
 *
 * Exportierte Funktionen (global auf window.DayView):
 * - render(dayData)   → void (Tagesansicht rendern)
 * - refresh()         → void (Aktuelle Ansicht neu laden)
 *
 * DOM-Abhängigkeiten:
 * - #day-view → Container für die Tagesansicht
 *
 * Abhängigkeiten: modules/calendar.js, modules/workout.js
 * Genutzt von: app.js (Kalender-Seite)
 */

const DayView = (() => {
  // ============================
  // Private Variablen
  // ============================
  let containerEl = null;
  let _currentDay = null;
  let _workoutData = null;
  let _checkedExercises = {};

  // ============================
  // Private Funktionen
  // ============================

  /**
   * Lädt die Workout-Daten vom Server.
   */
  async function _loadWorkoutData() {
    try {
      _workoutData = await ApiClient.get('/api/workout');
    } catch (err) {
      console.error('[DayView] Fehler beim Laden der Workout-Daten:', err);
    }
  }

  /**
   * Lädt den Abhak-Status via Workout-Modul.
   */
  function _loadCheckedState() {
    if (window.Workout) {
      _checkedExercises = Workout.getCheckedExercises(_currentDay.date);
    } else {
      try {
        const raw = localStorage.getItem(`workout-checked-${_currentDay.date}`);
        _checkedExercises = raw ? JSON.parse(raw) : {};
      } catch { _checkedExercises = {}; }
    }
  }

  function _getPhasesToRender() {
    if (_currentDay && Array.isArray(_currentDay.workoutPhases) && _currentDay.workoutPhases.length > 0) {
      return _currentDay.workoutPhases;
    }
    return (_workoutData && _workoutData.phases) ? _workoutData.phases : [];
  }

  /**
   * Berechnet Fortschritt via Workout-Modul.
   * @returns {{ total: number, checked: number, percent: number, isComplete: boolean }}
   */
  function _getProgress() {
    const phases = _getPhasesToRender();
    if (!phases || phases.length === 0) return { total: 0, checked: 0, percent: 0, isComplete: false };
    if (window.Workout && _currentDay) {
      return Workout.getProgress(_currentDay.date, phases);
    }
    // Fallback
    let total = 0, checked = 0;
    for (const phase of phases)
      for (const ex of phase.exercises) { total++; if (_checkedExercises[ex.id]) checked++; }
    const percent = total > 0 ? Math.round((checked / total) * 100) : 0;
    return { total, checked, percent, isComplete: total > 0 && checked === total };
  }

  /**
   * Rendert die Trainingstag-Ansicht mit allen Übungen.
   */
  function _renderTrainingDay() {
    const t = (k, p) => (window.I18n ? I18n.t(k, p) : k);
    const translateText = (txt) => (window.I18n ? I18n.translateText(txt) : txt);
    const isEn = window.I18n && I18n.getLanguage() === 'en';
    const locale = isEn ? 'en-US' : 'de-DE';

    if (!_workoutData) {
      containerEl.innerHTML = `
        <div class="text-center py-16 animate-fade-in">
          <div class="text-5xl mb-4">⏳</div>
          <p class="text-text-light-secondary dark:text-text-dark-secondary">${t('day_view_loading')}</p>
        </div>
      `;
      return;
    }

    // Prüfen ob dieser Tag in der Zukunft liegt
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayDate = new Date(_currentDay.date + 'T00:00:00');
    const isFuture = dayDate > today;

    const dayNameLocale = dayDate.toLocaleDateString(locale, { weekday: 'short' });
    const monthLocale = dayDate.toLocaleDateString(locale, { month: 'short' });

    const phasesToRender = _getPhasesToRender();
    const { total, checked } = _getProgress();
    const progressPercent = total > 0 ? Math.round((checked / total) * 100) : 0;
    const isComplete = total > 0 && checked === total;
    const todayLabel = _currentDay.isToday ? t('day_view_today') : `${dayNameLocale} ${dayDate.getDate()}. ${monthLocale}`;

    const trainingTitle = isFuture ? t('day_view_scheduled_training') : t('day_view_training');
    const routineBadge = _currentDay.workoutName
      ? `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-brand-purple text-white shadow-sm ml-2">🏋️ ${translateText(_currentDay.workoutName)}</span>`
      : '';

    let html = `
      <!-- Trainingstag Header -->
      <div class="mb-4 lg:mb-6 animate-fade-in">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h3 class="text-xl lg:text-2xl font-bold flex items-center gap-2 flex-wrap">
              ${isFuture ? '📅' : '🏋️'} <span class="${isFuture ? 'text-text-light-secondary dark:text-text-dark-secondary' : 'text-gradient-brand bg-gradient-brand bg-clip-text text-transparent'}">${trainingTitle}</span>
              ${routineBadge}
            </h3>
            <p class="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">${todayLabel} – ${_currentDay.date}</p>
          </div>
          ${!isFuture && !isComplete && !_currentDay.isCompleted ? `
            <button id="skip-day-btn" class="btn-ghost text-sm px-4 py-2.5 text-yellow-500 border-yellow-400/30 hover:bg-yellow-500/10 w-full sm:w-auto text-center" title="${t('skip_modal_title')}">
              ${t('day_view_skip_btn')}
            </button>
          ` : ''}
        </div>

        ${isFuture ? `
          <!-- Zukunfts-Hinweis-Banner -->
          <div class="flex items-center gap-3 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-700/30 mb-4">
            <span class="text-2xl">📅</span>
            <div>
              <p class="text-sm font-medium text-blue-700 dark:text-blue-300">${t('day_view_future_banner_title')}</p>
              <p class="text-xs text-blue-600/70 dark:text-blue-400/70 mt-0.5">${t('day_view_future_banner_desc')}</p>
            </div>
          </div>
        ` : ''}

        <!-- Fortschrittsbalken -->
        <div class="card-glass p-3 lg:p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium">${t('day_view_exercises_checked', { completed: checked, total })}</span>
            <span class="text-sm font-bold ${isComplete ? 'text-green-400' : 'text-brand-purple'}">${progressPercent}%</span>
          </div>
          <div class="w-full h-3 bg-gray-200 dark:bg-surface-dark-tertiary rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all duration-500 ease-out ${isComplete ? 'bg-green-400' : 'bg-gradient-brand'}"
                 style="width: ${progressPercent}%"></div>
          </div>
        </div>
      </div>
    `;

    // Übungen nach Phasen rendern (nutzt WorkoutCard-Komponente)
    for (const phase of phasesToRender) {
      const phaseName = translateText(phase.name);
      const restText = phase.restBetweenSets
        ? t('day_view_rest_between_sets', { rest: translateText(phase.restBetweenSets) })
        : t('day_view_no_rest');

      html += `
        <div class="mb-6 animate-fade-in-up ${isFuture ? 'opacity-50 pointer-events-none select-none' : ''}">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-2xl">${phase.emoji || '🏋️'}</span>
            <div>
              <h4 class="font-bold text-base">${phaseName}</h4>
              <p class="text-xs text-text-light-secondary dark:text-text-dark-secondary">${restText}</p>
            </div>
          </div>
          <div class="space-y-3">
      `;

      for (const exercise of phase.exercises) {
        const isChecked = !isFuture && !!_checkedExercises[exercise.id];
        // WorkoutCard-Komponente nutzen falls verfügbar
        if (window.WorkoutCard) {
          html += WorkoutCard.buildHTML(exercise, { isChecked });
        } else {
          html += _buildExerciseCard(exercise, isChecked);
        }
      }

      html += `
          </div>
        </div>
      `;
    }

    containerEl.innerHTML = html;

    // Events binden (nur wenn kein Zukunftstag)
    if (!isFuture) {
      _bindExerciseEvents();
      _bindSkipButton();
    }
  }

  /**
   * Baut eine einzelne Übungs-Karte als HTML.
   * @param {object} exercise
   * @param {boolean} isChecked
   * @returns {string}
   */
  function _buildExerciseCard(exercise, isChecked) {
    const t = (k) => (window.I18n ? I18n.t(k) : k);
    const translateReps = (r) => (window.I18n ? I18n.translateReps(r) : r);
    const translateText = (txt) => (window.I18n ? I18n.translateText(txt) : txt);

    const checkedClass = isChecked ? 'completed border-green-400/50 bg-green-50/30 dark:bg-green-900/10' : '';
    const textClass = isChecked ? 'line-through opacity-60' : '';
    const checkIcon = isChecked ? '✅' : '⬜';
    const checkTitle = isChecked ? t('card_uncheck') : t('card_check');
    const setLabel = exercise.sets === 1 ? t('card_set') : t('card_sets');

    return `
      <div class="workout-card ${checkedClass}" data-exercise-id="${exercise.id}">
        <div class="flex items-start gap-4">
          <!-- Checkbox -->
          <button class="exercise-check-btn flex-shrink-0 text-2xl mt-0.5 hover:scale-110 transition-transform cursor-pointer"
                  data-exercise-id="${exercise.id}" title="${checkTitle}">
            ${checkIcon}
          </button>

          <!-- Übungsinfo -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <h5 class="font-semibold ${textClass}">${exercise.name}</h5>
              <button class="exercise-toggle-btn text-text-light-secondary dark:text-text-dark-secondary hover:text-brand-purple transition-colors p-1"
                      data-exercise-id="${exercise.id}" title="${t('card_details')}">
                <svg class="w-5 h-5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
            </div>
            <p class="text-sm text-text-light-secondary dark:text-text-dark-secondary ${textClass}">
              ${exercise.sets} ${setLabel} × ${translateReps(exercise.reps)}
            </p>

            <!-- Aufklappbare Details -->
            <div class="exercise-details hidden mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/30" data-exercise-id="${exercise.id}">
              <p class="text-sm text-text-light-secondary dark:text-text-dark-secondary leading-relaxed mb-3">
                📝 <strong>${t('card_execution')}</strong> ${translateText(exercise.description)}
              </p>
              ${exercise.gifUrl ? `
                <div class="rounded-xl overflow-hidden bg-gray-100 dark:bg-surface-dark-tertiary">
                  <img src="${exercise.gifUrl}" alt="${exercise.name}" class="w-full max-h-48 object-contain" loading="lazy">
                </div>
              ` : `
                <div class="rounded-xl bg-gray-100 dark:bg-surface-dark-tertiary p-4 text-center text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  🎬 ${t('card_no_video')}
                </div>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Rendert die Pausentag-Ansicht.
   */
  function _renderRestDay() {
    const t = (k, p) => (window.I18n ? I18n.t(k, p) : k);
    const isEn = window.I18n && I18n.getLanguage() === 'en';
    const locale = isEn ? 'en-US' : 'de-DE';

    const dayDate = new Date(_currentDay.date + 'T00:00:00');
    const dayNameLocale = dayDate.toLocaleDateString(locale, { weekday: 'short' });
    const todayLabel = _currentDay.isToday ? t('day_view_today') : `${dayNameLocale} ${dayDate.getDate()}.`;
    const showAdvanceBtn = _currentDay.isToday;

    containerEl.innerHTML = `
      <div class="text-center py-12 animate-fade-in">
        <div class="text-7xl mb-6">😴</div>
        <h3 class="text-2xl font-bold mb-2">${todayLabel} - ${t('day_view_rest')}</h3>
        <p class="text-text-light-secondary dark:text-text-dark-secondary max-w-md mx-auto">
          ${t('day_view_rest_desc')}
        </p>
        <div class="mt-6 p-4 card-glass max-w-sm mx-auto">
          <p class="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            ${t('day_view_next_training_day')} <strong class="text-brand-purple">${_getNextTrainingDay()}</strong>
          </p>
        </div>
        ${showAdvanceBtn ? `
          <div class="mt-6">
            <button
              id="advance-workout-btn"
              class="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white
                     bg-gradient-to-r from-brand-purple to-blue-500
                     hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-purple-500/30"
            >
              ${t('day_view_do_workout_now')}
            </button>
            <p class="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-3">
              ${t('day_view_advance_hint')}
            </p>
          </div>
        ` : ''}
      </div>
    `;

    if (showAdvanceBtn) {
      const advBtn = document.getElementById('advance-workout-btn');
      if (advBtn) {
        advBtn.addEventListener('click', async () => {
          advBtn.disabled = true;
          advBtn.innerHTML = '<span class="text-xl">⏳</span> Processing...';
          await _advanceWorkout();
        });
      }
    }
  }

  /**
   * Rendert die Ansicht für einen bereits abgeschlossenen Tag.
   */
  function _renderCompletedDay() {
    const t = (k, p) => (window.I18n ? I18n.t(k, p) : k);
    containerEl.innerHTML = `
      <div class="text-center py-16 animate-fade-in">
        <div class="text-7xl mb-6">🎉</div>
        <h3 class="text-2xl font-bold mb-2 text-green-400">${t('day_view_completed_title')}</h3>
        <p class="text-text-light-secondary dark:text-text-dark-secondary max-w-md mx-auto">
          ${t('day_view_completed_desc', { date: _currentDay.date })}
        </p>
      </div>
    `;
  }

  /**
   * Rendert die Ansicht für einen übersprungenen Tag.
   */
  function _renderSkippedDay() {
    const t = (k, p) => (window.I18n ? I18n.t(k, p) : k);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const isToday = _currentDay.date === todayStr;

    const skipReason = _currentDay.skipReason;
    const isFrozen = skipReason === 'vacation' || skipReason === 'soreness';
    const reasonLabel = t(`day_view_skip_reason_${skipReason}`);
    const titleText = isFrozen ? t('day_view_skipped_frozen_title') : t('day_view_skipped_title');
    const descText = isFrozen ? t('day_view_skipped_frozen_desc') : t('day_view_skipped_desc');

    containerEl.innerHTML = `
      <div class="text-center py-16 animate-fade-in">
        <div class="text-7xl mb-6">${isFrozen ? '❄️' : '⏭️'}</div>
        <h3 class="text-2xl font-bold mb-2 ${isFrozen ? 'text-sky-400' : 'text-yellow-400'}">
          ${titleText}
        </h3>
        <p class="text-text-light-secondary dark:text-text-dark-secondary max-w-md mx-auto mb-2">
          ${t('day_view_skipped_reason', { reason: reasonLabel })}
        </p>
        <p class="text-text-light-secondary dark:text-text-dark-secondary max-w-md mx-auto ${isToday ? 'mb-8' : ''}">
          ${descText}
        </p>
        ${isToday ? `
          <button
            id="undo-skip-btn"
            data-date="${_currentDay.date}"
            class="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white
                   bg-gradient-to-r from-brand-purple to-blue-500
                   hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-purple-500/30"
          >
            ${t('day_view_undo_skip_title')}
          </button>
          <p class="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-4">
            ${t('day_view_undo_skip_desc')}
          </p>
        ` : ''}
      </div>
    `;

    // Undo-Button Event binden
    if (isToday) {
      const undoBtn = document.getElementById('undo-skip-btn');
      if (undoBtn) {
        undoBtn.addEventListener('click', async () => {
          undoBtn.disabled = true;
          undoBtn.textContent = '...';
          await _undoSkip(_currentDay.date);
        });
      }
    }
  }

  /**
   * Rendert die Ansicht für einen versäumten vergangenen Trainingstag.
   * Ermöglicht nachträgliches Abhaken.
   */
  function _renderMissedDay() {
    const t = (k, p) => (window.I18n ? I18n.t(k, p) : k);
    const isEn = window.I18n && I18n.getLanguage() === 'en';
    const locale = isEn ? 'en-US' : 'de-DE';

    const dayDate = new Date(_currentDay.date + 'T00:00:00');
    const dateLabel = `${dayDate.toLocaleDateString(locale, { weekday: 'short' })} ${dayDate.getDate()}. ${dayDate.toLocaleDateString(locale, { month: 'short' })}`;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    const isYesterday = _currentDay.date === yesterdayStr;

    if (isYesterday) {
      containerEl.innerHTML = `
        <div class="text-center py-12 animate-fade-in">
          <div class="text-7xl mb-6">❌</div>
          <h3 class="text-2xl font-bold mb-2 text-red-400">${t('day_view_missed_title')}</h3>
          <p class="text-text-light-secondary dark:text-text-dark-secondary max-w-md mx-auto mb-8">
            ${t('day_view_missed_yesterday_desc', { date: dateLabel })}
          </p>
          <button
            id="retroactive-complete-btn"
            data-date="${_currentDay.date}"
            class="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white
                   bg-gradient-to-r from-green-500 to-emerald-400
                   hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-green-500/30"
          >
            ${t('day_view_missed_did_it_btn')}
          </button>
          <p class="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-4">
            ${t('day_view_missed_retroactive_hint')}
          </p>
        </div>
      `;

      const btn = document.getElementById('retroactive-complete-btn');
      if (btn) {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          btn.textContent = '...';
          await _retroactiveComplete(_currentDay.date);
        });
      }
    } else {
      containerEl.innerHTML = `
        <div class="text-center py-12 animate-fade-in">
          <div class="text-7xl mb-6">❌</div>
          <h3 class="text-2xl font-bold mb-2 text-red-400">${t('day_view_missed_title')}</h3>
          <p class="text-text-light-secondary dark:text-text-dark-secondary max-w-md mx-auto mb-6">
            ${t('day_view_missed_old_desc', { date: dateLabel })}
          </p>
          <div class="card-glass p-4 max-w-sm mx-auto text-left">
            <div class="flex items-start gap-3">
              <span class="text-2xl mt-0.5">⚠️</span>
              <div>
                <p class="text-sm font-semibold text-text-light dark:text-text-dark mb-1">
                  ${t('day_view_missed_not_possible_title')}
                </p>
                <p class="text-xs text-text-light-secondary dark:text-text-dark-secondary leading-relaxed">
                  ${t('day_view_missed_not_possible_desc')}
                </p>
              </div>
            </div>
          </div>
        </div>
      `;
    }
  }

  /**
   * Findet den nächsten Trainingstag.
   * @returns {string}
   */
  function _getNextTrainingDay() {
    if (!window.Calendar) return '...';
    const days = Calendar.getNext14Days();
    const currentIdx = days.findIndex((d) => d.date === _currentDay.date);
    for (let i = currentIdx + 1; i < days.length; i++) {
      if (days[i].isTraining) {
        return days[i].dayName + ' ' + days[i].dayNumber + '. ' + days[i].month;
      }
    }
    return 'Bald!';
  }

  /**
   * Bindet Events an die Übungs-Checkboxen und Toggle-Buttons.
   */
  function _bindExerciseEvents() {
    // Checkbox-Klicks
    const checkBtns = containerEl.querySelectorAll('.exercise-check-btn');
    checkBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-exercise-id');
        _toggleExercise(id);
      });
    });

    // Details aufklappen
    const toggleBtns = containerEl.querySelectorAll('.exercise-toggle-btn');
    toggleBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-exercise-id');
        _toggleDetails(id, btn);
      });
    });
  }

  /**
   * Bindet den Skip-Button Event.
   */
  function _bindSkipButton() {
    const skipBtn = document.getElementById('skip-day-btn');
    if (skipBtn && window.Skip) {
      skipBtn.addEventListener('click', () => {
        Skip.showSkipDialog(_currentDay.date);
      });
    }
  }

  /**
   * Markiert einen vergangenen Tag nachträglich als abgeschlossen.
   * Nur für gestern erlaubt (mit Streak-Erhalt). Ältere Tage setzen die Streak zurück.
   * @param {string} date - YYYY-MM-DD
   */
  async function _retroactiveComplete(date) {
    try {
      const result = await ApiClient.post('/api/calendar/complete', { date }, { clientOptions: { silent: true } });

      // GIF-Overlay anzeigen
      if (window.GifOverlay) {
        GifOverlay.showHappy();
      }

      // Falls Streak zurückgesetzt wurde: kurze Info
      if (result && result.streakReset) {
        console.log('[DayView] Streak wurde zurückgesetzt (Workout lag mehr als 1 Tag zurück).');
      }

      // Stats und Kalender aktualisieren
      if (window.Stats) await Stats.init();
      if (window.Calendar) await Calendar.refresh();

      // Tagesansicht neu laden
      if (_currentDay) await render(_currentDay);

      console.log(`[DayView] Nachträglich abgeschlossen: ${date}`);
    } catch (err) {
      if (err.status === 400) {
        // Bereits abgeschlossen – kein Fehler
        if (window.GifOverlay) GifOverlay.showHappy();
        if (window.Stats) await Stats.init();
        if (window.Calendar) await Calendar.refresh();
        if (_currentDay) await render(_currentDay);
        return;
      }
      console.error('[DayView] Fehler beim nachträglichen Abschließen:', err);
    }
  }

  /**
   * Macht den Skip eines Tages rückgängig (nur heute möglich).
   * Stellt die Streak wieder her und wechselt zurück zur Trainingsansicht.
   * @param {string} date - YYYY-MM-DD
   */
  async function _undoSkip(date) {
    try {
      await ApiClient.del('/api/calendar/skip', {
        body: JSON.stringify({ date }),
        headers: { 'Content-Type': 'application/json' },
        clientOptions: { silent: true },
      });

      // Stats und Kalender aktualisieren
      if (window.Stats) await Stats.init();
      if (window.Calendar) await Calendar.refresh();

      // Tagesansicht neu laden (jetzt wieder Trainingstag)
      if (_currentDay) {
        // currentDay-Status aktualisieren: nicht mehr geskippt
        _currentDay = { ..._currentDay, isSkipped: false, skipReason: null };
        await render(_currentDay);
      }

      console.log(`[DayView] Skip rückgängig gemacht: ${date} ✅`);
    } catch (err) {
      console.error('[DayView] Fehler beim Rückgängigmachen des Skips:', err);
      // Button wieder aktivieren bei Fehler
      const undoBtn = document.getElementById('undo-skip-btn');
      if (undoBtn) {
        undoBtn.disabled = false;
        undoBtn.innerHTML = '<span class="text-xl">💪</span> Doch trainieren!';
      }
    }
  }

  /**
   * Zieht das nächste Workout auf heute vor (Ruhetag → Trainingstag).
   * Passt trainingStartDate so an, dass heute ein Trainingstag wird.
   */
  async function _advanceWorkout() {
    try {
      const result = await ApiClient.post('/api/calendar/advance', {}, { clientOptions: { silent: true } });

      if (result && result.noChange) {
        // Heute ist bereits ein Trainingstag (kein Änderungsbedarf)
        if (_currentDay) await render(_currentDay);
        return;
      }

      // Alles neu laden
      if (window.Stats) await Stats.init();
      if (window.Calendar) await Calendar.refresh();

      // Tagesansicht: Heute ist jetzt Trainingstag
      if (_currentDay) {
        _currentDay = { ..._currentDay, isTraining: true, isSkipped: false };
        // Kalender neu laden um den aktualisierten dayData zu erhalten
        const updatedDay = window.Calendar ? Calendar.getSelectedDay() : _currentDay;
        await render(updatedDay || _currentDay);
      }

      if (window.ApiClient) {
        ApiClient.showToast('🏃 Workout auf heute vorgezogen! Viel Spaß!', 'success', 3000);
      }

      console.log('[DayView] Workout auf heute vorgezogen ✅');
    } catch (err) {
      console.error('[DayView] Fehler beim Vorziehen des Workouts:', err);
      const advBtn = document.getElementById('advance-workout-btn');
      if (advBtn) {
        advBtn.disabled = false;
        advBtn.innerHTML = '<span class="text-xl">🏃</span> Workout jetzt machen!';
      }
    }
  }

  /**
   * Toggled eine Übung als erledigt/nicht erledigt.
   * Delegiert an Workout-Modul für Persistenz + Abschluss-Erkennung.
   * @param {string} exerciseId
   */
  async function _toggleExercise(exerciseId) {
    if (window.Workout && _workoutData) {
      // Workout-Modul übernimmt Toggle, Speichern und Abschluss-Logik
      const { checked } = await Workout.toggleExercise(
        _currentDay.date,
        exerciseId,
        _workoutData.phases
      );
      _checkedExercises = checked;
    } else {
      // Fallback: direkt toggling
      _checkedExercises[exerciseId] = !_checkedExercises[exerciseId];
      try {
        localStorage.setItem(`workout-checked-${_currentDay.date}`, JSON.stringify(_checkedExercises));
      } catch {}
    }

    // UI aktualisieren
    _renderTrainingDay();
  }

  /**
   * Toggled die Details-Ansicht einer Übung.
   * @param {string} exerciseId
   * @param {HTMLElement} toggleBtn
   */
  function _toggleDetails(exerciseId, toggleBtn) {
    const details = containerEl.querySelector(`.exercise-details[data-exercise-id="${exerciseId}"]`);
    if (!details) return;

    const isHidden = details.classList.contains('hidden');
    details.classList.toggle('hidden');

    const svg = toggleBtn.querySelector('svg');
    if (svg) svg.style.transform = isHidden ? 'rotate(180deg)' : '';

    toggleBtn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
  }

  // ============================
  // Öffentliche Funktionen
  // ============================

  /**
   * Rendert die Tagesansicht für den gegebenen Tag.
   * @param {object} dayData - DayData-Objekt aus dem Kalender-Modul
   */
  async function render(dayData) {
    containerEl = document.getElementById('day-view');
    if (!containerEl) {
      console.warn('[DayView] #day-view Element nicht gefunden.');
      return;
    }

    _currentDay = dayData;

    // Workout-Daten laden (einmalig)
    if (!_workoutData) {
      await _loadWorkoutData();
    }

    // Checked-State für diesen Tag laden
    _loadCheckedState();

    // Ansicht basierend auf Tagestyp rendern
    if (dayData.isCompleted) {
      _renderCompletedDay();
    } else if (dayData.isSkipped) {
      _renderSkippedDay();
    } else if (dayData.isMissed) {
      _renderMissedDay();
    } else if (dayData.isTraining) {
      _renderTrainingDay();
    } else {
      _renderRestDay();
    }

    // Page-Titel aktualisieren
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');
    const t = (k) => (window.I18n ? I18n.t(k) : k);
    const isEn = window.I18n && I18n.getLanguage() === 'en';
    const locale = isEn ? 'en-US' : 'de-DE';

    if (pageTitle) {
      pageTitle.textContent = dayData.isTraining ? `🏋️ ${t('day_view_training')}` : `😴 ${t('day_view_rest')}`;
    }
    if (pageSubtitle) {
      const dayDate = new Date(dayData.date + 'T00:00:00');
      const dayName = dayDate.toLocaleDateString(locale, { weekday: 'short' });
      const month = dayDate.toLocaleDateString(locale, { month: 'short' });
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const todayTag = dayData.date === todayStr ? ` (${t('day_view_today')})` : '';
      pageSubtitle.textContent = `${dayName} ${dayDate.getDate()}. ${month}${todayTag}`;
    }
  }

  /**
   * Aktualisiert die aktuelle Ansicht.
   */
  async function refresh() {
    if (_currentDay) {
      _workoutData = null; // Daten neu laden
      await render(_currentDay);
    }
  }

  // ============================
  // Public API
  // ============================
  return {
    render,
    refresh,
  };
})();

// Global verfügbar machen
window.DayView = DayView;
