/**
 * components/workout-card.js
 * ===========================
 * Wiederverwendbare Workout-Karten-Komponente.
 *
 * Zweck:
 * - Rendert eine einzelne Übung als interaktive Karte
 * - Checkbox zum Abhaken (mit Animation)
 * - Accordion: Aufklappbare Beschreibung + GIF
 * - Visuelles Feedback für erledigte Übungen
 * - Kann standalone genutzt werden (außerhalb der day-view)
 *
 * Exportierte Funktionen (global auf window.WorkoutCard):
 * - build(exercise, options)    → HTMLElement (DOM-Element zurückgeben)
 * - buildHTML(exercise, options) → string (HTML-String zurückgeben)
 *
 * Options:
 * {
 *   isChecked: boolean,       // Bereits abgehakt?
 *   readOnly: boolean,        // Keine Interaktion (z.B. für vergangene Tage)
 *   showPhaseLabel: boolean,  // Phasen-Label über der Karte anzeigen?
 *   onCheck: Function,        // Callback bei Abhaken: (exerciseId, isChecked) => void
 * }
 *
 * DOM-Abhängigkeiten: keine (selbst-contained)
 * Genutzt von: components/day-view.js, components/editor.js
 */

const WorkoutCard = (() => {
  // ============================
  // Private Funktionen
  // ============================

  /**
   * Erstellt den HTML-String für eine Workout-Karte.
   * @param {object} exercise - Übungs-Daten
   * @param {object} options - Render-Optionen
   * @returns {string} HTML-String
   */
  function _buildCardHTML(exercise, options = {}) {
    const {
      isChecked = false,
      readOnly = false,
      showPhaseLabel = false,
      phaseLabel = '',
      phaseEmoji = '',
    } = options;

    const t = (k) => (window.I18n ? I18n.t(k) : k);
    const translateReps = (r) => (window.I18n ? I18n.translateReps(r) : r);
    const translateText = (txt) => (window.I18n ? I18n.translateText(txt) : txt);

    const checkIcon = isChecked ? '✅' : '⬜';
    const cardStateClass = isChecked
      ? 'workout-card completed border-green-400/40 bg-green-50/20 dark:bg-green-900/10'
      : 'workout-card';
    const nameClass = isChecked ? 'line-through opacity-50' : '';
    const metaClass = isChecked ? 'opacity-50' : '';

    const translatedPhaseLabel = translateText(phaseLabel);

    const phaseLabelHtml = showPhaseLabel && phaseLabel ? `
      <div class="flex items-center gap-1.5 mb-2">
        <span class="text-base">${phaseEmoji}</span>
        <span class="text-xs uppercase tracking-widest font-semibold text-text-light-secondary dark:text-text-dark-secondary">${translatedPhaseLabel}</span>
      </div>
    ` : '';

    const ytEmbed = (window.MediaUrl && MediaUrl.isYouTube(exercise.gifUrl)) ? MediaUrl.embedUrl(exercise.gifUrl) : null;
    const gifHtml = ytEmbed
      ? `<div class="mt-3 rounded-xl overflow-hidden bg-black">
           <div class="relative" style="padding-bottom:56.25%">
             <iframe src="${ytEmbed}" title="${exercise.name}"
                     class="absolute inset-0 w-full h-full" frameborder="0" loading="lazy"
                     allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                     referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
           </div>
         </div>`
      : exercise.gifUrl
      ? `<div class="mt-3 rounded-xl overflow-hidden bg-black/5 dark:bg-white/5">
           <img src="${exercise.gifUrl}" alt="${exercise.name}"
                class="w-full max-h-56 object-contain" loading="lazy">
         </div>`
      : `<div class="mt-3 p-3 rounded-xl bg-gray-100 dark:bg-surface-dark-tertiary flex items-center gap-2 text-sm text-text-light-secondary dark:text-text-dark-secondary">
           <span>🎬</span> <span>${t('card_no_video')}</span>
         </div>`;

    const checkBtnTitle = isChecked ? t('card_uncheck') : t('card_check');
    const setLabel = exercise.sets === 1 ? t('card_set') : t('card_sets');
    const repsLabel = translateReps(exercise.reps);
    const exDescription = translateText(exercise.description);

    const checkBtnHtml = readOnly
      ? `<span class="text-2xl flex-shrink-0 mt-0.5">${checkIcon}</span>`
      : `<button
           class="exercise-check-btn flex-shrink-0 text-2xl mt-0.5 hover:scale-110 active:scale-95 transition-all duration-150 cursor-pointer focus:outline-none"
           data-exercise-id="${exercise.id}"
           title="${checkBtnTitle}"
           aria-pressed="${isChecked}"
         >${checkIcon}</button>`;

    return `
      ${phaseLabelHtml}
      <div class="${cardStateClass} group" data-exercise-id="${exercise.id}">
        <div class="flex items-start gap-3">

          <!-- Checkbox -->
          ${checkBtnHtml}

          <!-- Inhalt -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2">
              <!-- Name + Sätze/Wdh -->
              <div class="flex-1">
                <h5 class="font-semibold leading-tight ${nameClass} transition-all duration-300">
                  ${exercise.name}
                </h5>
                <p class="text-sm mt-0.5 ${metaClass} transition-all duration-300">
                  <span class="inline-flex items-center gap-1 text-brand-purple font-medium">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                    ${exercise.sets} ${setLabel}
                  </span>
                  <span class="mx-1.5 opacity-30">×</span>
                  <span class="${metaClass}">${repsLabel}</span>
                </p>
              </div>

              <!-- Aufklapp-Button -->
              ${!readOnly ? `
              <button
                class="exercise-toggle-btn flex-shrink-0 p-1.5 rounded-lg text-text-light-secondary dark:text-text-dark-secondary hover:bg-gray-100 dark:hover:bg-surface-dark-tertiary hover:text-brand-purple transition-all duration-200 focus:outline-none"
                data-exercise-id="${exercise.id}"
                title="${t('card_details')}"
                aria-expanded="false"
              >
                <svg class="w-4 h-4 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
              ` : ''}
            </div>

            <!-- Aufklappbarer Detail-Bereich -->
            <div
              class="exercise-details hidden overflow-hidden"
              data-exercise-id="${exercise.id}"
            >
              <div class="pt-3 mt-3 border-t border-gray-200/60 dark:border-gray-700/40">
                <!-- Beschreibung -->
                <div class="text-sm text-text-light-secondary dark:text-text-dark-secondary leading-relaxed space-y-1">
                  <p class="font-medium text-text-light dark:text-text-dark mb-2 flex items-center gap-1.5">
                    <span>📝</span> ${t('card_execution')}
                  </p>
                  <p>${exDescription}</p>
                </div>
                <!-- GIF / Video -->
                ${gifHtml}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Bindet Checkbox- und Toggle-Events an eine gerenderte Karte.
   * @param {HTMLElement} container - Container-Element
   * @param {Function|null} onCheck - Callback (exerciseId, isChecked)
   */
  function _bindCardEvents(container, onCheck) {
    // Checkbox
    const checkBtn = container.querySelector('.exercise-check-btn');
    if (checkBtn) {
      checkBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = checkBtn.getAttribute('data-exercise-id');
        const isCurrentlyChecked = checkBtn.textContent.trim() === '✅';
        if (onCheck) onCheck(id, !isCurrentlyChecked);
      });
    }

    // Aufklapp-Toggle
    const toggleBtn = container.querySelector('.exercise-toggle-btn');
    const detailsEl = container.querySelector('.exercise-details');
    if (toggleBtn && detailsEl) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isExpanded = !detailsEl.classList.contains('hidden');
        const svg = toggleBtn.querySelector('svg');

        if (isExpanded) {
          detailsEl.classList.add('hidden');
          svg && (svg.style.transform = '');
          toggleBtn.setAttribute('aria-expanded', 'false');
        } else {
          detailsEl.classList.remove('hidden');
          svg && (svg.style.transform = 'rotate(180deg)');
          toggleBtn.setAttribute('aria-expanded', 'true');
        }
      });
    }
  }

  // ============================
  // Öffentliche Funktionen
  // ============================

  /**
   * Erstellt eine Workout-Karte als HTML-String.
   * Wird von day-view.js verwendet zum Einbetten in größere Strukturen.
   *
   * @param {object} exercise - { id, name, sets, reps, description, gifUrl }
   * @param {object} options  - { isChecked, readOnly, showPhaseLabel, phaseLabel, phaseEmoji }
   * @returns {string} HTML-String
   */
  function buildHTML(exercise, options = {}) {
    return _buildCardHTML(exercise, options);
  }

  /**
   * Erstellt eine Workout-Karte als DOM-Element mit gebundenen Events.
   * Nützlich wenn onCheck-Callback direkt registriert werden soll.
   *
   * @param {object} exercise - { id, name, sets, reps, description, gifUrl }
   * @param {object} options  - { isChecked, readOnly, showPhaseLabel, phaseLabel, phaseEmoji, onCheck }
   * @returns {HTMLElement} Wrapper-div mit der Karte
   */
  function build(exercise, options = {}) {
    const { onCheck, ...renderOptions } = options;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = _buildCardHTML(exercise, renderOptions).trim();

    _bindCardEvents(wrapper, onCheck || null);

    return wrapper;
  }

  // ============================
  // Public API
  // ============================
  return {
    build,
    buildHTML,
  };
})();

// Global verfügbar machen
window.WorkoutCard = WorkoutCard;
