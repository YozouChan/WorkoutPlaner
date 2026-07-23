/**
 * routes/api.js
 * =============
 * REST-API-Routen für die Workout-Kalender App.
 *
 * Zweck:
 * - Stellt CRUD-Endpunkte für Workout-Daten bereit
 * - Verwaltet Statistiken (abgeschlossen/übersprungen)
 * - Handhabt Kalender-Aktionen (Skip, Complete)
 * - Liefert und speichert den App-Zustand
 *
 * Endpunkte:
 * - GET    /api/workout              → Aktuelles Workout als JSON
 * - PUT    /api/workout              → Workout-Plan aktualisieren
 * - POST   /api/workout/exercise     → Übung hinzufügen
 * - DELETE /api/workout/exercise/:id → Übung entfernen
 * - PATCH  /api/workout/exercise/reorder → Reihenfolge ändern
 * - PATCH  /api/workout/rhythm       → Trainings-Rhythmus anpassen
 * - GET    /api/stats                → Statistiken abrufen
 * - POST   /api/stats/reset          → Statistiken zurücksetzen
 * - GET    /api/calendar             → 14-Tage-Kalender mit Status
 * - POST   /api/calendar/skip        → Tag überspringen
 * - DELETE /api/calendar/skip        → Skip rückgängig machen (nur heute)
 * - POST   /api/calendar/advance     → Workout auf heute vorziehen (Ruhetag)
 * - POST   /api/calendar/complete    → Workout als abgeschlossen markieren
 * - GET    /api/state                → Gesamten App-Zustand abrufen
 *
 * Abhängigkeiten: express, fs, path
 * Eingebunden in: server.js
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const router = express.Router();

// ============================
// Hilfsfunktionen: Dateizugriff
// ============================

/** Pfad zur Workout-Daten-Datei */
const WORKOUT_DATA_PATH = path.join(__dirname, '..', 'src', 'data', 'workout-data.json');

/** Pfad zur State-Datei */
const STATE_PATH = path.join(__dirname, '..', 'data', 'state.json');

/**
 * Formatiert ein Date-Objekt als YYYY-MM-DD in der lokalen Zeitzone.
 * @param {Date} date
 * @returns {string} YYYY-MM-DD
 */
function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parsed einen YYYY-MM-DD String in ein Date-Objekt in der lokalen Zeitzone.
 * @param {string} dateStr
 * @returns {Date}
 */
function parseLocalDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Gibt den Standard-App-Zustand zurück.
 * @returns {object} Standard-State
 */
function getDefaultState() {
  return {
    stats: {
      completedWorkouts: 0,
      skippedWorkouts: 0,
    },
    streak: {
      current: 0,
      record: 0,
    },
    skippedDays: [],
    completedDays: [],
    trainingStartDate: formatLocalDate(new Date()),
    checkedExercises: {},
  };
}

/**
 * Liest eine JSON-Datei und gibt den Inhalt als Objekt zurück.
 * @param {string} filePath - Pfad zur JSON-Datei
 * @returns {object|null} Geparster Inhalt oder null bei Fehler
 */
function readJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`[API] Datei nicht gefunden: ${filePath}`);
      return null;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    if (!raw || raw.trim() === '') {
      console.warn(`[API] Datei ist leer: ${filePath}`);
      return null;
    }
    return JSON.parse(raw);
  } catch (err) {
    if (err instanceof SyntaxError) {
      console.error(`[API] JSON-Parsefehler in ${filePath}:`, err.message);
      // Backup der korrupten Datei erstellen
      try {
        const backupPath = filePath + '.corrupt.' + Date.now();
        fs.copyFileSync(filePath, backupPath);
        console.warn(`[API] Korrupte Datei gesichert als: ${backupPath}`);
      } catch (_) { /* ignorieren */ }
    } else {
      console.error(`[API] Fehler beim Lesen von ${filePath}:`, err.message);
    }
    return null;
  }
}

/**
 * Schreibt ein Objekt als JSON in eine Datei (atomisch via Temp-Datei).
 * @param {string} filePath - Pfad zur JSON-Datei
 * @param {object} data - Zu schreibende Daten
 * @returns {boolean} Erfolg
 */
function writeJSON(filePath, data) {
  const tmpPath = filePath + '.tmp';
  try {
    // Verzeichnis erstellen falls nicht vorhanden
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // Erst in Temp-Datei schreiben, dann umbenennen (atomisch)
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, filePath);
    return true;
  } catch (err) {
    console.error(`[API] Fehler beim Schreiben von ${filePath}:`, err.message);
    // Temp-Datei aufräumen falls vorhanden
    try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (_) {}
    return false;
  }
}

/**
 * Validiert und normalisiert den State-Objekt.
 * Füllt fehlende Felder mit Standardwerten auf.
 * @param {object} state - Roher State (kann unvollständig sein)
 * @returns {object} Validierter State
 */
function validateState(state) {
  const defaults = getDefaultState();
  if (!state || typeof state !== 'object') return defaults;

  return {
    stats: {
      completedWorkouts:
        typeof state.stats?.completedWorkouts === 'number'
          ? state.stats.completedWorkouts
          : defaults.stats.completedWorkouts,
      skippedWorkouts:
        typeof state.stats?.skippedWorkouts === 'number'
          ? state.stats.skippedWorkouts
          : defaults.stats.skippedWorkouts,
    },
    streak: {
      current:
        typeof state.streak?.current === 'number'
          ? state.streak.current
          : defaults.streak.current,
      record:
        typeof state.streak?.record === 'number'
          ? state.streak.record
          : defaults.streak.record,
    },
    skippedDays: Array.isArray(state.skippedDays) ? state.skippedDays : [],
    completedDays: Array.isArray(state.completedDays) ? state.completedDays : [],
    trainingStartDate:
      typeof state.trainingStartDate === 'string' && state.trainingStartDate.match(/^\d{4}-\d{2}-\d{2}$/)
        ? state.trainingStartDate
        : defaults.trainingStartDate,
    checkedExercises:
      state.checkedExercises && typeof state.checkedExercises === 'object'
        ? state.checkedExercises
        : {},
  };
}

/**
 * Berechnet die aktuelle Streak aus den State-Daten.
 * - vacation + soreness = Freeze (kein Reset, kein Inkrement bei diesem Tag)
 * - laziness + heat = Reset auf 0
 * @param {object} state
 * @returns {number} aktuelle Streak
 */
