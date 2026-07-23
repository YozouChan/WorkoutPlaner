/**
 * components/calendar-bar.js
 * ===========================
 * Kalenderleiste mit dynamischer Tagesanzahl und Navigation.
 *
 * Zweck:
 * - Zeigt so viele Tage wie in die Leiste passen (dynamisch per ResizeObserver)
 * - Navigationspfeile links/rechts zum Verschieben des Tagesfensters
 * - Hebt den aktuellen Tag hervor (leuchtender Rahmen, Gradient)
 * - Unterscheidet Trainings- und Pausentage farblich
 * - Zeigt Statusindikatoren: ✅ abgeschlossen, ⏭️ übersprungen, ❌ versäumt
 * - Klick auf Tag wählt diesen aus und benachrichtigt Calendar-Modul
 *
 * Exportierte Funktionen (global auf window.CalendarBar):
 * - render(days, selectedDay) → void (Kalenderleiste rendern)
 * - setSelected(dateStr)      → void (Tag visuell als ausgewählt markieren)
 *
 * DOM-Abhängigkeiten:
 * - #calendar-bar-container → Äußerer Container (mit Pfeilen)
 * - #calendar-bar           → Container für die Tages-Kacheln
 * - #cal-nav-prev           → Zurück-Pfeil
 * - #cal-nav-next           → Vorwärts-Pfeil
 *
 * Abhängigkeiten: modules/calendar.js
 * Genutzt von: modules/calendar.js, app.js
 */

