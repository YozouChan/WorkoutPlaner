/**
 * modules/calendar.js
 * ====================
 * Kalender-Logik für die Workout-Kalender App.
 *
 * Zweck:
 * - Lädt die Kalenderansicht vom Server (mit konfigurierbarem Offset und Anzahl)
 * - Bestimmt ob ein Tag ein Trainings- oder Pausentag ist
 * - Stellt Daten für die Kalenderleiste bereit
 * - Verwaltet den aktuell ausgewählten Tag
 * - Unterstützt Navigation (vor/zurück in Tagen)
 *
 * Exportierte Funktionen (global auf window.Calendar):
 * - init()                → Promise<void> (Daten laden und Kalender rendern)
 * - getDays()             → Array<DayData>
 * - getNext14Days()       → Array<DayData> (Alias für getDays())
 * - getSelectedDay()      → DayData | null
 * - selectDay(dateStr)    → void
 * - navigateDays(delta)   → Promise<void>  (Offset um delta Tage verschieben)
 * - refresh()             → Promise<void> (Daten neu laden)
 * - onDaySelected(cb)     → void (Callback registrieren)
 * - getOffset()           → number  (Aktueller Tages-Offset)
 * - getDaysPerPage()      → number  (Wie viele Tage aktuell angezeigt werden)
 * - setDaysPerPage(n)     → void
 *
 * DayData: { date, dayName, dayNumber, month, isToday, isPast, isTraining, isCompleted, isSkipped, isMissed }
 *
 * Abhängigkeiten: API /api/calendar
 * Genutzt von: components/calendar-bar.js, components/day-view.js, app.js
 */

const Calendar = (() => {
  // ============================
  // Private Variablen
  // ============================
  let _days = [];
  let _selectedDay = null;
  let _onDaySelectedCallbacks = [];
  let _offset = 0;           // Tages-Offset relativ zu heute
  let _daysPerPage = 14;     // Wird von CalendarBar dynamisch gesetzt

  // ============================
  // Private Funktionen
  // ============================

  /**
   * Lädt die Kalenderdaten vom Server.
   * @returns {Promise<Array>}
   */
  async function _fetchCalendarData() {
    try {
      const params = new URLSearchParams({
        offset: _offset,
        count: _daysPerPage,
      });
      const data = await ApiClient.get(`/api/calendar?${params}`);
      return data.days || [];
    } catch (err) {
      console.error('[Calendar] Fehler beim Laden der Kalenderdaten:', err);
      return [];
    }
  }

  /**
   * Benachrichtigt alle registrierten Callbacks über eine Tagesauswahl.
   * @param {object} day - Das ausgewählte DayData-Objekt
   */
  function _notifyDaySelected(day) {
    _onDaySelectedCallbacks.forEach((cb) => {
      try {
        cb(day);
      } catch (err) {
        console.error('[Calendar] Fehler im onDaySelected Callback:', err);
      }
    });
  }

  // ============================
  // Öffentliche Funktionen
  // ============================

  /**
   * Initialisiert das Kalender-Modul.
   * Lädt die Daten und wählt den heutigen Tag aus.
   */
  async function init() {
    _days = await _fetchCalendarData();

    // Heutigen Tag als Standard auswählen
    const today = _days.find((d) => d.isToday);
    if (today) {
      _selectedDay = today;
    } else if (_days.length > 0) {
      _selectedDay = _days[0];
    }

    // Kalenderleiste rendern
    if (window.CalendarBar) {
      CalendarBar.render(_days, _selectedDay);
    }

    // Tagesansicht rendern
    if (_selectedDay) {
      _notifyDaySelected(_selectedDay);
    }

    console.log(`[Calendar] Initialisiert mit ${_days.length} Tagen (Offset: ${_offset}).`);
  }

  /**
   * Gibt die aktuell geladenen Tage zurück.
   * @returns {Array<DayData>}
   */
  function getDays() {
    return _days;
  }

  /**
   * Alias für getDays() (Rückwärtskompatibilität).
   * @returns {Array<DayData>}
   */
  function getNext14Days() {
    return _days;
  }

  /**
   * Gibt den aktuell ausgewählten Tag zurück.
   * @returns {DayData|null}
   */
  function getSelectedDay() {
    return _selectedDay;
  }

  /**
   * Gibt den aktuellen Tages-Offset zurück.
   * @returns {number}
   */
  function getOffset() {
    return _offset;
  }

  /**
   * Gibt die aktuelle Anzahl angezeigter Tage zurück.
   * @returns {number}
   */
  function getDaysPerPage() {
    return _daysPerPage;
  }

  /**
   * Setzt die Anzahl der angezeigten Tage (wird von CalendarBar gesetzt).
   * @param {number} n
   */
  function setDaysPerPage(n) {
    if (n > 0 && n !== _daysPerPage) {
      _daysPerPage = n;
    }
  }

  /**
   * Navigiert den Kalender um delta Tage vor/zurück.
   * Lädt anschließend neue Daten und rendert die Leiste neu.
   * @param {number} delta - Positive Zahl = vorwärts, negative = rückwärts
   */
  async function navigateDays(delta) {
    _offset += delta;

    // Maximal 90 Tage in die Vergangenheit
    if (_offset < -90) _offset = -90;

    _days = await _fetchCalendarData();

    // Kalenderleiste neu rendern
    if (window.CalendarBar) {
      CalendarBar.render(_days, _selectedDay);
    }

    console.log(`[Calendar] Navigiert zu Offset ${_offset}.`);
  }

  /**
   * Wählt einen Tag aus und benachrichtigt alle Listener.
   * Falls der Tag nicht im aktuellen Fenster ist, wird in das Fenster navigiert.
   * @param {string} dateStr - ISO-Datum-String (YYYY-MM-DD)
   */
  function selectDay(dateStr) {
    const day = _days.find((d) => d.date === dateStr);
    if (!day) {
      console.warn(`[Calendar] Tag ${dateStr} nicht im aktuellen Fenster.`);
      return;
    }

    _selectedDay = day;

    // Kalenderleiste aktualisieren
    if (window.CalendarBar) {
      CalendarBar.setSelected(dateStr);
    }

    // Listener benachrichtigen
    _notifyDaySelected(day);
  }

  /**
   * Lädt die Kalenderdaten neu vom Server.
   */
  async function refresh() {
    _days = await _fetchCalendarData();

    // Kalenderleiste aktualisieren
    if (window.CalendarBar) {
      CalendarBar.render(_days, _selectedDay);
    }

    // Ausgewählten Tag aktualisieren (falls noch vorhanden)
    if (_selectedDay) {
      const updated = _days.find((d) => d.date === _selectedDay.date);
      if (updated) {
        _selectedDay = updated;
        _notifyDaySelected(updated);
      }
    }

    console.log('[Calendar] Daten aktualisiert.');
  }

  /**
   * Registriert einen Callback, der bei Tagesauswahl aufgerufen wird.
   * @param {Function} callback - Funktion mit (dayData) Parameter
   */
  function onDaySelected(callback) {
    if (typeof callback === 'function') {
      _onDaySelectedCallbacks.push(callback);
    }
  }

  // ============================
  // Public API
  // ============================
  return {
    init,
    getDays,
    getNext14Days,
    getSelectedDay,
    getOffset,
    getDaysPerPage,
    setDaysPerPage,
    selectDay,
    navigateDays,
    refresh,
    onDaySelected,
  };
})();

// Global verfügbar machen
window.Calendar = Calendar;