function calculateStreak(state) {
  const completedDays = new Set(state.completedDays || []);
  const skippedDaysMap = {};
  for (const s of (state.skippedDays || [])) {
    skippedDaysMap[s.date] = s.reason;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let dayOffset = 0;

  // Auch heute zählen falls schon abgeschlossen
  const todayStr = formatLocalDate(today);
  if (completedDays.has(todayStr)) {
    streak = 1;
    dayOffset = 1;
  }

  // Rückwärts iterieren (max. 90 Tage)
  for (let i = dayOffset; i < 90; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = formatLocalDate(date);

    if (completedDays.has(dateStr)) {
      streak++;
    } else if (skippedDaysMap[dateStr] !== undefined) {
      const reason = skippedDaysMap[dateStr];
      if (reason === 'vacation' || reason === 'soreness') {
        // Freeze: Streak bricht nicht ab, dieser Tag zählt aber nicht als Training
        continue;
      } else {
        // laziness, heat oder unbekannt → Streak bricht ab
        break;
      }
    }
    // Pausentag (kein Training erwartet) → Streak läuft weiter
  }

  return streak;
}

/**
 * Liest den State oder erstellt einen neuen mit Defaults.
 * Bei korrupten/unvollständigen Daten wird mit Defaults zusammengeführt.
 * @param {object} [req] - Express Request Objekt
 * @returns {object}
 */
function getState(req) {
  const statePath = req ? req.statePath : STATE_PATH;
  const raw = readJSON(statePath);
  const state = validateState(raw);

  // Falls Datei nicht existierte oder korrupt war: neu schreiben
  if (!raw) {
    console.log('[API] State-Datei wird neu erstellt...');
    writeJSON(statePath, state);
  } else if (JSON.stringify(raw) !== JSON.stringify(state)) {
    // Fehlende Felder wurden ergänzt — State aktualisieren
    console.log('[API] State wurde mit Standardwerten ergänzt.');
    writeJSON(statePath, state);
  }

  return state;
}

// ============================
// AUTHENTIFIZIERUNG & MULTI-USER MIDDLEWARE
// ============================
// AUTHENTIFIZIERUNG & MULTI-USER MIDDLEWARE
// ============================

const DEFAULT_WORKOUT_DATA_PATH = path.join(__dirname, '..', 'src', 'data', 'workout-data.json');

/**
 * Zählt die Wörter in einem String.
 * @param {string} text
 * @returns {number}
 */
function getWordCount(text) {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Erzeugt einen eindeutigen, sicheren Dateisystem-Schlüssel für die Kombination aus Benutzername und Passphrase.
 * @param {string} username
 * @param {string} passphrase
 * @returns {string} e.g. "max_a1b2c3d4e5f6"
 */
function getUserKey(username, passphrase) {
  const cleanUser = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const cleanPass = passphrase.trim().toLowerCase().replace(/\s+/g, '_');
  const hash = crypto.createHash('sha256').update(cleanPass).digest('hex').substring(0, 12);
  return `${cleanUser}_${hash}`;
}

function getUserStatePath(userKey) {
  return path.join(__dirname, '..', 'data', 'users', userKey, 'state.json');
}

function getUserWorkoutDataPath(userKey) {
  return path.join(__dirname, '..', 'data', 'users', userKey, 'workout-data.json');
}

function getUserAuthPath(userKey) {
  return path.join(__dirname, '..', 'data', 'users', userKey, 'auth.json');
}

/** Max. erlaubte Inaktivität in Tagen bevor ein Profil gelöscht wird */
const MAX_INACTIVITY_DAYS = 90;

/**
 * Durchsucht das Verzeichnis data/users/ und löscht Ordner von Benutzern,
 * deren letzte Anmeldung mindestens 90 Tage zurückliegt.
 */
function cleanupInactiveUsers() {
  const usersDir = path.join(__dirname, '..', 'data', 'users');
  if (!fs.existsSync(usersDir)) return;

  try {
    const entries = fs.readdirSync(usersDir, { withFileTypes: true });
    const now = Date.now();

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const userKey = entry.name;
        const userDir = path.join(usersDir, userKey);
        const authPath = path.join(userDir, 'auth.json');

        if (fs.existsSync(authPath)) {
          const authData = readJSON(authPath);
          const lastActiveStr = authData?.lastLogin || authData?.createdAt;

          if (lastActiveStr) {
            const lastActiveTime = new Date(lastActiveStr).getTime();
            const daysInactive = (now - lastActiveTime) / (1000 * 60 * 60 * 24);

            if (daysInactive >= MAX_INACTIVITY_DAYS) {
              const displayName = authData?.username || userKey;
              console.log(`[API] 🗑️ Profil "${displayName}" (${userKey}) ist seit ${Math.floor(daysInactive)} Tagen inaktiv (>90 Tage). Profil wird gelöscht...`);
              fs.rmSync(userDir, { recursive: true, force: true });
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('[API] Fehler beim Bereinigen inaktiver Benutzer:', err.message);
  }
}

// Initial beim Start ausführen und alle 24h wiederholen
cleanupInactiveUsers();
setInterval(cleanupInactiveUsers, 24 * 60 * 60 * 1000);

// POST /api/auth/login
router.post('/auth/login', (req, res) => {
  const { username, passphrase } = req.body;
  if (!username || typeof username !== 'string' || !username.trim()) {
    return res.status(400).json({ error: 'Benutzername ist erforderlich.' });
  }
  if (!passphrase || typeof passphrase !== 'string' || !passphrase.trim()) {
    return res.status(400).json({ error: 'Passphrase ist erforderlich.' });
  }

  const cleanUsername = username.trim();
  if (!/^[a-zA-Z0-9_-]{1,30}$/.test(cleanUsername)) {
    return res.status(400).json({ error: 'Benutzername darf nur Buchstaben, Zahlen, Bindestriche und Unterstriche enthalten (max. 30 Zeichen).' });
  }

  const cleanPassphrase = passphrase.trim();
  const wordCount = getWordCount(cleanPassphrase);
  if (wordCount !== 10) {
    return res.status(400).json({ error: `Die Passphrase muss aus genau 10 Wörtern bestehen (aktuell: ${wordCount} Wörter).` });
  }

  // Veraltete Profile aufräumen
  cleanupInactiveUsers();

  const userKey = getUserKey(cleanUsername, cleanPassphrase);
  const userDir = path.join(__dirname, '..', 'data', 'users', userKey);
  const authPath = getUserAuthPath(userKey);
  const statePath = getUserStatePath(userKey);
  const workoutDataPath = getUserWorkoutDataPath(userKey);

  try {
    const nowIso = new Date().toISOString();

    if (fs.existsSync(authPath)) {
      // Bestehende Kombination → lastLogin aktualisieren
      const authData = readJSON(authPath) || {};
      authData.lastLogin = nowIso;
      authData.username = cleanUsername;
      authData.passphrase = cleanPassphrase;
      writeJSON(authPath, authData);
    } else {
      // Neue Kombination → Ordner erstellen & auth.json + Initialdaten speichern
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
      }
      writeJSON(authPath, {
        username: cleanUsername,
        passphrase: cleanPassphrase,
        createdAt: nowIso,
        lastLogin: nowIso,
      });

      if (!fs.existsSync(workoutDataPath)) {
        const defaultWorkout = readJSON(DEFAULT_WORKOUT_DATA_PATH) || { phases: [] };
        writeJSON(workoutDataPath, defaultWorkout);
      }

      if (!fs.existsSync(statePath)) {
        writeJSON(statePath, getDefaultState());
      }
    }

    res.json({ success: true, message: 'Erfolgreich angemeldet.', username: cleanUsername, passphrase: cleanPassphrase, userKey });
  } catch (err) {
    console.error('[API] Fehler beim Erstellen/Prüfen der Benutzerdaten:', err);
    res.status(500).json({ error: 'Benutzerdaten konnten nicht verarbeitet werden.' });
  }
});

// Middleware zur Authentifizierung und Pfadzuweisung
router.use((req, res, next) => {
  const username = req.headers['x-username'];
  const passphrase = req.headers['x-passphrase'];

  if (!username || !passphrase) {
    return res.status(401).json({ error: 'Nicht eingeloggt. Bitte melde dich an.' });
  }

  const cleanUsername = username.trim();
  if (!/^[a-zA-Z0-9_-]{1,30}$/.test(cleanUsername)) {
    return res.status(400).json({ error: 'Ungültiger Benutzername.' });
  }

  const cleanPassphrase = passphrase.trim();
  const wordCount = getWordCount(cleanPassphrase);
  if (wordCount !== 10) {
    return res.status(400).json({ error: 'Passphrase muss genau 10 Wörter enthalten.' });
  }

  const userKey = getUserKey(cleanUsername, cleanPassphrase);
  req.username = cleanUsername;
  req.userKey = userKey;
  req.statePath = getUserStatePath(userKey);
  req.workoutDataPath = getUserWorkoutDataPath(userKey);

  try {
    const userDir = path.join(__dirname, '..', 'data', 'users', userKey);
    const authPath = getUserAuthPath(userKey);

    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    if (!fs.existsSync(authPath)) {
      const nowIso = new Date().toISOString();
      writeJSON(authPath, {
        username: cleanUsername,
        passphrase: cleanPassphrase,
        createdAt: nowIso,
        lastLogin: nowIso,
      });
    }
    if (!fs.existsSync(req.workoutDataPath)) {
      const defaultWorkout = readJSON(DEFAULT_WORKOUT_DATA_PATH) || { phases: [] };
      writeJSON(req.workoutDataPath, defaultWorkout);
    }
    if (!fs.existsSync(req.statePath)) {
      writeJSON(req.statePath, getDefaultState());
    }
  } catch (err) {
    console.error('[API] Middleware Initialisierungsfehler:', err);
  }

  next();
});

// ============================
// WORKOUT-Endpunkte (Multi-Workout Support)
// ============================

/**
 * Normalisiert und migriert Workout-Daten (Legacy-Einzeltraining → Multi-Workout-Struktur).
 * @param {object} raw
 * @returns {object}
 */
function normalizeWorkoutData(raw) {
  if (!raw || typeof raw !== 'object') {
    raw = { rhythm: 2, phases: [] };
  }

  // Legacy Migration
  if (!Array.isArray(raw.workouts)) {
    const singlePhases = Array.isArray(raw.phases) ? raw.phases : [];
    const rhythmVal = typeof raw.rhythm === 'number' ? raw.rhythm : 2;
    raw.workouts = [
      {
        id: 'workout_default',
        name: 'Ganzkörper Workout',
        scheduleType: 'rhythm', // 'rhythm' | 'weekdays'
        rhythm: rhythmVal,
        weekdays: [1, 3, 5],
        phases: singlePhases,
      },
    ];
    raw.activeWorkoutId = 'workout_default';
  }

  if (!raw.activeWorkoutId && raw.workouts.length > 0) {
    raw.activeWorkoutId = raw.workouts[0].id;
  }

  const activeWorkout = raw.workouts.find((w) => w.id === raw.activeWorkoutId) || raw.workouts[0] || { id: 'default', name: 'Workout', phases: [], rhythm: 2, scheduleType: 'rhythm', weekdays: [1, 3, 5] };
  
  // Abwärtskompatible Root-Felder
  raw.phases = activeWorkout.phases || [];
  raw.rhythm = activeWorkout.rhythm || 2;
  raw.activeWorkout = activeWorkout;

  return raw;
}

/**
 * GET /api/workout
 * Liefert alle Workouts und das aktive Workout als JSON.
 */
router.get('/workout', (req, res) => {
  const raw = readJSON(req.workoutDataPath);
  if (!raw) {
    return res.status(500).json({ error: 'Workout-Daten konnten nicht geladen werden.' });
  }
  const normalized = normalizeWorkoutData(raw);
  res.json(normalized);
});

/**
 * POST /api/workout
 * Erstellt ein neues Workout.
 * Body: { name, scheduleType?, rhythm?, weekdays? }
 */
router.post('/workout', (req, res) => {
  const { name, scheduleType, rhythm, weekdays } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Workout-Name ist erforderlich.' });
  }

  const raw = readJSON(req.workoutDataPath) || {};
  const workoutData = normalizeWorkoutData(raw);

  const newWorkoutId = `workout_${Date.now()}`;
  const newWorkout = {
    id: newWorkoutId,
    name: name.trim(),
    scheduleType: scheduleType === 'weekdays' ? 'weekdays' : 'rhythm',
    rhythm: typeof rhythm === 'number' && rhythm >= 1 && rhythm <= 7 ? rhythm : 2,
    weekdays: Array.isArray(weekdays) ? weekdays : [1, 3, 5],
    phases: [
      {
        id: `phase-${Date.now()}-1`,
        name: 'Phase 1: Hauptteil',
        exercises: [],
      },
    ],
  };

  workoutData.workouts.push(newWorkout);
  workoutData.activeWorkoutId = newWorkoutId;

  const success = writeJSON(req.workoutDataPath, workoutData);
  if (!success) {
    return res.status(500).json({ error: 'Neues Workout konnte nicht gespeichert werden.' });
  }

  res.status(201).json({ message: `Workout "${newWorkout.name}" erstellt.`, workout: newWorkout, workoutData: normalizeWorkoutData(workoutData) });
});

/**
 * PUT /api/workout/:id
 * Aktualisiert Name & Trainingszeiten-Einstellungen eines Workouts.
 * Body: { name?, scheduleType?, rhythm?, weekdays?, phases? }
 */
router.put('/workout/:id', (req, res) => {
  const workoutId = req.params.id;
  const { name, scheduleType, rhythm, weekdays, phases } = req.body;

  const raw = readJSON(req.workoutDataPath);
  if (!raw) {
    return res.status(500).json({ error: 'Workout-Daten konnten nicht geladen werden.' });
  }
  const workoutData = normalizeWorkoutData(raw);

  const targetWorkout = workoutData.workouts.find((w) => w.id === workoutId);
  if (!targetWorkout) {
    return res.status(404).json({ error: `Workout "${workoutId}" nicht gefunden.` });
  }

  if (typeof name === 'string' && name.trim()) {
    targetWorkout.name = name.trim();
  }
  if (scheduleType === 'rhythm' || scheduleType === 'weekdays') {
    targetWorkout.scheduleType = scheduleType;
  }
  if (typeof rhythm === 'number' && rhythm >= 1 && rhythm <= 7) {
    targetWorkout.rhythm = rhythm;
  }
  if (Array.isArray(weekdays)) {
    targetWorkout.weekdays = weekdays;
  }
  if (Array.isArray(phases)) {
    targetWorkout.phases = phases;
  }

  const success = writeJSON(req.workoutDataPath, workoutData);
  if (!success) {
    return res.status(500).json({ error: 'Workout-Daten konnten nicht gespeichert werden.' });
  }

  res.json({ message: 'Workout aktualisiert.', workout: targetWorkout, workoutData: normalizeWorkoutData(workoutData) });
});

/**
 * POST /api/workout/select
 * Aktiviert ein bestimmtes Workout.
 * Body: { workoutId }
 */
router.post('/workout/select', (req, res) => {
  const { workoutId } = req.body;
  if (!workoutId) {
    return res.status(400).json({ error: 'workoutId ist erforderlich.' });
  }

  const raw = readJSON(req.workoutDataPath);
  if (!raw) {
    return res.status(500).json({ error: 'Workout-Daten konnten nicht geladen werden.' });
  }
  const workoutData = normalizeWorkoutData(raw);

  const exists = workoutData.workouts.some((w) => w.id === workoutId);
  if (!exists) {
    return res.status(404).json({ error: `Workout "${workoutId}" existiert nicht.` });
  }

  workoutData.activeWorkoutId = workoutId;
  writeJSON(req.workoutDataPath, workoutData);

  res.json({ message: 'Aktives Workout gewechselt.', workoutData: normalizeWorkoutData(workoutData) });
});

/**
 * DELETE /api/workout/:id
 * Löscht ein Workout. Das letzte Workout kann nicht gelöscht werden.
 */
router.delete('/workout/:id', (req, res) => {
  const workoutId = req.params.id;

  const raw = readJSON(req.workoutDataPath);
  if (!raw) {
    return res.status(500).json({ error: 'Workout-Daten konnten nicht geladen werden.' });
  }
  const workoutData = normalizeWorkoutData(raw);

  if (workoutData.workouts.length <= 1) {
    return res.status(400).json({ error: 'Das letzte verbleibende Workout kann nicht gelöscht werden.' });
  }

  const idx = workoutData.workouts.findIndex((w) => w.id === workoutId);
  if (idx === -1) {
    return res.status(404).json({ error: `Workout "${workoutId}" nicht gefunden.` });
  }

  workoutData.workouts.splice(idx, 1);
  if (workoutData.activeWorkoutId === workoutId) {
    workoutData.activeWorkoutId = workoutData.workouts[0].id;
  }

  writeJSON(req.workoutDataPath, workoutData);
  res.json({ message: 'Workout gelöscht.', workoutData: normalizeWorkoutData(workoutData) });
});

/**
 * POST /api/workout/exercise
 * Fügt eine neue Übung zu einer Phase hinzu.
 * Body: { phaseId, exercise: { name, sets, reps, description, gifUrl }, index?, workoutId? }
 */
router.post('/workout/exercise', (req, res) => {
  const { phaseId, exercise, index, workoutId } = req.body;

  if (!phaseId || !exercise || !exercise.name) {
    return res.status(400).json({ error: 'phaseId und exercise.name sind erforderlich.' });
  }

  const raw = readJSON(req.workoutDataPath);
  if (!raw) {
    return res.status(500).json({ error: 'Workout-Daten konnten nicht geladen werden.' });
  }
  const workoutData = normalizeWorkoutData(raw);
  const targetWorkout = (workoutId && workoutData.workouts.find(w => w.id === workoutId)) || workoutData.activeWorkout;

  const phase = targetWorkout.phases.find((p) => p.id === phaseId);
  if (!phase) {
    return res.status(404).json({ error: `Phase "${phaseId}" nicht gefunden.` });
  }

  // Eindeutige ID generieren
  const newExercise = {
    id: `${phaseId}-${Date.now()}`,
    name: exercise.name,
    sets: exercise.sets || 1,
    reps: exercise.reps || '',
    description: exercise.description || '',
    gifUrl: exercise.gifUrl || '',
  };

  if (typeof index === 'number' && index >= 0 && index <= phase.exercises.length) {
    phase.exercises.splice(index, 0, newExercise);
  } else {
    phase.exercises.push(newExercise);
  }

  writeJSON(req.workoutDataPath, workoutData);
  res.status(201).json({ message: 'Übung hinzugefügt.', exercise: newExercise, workoutData: normalizeWorkoutData(workoutData) });
});

/**
 * DELETE /api/workout/exercise/:id
 * Entfernt eine Übung anhand ihrer ID.
 */
router.delete('/workout/exercise/:id', (req, res) => {
  const exerciseId = req.params.id;

  const raw = readJSON(req.workoutDataPath);
  if (!raw) {
    return res.status(500).json({ error: 'Workout-Daten konnten nicht geladen werden.' });
  }
  const workoutData = normalizeWorkoutData(raw);

  let found = false;
  for (const workout of workoutData.workouts) {
    for (const phase of workout.phases) {
      const idx = phase.exercises.findIndex((e) => e.id === exerciseId);
      if (idx !== -1) {
        phase.exercises.splice(idx, 1);
        found = true;
        break;
      }
    }
    if (found) break;
  }

  if (!found) {
    return res.status(404).json({ error: `Übung "${exerciseId}" nicht gefunden.` });
  }

  writeJSON(req.workoutDataPath, workoutData);
  res.json({ message: 'Übung entfernt.', workoutData: normalizeWorkoutData(workoutData) });
});

/**
 * PUT /api/workout/exercise/:id
 * Aktualisiert eine bestehende Übung (Name, Sätze, Reps, Beschreibung, gifUrl).
 */
router.put('/workout/exercise/:id', (req, res) => {
  const exerciseId = req.params.id;
  const { name, sets, reps, description, gifUrl } = req.body;

  const raw = readJSON(req.workoutDataPath);
  if (!raw) {
    return res.status(500).json({ error: 'Workout-Daten konnten nicht geladen werden.' });
  }
  const workoutData = normalizeWorkoutData(raw);

  let targetExercise = null;
  for (const workout of workoutData.workouts) {
    for (const phase of workout.phases) {
      const ex = phase.exercises.find((e) => e.id === exerciseId);
      if (ex) {
        targetExercise = ex;
        break;
      }
    }
    if (targetExercise) break;
  }

  if (!targetExercise) {
    return res.status(404).json({ error: `Übung "${exerciseId}" nicht gefunden.` });
  }

  if (typeof name === 'string' && name.trim()) targetExercise.name = name.trim();
  if (typeof sets === 'number' && sets >= 1) targetExercise.sets = sets;
  if (typeof reps === 'string') targetExercise.reps = reps.trim();
  if (typeof description === 'string') targetExercise.description = description.trim();
  if (typeof gifUrl === 'string') targetExercise.gifUrl = gifUrl.trim();

  writeJSON(req.workoutDataPath, workoutData);
  res.json({ message: 'Übung aktualisiert.', exercise: targetExercise, workoutData: normalizeWorkoutData(workoutData) });
});

/**
 * POST /api/upload
 * Speichert ein hochgeladenes Bild oder GIF (bis 25MB) im public/uploads/ Ordner.
 * Body: { filename: string, dataUrl: string }
 */
router.post('/upload', (req, res) => {
  const { filename, dataUrl } = req.body;

  if (!dataUrl || typeof dataUrl !== 'string') {
    return res.status(400).json({ error: 'Keine Datei-Daten übermittelt.' });
  }

  // Header prüfen (Base64 data URL format e.g. data:image/png;base64,...)
  const matches = dataUrl.match(/^data:(image\/[a-zA-Z0-9\+\-\.]+);base64,(.+)$/);
  if (!matches) {
    return res.status(400).json({ error: 'Ungültiges Dateiformat. Nur Bild-Dateien (PNG, JPG, GIF, WebP) sind erlaubt.' });
  }

  const mimeType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');

  // Maximale Dateigröße prüfen (25MB = 25 * 1024 * 1024 Bytes)
  const MAX_SIZE_BYTES = 25 * 1024 * 1024;
  if (buffer.length > MAX_SIZE_BYTES) {
    return res.status(400).json({ error: 'Datei ist zu groß. Maximale erlaubte Größe ist 25MB.' });
  }

  // Dateiendung ermitteln
  let ext = 'png';
  if (mimeType.includes('gif')) ext = 'gif';
  else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
  else if (mimeType.includes('webp')) ext = 'webp';
  else if (mimeType.includes('png')) ext = 'png';

  // Sicheren Dateinamen erstellen
  const cleanOriginalName = (filename || 'upload')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .substring(0, 30);

  const savedFilename = `upload_${Date.now()}_${cleanOriginalName}.${ext}`;
  const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');

  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, savedFilename);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${savedFilename}`;
    res.json({
      success: true,
      message: 'Datei erfolgreich hochgeladen.',
      url: publicUrl,
      size: buffer.length,
    });
  } catch (err) {
    console.error('[API] Fehler beim Speichern der hochgeladenen Datei:', err);
    res.status(500).json({ error: 'Datei konnte auf dem Server nicht gespeichert werden.' });
  }
});

/**
 * PATCH /api/workout/exercise/reorder
 * Ändert die Reihenfolge einer Übung innerhalb einer Phase.
 */
router.patch('/workout/exercise/reorder', (req, res) => {
  const { phaseId, exerciseId, newIndex, workoutId } = req.body;

  if (!phaseId || !exerciseId || typeof newIndex !== 'number') {
    return res.status(400).json({ error: 'phaseId, exerciseId und newIndex sind erforderlich.' });
  }

  const raw = readJSON(req.workoutDataPath);
  if (!raw) {
    return res.status(500).json({ error: 'Workout-Daten konnten nicht geladen werden.' });
  }
  const workoutData = normalizeWorkoutData(raw);
  const targetWorkout = (workoutId && workoutData.workouts.find(w => w.id === workoutId)) || workoutData.activeWorkout;

  const phase = targetWorkout.phases.find((p) => p.id === phaseId);
  if (!phase) {
    return res.status(404).json({ error: `Phase "${phaseId}" nicht gefunden.` });
  }

  const oldIdx = phase.exercises.findIndex((e) => e.id === exerciseId);
  if (oldIdx === -1) {
    return res.status(404).json({ error: `Übung "${exerciseId}" nicht gefunden.` });
  }

  const [exercise] = phase.exercises.splice(oldIdx, 1);
  const clampedIndex = Math.max(0, Math.min(newIndex, phase.exercises.length));
  phase.exercises.splice(clampedIndex, 0, exercise);

  writeJSON(req.workoutDataPath, workoutData);
  res.json({ message: 'Reihenfolge geändert.', exercises: phase.exercises });
});

/**
 * PATCH /api/workout/rhythm
 * Setzt den Trainings-Rhythmus des aktiven Workouts.
 * Body: { rhythm: number, workoutId? }
 */
router.patch('/workout/rhythm', (req, res) => {
  const { rhythm, workoutId } = req.body;

  if (!rhythm || typeof rhythm !== 'number' || !Number.isInteger(rhythm) || rhythm < 1 || rhythm > 7) {
    return res.status(400).json({ error: 'rhythm muss eine ganze Zahl zwischen 1 und 7 sein.' });
  }

  const raw = readJSON(req.workoutDataPath);
  if (!raw) {
    return res.status(500).json({ error: 'Workout-Daten konnten nicht geladen werden.' });
  }
  const workoutData = normalizeWorkoutData(raw);
  const targetWorkout = (workoutId && workoutData.workouts.find(w => w.id === workoutId)) || workoutData.activeWorkout;

  targetWorkout.rhythm = rhythm;
  const success = writeJSON(req.workoutDataPath, workoutData);
  if (!success) {
    return res.status(500).json({ error: 'Rhythmus konnte nicht gespeichert werden.' });
  }

  res.json({ message: `Trainings-Rhythmus auf alle ${rhythm} Tage gesetzt.`, rhythm, workoutData: normalizeWorkoutData(workoutData) });
});

// ============================
// PHASEN-Endpunkte
// ============================

/**
 * POST /api/workout/phase
 * Erstellt eine neue Workout-Phase.
 * Body: { name, workoutId? }
 */
router.post('/workout/phase', (req, res) => {
  const { name, workoutId } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name ist erforderlich.' });
  }

  const raw = readJSON(req.workoutDataPath);
  if (!raw) {
    return res.status(500).json({ error: 'Workout-Daten konnten nicht geladen werden.' });
  }
  const workoutData = normalizeWorkoutData(raw);
  const targetWorkout = (workoutId && workoutData.workouts.find(w => w.id === workoutId)) || workoutData.activeWorkout;

  const cleanName = name.trim();
  const phaseId = `phase-${Date.now()}`;
  const newPhase = {
    id: phaseId,
    name: cleanName,
    exercises: [],
  };

  targetWorkout.phases.push(newPhase);
  writeJSON(req.workoutDataPath, workoutData);

  res.status(201).json({ message: 'Phase erstellt.', phase: newPhase, workoutData: normalizeWorkoutData(workoutData) });
});

/**
 * PATCH /api/workout/phase/reorder
 * Ändert die Reihenfolge von Phasen.
 */
router.patch('/workout/phase/reorder', (req, res) => {
  const { phaseId, direction, workoutId } = req.body;

  if (!phaseId || !['up', 'down'].includes(direction)) {
    return res.status(400).json({ error: 'phaseId und direction ("up" oder "down") sind erforderlich.' });
  }

  const raw = readJSON(req.workoutDataPath);
  if (!raw) {
    return res.status(500).json({ error: 'Workout-Daten konnten nicht geladen werden.' });
  }
  const workoutData = normalizeWorkoutData(raw);
  const targetWorkout = (workoutId && workoutData.workouts.find(w => w.id === workoutId)) || workoutData.activeWorkout;

  const idx = targetWorkout.phases.findIndex((p) => p.id === phaseId);
  if (idx === -1) {
    return res.status(404).json({ error: `Phase "${phaseId}" nicht gefunden.` });
  }

  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx >= 0 && targetIdx < targetWorkout.phases.length) {
    const [phase] = targetWorkout.phases.splice(idx, 1);
    targetWorkout.phases.splice(targetIdx, 0, phase);
    writeJSON(req.workoutDataPath, workoutData);
  }

  res.json({ message: 'Phasen-Reihenfolge geändert.', workoutData: normalizeWorkoutData(workoutData) });
});

/**
 * PATCH /api/workout/phase/:id
 * Benennt eine Phase um.
 * Body: { name }
 */
router.patch('/workout/phase/:id', (req, res) => {
  const phaseId = req.params.id;
  const { name } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name ist erforderlich.' });
  }

  const raw = readJSON(req.workoutDataPath);
  if (!raw) {
    return res.status(500).json({ error: 'Workout-Daten konnten nicht geladen werden.' });
  }
  const workoutData = normalizeWorkoutData(raw);

  let phaseFound = null;
  for (const workout of workoutData.workouts) {
    const p = workout.phases.find((item) => item.id === phaseId);
    if (p) {
      phaseFound = p;
      break;
    }
  }

  if (!phaseFound) {
    return res.status(404).json({ error: `Phase "${phaseId}" nicht gefunden.` });
  }

  phaseFound.name = name.trim();
  writeJSON(req.workoutDataPath, workoutData);

  res.json({ message: 'Phase umbenannt.', phase: phaseFound, workoutData: normalizeWorkoutData(workoutData) });
});

/**
 * DELETE /api/workout/phase/:id
 * Löscht eine Phase inklusive aller Übungen.
 */
router.delete('/workout/phase/:id', (req, res) => {
  const phaseId = req.params.id;

  const raw = readJSON(req.workoutDataPath);
  if (!raw) {
    return res.status(500).json({ error: 'Workout-Daten konnten nicht geladen werden.' });
  }
  const workoutData = normalizeWorkoutData(raw);

  let removedPhase = null;
  for (const workout of workoutData.workouts) {
    const idx = workout.phases.findIndex((p) => p.id === phaseId);
    if (idx !== -1) {
      [removedPhase] = workout.phases.splice(idx, 1);
      break;
    }
  }

  if (!removedPhase) {
    return res.status(404).json({ error: `Phase "${phaseId}" nicht gefunden.` });
  }

  writeJSON(req.workoutDataPath, workoutData);
  res.json({ message: `Phase "${removedPhase.name}" gelöscht.`, workoutData: normalizeWorkoutData(workoutData) });
});

// ============================
// STATS-Endpunkte
// ============================

/**
 * GET /api/stats
 * Liefert die aktuellen Statistiken.
 */
router.get('/stats', (req, res) => {
  const state = getState(req);
  res.json(state.stats);
});

/**
 * POST /api/stats/reset
 * Setzt Statistik-Zähler zurück.
 * Body: { type: 'completed' | 'skipped' | 'all' }
 */
router.post('/stats/reset', (req, res) => {
  const { type } = req.body;
  const state = getState(req);

  switch (type) {
    case 'completed':
      state.stats.completedWorkouts = 0;
      state.completedDays = [];
      state.checkedExercises = {};
      state.streak.current = 0;
      state.streak.record = 0;
      break;
    case 'skipped':
      state.stats.skippedWorkouts = 0;
      state.skippedDays = [];
      break;
    case 'all':
      state.stats.completedWorkouts = 0;
      state.stats.skippedWorkouts = 0;
      state.completedDays = [];
      state.skippedDays = [];
      state.checkedExercises = {};
      state.streak.current = 0;
      state.streak.record = 0;
      break;
    default:
      return res.status(400).json({ error: 'Ungültiger type. Erlaubt: completed, skipped, all.' });
  }

  writeJSON(req.statePath, state);
  res.json({ message: `Stats (${type}) zurückgesetzt.`, stats: state.stats });
});

// ============================
// KALENDER-Endpunkte
// ============================

/**
 * GET /api/calendar
 * Liefert Tage mit Trainings-/Pausenstatus.
 * Query-Parameter:
 *   - offset {number} Tages-Offset relativ zu heute (negativ = Vergangenheit, Standard: 0)
 *   - count  {number} Anzahl der Tage (Standard: 28, Max: 90)
 */
router.get('/calendar', (req, res) => {
  const state = getState(req);
  const rawData = readJSON(req.workoutDataPath);
  const workoutData = normalizeWorkoutData(rawData);

  const startDate = parseLocalDate(state.trainingStartDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const offset = parseInt(req.query.offset) || 0;
  const count = Math.min(parseInt(req.query.count) || 28, 90);

  const days = [];
  for (let i = 0; i < count; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset + i);
    const dateStr = formatLocalDate(date);
    const isPast = date < today;
    const isToday = offset + i === 0;

    // Tage seit Start zählen
    const daysSinceStart = Math.round((date - startDate) / (1000 * 60 * 60 * 24));
    // Übersprungene Tage vor diesem Datum zählen
    const skippedBefore = state.skippedDays.filter((s) => s.date < dateStr).length;
    const effectiveIndex = daysSinceStart + skippedBefore;

    const skipEntry = state.skippedDays.find((s) => s.date === dateStr);
    const isSkipped = !!skipEntry;
    const skipReason = skipEntry ? skipEntry.reason : null;

    const isCompleted = state.completedDays.includes(dateStr);
    const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

    // Prüfen, ob für diesen Tag ein Workout eingeplant ist (Rhythmus oder Wochentag)
    let matchedWorkout = null;
    if (!isSkipped) {
      for (const workout of workoutData.workouts) {
        if (workout.scheduleType === 'weekdays') {
          const wDays = Array.isArray(workout.weekdays) ? workout.weekdays : [1, 3, 5];
          if (wDays.includes(dayOfWeek)) {
            matchedWorkout = workout;
            break;
          }
        } else {
          // rhythm
          const rVal = workout.rhythm || 2;
          if (effectiveIndex >= 0 && effectiveIndex % rVal === 0) {
            matchedWorkout = workout;
            break;
          }
        }
      }
    }

    const isTraining = !isSkipped && matchedWorkout !== null;
    const isMissed = isPast && isTraining && !isCompleted && !isSkipped;

    days.push({
      date: dateStr,
      dayName: date.toLocaleDateString('de-DE', { weekday: 'short' }),
      dayNumber: date.getDate(),
      month: date.toLocaleDateString('de-DE', { month: 'short' }),
      isToday,
      isPast,
      isTraining,
      workoutId: matchedWorkout ? matchedWorkout.id : null,
      workoutName: matchedWorkout ? matchedWorkout.name : null,
      workoutPhases: matchedWorkout ? matchedWorkout.phases : (workoutData.activeWorkout ? workoutData.activeWorkout.phases : []),
      isCompleted,
      isSkipped,
      isMissed,
      skipReason,
      rhythm: matchedWorkout ? matchedWorkout.rhythm : 2,
    });
  }

  res.json({ days, trainingStartDate: state.trainingStartDate, activeWorkout: workoutData.activeWorkout });
});

/**
 * POST /api/calendar/skip
 * Überspringt einen Trainingstag.
 * Body: { date, reason: 'soreness' | 'laziness' }
 */
router.post('/calendar/skip', (req, res) => {
  const { date, reason } = req.body;

  if (!date || !reason) {
    return res.status(400).json({ error: 'date und reason sind erforderlich.' });
  }

  if (!['soreness', 'heat', 'laziness', 'vacation'].includes(reason)) {
    return res.status(400).json({ error: 'reason muss "soreness", "heat", "laziness" oder "vacation" sein.' });
  }

  const state = getState(req);

  // Prüfen ob schon übersprungen
  if (state.skippedDays.some((s) => s.date === date)) {
    return res.status(400).json({ error: 'Dieser Tag wurde bereits übersprungen.' });
  }

  state.skippedDays.push({ date, reason });
  state.stats.skippedWorkouts += 1;

  // Streak aktualisieren
  const newStreak = calculateStreak(state);
  state.streak.current = newStreak;

  writeJSON(req.statePath, state);
  res.json({ message: 'Trainingstag übersprungen.', stats: state.stats, streak: state.streak });
});

/**
 * DELETE /api/calendar/skip
 * Macht einen Skip des heutigen Tages rückgängig.
 * Body: { date }
 * Nur erlaubt wenn der Skip für heute ist.
 */
router.delete('/calendar/skip', (req, res) => {
  const { date } = req.body;

  if (!date) {
    return res.status(400).json({ error: 'date ist erforderlich.' });
  }

  // Nur heute erlaubt
  const today = formatLocalDate(new Date());
  if (date !== today) {
    return res.status(403).json({ error: 'Skip kann nur für den heutigen Tag rückgängig gemacht werden.' });
  }

  const state = getState(req);

  const skipIndex = state.skippedDays.findIndex((s) => s.date === date);
  if (skipIndex === -1) {
    return res.status(404).json({ error: 'Kein Skip für diesen Tag gefunden.' });
  }

  // Skip entfernen
  state.skippedDays.splice(skipIndex, 1);
  if (state.stats.skippedWorkouts > 0) {
    state.stats.skippedWorkouts -= 1;
  }

  // Streak neu berechnen (wird wiederhergestellt)
  const newStreak = calculateStreak(state);
  state.streak.current = newStreak;

  writeJSON(req.statePath, state);
  res.json({ message: 'Skip rückgängig gemacht.', stats: state.stats, streak: state.streak });
});

/**
 * POST /api/calendar/advance
 * Verschiebt den Trainings-Rhythmus so, dass heute ein Trainingstag wird.
 * Nur sinnvoll wenn heute ein Ruhetag ist.
 */
router.post('/calendar/advance', (req, res) => {
  const state = getState(req);
  const workoutData = readJSON(req.workoutDataPath);
  const rhythm = (workoutData && typeof workoutData.rhythm === 'number') ? workoutData.rhythm : 2;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatLocalDate(today);

  // Aktuellen effektiven Index für heute berechnen
  const startDate = parseLocalDate(state.trainingStartDate);
  const daysSinceStart = Math.round((today - startDate) / (1000 * 60 * 60 * 24));
  const skippedBefore = state.skippedDays.filter((s) => s.date < todayStr).length;
  const effectiveIndex = daysSinceStart + skippedBefore;

  // Prüfen ob heute schon ein Trainingstag ist
  if (effectiveIndex % rhythm === 0) {
    return res.json({ message: 'Heute ist bereits ein Trainingstag.', noChange: true });
  }

  // Neues trainingStartDate berechnen:
  // Wir wollen effectiveIndex % rhythm === 0 für heute
  // effectiveIndex = daysSinceStart + skippedBefore
  // Neues daysSinceStart muss = (rhythm - (skippedBefore % rhythm)) % rhythm sein
  const targetDaysSinceStart = (rhythm - (skippedBefore % rhythm)) % rhythm;
  const newStartDate = new Date(today);
  newStartDate.setDate(today.getDate() - targetDaysSinceStart);

  state.trainingStartDate = formatLocalDate(newStartDate);
  writeJSON(req.statePath, state);

  res.json({
    message: 'Workout auf heute vorgezogen!',
    trainingStartDate: state.trainingStartDate,
  });
});

/**
 * POST /api/calendar/complete
 * Markiert ein Workout als abgeschlossen.
 * Body: { date }
 */
router.post('/calendar/complete', (req, res) => {
  const { date } = req.body;

  if (!date) {
    return res.status(400).json({ error: 'date ist erforderlich.' });
  }

  const state = getState(req);

  // Prüfen ob schon abgeschlossen
  if (state.completedDays.includes(date)) {
    return res.status(400).json({ error: 'Dieses Workout wurde bereits abgeschlossen.' });
  }

  // Datum validieren: heute oder gestern?
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const todayStr = formatLocalDate(today);
  const yesterdayStr = formatLocalDate(yesterday);

  // Zukünftige Workouts können nicht abgeschlossen werden
  const requestDate = new Date(date);
  requestDate.setHours(0, 0, 0, 0);
  if (requestDate > today) {
    return res.status(400).json({ error: 'Zukünftige Workouts können nicht abgeschlossen werden.' });
  }

  let streakReset = false;

  state.completedDays.push(date);
  state.stats.completedWorkouts += 1;

  if (date === todayStr || date === yesterdayStr) {
    // Normal: Streak neu berechnen
    const newStreak = calculateStreak(state);
    state.streak.current = newStreak;
    if (newStreak > state.streak.record) {
      state.streak.record = newStreak;
    }
  } else {
    // Älter als gestern: Record sichern, dann Streak auf 0
    if (state.streak.current > state.streak.record) {
      state.streak.record = state.streak.current;
    }
    state.streak.current = 0;
    streakReset = true;
  }

  writeJSON(req.statePath, state);
  res.json({ message: 'Workout abgeschlossen!', stats: state.stats, streak: state.streak, streakReset });
});

// ============================
// STATE-Endpunkt
// ============================

/**
 * GET /api/state
 * Liefert den gesamten App-Zustand.
 */
router.get('/state', (req, res) => {
  const state = getState(req);
  res.json(state);
});

// ============================
// LEADERBOARD-Endpunkt
// ============================

/**
 * GET /api/leaderboard
 * Liefert die zwei globalen Bestenlisten (Streak ab 3 Tage & Gesamt-Workouts).
 */
router.get('/leaderboard', (req, res) => {
  const usersDir = path.join(__dirname, '..', 'data', 'users');
  const allUsers = [];

  if (fs.existsSync(usersDir)) {
    try {
      const entries = fs.readdirSync(usersDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const userKey = entry.name;
          const userDir = path.join(usersDir, userKey);
          const authPath = path.join(userDir, 'auth.json');
          const statePath = path.join(userDir, 'state.json');

          if (fs.existsSync(authPath) && fs.existsSync(statePath)) {
            const authData = readJSON(authPath) || {};
            const state = readJSON(statePath) || {};

            const calculatedStreak = calculateStreak(state);
            const storedStreak = state.streak?.current || 0;
            const streak = Math.max(calculatedStreak, storedStreak);
            const completedWorkouts = state.stats?.completedWorkouts || (state.completedDays ? state.completedDays.length : 0);

            allUsers.push({
              userKey,
              username: authData.username || 'Benutzer',
              streak,
              completedWorkouts,
              isSelf: userKey === req.userKey,
            });
          }
        }
      }
    } catch (err) {
      console.error('[API] Fehler beim Lesen der Leaderboard-Daten:', err.message);
    }
  }

  // 1. Streak Leaderboard (erst ab Streak >= 3)
  const streakUsers = allUsers
    .filter((u) => u.streak >= 3)
    .sort((a, b) => {
      if (b.streak !== a.streak) return b.streak - a.streak;
      if (b.completedWorkouts !== a.completedWorkouts) return b.completedWorkouts - a.completedWorkouts;
      return a.username.localeCompare(b.username);
    });

  const streakLeaderboard = streakUsers.map((u, i) => ({
    rank: i + 1,
    username: u.username,
    streak: u.streak,
    completedWorkouts: u.completedWorkouts,
    isSelf: u.isSelf,
  }));

  // 2. Gesamt-Workouts Leaderboard (ab completedWorkouts > 0)
  const workoutUsers = allUsers
    .filter((u) => u.completedWorkouts > 0)
    .sort((a, b) => {
      if (b.completedWorkouts !== a.completedWorkouts) return b.completedWorkouts - a.completedWorkouts;
      if (b.streak !== a.streak) return b.streak - a.streak;
      return a.username.localeCompare(b.username);
    });

  const completedLeaderboard = workoutUsers.map((u, i) => ({
    rank: i + 1,
    username: u.username,
    completedWorkouts: u.completedWorkouts,
    streak: u.streak,
    isSelf: u.isSelf,
  }));

  // Eigene Ränge ermitteln
  const selfStreakEntry = streakLeaderboard.find((u) => u.isSelf);
  const selfWorkoutEntry = completedLeaderboard.find((u) => u.isSelf);

  // Eigene Live-Werte aus req state für Zusammenfassung
  const selfState = getState(req);
  const myCurrentStreak = calculateStreak(selfState);
  const myCompletedWorkouts = selfState.stats?.completedWorkouts || 0;

  res.json({
    streakLeaderboard,
    completedLeaderboard,
    currentUser: {
      username: req.username,
      streak: myCurrentStreak,
      completedWorkouts: myCompletedWorkouts,
      streakRank: selfStreakEntry ? selfStreakEntry.rank : null,
      completedRank: selfWorkoutEntry ? selfWorkoutEntry.rank : null,
    },
  });
});
// ============================
// BUGREPORT-Endpunkt
// ============================

/** Pfad zur bug.log Datei im Projektverzeichnis */
const BUG_LOG_PATH = path.join(__dirname, '..', 'bug.log');

/**
 * POST /api/bugreport
 * Speichert einen Fehlerbericht in bug.log.
 * Body: { description, pageUrl }
 */
router.post('/bugreport', (req, res) => {
  const { description, pageUrl } = req.body;

  if (!description || typeof description !== 'string' || !description.trim()) {
    return res.status(400).json({ error: 'Eine Fehlerbeschreibung ist erforderlich.' });
  }

  const timestamp = new Date().toISOString();
  const username = req.username || 'Unbekannt';
  const url = pageUrl || req.headers.referer || 'Unbekannt';

  const logEntry = [
    `========================================`,
    `Zeitstempel: ${timestamp}`,
    `Benutzer:    ${username}`,
    `URL:         ${url}`,
    `Beschreibung:`,
    description.trim(),
    `========================================\n`,
  ].join('\n');

  try {
    fs.appendFileSync(BUG_LOG_PATH, logEntry, 'utf-8');
    res.json({ message: 'Bugreport gespeichert. Vielen Dank!' });
  } catch (err) {
    console.error('[API] Fehler beim Schreiben in bug.log:', err.message);
    res.status(500).json({ error: 'Bugreport konnte nicht gespeichert werden.' });
  }
});

// ============================
// 404 + Globaler Error-Handler
// ============================

/**
 * 404-Handler: Unbekannte API-Routen
 */
router.use((req, res) => {
  res.status(404).json({
    error: 'API-Endpunkt nicht gefunden.',
    path: req.originalUrl,
    method: req.method,
  });
});

/**
 * Globaler Fehler-Handler für unerwartete Fehler in Route-Handlern.
 * Verhindert, dass Stack-Traces an den Client gesendet werden.
 */
// eslint-disable-next-line no-unused-vars
router.use((err, req, res, _next) => {
  console.error('[API] Unerwarteter Fehler:', err.message);
  console.error(err.stack);

  const isDev = process.env.NODE_ENV !== 'production';
  res.status(500).json({
    error: 'Interner Serverfehler.',
    ...(isDev && { detail: err.message }),
  });
});

module.exports = router;
