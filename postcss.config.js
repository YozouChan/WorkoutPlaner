/**
 * postcss.config.js
 * =================
 * PostCSS Konfiguration für die Workout-Kalender App.
 *
 * Zweck:
 * - Bindet Tailwind CSS als PostCSS-Plugin ein
 * - Fügt Autoprefixer für Browser-Kompatibilität hinzu
 *
 * Abhängigkeiten: postcss, tailwindcss, autoprefixer
 * Pipeline: src/styles/input.css → [PostCSS + Tailwind] → public/css/output.css
 */

module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
