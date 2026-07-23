/**
 * components/modal.js
 * ====================
 * Wiederverwendbare Modal-Komponente.
 *
 * Zweck:
 * - Erstellt ein zentriertes Overlay-Modal
 * - Unterstützt beliebigen Inhalt (HTML-String oder DOM-Element)
 * - Schließbar per X-Button, Escape-Taste oder Klick auf Overlay
 * - Fade-in/Fade-out Animation
 * - Unterstützt verschachtelte Bestätigungsdialoge
 *
 * Exportierte Funktionen (global auf window.Modal):
 * - open(options)   → void
 *   options: { title, content, onClose, showCloseButton, size }
 * - close()         → void
 * - isOpen()        → boolean
 * - confirm(options) → Promise<boolean>
 *   options: { title, message, confirmText, cancelText, danger }
 *
 * DOM-Abhängigkeiten:
 * - #modal-container → Container für das Modal
 *
 * CSS-Klassen: .modal-overlay, .modal-content (definiert in input.css)
 * Genutzt von: modules/settings.js, modules/skip.js, components/gif-overlay.js
 */

const Modal = (() => {
  // ============================
  // Private Variablen
  // ============================
  let containerEl = null;
  let _isOpen = false;
  let _onCloseCallback = null;

  // ============================
  // Private Funktionen
  // ============================

  /**
   * Erzeugt das Modal-HTML und fügt es in den Container ein.
   * @param {object} options
   */
  function _render(options) {
    const {
      title = '',
      content = '',
      showCloseButton = true,
      size = 'md', // 'sm', 'md', 'lg'
    } = options;

    const sizeClasses = {
      sm: 'max-w-sm',
      md: 'max-w-lg',
      lg: 'max-w-2xl',
    };

    const contentHtml = typeof content === 'string' ? content : '';

    const modalHtml = `
      <div class="modal-overlay" id="modal-overlay">
        <div class="card-glass p-0 ${sizeClasses[size] || sizeClasses.md} w-full mx-4 animate-bounce-in overflow-hidden" id="modal-body">

          <!-- Modal Header -->
          <div class="flex items-center justify-between p-6 pb-4 border-b border-gray-200/50 dark:border-gray-700/30">
            <h3 class="text-lg font-bold">${title}</h3>
            ${showCloseButton ? `
              <button id="modal-close-btn" class="p-1.5 rounded-lg text-text-light-secondary dark:text-text-dark-secondary hover:bg-gray-100 dark:hover:bg-surface-dark-tertiary transition-colors" title="Schließen">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            ` : ''}
          </div>

          <!-- Modal Content -->
          <div class="p-6" id="modal-content-body">
            ${contentHtml}
          </div>
        </div>
      </div>
    `;

    containerEl.innerHTML = modalHtml;

    // Wenn content ein DOM-Element ist, in den Body einfügen
    if (typeof content !== 'string' && content instanceof HTMLElement) {
      document.getElementById('modal-content-body').appendChild(content);
    }

    // Event-Listener registrieren
    _bindModalEvents();
  }

  /**
   * Registriert Event-Listener für das aktuelle Modal.
   */
  function _bindModalEvents() {
    // X-Button
    const closeBtn = document.getElementById('modal-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', close);
    }

    // Overlay-Klick (nur auf das Overlay selbst, nicht auf den Inhalt)
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          close();
        }
      });
    }

    // Escape-Taste
    document.addEventListener('keydown', _handleEscape);
  }

  /**
   * Escape-Taste Handler.
   * @param {KeyboardEvent} e
   */
  function _handleEscape(e) {
    if (e.key === 'Escape' && _isOpen) {
      close();
    }
  }

  // ============================
  // Öffentliche Funktionen
  // ============================

  /**
   * Öffnet ein Modal mit den gegebenen Optionen.
   * @param {object} options
   * @param {string} options.title - Titel des Modals
   * @param {string|HTMLElement} options.content - Inhalt (HTML-String oder DOM-Element)
   * @param {Function} [options.onClose] - Callback beim Schließen
   * @param {boolean} [options.showCloseButton=true] - X-Button anzeigen
   * @param {string} [options.size='md'] - Größe: 'sm', 'md', 'lg'
   */
  function open(options = {}) {
    containerEl = document.getElementById('modal-container');
    if (!containerEl) {
      console.warn('[Modal] #modal-container nicht gefunden.');
      return;
    }

    _onCloseCallback = options.onClose || null;
    _render(options);
    _isOpen = true;

    // Hintergrund-Scroll verhindern
    document.body.style.overflow = 'hidden';
  }

  /**
   * Schließt das aktuelle Modal.
   */
  function close() {
    if (!_isOpen || !containerEl) return;

    // Fade-out Animation
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.2s ease-out';

      setTimeout(() => {
        containerEl.innerHTML = '';
        _isOpen = false;
        document.body.style.overflow = '';
        document.removeEventListener('keydown', _handleEscape);

        if (_onCloseCallback) {
          _onCloseCallback();
          _onCloseCallback = null;
        }
      }, 200);
    } else {
      containerEl.innerHTML = '';
      _isOpen = false;
      document.body.style.overflow = '';
      document.removeEventListener('keydown', _handleEscape);
    }
  }

  /**
   * Prüft ob ein Modal offen ist.
   * @returns {boolean}
   */
  function isOpen() {
    return _isOpen;
  }

  /**
   * Zeigt einen Bestätigungsdialog und gibt ein Promise zurück.
   * @param {object} options
   * @param {string} options.title - Titel
   * @param {string} options.message - Nachricht
   * @param {string} [options.confirmText='Bestätigen'] - Text des Bestätigungs-Buttons
   * @param {string} [options.cancelText='Abbrechen'] - Text des Abbrechen-Buttons
   * @param {boolean} [options.danger=false] - Roter Bestätigungs-Button
   * @returns {Promise<boolean>} - true wenn bestätigt, false wenn abgebrochen
   */
  function confirm(options = {}) {
    return new Promise((resolve) => {
      const {
        title = 'Bestätigung',
        message = 'Bist du sicher?',
        confirmText = 'Bestätigen',
        cancelText = 'Abbrechen',
        danger = false,
      } = options;

      const confirmBtnClass = danger
        ? 'bg-red-500 hover:bg-red-600 text-white'
        : 'bg-gradient-brand text-white';

      const content = `
        <p class="text-text-light-secondary dark:text-text-dark-secondary mb-6">${message}</p>
        <div class="flex gap-3 justify-end">
          <button id="confirm-cancel-btn" class="btn-ghost text-sm px-4 py-2">
            ${cancelText}
          </button>
          <button id="confirm-ok-btn" class="${confirmBtnClass} font-semibold px-4 py-2 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 text-sm">
            ${confirmText}
          </button>
        </div>
      `;

      open({
        title,
        content,
        size: 'sm',
        showCloseButton: false,
        onClose: () => resolve(false),
      });

      // Button-Events
      setTimeout(() => {
        const cancelBtn = document.getElementById('confirm-cancel-btn');
        const okBtn = document.getElementById('confirm-ok-btn');

        if (cancelBtn) {
          cancelBtn.addEventListener('click', () => {
            _onCloseCallback = null; // Prevent double resolve
            close();
            resolve(false);
          });
        }

        if (okBtn) {
          okBtn.addEventListener('click', () => {
            _onCloseCallback = null;
            close();
            resolve(true);
          });
        }
      }, 50);
    });
  }

  // ============================
  // Public API
  // ============================
  return {
    open,
    close,
    isOpen,
    confirm,
  };
})();

// Global verfügbar machen
window.Modal = Modal;
