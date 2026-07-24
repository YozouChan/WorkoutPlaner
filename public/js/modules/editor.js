/**
 * modules/editor.js
 * ==================
 * Workout-Editor: Mehrere Workouts & flexible Trainingszeiten verwalten.
 *
 * Zweck:
 * - Lädt alle Workouts & aktives Workout vom Server (/api/workout)
 * - Erlaubt das Wechseln, Erstellen, Umbenennen und Löschen von Routinen
 * - Konfiguration von Trainingszeiten (Intervall-Rhythmus vs. Feste Wochentage)
 * - Phasen & Übungen pro Workout bearbeiten
 *
 * Abhängigkeiten: API /api/workout, components/modal.js
 * Genutzt von: public/pages/editor.html
 */

const Editor = (() => {
  // ============================
  // Private Variablen
  // ============================
  let _workoutData = null; // { activeWorkoutId, workouts: [...], activeWorkout: {...} }

  const EXERCISE_IMAGE_PRESETS = [
    { name: 'Kniebeugen (Squats)', url: '/assets/images/exercises/squats.png' },
    { name: 'Beckenheben (Glute Bridge)', url: '/assets/images/exercises/glute-bridge.png' },
    { name: 'Ausfallschritte (Lunges)', url: 'https://upload.wikimedia.org/wikipedia/commons/a/af/Lunge-CDC_strength_training_for_older_adults.gif' },
    { name: 'Eselstritte (Donkey Kicks)', url: '/assets/images/exercises/donkey-kicks.png' },
    { name: 'Crunches (Bauchpressen)', url: '/assets/images/exercises/crunches.png' },
    { name: 'Unterarmstütz (Plank)', url: '/assets/images/exercises/plank.png' },
    { name: 'Beinheben (Leg Raises)', url: '/assets/images/exercises/leg-raises.png' },
    { name: 'Kobra-Pose (Cobra Pose)', url: '/assets/images/exercises/cobra-pose.png' },
    { name: 'Oberschenkeldehnung (Quad Stretch)', url: '/assets/images/exercises/quad-stretch.png' },
    { name: 'Hüftkreisen (Hip Circles)', url: '/assets/images/exercises/hip-circles.png' },
    { name: 'Hampelmänner (Jumping Jacks)', url: '/assets/images/exercises/jumping-jacks.png' },
  ];

  // ============================
  // API-Funktionen
  // ============================

  async function _fetchWorkoutData() {
    try {
      const data = await ApiClient.get('/api/workout');
      if (data) {
        _workoutData = data;
      }
      return data;
    } catch (err) {
      console.error('[Editor] Fehler beim Laden der Workout-Daten:', err);
      return null;
    }
  }

  async function _apiSelectWorkout(workoutId) {
    const res = await ApiClient.post('/api/workout/select', { workoutId });
    if (res && res.workoutData) {
      _workoutData = res.workoutData;
    }
    return res;
  }

  async function _apiCreateWorkout(name, scheduleType, rhythm, weekdays) {
    const res = await ApiClient.post('/api/workout', { name, scheduleType, rhythm, weekdays });
    if (res && res.workoutData) {
      _workoutData = res.workoutData;
    }
    return res;
  }

  async function _apiUpdateWorkout(workoutId, updateObj) {
    const res = await ApiClient.put(`/api/workout/${encodeURIComponent(workoutId)}`, updateObj);
    if (res && res.workoutData) {
      _workoutData = res.workoutData;
    }
    return res;
  }

  async function _apiDeleteWorkout(workoutId) {
    const res = await ApiClient.del(`/api/workout/${encodeURIComponent(workoutId)}`);
    if (res && res.workoutData) {
      _workoutData = res.workoutData;
    }
    return res;
  }

  async function _apiAddExercise(phaseId, exercise, index) {
    const activeId = _workoutData?.activeWorkoutId;
    const res = await ApiClient.post('/api/workout/exercise', { phaseId, exercise, index, workoutId: activeId });
    if (res && res.workoutData) _workoutData = res.workoutData;
    return res;
  }

  async function _apiDeleteExercise(exerciseId) {
    const res = await ApiClient.del(`/api/workout/exercise/${encodeURIComponent(exerciseId)}`);
    if (res && res.workoutData) _workoutData = res.workoutData;
    return res;
  }

  async function _apiReorder(phaseId, exerciseId, newIndex) {
    const activeId = _workoutData?.activeWorkoutId;
    return await ApiClient.patch('/api/workout/exercise/reorder', { phaseId, exerciseId, newIndex, workoutId: activeId });
  }

  // ============================
  // UI Builder & Components
  // ============================

  /**
   * Erstellt den Routine-Auswahl-Tab-bereich oben.
   */
  function _buildRoutinesBar() {
    if (!_workoutData || !_workoutData.workouts) return '';
    const t = (k, p) => (window.I18n ? I18n.t(k, p) : k);
    const activeId = _workoutData.activeWorkoutId;

    const tabsHtml = _workoutData.workouts
      .map((w) => {
        const isActive = w.id === activeId;
        const activeClass = isActive
          ? 'bg-gradient-brand text-white font-bold shadow-md'
          : 'bg-white dark:bg-surface-dark-tertiary text-text-light-secondary dark:text-text-dark-secondary hover:bg-gray-100 dark:hover:bg-surface-dark';

        return `
          <button
            class="routine-tab px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer border border-gray-200/50 dark:border-gray-700/30 ${activeClass}"
            data-workout-id="${w.id}"
          >
            <span>🏋️</span>
            <span>${_escapeHtml(w.name)}</span>
            ${isActive ? '<span class="text-[10px] bg-white/20 px-1.5 py-0.5 rounded ml-1">Aktiv</span>' : ''}
          </button>
        `;
      })
      .join('');

    return `
      <div class="card-glass p-4 sm:p-5 space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200/50 dark:border-gray-700/30 pb-3">
          <div>
            <h3 class="font-bold text-base flex items-center gap-2">
              <span>📋</span> ${t('workout_routines')}
            </h3>
            <p class="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-0.5">
              ${t('editor_routines_desc')}
            </p>
          </div>
          <button
            id="create-routine-btn"
            class="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-brand-purple text-white hover:bg-brand-purple/90 font-semibold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 cursor-pointer self-start sm:self-auto"
          >
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            <span>${t('editor_create_routine')}</span>
          </button>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          ${tabsHtml}
        </div>
      </div>
    `;
  }

  /**
   * Erstellt die Trainingszeiten-Konfigurationskarte (Intervall vs. Wochentage).
   */
  function _buildScheduleCard() {
    if (!_workoutData || !_workoutData.activeWorkout) return '';
    const isEn = window.I18n && I18n.getLanguage() === 'en';
    const t = (k, p) => (window.I18n ? I18n.t(k, p) : k);

    const active = _workoutData.activeWorkout;
    const scheduleType = active.scheduleType || 'rhythm';
    const rhythmVal = active.rhythm || 2;
    const weekdaysArr = Array.isArray(active.weekdays) ? active.weekdays : [1, 3, 5];

    const canDecrease = rhythmVal > 1;
    const canIncrease = rhythmVal < 7;

    const rhythmLabel = t('editor_rhythm_every', { n: rhythmVal });

    // Wochentags-Pills (Mo, Di, Mi, Do, Fr, Sa, So) -> IDs: Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6, Sun=0
    const weekdayIndices = [1, 2, 3, 4, 5, 6, 0];
    const weekdayButtonsHtml = weekdayIndices
      .map((wIdx) => {
        const isSelected = weekdaysArr.includes(wIdx);
        const nameShort = t(`weekday_short_${wIdx}`);
        const nameFull = t(`weekday_${wIdx}`);

        return `
          <button
            type="button"
            class="weekday-toggle-btn w-10 h-10 sm:w-11 sm:h-11 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer border ${isSelected
            ? 'bg-gradient-brand text-white border-transparent shadow-md shadow-purple-500/20 scale-105'
            : 'bg-gray-100 dark:bg-surface-dark-tertiary text-text-light-secondary dark:text-text-dark-secondary border-gray-200/60 dark:border-gray-700/40 hover:bg-gray-200 dark:hover:bg-gray-700'
          }"
            data-weekday="${wIdx}"
            title="${_escapeHtml(nameFull)}"
          >
            ${nameShort}
          </button>
        `;
      })
      .join('');

    // Visuelle 14-Tage Vorschau
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const previewDaysHtml = Array.from({ length: 14 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayOfWeek = date.getDay();

      let isTraining = false;
      if (scheduleType === 'weekdays') {
        isTraining = weekdaysArr.includes(dayOfWeek);
      } else {
        isTraining = i % rhythmVal === 0;
      }

      const dayName = date.toLocaleDateString(isEn ? 'en-US' : 'de-DE', { weekday: 'short' });

      return `
        <div class="flex flex-col items-center gap-1">
          <span class="text-[10px] text-text-light-secondary dark:text-text-dark-secondary font-medium">${dayName}</span>
          <div class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${isTraining
          ? 'bg-brand-purple text-white shadow-sm ring-2 ring-purple-400/40'
          : 'bg-gray-100 dark:bg-surface-dark-tertiary text-gray-400 dark:text-gray-600'
        }" title="Tag ${i + 1}: ${isTraining ? 'Training' : 'Pause'}">
            ${isTraining ? '🏋️' : '😴'}
          </div>
        </div>
      `;
    }).join('');

    const canDeleteRoutine = _workoutData.workouts.length > 1;

    return `
      <div class="schedule-card rounded-2xl overflow-hidden shadow-sm border border-brand-purple/20 bg-gradient-to-r from-brand-purple/5 to-blue-500/5 dark:from-brand-purple/10 dark:to-blue-500/10 p-4 lg:p-6 space-y-5">
        
        <!-- Routine Header Info & Aktionen -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-purple/15 pb-4">
          <div class="flex items-center gap-3">
            <span class="text-3xl">⚙️</span>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-extrabold text-lg text-brand-purple dark:text-purple-300">
                  ${_escapeHtml(active.name)}
                </h3>
                <button id="rename-routine-btn" class="p-1 rounded-lg text-text-light-secondary dark:text-text-dark-secondary hover:text-brand-purple hover:bg-gray-100 dark:hover:bg-surface-dark-tertiary transition-all" title="Routine umbenennen">
                  ✏️
                </button>
              </div>
              <p class="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                ${t('editor_routine_config_desc')}
              </p>
            </div>
          </div>

          ${canDeleteRoutine ? `
            <button id="delete-routine-btn" class="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs font-semibold transition-all cursor-pointer">
              <span>🗑️</span>
              <span>${t('editor_delete_routine')}</span>
            </button>
          ` : ''}
        </div>

        <!-- Schedule Typ-Umschalter -->
        <div class="space-y-3">
          <label class="block text-xs font-bold uppercase tracking-wider text-text-light-secondary dark:text-text-dark-secondary">
            ${t('editor_routine_schedule')}
          </label>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <!-- Typ 1: Intervall Rhythmus -->
            <label class="cursor-pointer flex items-start gap-3 p-3.5 rounded-xl border transition-all ${scheduleType === 'rhythm'
        ? 'border-brand-purple bg-brand-purple/10 dark:bg-brand-purple/20 shadow-sm'
        : 'border-gray-200/60 dark:border-gray-700/40 bg-white/60 dark:bg-surface-dark-secondary/60 hover:border-brand-purple/40'
      }">
              <input type="radio" name="scheduleType" value="rhythm" ${scheduleType === 'rhythm' ? 'checked' : ''} class="mt-1 accent-brand-purple">
              <div>
                <span class="block text-sm font-bold text-text-light dark:text-text-dark">${t('schedule_type_rhythm')}</span>
                <span class="block text-xs text-text-light-secondary dark:text-text-dark-secondary mt-0.5">${t('schedule_type_rhythm_desc')}</span>
              </div>
            </label>

            <!-- Typ 2: Feste Wochentage -->
            <label class="cursor-pointer flex items-start gap-3 p-3.5 rounded-xl border transition-all ${scheduleType === 'weekdays'
        ? 'border-brand-purple bg-brand-purple/10 dark:bg-brand-purple/20 shadow-sm'
        : 'border-gray-200/60 dark:border-gray-700/40 bg-white/60 dark:bg-surface-dark-secondary/60 hover:border-brand-purple/40'
      }">
              <input type="radio" name="scheduleType" value="weekdays" ${scheduleType === 'weekdays' ? 'checked' : ''} class="mt-1 accent-brand-purple">
              <div>
                <span class="block text-sm font-bold text-text-light dark:text-text-dark">${t('schedule_type_weekdays')}</span>
                <span class="block text-xs text-text-light-secondary dark:text-text-dark-secondary mt-0.5">${t('schedule_type_weekdays_desc')}</span>
              </div>
            </label>
          </div>
        </div>

        <!-- Detail-Einstellungen je nach Typ -->
        ${scheduleType === 'rhythm' ? `
          <!-- Intervall Stepper -->
          <div class="flex items-center justify-between p-4 rounded-xl bg-white/60 dark:bg-surface-dark-secondary/60 border border-gray-200/60 dark:border-gray-700/40">
            <div>
              <span class="block text-xs font-bold text-text-light-secondary dark:text-text-dark-secondary">${t('editor_interval_days')}</span>
              <span class="text-sm font-extrabold text-brand-purple" id="rhythm-label">${rhythmLabel}</span>
            </div>
            <div class="flex items-center gap-3">
              <button
                id="rhythm-decrease-btn"
                class="w-9 h-9 flex items-center justify-center rounded-xl border-2 font-bold text-base transition-all active:scale-90 ${canDecrease ? 'border-brand-purple/40 text-brand-purple hover:bg-brand-purple/10 cursor-pointer' : 'border-gray-200 dark:border-gray-700 text-gray-400 cursor-not-allowed'
        }"
                ${canDecrease ? '' : 'disabled'}
              >−</button>
              <span class="text-2xl font-black text-brand-purple w-6 text-center">${rhythmVal}</span>
              <button
                id="rhythm-increase-btn"
                class="w-9 h-9 flex items-center justify-center rounded-xl border-2 font-bold text-base transition-all active:scale-90 ${canIncrease ? 'border-brand-purple/40 text-brand-purple hover:bg-brand-purple/10 cursor-pointer' : 'border-gray-200 dark:border-gray-700 text-gray-400 cursor-not-allowed'
        }"
                ${canIncrease ? '' : 'disabled'}
              >+</button>
            </div>
          </div>
        ` : `
          <!-- Wochentage Auswahl -->
          <div class="p-4 rounded-xl bg-white/60 dark:bg-surface-dark-secondary/60 border border-gray-200/60 dark:border-gray-700/40 space-y-2">
            <span class="block text-xs font-bold text-text-light-secondary dark:text-text-dark-secondary mb-2">${t('editor_weekday_select')}</span>
            <div class="flex items-center justify-between gap-1 flex-wrap">
              ${weekdayButtonsHtml}
            </div>
          </div>
        `}

        <!-- 14-Tage Vorschau -->
        <div class="pt-3 border-t border-brand-purple/15">
          <p class="text-xs font-semibold text-text-light-secondary dark:text-text-dark-secondary mb-2.5">
            📅 ${t('editor_preview_14days')}
          </p>
          <div class="flex items-center justify-between gap-1 overflow-x-auto pb-1 scrollbar-thin">
            ${previewDaysHtml}
          </div>
        </div>

      </div>
    `;
  }

  function _buildExerciseRow(exercise, phaseId, index, total) {
    const t = (k, p) => (window.I18n ? I18n.t(k, p) : k);
    const translateReps = (r) => (window.I18n ? I18n.translateReps(r) : r);
    const translateText = (txt) => (window.I18n ? I18n.translateText(txt) : txt);

    const isFirst = index === 0;
    const isLast = index === total - 1;
    const setsLabel = exercise.sets ? (exercise.sets === 1 ? t('card_set') : t('card_sets')) : '';
    const repsLabel = exercise.reps ? translateReps(exercise.reps) : '';

    return `
      <div
        class="exercise-row group flex items-start gap-3 p-4 rounded-xl border border-gray-200/60 dark:border-gray-700/40
               bg-white dark:bg-surface-dark-secondary hover:border-brand-purple/30
               transition-all duration-200 hover:shadow-md"
        data-exercise-id="${exercise.id}"
        data-phase-id="${phaseId}"
      >
        <div class="flex flex-col items-center gap-1 pt-1 flex-shrink-0">
          <span class="text-xs font-bold text-text-light-secondary dark:text-text-dark-secondary w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 dark:bg-surface-dark-tertiary">
            ${index + 1}
          </span>
        </div>

        ${exercise.gifUrl ? `
          <div class="relative w-12 h-12 rounded-lg overflow-hidden bg-black/5 dark:bg-white/5 border border-gray-200/60 dark:border-gray-700/40 flex-shrink-0 self-center">
            <img src="${_escapeHtml((window.MediaUrl && MediaUrl.isYouTube(exercise.gifUrl)) ? MediaUrl.thumbUrl(exercise.gifUrl) : exercise.gifUrl)}" alt="${_escapeHtml(exercise.name)}" class="w-full h-full object-contain" />
            ${(window.MediaUrl && MediaUrl.isYouTube(exercise.gifUrl)) ? '<span class="absolute inset-0 flex items-center justify-center text-white text-sm drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">▶</span>' : ''}
          </div>
        ` : ''}

        <div class="flex-1 min-w-0">
          <div class="flex items-start gap-2">
            <h4 class="font-semibold text-sm leading-tight">${_escapeHtml(exercise.name)}</h4>
          </div>
          <div class="flex items-center gap-3 mt-1 flex-wrap">
            ${exercise.sets ? `<span class="text-xs px-2 py-0.5 rounded-full bg-brand-purple/10 text-brand-purple font-medium">${exercise.sets} ${setsLabel}</span>` : ''}
            ${exercise.reps ? `<span class="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium">${_escapeHtml(String(repsLabel))}</span>` : ''}
          </div>
          ${exercise.description ? `
            <p class="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1.5 line-clamp-2">
              ${_escapeHtml(translateText(exercise.description))}
            </p>
          ` : ''}
        </div>

        <div class="flex flex-col gap-1 flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button
            class="edit-exercise-btn w-7 h-7 flex items-center justify-center rounded-lg
                   text-text-light-secondary dark:text-text-dark-secondary
                   hover:bg-gray-100 dark:hover:bg-surface-dark-tertiary
                   hover:text-brand-purple transition-all cursor-pointer"
            title="${t('editor_edit_exercise')}"
          >
            ✏️
          </button>
          <button
            class="move-up-btn w-7 h-7 flex items-center justify-center rounded-lg
                   text-text-light-secondary dark:text-text-dark-secondary
                   hover:bg-gray-100 dark:hover:bg-surface-dark-tertiary
                   hover:text-brand-purple transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="${t('editor_move_up')}"
            ${isFirst ? 'disabled' : ''}
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
            </svg>
          </button>
          <button
            class="move-down-btn w-7 h-7 flex items-center justify-center rounded-lg
                   text-text-light-secondary dark:text-text-dark-secondary
                   hover:bg-gray-100 dark:hover:bg-surface-dark-tertiary
                   hover:text-brand-purple transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="${t('editor_move_down')}"
            ${isLast ? 'disabled' : ''}
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          <button
            class="delete-btn w-7 h-7 flex items-center justify-center rounded-lg
                   text-text-light-secondary dark:text-text-dark-secondary
                   hover:bg-red-50 dark:hover:bg-red-900/20
                   hover:text-red-500 transition-all cursor-pointer"
            title="${t('editor_delete_exercise')}"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  function _buildPhaseHtml(phase, phaseIndex, totalPhases) {
    const t = (k, p) => (window.I18n ? I18n.t(k, p) : k);
    const translateText = (txt) => (window.I18n ? I18n.translateText(txt) : txt);

    const exercisesHtml = phase.exercises.map((ex, idx) =>
      _buildExerciseRow(ex, phase.id, idx, phase.exercises.length)
    ).join('');

    const phaseColors = [
      'from-violet-500 to-purple-600',
      'from-blue-500 to-cyan-600',
      'from-emerald-500 to-teal-600',
      'from-orange-500 to-amber-600',
    ];
    const gradient = phaseColors[phaseIndex % phaseColors.length];
    const isFirstPhase = phaseIndex === 0;
    const isLastPhase = phaseIndex === totalPhases - 1;

    const countLabel = phase.exercises.length === 1
      ? t('editor_exercise_count_one', { n: 1 })
      : t('editor_exercise_count_many', { n: phase.exercises.length });

    const phaseTitleTranslated = translateText(phase.name);

    return `
      <div class="phase-card rounded-2xl overflow-hidden shadow-sm border border-gray-200/60 dark:border-gray-700/40" data-phase-id="${phase.id}">

        <div class="bg-gradient-to-r ${gradient} p-3 lg:p-4 flex items-center justify-between">
          <div class="min-w-0 flex-1">
            <h3 class="text-white font-bold text-base lg:text-lg truncate">${_escapeHtml(phaseTitleTranslated)}</h3>
            <p class="text-white/70 text-xs mt-0.5">${countLabel}</p>
          </div>
          <div class="flex items-center gap-1.5 flex-shrink-0 ml-2">
            <button
              class="move-phase-up-btn p-1.5 rounded-lg text-white/90 hover:bg-white/20 transition-all text-xs border border-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
              data-phase-id="${phase.id}"
              title="${t('editor_move_up')}"
              ${isFirstPhase ? 'disabled' : ''}
            >
              ▲
            </button>
            <button
              class="move-phase-down-btn p-1.5 rounded-lg text-white/90 hover:bg-white/20 transition-all text-xs border border-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
              data-phase-id="${phase.id}"
              title="${t('editor_move_down')}"
              ${isLastPhase ? 'disabled' : ''}
            >
              ▼
            </button>
            <button
              class="rename-phase-btn p-1.5 rounded-lg text-white/90 hover:bg-white/20 transition-all text-xs border border-white/20 cursor-pointer"
              data-phase-id="${phase.id}"
              data-phase-name="${_escapeHtml(phase.name)}"
              title="${t('editor_edit_phase')}"
            >
              ✏️
            </button>
            <button
              class="delete-phase-btn p-1.5 rounded-lg text-white/90 hover:bg-red-500/40 hover:text-white transition-all text-xs border border-white/20 cursor-pointer"
              data-phase-id="${phase.id}"
              data-phase-name="${_escapeHtml(phase.name)}"
              title="${t('editor_delete_phase')}"
            >
              🗑️
            </button>

            <button
              class="add-exercise-btn flex items-center gap-1.5 px-3 py-2 rounded-lg text-white/90 hover:bg-white/20
                     transition-all duration-200 text-sm font-medium border border-white/30 hover:border-white/60
                     active:scale-95 min-h-[36px] ml-1 cursor-pointer"
              data-phase-id="${phase.id}"
              title="${t('editor_add_exercise')}"
            >
              <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              <span class="hidden sm:inline">${t('editor_add_exercise')}</span>
              <span class="sm:hidden">+</span>
            </button>
          </div>
        </div>

        <div class="exercise-list bg-surface-light dark:bg-surface-dark p-4 space-y-2">
          ${exercisesHtml || `
            <div class="text-center py-8 text-text-light-secondary dark:text-text-dark-secondary">
              <div class="text-3xl mb-2">📭</div>
              <p class="text-sm">${t('editor_empty_phase')}</p>
              <p class="text-xs mt-1 opacity-70">${t('editor_empty_phase_hint')}</p>
            </div>
          `}
        </div>
      </div>
    `;
  }

  // ============================
  // Modals & User Actions
  // ============================

  function _openCreateRoutineModal() {
    if (!window.Modal) return;
    const t = (k) => (window.I18n ? I18n.t(k) : k);

    Modal.open({
      title: t('editor_create_routine_title'),
      content: `
        <form id="create-routine-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1" for="routine-name">${t('editor_routine_name')} <span class="text-red-500">*</span></label>
            <input
              id="routine-name" type="text" required
              placeholder="z.B. Push / Oberkörper"
              class="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark-secondary text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
            >
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">${t('editor_routine_schedule')}</label>
            <div class="grid grid-cols-2 gap-2">
              <label class="p-3 rounded-xl border border-gray-300 dark:border-gray-600 flex items-center gap-2 cursor-pointer">
                <input type="radio" name="newScheduleType" value="rhythm" checked class="accent-brand-purple">
                <span class="text-xs font-semibold">${t('schedule_type_rhythm')}</span>
              </label>
              <label class="p-3 rounded-xl border border-gray-300 dark:border-gray-600 flex items-center gap-2 cursor-pointer">
                <input type="radio" name="newScheduleType" value="weekdays" class="accent-brand-purple">
                <span class="text-xs font-semibold">${t('schedule_type_weekdays')}</span>
              </label>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-4 border-t border-gray-200/50 dark:border-gray-700/30">
            <button type="button" id="modal-cancel-btn" class="px-4 py-2 rounded-xl text-sm font-semibold text-text-light-secondary dark:text-text-dark-secondary hover:bg-gray-100 dark:hover:bg-surface-dark-tertiary">
              ${t('editor_cancel')}
            </button>
            <button type="submit" id="modal-submit-btn" class="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-brand shadow-md hover:scale-105 active:scale-95 transition-all">
              ${t('editor_create_routine')}
            </button>
          </div>
        </form>
      `,
    });

    setTimeout(() => {
      const input = document.getElementById('routine-name');
      const form = document.getElementById('create-routine-form');
      const cancelBtn = document.getElementById('modal-cancel-btn');

      if (input) input.focus();
      if (cancelBtn) cancelBtn.onclick = () => Modal.close();

      if (form) {
        form.onsubmit = async (e) => {
          e.preventDefault();
          const name = input?.value?.trim();
          const typeEl = document.querySelector('input[name="newScheduleType"]:checked');
          const scheduleType = typeEl ? typeEl.value : 'rhythm';

          if (!name) return;

          await _apiCreateWorkout(name, scheduleType, 2, [1, 3, 5]);
          Modal.close();
          _render();
        };
      }
    }, 100);
  }

  function _openRenameRoutineModal() {
    if (!window.Modal || !_workoutData || !_workoutData.activeWorkout) return;
    const active = _workoutData.activeWorkout;
    const t = (k) => (window.I18n ? I18n.t(k) : k);

    Modal.open({
      title: `✏️ ${t('editor_rename_routine')}`,
      content: `
        <form id="rename-routine-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1" for="rename-routine-name">${t('editor_new_name')}</label>
            <input
              id="rename-routine-name" type="text" required
              value="${_escapeHtml(active.name)}"
              class="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark-secondary text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
            >
          </div>

          <div class="flex items-center justify-end gap-2 pt-4 border-t border-gray-200/50 dark:border-gray-700/30">
            <button type="button" id="modal-cancel-btn" class="px-4 py-2 rounded-xl text-sm font-semibold text-text-light-secondary dark:text-text-dark-secondary hover:bg-gray-100 dark:hover:bg-surface-dark-tertiary">
              ${t('editor_cancel')}
            </button>
            <button type="submit" class="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-brand shadow-md hover:scale-105 active:scale-95 transition-all">
              ${t('editor_save')}
            </button>
          </div>
        </form>
      `,
    });

    setTimeout(() => {
      const input = document.getElementById('rename-routine-name');
      const form = document.getElementById('rename-routine-form');
      const cancelBtn = document.getElementById('modal-cancel-btn');

      if (input) input.focus();
      if (cancelBtn) cancelBtn.onclick = () => Modal.close();

      if (form) {
        form.onsubmit = async (e) => {
          e.preventDefault();
          const newName = input?.value?.trim();
          if (!newName) return;
          await _apiUpdateWorkout(active.id, { name: newName });
          Modal.close();
          _render();
        };
      }
    }, 100);
  }

  function _buildExerciseFormFields(exercise = {}) {
    const t = (k, p) => (window.I18n ? I18n.t(k, p) : k);
    const initialGifUrl = exercise.gifUrl || '';

    const isPresetMatch = EXERCISE_IMAGE_PRESETS.some(p => p.url === initialGifUrl);
    const selectedPresetVal = isPresetMatch ? initialGifUrl : (initialGifUrl ? 'custom' : '');

    return `
      <div>
        <label class="block text-sm font-medium mb-1" for="ex-name">${t('editor_field_name')} <span class="text-red-500">*</span></label>
        <input
          id="ex-name" type="text" required
          placeholder="z.B. Kniebeugen"
          value="${_escapeHtml(exercise.name || '')}"
          class="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark-secondary text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
        >
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium mb-1" for="ex-sets">${t('editor_field_sets')}</label>
          <input
            id="ex-sets" type="number" min="1" max="20" value="${exercise.sets || 3}"
            class="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark-secondary text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
          >
        </div>
        <div>
          <label class="block text-sm font-medium mb-1" for="ex-reps">${t('editor_field_reps')}</label>
          <input
            id="ex-reps" type="text"
            placeholder="z.B. 15 Wiederholungen oder 30s"
            value="${_escapeHtml(exercise.reps || '')}"
            class="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark-secondary text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
          >
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1" for="ex-desc">${t('editor_field_desc')}</label>
        <textarea
          id="ex-desc" rows="2"
          class="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark-secondary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
        >${_escapeHtml(exercise.description || '')}</textarea>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1.5">${t('editor_field_image')}</label>
        <input type="file" id="ex-file-input" accept="image/*,.gif,.png,.jpg,.jpeg,.webp" class="hidden">
        
        <!-- Drag & Drop Dropzone -->
        <div
          id="ex-dropzone"
          class="relative border-2 border-dashed border-brand-purple/40 hover:border-brand-purple rounded-xl p-4 text-center bg-purple-50/30 dark:bg-purple-900/10 hover:bg-purple-50/60 dark:hover:bg-purple-900/20 transition-all cursor-pointer group"
        >
          <div id="ex-dropzone-empty" class="${initialGifUrl ? 'hidden' : ''} space-y-1.5 py-1">
            <div class="text-3xl group-hover:scale-110 transition-transform">📁</div>
            <p class="text-xs font-bold text-text-light dark:text-text-dark">
              ${t('editor_dropzone_title')}
            </p>
            <p class="text-[11px] text-text-light-secondary dark:text-text-dark-secondary">
              ${t('editor_dropzone_subtitle')}
            </p>
          </div>

          <div id="ex-dropzone-preview" class="${initialGifUrl ? '' : 'hidden'} flex flex-col items-center gap-2">
            <div class="relative w-28 h-28 rounded-lg overflow-hidden border border-gray-200/80 dark:border-gray-700/80 bg-black/5 dark:bg-white/5 flex items-center justify-center">
              <img id="ex-img-preview" src="${_escapeHtml(initialGifUrl)}" alt="Vorschau" class="w-full h-full object-contain" />
            </div>
            <div class="flex items-center gap-2">
              <span id="ex-img-preview-text" class="text-xs text-green-600 dark:text-green-400 font-medium">Bild / GIF aktiv</span>
              <button
                type="button"
                id="ex-remove-img-btn"
                class="px-2 py-0.5 text-xs rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 font-semibold transition-all cursor-pointer"
              >
                ✕ Entfernen
              </button>
            </div>
          </div>
        </div>

        <div id="ex-upload-status" class="text-[11px] font-medium mt-1.5 text-center hidden"></div>

        <!-- Manuelle Vorlagen oder URL Eingabe -->
        <details class="mt-2 text-xs">
          <summary class="cursor-pointer font-medium text-text-light-secondary dark:text-text-dark-secondary hover:text-brand-purple py-1">
            ⚙️ Vorlage wählen oder URL manuell eingeben...
          </summary>
          <div class="mt-2 space-y-2 pt-2 border-t border-gray-200/50 dark:border-gray-700/30">
            <select
              id="ex-preset"
              class="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark-secondary text-xs focus:outline-none focus:ring-2 focus:ring-brand-purple/50 cursor-pointer"
            >
              <option value="">-- ${t('editor_no_image')} --</option>
              ${EXERCISE_IMAGE_PRESETS.map((p) => `
                <option value="${_escapeHtml(p.url)}" ${p.url === selectedPresetVal ? 'selected' : ''}>
                  ${_escapeHtml(p.name)}
                </option>
              `).join('')}
              <option value="custom" ${selectedPresetVal === 'custom' ? 'selected' : ''}>${t('editor_preset_custom')}</option>
            </select>
            <input
              id="ex-gifurl" type="text"
              placeholder="Bild-/GIF-URL, /assets/... oder YouTube-Link"
              value="${_escapeHtml(initialGifUrl)}"
              class="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark-secondary text-xs focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
            >
            <p class="text-[11px] text-text-light-secondary dark:text-text-dark-secondary mt-1 leading-snug">
              🎬 GIF/Bild-URL <span class="opacity-60">oder</span> ▶️ YouTube-Link – die Startzeit wird übernommen
              (z.&nbsp;B. <code class="px-1 rounded bg-black/5 dark:bg-white/10">…watch?v=ID&amp;t=1m30s</code>).
            </p>
          </div>
        </details>
      </div>
    `;
  }

  function _setupExerciseFormListeners(formId, onSubmit) {
    const input = document.getElementById('ex-name');
    const form = document.getElementById(formId);
    const cancelBtn = document.getElementById('modal-cancel-btn');
    const presetSelect = document.getElementById('ex-preset');
    const gifUrlInput = document.getElementById('ex-gifurl');
    const previewImg = document.getElementById('ex-img-preview');
    const dropzoneEmpty = document.getElementById('ex-dropzone-empty');
    const dropzonePreview = document.getElementById('ex-dropzone-preview');
    const previewText = document.getElementById('ex-img-preview-text');
    const dropzone = document.getElementById('ex-dropzone');
    const removeImgBtn = document.getElementById('ex-remove-img-btn');
    const fileInput = document.getElementById('ex-file-input');
    const uploadStatus = document.getElementById('ex-upload-status');
    const t = (k) => (window.I18n ? I18n.t(k) : k);

    if (input) input.focus();
    if (cancelBtn) cancelBtn.onclick = () => Modal.close();

    const updatePreview = () => {
      const url = gifUrlInput?.value?.trim();
      if (url) {
        const isYt = window.MediaUrl && MediaUrl.isYouTube(url);
        if (previewImg) previewImg.src = isYt ? MediaUrl.thumbUrl(url) : url;
        if (dropzoneEmpty) dropzoneEmpty.classList.add('hidden');
        if (dropzonePreview) dropzonePreview.classList.remove('hidden');
        if (previewText) previewText.textContent = isYt ? '▶️ YouTube-Video aktiv' : 'Bild / GIF aktiv';
      } else {
        if (previewImg) previewImg.src = '';
        if (dropzoneEmpty) dropzoneEmpty.classList.remove('hidden');
        if (dropzonePreview) dropzonePreview.classList.add('hidden');
        if (previewText) previewText.textContent = 'Kein Bild ausgewählt';
      }
    };
    // Initial normalisieren (z.B. YouTube-Thumbnail statt kaputtem <img>)
    updatePreview();

    if (presetSelect && gifUrlInput) {
      presetSelect.onchange = () => {
        if (presetSelect.value && presetSelect.value !== 'custom') {
          gifUrlInput.value = presetSelect.value;
        } else if (presetSelect.value === '') {
          gifUrlInput.value = '';
        }
        updatePreview();
      };

      gifUrlInput.oninput = () => {
        const val = gifUrlInput.value.trim();
        const match = EXERCISE_IMAGE_PRESETS.find((p) => p.url === val);
        presetSelect.value = match ? match.url : (val ? 'custom' : '');
        updatePreview();
      };
    }

    if (dropzone && fileInput) {
      dropzone.onclick = (e) => {
        if (e.target.closest('#ex-remove-img-btn')) return;
        fileInput.click();
      };

      ['dragenter', 'dragover'].forEach((eventName) => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add('border-brand-purple', 'bg-purple-100/50', 'dark:bg-purple-900/30');
        });
      });

      ['dragleave', 'drop'].forEach((eventName) => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove('border-brand-purple', 'bg-purple-100/50', 'dark:bg-purple-900/30');
        });
      });

      dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt?.files;
        if (files && files.length > 0) {
          fileInput.files = files;
          fileInput.dispatchEvent(new Event('change'));
        }
      });
    }

    if (removeImgBtn) {
      removeImgBtn.onclick = (e) => {
        e.stopPropagation();
        if (gifUrlInput) gifUrlInput.value = '';
        if (presetSelect) presetSelect.value = '';
        updatePreview();
      };
    }

    if (fileInput) {
      fileInput.onchange = async () => {
        const file = fileInput.files[0];
        if (!file) return;

        const MAX_SIZE = 25 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
          if (window.ApiClient) ApiClient.showToast(t('editor_upload_err_size'), 'warning');
          return;
        }

        if (!file.type.startsWith('image/')) {
          if (window.ApiClient) ApiClient.showToast(t('editor_upload_err_type'), 'warning');
          return;
        }

        try {
          if (uploadStatus) {
            uploadStatus.textContent = `⏳ ${t('editor_uploading')}`;
            uploadStatus.classList.remove('hidden', 'text-red-500', 'text-green-500');
            uploadStatus.classList.add('text-brand-purple');
          }

          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          // Extended timeout to 90s for large files up to 25MB
          const res = await ApiClient.post(
            '/api/upload',
            { filename: file.name, dataUrl },
            { clientOptions: { timeoutMs: 90000, retries: 1 } }
          );

          if (res && res.url) {
            if (gifUrlInput) gifUrlInput.value = res.url;
            if (presetSelect) presetSelect.value = 'custom';
            updatePreview();

            if (uploadStatus) {
              uploadStatus.textContent = `✅ ${t('editor_upload_success')}`;
              uploadStatus.classList.remove('text-brand-purple');
              uploadStatus.classList.add('text-green-500');
            }
            if (window.ApiClient) ApiClient.showToast(t('editor_upload_success'), 'success');
          }
        } catch (err) {
          console.error('[Editor] Upload-Fehler:', err);
          if (uploadStatus) {
            uploadStatus.textContent = `❌ ${err.message || 'Upload fehlgeschlagen'}`;
            uploadStatus.classList.remove('text-brand-purple');
            uploadStatus.classList.add('text-red-500');
          }
        }
      };
    }

    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const name = input?.value?.trim();
        const sets = parseInt(document.getElementById('ex-sets')?.value) || 1;
        const reps = document.getElementById('ex-reps')?.value?.trim() || '';
        const desc = document.getElementById('ex-desc')?.value?.trim() || '';
        const gifUrl = gifUrlInput?.value?.trim() || '';

        if (!name) return;

        await onSubmit({ name, sets, reps, description: desc, gifUrl });
        Modal.close();
      };
    }
  }

  function _openAddExerciseModal(phaseId, phaseName) {
    if (!window.Modal) return;
    const t = (k, p) => (window.I18n ? I18n.t(k, p) : k);
    const translateText = (txt) => (window.I18n ? I18n.translateText(txt) : txt);

    Modal.open({
      title: t('editor_add_exercise_title'),
      content: `
        <p class="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-3">
          Phase: <strong>${_escapeHtml(translateText(phaseName))}</strong>
        </p>
        <form id="add-exercise-form" class="space-y-3.5">
          ${_buildExerciseFormFields()}
          <div class="flex items-center justify-end gap-2 pt-4 border-t border-gray-200/50 dark:border-gray-700/30">
            <button type="button" id="modal-cancel-btn" class="px-4 py-2 rounded-xl text-sm font-semibold text-text-light-secondary dark:text-text-dark-secondary hover:bg-gray-100 dark:hover:bg-surface-dark-tertiary cursor-pointer">
              ${t('editor_cancel')}
            </button>
            <button type="submit" class="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-brand shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer">
              ${t('editor_add_btn')}
            </button>
          </div>
        </form>
      `,
      size: 'md',
    });

    setTimeout(() => {
      _setupExerciseFormListeners('add-exercise-form', async (data) => {
        await addExercise(phaseId, data);
      });
    }, 100);
  }

  function _openEditExerciseModal(exercise, phaseId) {
    if (!window.Modal) return;
    const t = (k, p) => (window.I18n ? I18n.t(k, p) : k);

    Modal.open({
      title: t('editor_edit_exercise_title'),
      content: `
        <form id="edit-exercise-form" class="space-y-3.5">
          ${_buildExerciseFormFields(exercise)}
          <div class="flex items-center justify-end gap-2 pt-4 border-t border-gray-200/50 dark:border-gray-700/30">
            <button type="button" id="modal-cancel-btn" class="px-4 py-2 rounded-xl text-sm font-semibold text-text-light-secondary dark:text-text-dark-secondary hover:bg-gray-100 dark:hover:bg-surface-dark-tertiary cursor-pointer">
              ${t('editor_cancel')}
            </button>
            <button type="submit" class="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-brand shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer">
              ${t('editor_save')}
            </button>
          </div>
        </form>
      `,
      size: 'md',
    });

    setTimeout(() => {
      _setupExerciseFormListeners('edit-exercise-form', async (data) => {
        await updateExercise(exercise.id, data);
      });
    }, 100);
  }
  function _openAddPhaseModal() {
    if (!window.Modal) return;
    const t = (k) => (window.I18n ? I18n.t(k) : k);

    Modal.open({
      title: `${t('editor_add_phase')}`,
      content: `
        <form id="add-phase-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1" for="phase-name">${t('editor_phase_name')} <span class="text-red-500">*</span></label>
            <input
              id="phase-name" type="text" required
              placeholder="${t('editor_phase_placeholder')}"
              class="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark-secondary text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
            >
          </div>

          <div class="flex items-center justify-end gap-2 pt-4 border-t border-gray-200/50 dark:border-gray-700/30">
            <button type="button" id="modal-cancel-btn" class="px-4 py-2 rounded-xl text-sm font-semibold text-text-light-secondary dark:text-text-dark-secondary hover:bg-gray-100 dark:hover:bg-surface-dark-tertiary">
              ${t('editor_cancel')}
            </button>
            <button type="submit" class="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-brand shadow-md hover:scale-105 active:scale-95 transition-all">
              ${t('editor_add_phase')}
            </button>
          </div>
        </form>
      `,
    });

    setTimeout(() => {
      const input = document.getElementById('phase-name');
      const form = document.getElementById('add-phase-form');
      const cancelBtn = document.getElementById('modal-cancel-btn');

      if (input) input.focus();
      if (cancelBtn) cancelBtn.onclick = () => Modal.close();

      if (form) {
        form.onsubmit = async (e) => {
          e.preventDefault();
          const name = input?.value?.trim();
          if (!name) return;
          await ApiClient.post('/api/workout/phase', { name, workoutId: _workoutData?.activeWorkoutId });
          Modal.close();
          await _fetchWorkoutData();
          _render();
        };
      }
    }, 100);
  }

  function _openRenamePhaseModal(phaseId, currentName) {
    if (!window.Modal) return;
    const t = (k) => (window.I18n ? I18n.t(k) : k);

    Modal.open({
      title: `✏️ ${t('editor_rename_phase')}`,
      content: `
        <form id="rename-phase-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1" for="rename-phase-name">${t('editor_new_phase_name')}</label>
            <input
              id="rename-phase-name" type="text" required
              value="${_escapeHtml(currentName)}"
              class="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark-secondary text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
            >
          </div>

          <div class="flex items-center justify-end gap-2 pt-4 border-t border-gray-200/50 dark:border-gray-700/30">
            <button type="button" id="modal-cancel-btn" class="px-4 py-2 rounded-xl text-sm font-semibold text-text-light-secondary dark:text-text-dark-secondary hover:bg-gray-100 dark:hover:bg-surface-dark-tertiary">
              ${t('editor_cancel')}
            </button>
            <button type="submit" class="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-brand shadow-md hover:scale-105 active:scale-95 transition-all">
              ${t('editor_save')}
            </button>
          </div>
        </form>
      `,
    });

    setTimeout(() => {
      const input = document.getElementById('rename-phase-name');
      const form = document.getElementById('rename-phase-form');
      const cancelBtn = document.getElementById('modal-cancel-btn');

      if (input) input.focus();
      if (cancelBtn) cancelBtn.onclick = () => Modal.close();

      if (form) {
        form.onsubmit = async (e) => {
          e.preventDefault();
          const newName = input?.value?.trim();
          if (!newName) return;
          await ApiClient.patch(`/api/workout/phase/${encodeURIComponent(phaseId)}`, { name: newName });
          Modal.close();
          await _fetchWorkoutData();
          _render();
        };
      }
    }, 100);
  }

  function _escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ============================
  // Main Render & Event Binding
  // ============================

  function _render() {
    const container = document.getElementById('phases-container');
    const rhythmContainer = document.getElementById('rhythm-container');
    const loading = document.getElementById('editor-loading');
    const content = document.getElementById('editor-content');

    if (!_workoutData || !_workoutData.activeWorkout) return;

    if (loading) loading.classList.add('hidden');
    if (content) content.classList.remove('hidden');

    // Rhythm Container befüllen: Routines Bar + Schedule Card
    if (rhythmContainer) {
      rhythmContainer.innerHTML = `
        <div class="space-y-6">
          ${_buildRoutinesBar()}
          ${_buildScheduleCard()}
        </div>
      `;
      _bindScheduleEvents();
    }

    const phases = _workoutData.activeWorkout.phases || [];
    const totalPhases = phases.length;

    if (container) {
      container.innerHTML = phases.map((phase, idx) =>
        _buildPhaseHtml(phase, idx, totalPhases)
      ).join('');
    }

    _bindPhaseEvents();
  }

  function _bindScheduleEvents() {
    // Routine Switcher Tabs
    document.querySelectorAll('.routine-tab').forEach((tab) => {
      tab.addEventListener('click', async () => {
        const wId = tab.getAttribute('data-workout-id');
        if (wId && wId !== _workoutData.activeWorkoutId) {
          await _apiSelectWorkout(wId);
          _render();
        }
      });
    });

    // Neue Routine Button
    document.getElementById('create-routine-btn')?.addEventListener('click', () => {
      _openCreateRoutineModal();
    });

    // Routine Umbenennen
    document.getElementById('rename-routine-btn')?.addEventListener('click', () => {
      _openRenameRoutineModal();
    });

    // Routine Löschen
    document.getElementById('delete-routine-btn')?.addEventListener('click', async () => {
      if (!window.Modal) return;
      const active = _workoutData.activeWorkout;
      const t = (k) => (window.I18n ? I18n.t(k) : k);
      const confirmed = await Modal.confirm({
        title: `🗑️ ${t('editor_delete_routine')}`,
        message: t('editor_confirm_delete_routine'),
        confirmText: t('modal_confirm'),
        cancelText: t('modal_cancel'),
        danger: true,
      });

      if (confirmed) {
        await _apiDeleteWorkout(active.id);
        _render();
      }
    });

    // Schedule Type Radio Switcher (rhythm / weekdays)
    document.querySelectorAll('input[name="scheduleType"]').forEach((radio) => {
      radio.addEventListener('change', async (e) => {
        const newType = e.target.value;
        const active = _workoutData.activeWorkout;
        await _apiUpdateWorkout(active.id, { scheduleType: newType });
        _render();
      });
    });

    // Rhythm Stepper (− / +)
    const active = _workoutData.activeWorkout;
    const rhythmVal = active.rhythm || 2;

    document.getElementById('rhythm-decrease-btn')?.addEventListener('click', async () => {
      if (rhythmVal > 1) {
        await _apiUpdateWorkout(active.id, { rhythm: rhythmVal - 1 });
        _render();
      }
    });

    document.getElementById('rhythm-increase-btn')?.addEventListener('click', async () => {
      if (rhythmVal < 7) {
        await _apiUpdateWorkout(active.id, { rhythm: rhythmVal + 1 });
        _render();
      }
    });

    // Weekday Toggle Buttons
    document.querySelectorAll('.weekday-toggle-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const wIdx = parseInt(btn.getAttribute('data-weekday'));
        let currentWeekdays = Array.isArray(active.weekdays) ? [...active.weekdays] : [1, 3, 5];

        if (currentWeekdays.includes(wIdx)) {
          if (currentWeekdays.length > 1) {
            currentWeekdays = currentWeekdays.filter((d) => d !== wIdx);
          }
        } else {
          currentWeekdays.push(wIdx);
        }

        await _apiUpdateWorkout(active.id, { weekdays: currentWeekdays });
        _render();
      });
    });
  }

  function _bindPhaseEvents() {
    const container = document.getElementById('phases-container');
    if (!container) return;

    const addPhaseBtn = document.getElementById('add-phase-header-btn');
    if (addPhaseBtn) {
      addPhaseBtn.onclick = () => _openAddPhaseModal();
    }

    container.querySelectorAll('.phase-card').forEach((card) => {
      const phaseId = card.getAttribute('data-phase-id');

      card.querySelector('.rename-phase-btn')?.addEventListener('click', () => {
        const currentName = card.querySelector('.rename-phase-btn').getAttribute('data-phase-name');
        _openRenamePhaseModal(phaseId, currentName);
      });

      card.querySelector('.delete-phase-btn')?.addEventListener('click', async () => {
        const phaseName = card.querySelector('.delete-phase-btn').getAttribute('data-phase-name');
        const t = (k) => (window.I18n ? I18n.t(k) : k);
        if (!window.Modal) {
          await deletePhase(phaseId);
          return;
        }

        const confirmed = await Modal.confirm({
          title: `🗑️ ${t('editor_delete_phase')}`,
          message: t('editor_confirm_delete_phase'),
          confirmText: t('modal_confirm'),
          cancelText: t('modal_cancel'),
          danger: true,
        });

        if (confirmed) {
          await deletePhase(phaseId);
        }
      });

      card.querySelector('.move-phase-up-btn')?.addEventListener('click', async () => {
        await ApiClient.patch('/api/workout/phase/reorder', { phaseId, direction: 'up', workoutId: _workoutData.activeWorkoutId });
        await _fetchWorkoutData();
        _render();
      });

      card.querySelector('.move-phase-down-btn')?.addEventListener('click', async () => {
        await ApiClient.patch('/api/workout/phase/reorder', { phaseId, direction: 'down', workoutId: _workoutData.activeWorkoutId });
        await _fetchWorkoutData();
        _render();
      });

      card.querySelector('.add-exercise-btn')?.addEventListener('click', () => {
        const phaseName = card.querySelector('.rename-phase-btn')?.getAttribute('data-phase-name') || '';
        _openAddExerciseModal(phaseId, phaseName);
      });
    });

    container.querySelectorAll('.exercise-row').forEach((row) => {
      const exerciseId = row.getAttribute('data-exercise-id');
      const phaseId = row.getAttribute('data-phase-id');

      row.querySelector('.edit-exercise-btn')?.addEventListener('click', () => {
        const exercise = _getExercise(phaseId, exerciseId);
        if (exercise) {
          _openEditExerciseModal(exercise, phaseId);
        }
      });

      row.querySelector('.move-up-btn')?.addEventListener('click', async () => {
        const idx = _getExerciseIndex(phaseId, exerciseId);
        if (idx > 0) {
          await moveExercise(phaseId, exerciseId, 'up');
        }
      });

      row.querySelector('.move-down-btn')?.addEventListener('click', async () => {
        await moveExercise(phaseId, exerciseId, 'down');
      });

      row.querySelector('.delete-btn')?.addEventListener('click', async () => {
        await removeExercise(exerciseId);
      });
    });
  }

  function _getExercise(phaseId, exerciseId) {
    if (!_workoutData || !_workoutData.activeWorkout) return null;
    const phase = _workoutData.activeWorkout.phases.find((p) => p.id === phaseId);
    if (!phase) return null;
    return phase.exercises.find((e) => e.id === exerciseId) || null;
  }

  function _getExerciseIndex(phaseId, exerciseId) {
    if (!_workoutData || !_workoutData.activeWorkout) return -1;
    const phase = _workoutData.activeWorkout.phases.find((p) => p.id === phaseId);
    if (!phase) return -1;
    return phase.exercises.findIndex((e) => e.id === exerciseId);
  }

  // ============================
  // Öffentliche API
  // ============================

  async function init() {
    await _fetchWorkoutData();
    _render();
  }

  async function addExercise(phaseId, exerciseData, index) {
    const res = await _apiAddExercise(phaseId, exerciseData, index);
    if (res) {
      const msg = window.I18n ? I18n.t('editor_toast_exercise_added') : 'Exercise added!';
      if (window.ApiClient) ApiClient.showToast(msg, 'success');
      _render();
    }
  }

  async function updateExercise(exerciseId, exerciseData) {
    const res = await ApiClient.put(`/api/workout/exercise/${encodeURIComponent(exerciseId)}`, exerciseData);
    if (res) {
      const msg = window.I18n ? I18n.t('editor_toast_exercise_updated') : 'Exercise updated!';
      if (window.ApiClient) ApiClient.showToast(msg, 'success');
      await _fetchWorkoutData();
      _render();
    }
  }

  async function removeExercise(exerciseId) {
    const res = await _apiDeleteExercise(exerciseId);
    if (res) {
      const msg = window.I18n ? I18n.t('editor_toast_exercise_removed') : 'Exercise removed.';
      if (window.ApiClient) ApiClient.showToast(msg, 'info');
      _render();
    }
  }

  async function moveExercise(phaseId, exerciseId, direction) {
    const idx = _getExerciseIndex(phaseId, exerciseId);
    if (idx === -1) return;

    const newIndex = direction === 'up' ? idx - 1 : idx + 1;
    const res = await _apiReorder(phaseId, exerciseId, newIndex);
    if (res) {
      await _fetchWorkoutData();
      _render();
    }
  }

  async function deletePhase(phaseId) {
    const res = await ApiClient.del(`/api/workout/phase/${encodeURIComponent(phaseId)}`);
    if (res) {
      const msg = window.I18n ? I18n.t('editor_toast_phase_deleted') : 'Phase deleted.';
      if (window.ApiClient) ApiClient.showToast(msg, 'info');
      await _fetchWorkoutData();
      _render();
    }
  }

  return {
    init,
    render: _render,
    addExercise,
    updateExercise,
    removeExercise,
    moveExercise,
    deletePhase,
  };
})();

window.Editor = Editor;
