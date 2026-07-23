/**
 * server.js
 * =========
 * Haupt-Einstiegspunkt des Express-Servers für die Workout-Kalender App.
 *
 * Zweck:
 * - Erstellt und konfiguriert die Express-App
 * - Liefert statische Dateien aus dem `public/` Verzeichnis aus
 * - Bindet API-Routen (`/api/*`) und Seiten-Routen (`/`) ein
 * - Startet den Server auf einem konfigurierbaren Port
 * - Globale Fehlerbehandlung (unhandledRejection, uncaughtException)
 *
 * Konfiguration:
 * - Port: Umgebungsvariable `PORT` oder Standard `3000`
 *
 * Abhängigkeiten: express, path, routes/api.js, routes/pages.js
 * Start: `npm start` (Produktion) oder `npm run dev` (Entwicklung)
 */

const express = require('express');
const path = require('path');

// Routen importieren
const apiRoutes = require('./routes/api');
const pageRoutes = require('./routes/pages');

// ============================
// Express-App erstellen
// ============================
const app = express();
const PORT = process.env.PORT || 3000;

// ============================
// Middleware
// ============================

// JSON-Body-Parser für API-Anfragen (35MB Limit für Bild- & GIF-Uploads bis 25MB)
app.use(express.json({ limit: '35mb' }));

// URL-encoded Body-Parser für Formulardaten
app.use(express.urlencoded({ limit: '35mb', extended: true }));

// Statische Dateien aus `public/` ausliefern
// (CSS, JS, Assets, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// ============================
// Routen einbinden
// ============================

// API-Routen unter /api/*
app.use('/api', apiRoutes);

// Seiten-Routen (HTML-Seiten ausliefern)
app.use('/', pageRoutes);

// ============================
// Globaler Express-Fehler-Handler
// ============================

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error('[Server] Unerwarteter Fehler:', err.message);
  console.error(err.stack);

  if (res.headersSent) return;

  const isDev = process.env.NODE_ENV !== 'production';
  res.status(500).json({
    error: 'Interner Serverfehler.',
    ...(isDev && { detail: err.message }),
  });
});

// ============================
// Server starten
// ============================
app.listen(PORT, () => {
  console.log('');
  console.log('  🏋️  WorkoutPlaner App gestartet!');
  console.log('  ────────────────────────────────────');
  console.log(`  🌐 URL:  http://localhost:${PORT}`);
  console.log(`  📁 Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
});

// ============================
// Globale Prozess-Fehlerbehandlung
// ============================

/**
 * Fängt unbehandelte Promise-Rejections ab (z.B. async-Fehler ohne try/catch).
 * Verhindert stilles Abstürzen des Servers.
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] ⚠️  Unhandled Promise Rejection:');
  console.error('  Promise:', promise);
  console.error('  Reason:', reason);
  // Server läuft weiter (kein process.exit)
});

/**
 * Fängt uncaught Exceptions ab (synchrone Fehler außerhalb von Express).
 * In Produktion: Server-Neustart via Process-Manager (PM2/nodemon) empfohlen.
 */
process.on('uncaughtException', (err) => {
  console.error('[Server] ⚠️  Uncaught Exception:', err.message);
  console.error(err.stack);
  // In Produktion: Prozess beenden und neu starten lassen
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

module.exports = app;
