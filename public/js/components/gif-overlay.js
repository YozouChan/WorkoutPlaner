/**
 * components/gif-overlay.js
 * ==========================
 * Vollbild-Overlay mit Anime-Girl GIF und motivierendem Text.
 *
 * Zweck:
 * - Zeigt ein animiertes Overlay bei Workout-Abschluss (glücklich) oder Skip (traurig/aufmunternd)
 * - Wählt zufällig aus der jeweiligen GIF-Kategorie
 * - Konfetti-Animation bei Erfolg
 * - Auto-Close nach 5 Sekunden oder manuell
 * - Nutzt modules/gifs.js für GIF-Auswahl (falls verfügbar), sonst Emoji-Fallback
 *
 * Exportierte Funktionen (global auf window.GifOverlay):
 * - showHappy()               → void (Workout abgeschlossen 🎉)
 * - showSad()                 → void (Aus Faulheit übersprungen 😢)
 * - showEncouraging()         → void (Wegen Muskelkater übersprungen 🤕)
 * - show(options)             → void (Generisch)
 * - hide()                    → void
 *
 * DOM-Abhängigkeiten:
 * - #modal-container → wird als Overlay-Container genutzt
 *
 * Abhängigkeiten: modules/gifs.js (optional)
 * Genutzt von: modules/workout.js, modules/skip.js
 */