const CalendarBar = (() => {
  // ============================
  // Private Variablen
  // ============================
  let containerEl = null;
  let _currentSelected = null;
  let _resizeObserver = null;
  const DAY_CARD_WIDTH_MOBILE = 56;  // w-12 (48px) + 8px gap
  const DAY_CARD_WIDTH_DESKTOP = 76; // w-16 (64px) + 12px gap

  // ============================
  // Private Funktionen
  // ============================

  /**
   * Berechnet wie viele Tage in die Leiste passen.
   * @returns {number}
   */
  function _calcDaysPerPage() {
    const section = document.getElementById('calendar-bar-container');
    if (!section) return 7;
    const isMobile = window.innerWidth < 640; // sm breakpoint
    const cardWidth = isMobile ? DAY_CARD_WIDTH_MOBILE : DAY_CARD_WIDTH_DESKTOP;
    // Breite abzüglich Pfeil-Buttons (2 × 40px) und Padding
    const arrowWidth = isMobile ? 80 : 96;
    const padding = isMobile ? 16 : 24;
    const available = section.offsetWidth - arrowWidth - padding;
    return Math.max(3, Math.floor(available / cardWidth));
  }

  /**
   * Erstellt das HTML für einen einzelnen Kalendertag.
   * @param {object} day - DayData-Objekt
   * @param {boolean} isSelected - Ob dieser Tag ausgewählt ist
   * @returns {string} HTML-String
   */
  function _buildDayHtml(day, isSelected) {
    let classes = 'calendar-day';
    let statusIcon = '';
    let extraStyles = '';
    let titleText = '';

    const t = (k) => (window.I18n ? I18n.t(k) : k);
    const lang = window.I18n ? I18n.getLanguage() : 'de';
    const locale = lang === 'en' ? 'en-US' : 'de-DE';
    const parsedDate = new Date(day.date + 'T00:00:00');
    const dayName = parsedDate.toLocaleDateString(locale, { weekday: 'short' });

    if (day.isToday) {
      classes += ' today';
      titleText = day.workoutName ? `🏋️ ${day.workoutName} (${t('day_view_today')})` : `🏋️ ${t('day_view_today')}`;
    } else if (day.isCompleted) {
      classes += ' training';
      statusIcon = '<span class="text-green-400 text-xs">✅</span>';
      extraStyles = 'border-color: rgb(74, 222, 128);';
      titleText = `✅ ${t('day_view_completed')} ${day.workoutName ? '(' + day.workoutName + ')' : ''}`;
    } else if (day.isMissed) {
      // Vergangener, versäumter Trainingstag
      classes += ' training';
      statusIcon = '<span class="text-red-400 text-xs">❌</span>';
      extraStyles = 'border-color: rgba(248, 113, 113, 0.6); opacity: 0.75;';
      titleText = `❌ ${t('day_view_missed')}`;
    } else if (day.isSkipped) {
      classes += ' rest';
      statusIcon = '<span class="text-yellow-400 text-xs">⏭️</span>';
      titleText = `⏭️ ${t('day_view_skipped')}`;
    } else if (day.isTraining) {
      classes += ' training';
      titleText = day.workoutName ? `🏋️ ${day.workoutName}` : `🏋️ ${t('day_view_training')}`;
    } else {
      classes += ' rest';
      titleText = `😴 ${t('day_view_rest')}`;
    }

    // Ausgewählter Tag (nicht heute)
    if (isSelected && !day.isToday) {
      extraStyles += 'border-color: rgba(168, 85, 247, 0.7); box-shadow: 0 0 14px rgba(168, 85, 247, 0.35);';
    }

    // Trainings-Punkt-Indikator (nur wenn kein anderes Icon)
    let typeIndicator = '';
    if (day.isTraining && !day.isSkipped && !day.isCompleted && !day.isMissed && !day.isToday) {
      typeIndicator = '<span class="w-1.5 h-1.5 rounded-full bg-brand-purple mt-1"></span>';
    }

    return `
      <button
        class="${classes} flex-shrink-0"
        data-date="${day.date}"
        style="${extraStyles}"
        title="${titleText} – ${day.date}"
      >
        <span class="text-xs opacity-60 uppercase">${dayName}</span>
        <span class="text-lg font-bold leading-tight">${day.dayNumber}</span>
        ${statusIcon || typeIndicator}
      </button>
    `;
  }

  /**
   * Bindet Klick-Events an alle Tages-Buttons.
   */
  function _bindDayEvents() {
    if (!containerEl) return;

    const dayButtons = containerEl.querySelectorAll('.calendar-day');
    dayButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const dateStr = btn.getAttribute('data-date');
        if (dateStr && window.Calendar) {
          Calendar.selectDay(dateStr);
        }
      });
    });
  }

  /**
   * Bindet die Navigationspfeil-Events + Touch-Swipe für Mobile.
   */
  function _bindNavEvents() {
    const prevBtn = document.getElementById('cal-nav-prev');
    const nextBtn = document.getElementById('cal-nav-next');

    if (prevBtn) {
      prevBtn.addEventListener('click', async () => {
        if (window.Calendar) {
          const delta = -Calendar.getDaysPerPage();
          await Calendar.navigateDays(delta);
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', async () => {
        if (window.Calendar) {
          const delta = Calendar.getDaysPerPage();
          await Calendar.navigateDays(delta);
        }
      });
    }

    // Touch-Swipe für Mobile-Navigation
    const barSection = document.getElementById('calendar-bar-container');
    if (barSection) {
      let touchStartX = 0;
      let touchStartY = 0;

      barSection.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }, { passive: true });

      barSection.addEventListener('touchend', async (e) => {
        const deltaX = e.changedTouches[0].clientX - touchStartX;
        const deltaY = e.changedTouches[0].clientY - touchStartY;

        // Nur horizontale Swipes (mehr horizontal als vertikal)
        if (Math.abs(deltaX) < 40 || Math.abs(deltaX) < Math.abs(deltaY)) return;

        if (window.Calendar) {
          if (deltaX < 0) {
            // Links wischen = nächste Tage
            await Calendar.navigateDays(Calendar.getDaysPerPage());
          } else {
            // Rechts wischen = vorherige Tage
            await Calendar.navigateDays(-Calendar.getDaysPerPage());
          }
        }
      }, { passive: true });
    }
  }

  /**
   * Aktualisiert den Disabled-State der Navigationspfeile.
   */
  function _updateNavState() {
    const prevBtn = document.getElementById('cal-nav-prev');
    if (prevBtn && window.Calendar) {
      const offset = Calendar.getOffset();
      // Nicht weiter als 90 Tage zurück
      prevBtn.disabled = offset <= -90;
      prevBtn.classList.toggle('opacity-30', offset <= -90);
    }
  }

  /**
   * Beobachtet Größenänderungen des Containers und passt daysPerPage an.
   */
  function _setupResizeObserver() {
    if (_resizeObserver) {
      _resizeObserver.disconnect();
    }

    const section = document.getElementById('calendar-bar-container');
    if (!section || typeof ResizeObserver === 'undefined') return;

    let lastCount = _calcDaysPerPage();

    _resizeObserver = new ResizeObserver(() => {
      const newCount = _calcDaysPerPage();
      if (newCount !== lastCount && window.Calendar) {
        lastCount = newCount;
        Calendar.setDaysPerPage(newCount);
        Calendar.refresh();
      }
    });

    _resizeObserver.observe(section);
  }

  // ============================
  // Öffentliche Funktionen
  // ============================

  /**
   * Rendert die Kalenderleiste mit den gegebenen Tagen.
   * @param {Array} days - Array von DayData-Objekten
   * @param {object|null} selectedDay - Der aktuell ausgewählte Tag
   */
  function render(days, selectedDay = null) {
    containerEl = document.getElementById('calendar-bar');
    if (!containerEl) {
      console.warn('[CalendarBar] #calendar-bar Element nicht gefunden.');
      return;
    }

    _currentSelected = selectedDay?.date || null;

    // Berechne und setze daysPerPage
    const daysPerPage = _calcDaysPerPage();
    if (window.Calendar) {
      Calendar.setDaysPerPage(daysPerPage);
    }

    // HTML generieren
    const html = days.map((day) => {
      const isSelected = _currentSelected === day.date;
      return _buildDayHtml(day, isSelected);
    }).join('');

    containerEl.innerHTML = html;

    // Events binden
    _bindDayEvents();
    _updateNavState();

    // Zum heutigen/ausgewählten Tag scrollen
    setTimeout(() => {
      const todayEl = containerEl.querySelector('.calendar-day.today');
      if (todayEl) {
        todayEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }, 50);

    console.log('[CalendarBar] Gerendert mit', days.length, 'Tagen.');
  }

  /**
   * Markiert einen Tag als visuell ausgewählt.
   * @param {string} dateStr - ISO-Datum-String (YYYY-MM-DD)
   */
  function setSelected(dateStr) {
    if (!containerEl) return;

    _currentSelected = dateStr;

    const dayButtons = containerEl.querySelectorAll('.calendar-day');
    dayButtons.forEach((btn) => {
      const btnDate = btn.getAttribute('data-date');
      const isSelected = btnDate === dateStr;
      const isToday = btn.classList.contains('today');
      const isMissed = btn.title.includes('Versäumt');
      const isCompleted = btn.title.includes('Abgeschlossen');

      if (isSelected && !isToday) {
        btn.style.borderColor = 'rgba(168, 85, 247, 0.7)';
        btn.style.boxShadow = '0 0 14px rgba(168, 85, 247, 0.35)';
      } else if (!isToday) {
        // Originalfarben wiederherstellen
        if (isCompleted) {
          btn.style.borderColor = 'rgb(74, 222, 128)';
        } else if (isMissed) {
          btn.style.borderColor = 'rgba(248, 113, 113, 0.6)';
        } else {
          btn.style.borderColor = 'transparent';
        }
        btn.style.boxShadow = '';
      }
    });
  }

  /**
   * Initialisiert die Pfeile und den ResizeObserver (einmalig beim ersten render).
   */
  function initNavigation() {
    _bindNavEvents();
    _setupResizeObserver();
  }

  // ============================
  // Public API
  // ============================
  return {
    render,
    setSelected,
    initNavigation,
    calcDaysPerPage: _calcDaysPerPage,
  };
})();

// Global verfügbar machen
window.CalendarBar = CalendarBar;
