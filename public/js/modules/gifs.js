/**
 * modules/gifs.js
 * ================
 * GIF/Bild-Verwaltung für Motivations- und Ermutigungs-Anzeigen.
 *
 * Zweck:
 * - Verwaltet Anime-Girl Bilder für drei Kategorien:
 *   • 'happy'       – bei Workout-Abschluss (fröhlich)
 *   • 'sad'         – bei Überspringen wegen Faulheit (traurig)
 *   • 'encouraging' – bei Überspringen wegen Muskelkater (aufmunternd)
 * - Stellt sicher, dass nicht dasselbe Bild zweimal hintereinander kommt
 *
 * Exportierte Funktionen (global auf window.Gifs):
 * - getRandom(category)      → string|null (Pfad zum Bild)
 * - getRandomHappy()         → string|null
 * - getRandomSad()           → string|null
 * - getRandomEncouraging()   → string|null
 * - preload()                → void (Bilder im Hintergrund vorladen)
 *
 * Bild-Verzeichnisse:
 * - /assets/gifs/happy/       → Glückliche Anime-Girl Bilder
 * - /assets/gifs/sad/         → Traurige Anime-Girl Bilder
 * - /assets/gifs/encouraging/ → Aufmunternde Anime-Girl Bilder
 *
 * Genutzt von: modules/workout.js, modules/skip.js, components/gif-overlay.js
 */

const Gifs = (() => {
  // ============================
  // Bild-Listen (lokal gespeichert)
  // ============================

  const IMAGES = {
    happy: [
      '/assets/gifs/happy/happy-1.png',
      '/assets/gifs/happy/happy-2.png',
      '/assets/gifs/happy/happy-3.png',
      '/assets/gifs/happy/happy-4.png',
      '/assets/gifs/happy/happy-5.png',
    ],
    sad: [
      '/assets/gifs/sad/sad-1.png',
      '/assets/gifs/sad/sad-2.png',
      '/assets/gifs/sad/sad-3.png',
      '/assets/gifs/sad/sad-4.png',
      '/assets/gifs/sad/sad-5.png',
    ],
    encouraging: [
      '/assets/gifs/encouraging/encouraging-1.png',
      '/assets/gifs/encouraging/encouraging-2.png',
      '/assets/gifs/encouraging/encouraging-3.png',
      '/assets/gifs/encouraging/encouraging-4.png',
      '/assets/gifs/encouraging/encouraging-5.png',
    ],
    hot: [
      '/assets/gifs/hot/hot-1.png',
      '/assets/gifs/hot/hot-2.png',
      '/assets/gifs/hot/hot-3.png',
      '/assets/gifs/hot/hot-4.png',
      '/assets/gifs/hot/hot-5.png',
    ],
  };

  // Zuletzt verwendete Indizes (verhindert Wiederholung)
  const _lastUsed = {
    happy: -1,
    sad: -1,
    encouraging: -1,
    hot: -1,
  };

  // ============================
  // Private Funktionen
  // ============================

  /**
   * Wählt zufällig ein Bild aus einer Kategorie, vermeide Wiederholung.
   * @param {string} category - 'happy' | 'sad' | 'encouraging'
   * @returns {string|null}
   */
  function _pickRandom(category) {
    const list = IMAGES[category];
    if (!list || list.length === 0) return null;
    if (list.length === 1) return list[0];

    let idx;
    do {
      idx = Math.floor(Math.random() * list.length);
    } while (idx === _lastUsed[category]);

    _lastUsed[category] = idx;
    return list[idx];
  }

  // ============================
  // Öffentliche Funktionen
  // ============================

  /**
   * Gibt ein zufälliges Bild der gewünschten Kategorie zurück.
   * @param {string} category - 'happy' | 'sad' | 'encouraging'
   * @returns {string|null} Pfad zum Bild oder null
   */
  function getRandom(category) {
    return _pickRandom(category);
  }

  /**
   * Zufälliges glückliches Bild (für Workout-Abschluss).
   * @returns {string|null}
   */
  function getRandomHappy() {
    return _pickRandom('happy');
  }

  /**
   * Zufälliges trauriges Bild (für Faulheits-Skip).
   * @returns {string|null}
   */
  function getRandomSad() {
    return _pickRandom('sad');
  }

  /**
   * Zufälliges aufmunterndes Bild (für Muskelkater).
   * @returns {string|null}
   */
  function getRandomEncouraging() {
    return _pickRandom('encouraging');
  }

  /**
   * Zufälliges Bild für "Zu heiß" Skip.
   * @returns {string|null}
   */
  function getRandomHot() {
    return _pickRandom('hot');
  }

  /**
   * Lädt alle Bilder im Hintergrund vor (verbessert Ladezeit beim ersten Anzeigen).
   */
  function preload() {
    const allImages = [
      ...IMAGES.happy,
      ...IMAGES.sad,
      ...IMAGES.encouraging,
      ...IMAGES.hot,
    ];

    allImages.forEach((src) => {
      const img = new Image();
      img.src = src;
    });

    console.log('[Gifs] Bilder vorgeladen:', allImages.length);
  }

  // ============================
  // Public API
  // ============================
  return {
    getRandom,
    getRandomHappy,
    getRandomSad,
    getRandomEncouraging,
    getRandomHot,
    preload,
  };
})();

// Global verfügbar machen
window.Gifs = Gifs;
