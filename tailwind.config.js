/**
 * tailwind.config.js
 * ==================
 * Tailwind CSS v3 Konfiguration für die Workout-Kalender App.
 *
 * Zweck:
 * - Definiert die Custom-Farbpalette (Pink, Lila, Blau) für Fades/Gradients
 * - Aktiviert Dark Mode über CSS-Klasse ('class') für manuellen Toggle
 * - Legt die Content-Pfade fest, damit Tailwind alle genutzten Klassen findet
 *
 * Abhängigkeiten: tailwindcss v3
 * Genutzt von: postcss.config.js → src/styles/input.css → public/css/output.css
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  // Dark Mode über Klasse steuern (für manuellen Toggle)
  darkMode: 'class',

  // Alle Dateien scannen, die Tailwind-Klassen enthalten können
  content: [
    './public/**/*.html',
    './public/js/**/*.js',
    './src/**/*.html',
  ],

  theme: {
    extend: {
      // ============================
      // Custom-Farbpalette: Pink → Lila → Blau
      // ============================
      colors: {
        // Pink-Töne
        brand: {
          'pink-light': '#FFB3D0',
          'pink': '#FF6B9D',
          'pink-dark': '#E84580',
        },
        // Lila/Purple-Töne
        'brand-purple': {
          light: '#C084FC',
          DEFAULT: '#A855F7',
          dark: '#7C3AED',
          deeper: '#6D28D9',
        },
        // Blau-Töne
        'brand-blue': {
          light: '#93C5FD',
          DEFAULT: '#6366F1',
          dark: '#3B82F6',
          deeper: '#2563EB',
        },
        // Neutrale Farben für Light/Dark Mode
        surface: {
          light: '#FFFFFF',
          'light-secondary': '#F8F9FC',
          dark: '#0F0F1A',
          'dark-secondary': '#1A1A2E',
          'dark-tertiary': '#25253D',
        },
        text: {
          light: '#1E1E2E',
          'light-secondary': '#6B7280',
          dark: '#F0F0F5',
          'dark-secondary': '#A0A0B8',
        },
      },

      // ============================
      // Gradient-Presets für Pink→Lila→Blau Fades
      // ============================
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #FF6B9D 0%, #A855F7 50%, #6366F1 100%)',
        'gradient-brand-horizontal': 'linear-gradient(90deg, #FF6B9D 0%, #A855F7 50%, #6366F1 100%)',
        'gradient-brand-vertical': 'linear-gradient(180deg, #FF6B9D 0%, #A855F7 50%, #6366F1 100%)',
        'gradient-brand-subtle': 'linear-gradient(135deg, rgba(255,107,157,0.1) 0%, rgba(168,85,247,0.1) 50%, rgba(99,102,241,0.1) 100%)',
        'gradient-sidebar': 'linear-gradient(180deg, #1A1A2E 0%, #16162A 100%)',
      },

      // ============================
      // Box-Shadow für Karten und Buttons
      // ============================
      boxShadow: {
        'brand': '0 4px 15px rgba(168, 85, 247, 0.3)',
        'brand-lg': '0 8px 30px rgba(168, 85, 247, 0.4)',
        'glow-pink': '0 0 20px rgba(255, 107, 157, 0.4)',
        'glow-purple': '0 0 20px rgba(168, 85, 247, 0.4)',
        'glow-blue': '0 0 20px rgba(99, 102, 241, 0.4)',
      },

      // ============================
      // Animationen
      // ============================
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-in-up': 'fadeInUp 0.4s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s infinite',
        'bounce-in': 'bounceIn 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(168, 85, 247, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(168, 85, 247, 0.6)' },
        },
        bounceIn: {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },

      // ============================
      // Font-Familie
      // ============================
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },

      // ============================
      // Border-Radius Erweiterungen
      // ============================
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
    },
  },

  plugins: [],
};
