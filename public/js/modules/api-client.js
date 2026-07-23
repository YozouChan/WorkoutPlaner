/**
 * modules/api-client.js
 * =====================
 * Zentraler HTTP-Client für alle API-Anfragen.
 *
 * Zweck:
 * - Einheitliches Fehler-Handling für alle fetch()-Aufrufe
 * - Offline-Erkennung mit benutzerfreundlicher Meldung
 * - Automatischer Retry bei Netzwerkfehlern (konfigurierbar)
 * - Strukturierte Fehlermeldungen aus Server-JSON extrahieren
 * - Toast-Benachrichtigungen bei Fehlern
 *
 * Exportierte Funktionen (global auf window.ApiClient):
 * - get(url, options?)            → Promise<any>   (GET-Anfrage)
 * - post(url, body?, options?)    → Promise<any>   (POST-Anfrage)
 * - put(url, body?, options?)     → Promise<any>   (PUT-Anfrage)
 * - patch(url, body?, options?)   → Promise<any>   (PATCH-Anfrage)
 * - del(url, options?)            → Promise<any>   (DELETE-Anfrage)
 * - isOnline()                    → boolean        (Verbindungsstatus)
 *
 * Genutzt von: allen Frontend-Modulen
 */

const ApiClient = (() => {
  // ============================
  // Konfiguration
  // ============================
  const DEFAULT_RETRY_COUNT = 2;
  const DEFAULT_RETRY_DELAY_MS = 800;
  const DEFAULT_TIMEOUT_MS = 10000;

  // ============================
  // Toast-System (eigene kleine Implementierung)
  // ============================

  let _toastContainer = null;

  function _getToastContainer() {
    if (!_toastContainer) {
      _toastContainer = document.getElementById('notification-banner');
    }
    if (!_toastContainer) {
      _toastContainer = document.createElement('div');
      _toastContainer.id = 'api-toast-container';
      _toastContainer.style.cssText =
        'position:fixed;top:1rem;right:1rem;z-index:9999;display:flex;flex-direction:column;gap:0.5rem;';
      document.body.appendChild(_toastContainer);
    }
    return _toastContainer;
  }

  /**
   * Zeigt eine Toast-Benachrichtigung.
   * @param {string} message - Nachricht
   * @param {'error'|'warning'|'info'} type - Typ
   * @param {number} duration - Anzeigedauer in ms (0 = manuell schließen)
   */
  function _showToast(message, type = 'error', duration = 5000) {
    const container = _getToastContainer();

    const colors = {
      success: 'bg-green-500/95 text-white border-green-400',
      error:   'bg-red-500/95 text-white border-red-400',
      warning: 'bg-yellow-500/95 text-white border-yellow-400',
      info:    'bg-blue-500/95 text-white border-blue-400',
      offline: 'bg-gray-700/95 text-white border-gray-600',
    };

    const icons = {
      success: '✅',
      error:   '❌',
      warning: '⚠️',
      info:    'ℹ️',
      offline: '📶',
    };

    const toast = document.createElement('div');
    toast.className = `
      flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border backdrop-blur-sm
      ${colors[type] || colors.error}
      animate-slide-in-right max-w-sm
    `.trim();
    toast.innerHTML = `
      <span class="text-lg flex-shrink-0">${icons[type] || icons.error}</span>
      <span class="text-sm font-medium flex-1">${_escapeHtml(message)}</span>
      <button onclick="this.parentElement.remove()" class="text-white/70 hover:text-white ml-2 flex-shrink-0 text-lg leading-none">×</button>
    `;

    container.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }

    return toast;
  }

  function _escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Dauerhafter "Offline"-Toast (wird bei Reconnect entfernt)
  let _offlineToast = null;

  function _handleOfflineStatus() {
    if (!navigator.onLine && !_offlineToast) {
      _offlineToast = _showToast(
        'Keine Internetverbindung – App läuft im Offline-Modus',
        'offline',
        0 // nicht automatisch ausblenden
      );
    } else if (navigator.onLine && _offlineToast) {
      _offlineToast.remove();
      _offlineToast = null;
      _showToast('Verbindung wiederhergestellt', 'info', 3000);
    }
  }

  // Online/Offline-Events registrieren
  window.addEventListener('online',  _handleOfflineStatus);
  window.addEventListener('offline', _handleOfflineStatus);

  // ============================
  // Kern-Fetch-Funktion
  // ============================

  /**
   * Führt einen Fetch-Aufruf mit Timeout, Retry und Fehlerbehandlung durch.
   * @param {string} url
   * @param {RequestInit} options
   * @param {object} clientOptions - { retries, retryDelay, silent, timeoutMs }
   * @returns {Promise<any>}
   */
  async function _fetchWithHandling(url, options = {}, clientOptions = {}) {
    const {
      retries = DEFAULT_RETRY_COUNT,
      retryDelay = DEFAULT_RETRY_DELAY_MS,
      silent = false,       // true = keine Toast-Fehlermeldungen
      timeoutMs = DEFAULT_TIMEOUT_MS,
    } = clientOptions;

    // Offline-Check
    if (!navigator.onLine) {
      _handleOfflineStatus();
      throw new Error('Offline: Keine Netzwerkverbindung');
    }

    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Username': localStorage.getItem('username') || '',
            'X-Passphrase': localStorage.getItem('passphrase') || '',
            ...(options.headers || {}),
          },
        });

        clearTimeout(timeoutId);

        // HTTP-Fehler behandeln
        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

          // Versuche JSON-Fehlermeldung vom Server zu lesen
          try {
            const errData = await response.json();
            if (errData.error) errorMessage = errData.error;
            else if (errData.message) errorMessage = errData.message;
          } catch (_) { /* JSON-Parsing fehlgeschlagen, originale Nachricht verwenden */ }

          // Nicht-retryable Fehler (Client-Fehler 4xx)
          if (response.status >= 400 && response.status < 500) {
            if (response.status === 401) {
              localStorage.removeItem('username');
              localStorage.removeItem('passphrase');
              window.location.reload();
            }
            if (!silent) {
              _showToast(errorMessage, 'warning', 5000);
            }
            throw Object.assign(new Error(errorMessage), { status: response.status, retryable: false });
          }

          // Server-Fehler 5xx → Retry
          throw Object.assign(new Error(errorMessage), { status: response.status, retryable: true });
        }

        // Leere Response (204 No Content)
        if (response.status === 204) return null;

        return await response.json();

      } catch (err) {
        clearTimeout(timeoutId);

        // AbortError = Timeout
        if (err.name === 'AbortError') {
          lastError = new Error(`Anfrage-Timeout nach ${timeoutMs / 1000}s: ${url}`);
          lastError.retryable = true;
        } else if (!err.retryable && err.retryable !== undefined) {
          // Nicht-retryable Fehler sofort weiterwerfen
          throw err;
        } else {
          lastError = err;
        }

        // Retry-Delay (außer beim letzten Versuch)
        if (attempt < retries) {
          console.warn(`[ApiClient] Versuch ${attempt + 1}/${retries + 1} fehlgeschlagen, retry in ${retryDelay}ms...`);
          await new Promise(r => setTimeout(r, retryDelay));
        }
      }
    }

    // Alle Versuche fehlgeschlagen
    const finalMessage = lastError?.message || 'Verbindungsfehler';
    console.error('[ApiClient] Alle Versuche fehlgeschlagen:', finalMessage);

    if (!silent) {
      _showToast(
        navigator.onLine
          ? `Server nicht erreichbar: ${finalMessage}`
          : 'Keine Verbindung – bitte prüfe deine Internetverbindung',
        'error',
        6000
      );
    }

    throw lastError;
  }

  // ============================
  // Öffentliche API-Methoden
  // ============================

  /**
   * GET-Anfrage
   */
  async function get(url, options = {}) {
    const { clientOptions, ...fetchOptions } = options;
    return _fetchWithHandling(url, { method: 'GET', ...fetchOptions }, clientOptions);
  }

  /**
   * POST-Anfrage
   */
  async function post(url, body = null, options = {}) {
    const { clientOptions, ...fetchOptions } = options;
    return _fetchWithHandling(url, {
      method: 'POST',
      body: body != null ? JSON.stringify(body) : null,
      ...fetchOptions,
    }, clientOptions);
  }

  /**
   * PUT-Anfrage
   */
  async function put(url, body = null, options = {}) {
    const { clientOptions, ...fetchOptions } = options;
    return _fetchWithHandling(url, {
      method: 'PUT',
      body: body != null ? JSON.stringify(body) : null,
      ...fetchOptions,
    }, clientOptions);
  }

  /**
   * PATCH-Anfrage
   */
  async function patch(url, body = null, options = {}) {
    const { clientOptions, ...fetchOptions } = options;
    return _fetchWithHandling(url, {
      method: 'PATCH',
      body: body != null ? JSON.stringify(body) : null,
      ...fetchOptions,
    }, clientOptions);
  }

  /**
   * DELETE-Anfrage
   */
  async function del(url, options = {}) {
    const { clientOptions, ...fetchOptions } = options;
    return _fetchWithHandling(url, { method: 'DELETE', ...fetchOptions }, clientOptions);
  }

  /**
   * Gibt zurück ob der Browser online ist.
   */
  function isOnline() {
    return navigator.onLine;
  }

  // ============================
  // Public API
  // ============================
  return {
    get,
    post,
    put,
    patch,
    del,
    isOnline,
    showToast: _showToast, // für andere Module nutzbar
  };
})();

// Global verfügbar machen
window.ApiClient = ApiClient;