const GifOverlay = (() => {
  // ============================
  // Konstanten
  // ============================
  const AUTO_CLOSE_MS = 5500;

  const CONFIGS = {
    happy: {
      emoji: '🎉',
      title: 'Großartig! Du hast es geschafft!',
      subtitle: 'Workout komplett! Du rockst! 💪',
      gradientFrom: '#ec4899',
      gradientTo: '#8b5cf6',
      confetti: true,
      gifCategory: 'happy',
    },
    sad: {
      emoji: '😢',
      title: 'Schade... aber morgen packst du es!',
      subtitle: 'Gib nicht auf! Jeder hat mal einen schwachen Tag. 💙',
      gradientFrom: '#6366f1',
      gradientTo: '#3b82f6',
      confetti: false,
      gifCategory: 'sad',
    },
    encouraging: {
      emoji: '🤗',
      title: 'Muskelkater ist ein Zeichen des Wachstums!',
      subtitle: 'Ruh dich aus – du verdienst es! Du bist auf dem richtigen Weg! 🌟',
      gradientFrom: '#f59e0b',
      gradientTo: '#ec4899',
      confetti: false,
      gifCategory: 'encouraging',
    },
    hot: {
      emoji: '🥵',
      title: 'Heute ist es einfach zu heiß!',
      subtitle: 'Bleib kühl und trink viel Wasser. Morgen packst du es wieder! 🧊',
      gradientFrom: '#f97316',
      gradientTo: '#ef4444',
      confetti: false,
      gifCategory: 'hot',
    },
  };

  // ============================
  // Private Variablen
  // ============================
  let _autoCloseTimer = null;
  let _confettiInterval = null;

  // ============================
  // Private Funktionen
  // ============================

  /**
   * Startet eine simple CSS-Konfetti-Animation.
   * @param {HTMLElement} container
   */
  function _startConfetti(container) {
    const colors = ['#ec4899', '#8b5cf6', '#3b82f6', '#f59e0b', '#10b981', '#f97316'];
    const confettiContainer = document.createElement('div');
    confettiContainer.className = 'absolute inset-0 pointer-events-none overflow-hidden';
    container.appendChild(confettiContainer);

    let count = 0;
    _confettiInterval = setInterval(() => {
      if (count > 60) {
        clearInterval(_confettiInterval);
        return;
      }

      const piece = document.createElement('div');
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 10 + 6;
      const left = Math.random() * 100;
      const delay = Math.random() * 0.5;
      const duration = Math.random() * 2 + 2;
      const rotation = Math.random() * 360;

      piece.style.cssText = `
        position: absolute;
        top: -20px;
        left: ${left}%;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
        transform: rotate(${rotation}deg);
        animation: confettiFall ${duration}s ease-in ${delay}s forwards;
        opacity: 0.9;
      `;

      confettiContainer.appendChild(piece);
      count++;
    }, 80);
  }

  /**
   * Holt das GIF für eine Kategorie (via GIFs-Modul oder Emoji-Fallback).
   * @param {string} category - 'happy' | 'sad' | 'encouraging'
   * @returns {{ type: 'gif'|'emoji', src: string }}
   */
  function _getGif(category) {
    if (window.Gifs) {
      const gif = Gifs.getRandom(category);
      if (gif) return { type: 'gif', src: gif };
    }
    // Emoji-Fallback
    const emojis = { happy: '🎊', sad: '🥺', encouraging: '🫂', hot: '🥵' };
    return { type: 'emoji', src: emojis[category] || '✨' };
  }

  /**
   * Rendert das Overlay-HTML.
   * @param {object} config - CONFIGS-Eintrag
   * @param {object} gifData - { type, src }
   * @returns {string}
   */
  function _buildOverlayHTML(config, gifData) {
    const gifSection = gifData.type === 'gif'
      ? `<div class="relative rounded-2xl overflow-hidden bg-black/20 max-h-64 flex items-center justify-center mb-6">
           <img src="${gifData.src}" alt="Anime GIF" class="max-h-64 object-contain w-full" />
         </div>`
      : `<div class="text-9xl mb-4 animate-bounce">${gifData.src}</div>`;

    const t = (k, fallback) => (window.I18n ? I18n.t(k) : fallback);
    const category = config.gifCategory || 'happy';
    const titleText = t(`overlay_${category}_title`, config.title);
    const subtitleText = t(`overlay_${category}_sub`, config.subtitle);

    return `
      <div
        id="gif-overlay"
        class="fixed inset-0 z-[9999] flex items-center justify-center p-6"
        style="background: rgba(0,0,0,0.75); backdrop-filter: blur(8px);"
      >
        <!-- Konfetti-Container (wird per JS befüllt) -->
        <div id="gif-confetti-container" class="absolute inset-0 pointer-events-none overflow-hidden"></div>

        <!-- Card -->
        <div
          class="relative z-10 max-w-sm w-full text-center animate-bounce-in"
          style="background: linear-gradient(135deg, ${config.gradientFrom}22, ${config.gradientTo}22);
                 border: 1px solid ${config.gradientFrom}44;
                 border-radius: 24px;
                 padding: 2rem;
                 backdrop-filter: blur(16px);"
        >
          <!-- GIF oder Emoji -->
          ${gifSection}

          <!-- Titel -->
          <h2 class="text-2xl font-extrabold text-white mb-2 leading-tight">
            ${config.emoji} ${titleText}
          </h2>

          <!-- Untertitel -->
          <p class="text-white/80 text-sm mb-6 leading-relaxed">
            ${subtitleText}
          </p>

          <!-- Schließen-Button -->
          <button
            id="gif-overlay-close"
            class="px-6 py-3 rounded-full text-white font-semibold text-sm transition-all duration-200 hover:scale-105 active:scale-95"
            style="background: linear-gradient(135deg, ${config.gradientFrom}, ${config.gradientTo});"
          >
            Weiter geht's! ✨
          </button>

          <!-- Auto-Close Countdown -->
          <p class="text-white/40 text-xs mt-3">Schließt automatisch…</p>
        </div>
      </div>
    `;
  }

  // ============================
  // Öffentliche Funktionen
  // ============================

  /**
   * Zeigt das Overlay mit konfigurierbaren Optionen.
   * @param {'happy'|'sad'|'encouraging'} type
   */
  function show(type = 'happy') {
    const config = CONFIGS[type] || CONFIGS.happy;
    const gifData = _getGif(config.gifCategory);

    // Altes Overlay entfernen falls vorhanden
    hide();

    // In modal-container rendern
    const container = document.getElementById('modal-container');
    if (!container) return;

    container.innerHTML = _buildOverlayHTML(config, gifData);

    // Konfetti starten
    if (config.confetti) {
      const confettiContainer = document.getElementById('gif-confetti-container');
      if (confettiContainer) _startConfetti(confettiContainer);
    }

    // Schließen-Button
    const closeBtn = document.getElementById('gif-overlay-close');
    if (closeBtn) closeBtn.addEventListener('click', hide);

    // Backdrop-Klick schließt
    const overlay = document.getElementById('gif-overlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) hide();
      });
    }

    // Auto-Close
    _autoCloseTimer = setTimeout(hide, AUTO_CLOSE_MS);

    // Scroll sperren
    document.body.style.overflow = 'hidden';
  }

  /**
   * Zeigt das glückliche Overlay (Workout abgeschlossen).
   */
  function showHappy() {
    show('happy');
  }

  /**
   * Zeigt das traurige Overlay (aus Faulheit übersprungen).
   */
  function showSad() {
    show('sad');
  }

  /**
   * Zeigt das aufmunternde Overlay (wegen Muskelkater übersprungen).
   */
  function showEncouraging() {
    show('encouraging');
  }

  /**
   * Zeigt das Hitze-Overlay (wegen "Zu heiß" übersprungen).
   */
  function showHot() {
    show('hot');
  }

  /**
   * Blendet das Overlay aus.
   */
  function hide() {
    if (_autoCloseTimer) {
      clearTimeout(_autoCloseTimer);
      _autoCloseTimer = null;
    }
    if (_confettiInterval) {
      clearInterval(_confettiInterval);
      _confettiInterval = null;
    }

    const overlay = document.getElementById('gif-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.3s ease-out';
      setTimeout(() => {
        const container = document.getElementById('modal-container');
        if (container) container.innerHTML = '';
        document.body.style.overflow = '';
      }, 300);
    } else {
      document.body.style.overflow = '';
    }
  }

  // ============================
  // Public API
  // ============================
  return {
    show,
    showHappy,
    showSad,
    showEncouraging,
    showHot,
    hide,
  };
})();

// Global verfügbar machen
window.GifOverlay = GifOverlay;
