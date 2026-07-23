/**
 * routes/pages.js
 * ===============
 * Seiten-Routen für die Workout-Kalender App.
 *
 * Zweck:
 * - Liefert HTML-Seiten an den Browser aus
 * - Hauptseite (Kalender) und Editor-Seite
 *
 * Routen:
 * - GET / → Startseite / Kalender (index.html)
 * - GET /editor → Workout-Editor (editor.html)
 *
 * Abhängigkeiten: express, path
 * Eingebunden in: server.js
 */

const express = require('express');
const path = require('path');
const router = express.Router();

/**
 * GET / → Startseite (Kalender)
 * Liefert die index.html aus public/pages/
 */
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'pages', 'index.html'));
});

/**
 * GET /editor → Workout-Editor
 * Liefert die editor.html aus public/pages/
 */
router.get('/editor', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'pages', 'editor.html'));
});

/**
 * GET /leaderboard → Leaderboard / Bestenlisten
 * Liefert die leaderboard.html aus public/pages/
 */
router.get('/leaderboard', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'pages', 'leaderboard.html'));
});

module.exports = router;
