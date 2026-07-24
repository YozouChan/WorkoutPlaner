/**
 * modules/i18n.js
 * ===============
 * Internationalisierungs-Modul (i18n) für Englisch und Deutsch.
 *
 * Zweck:
 * - Verwaltet Sprachwechsel zwischen Englisch (en) und Deutsch (de)
 * - Standardmäßig ist Englisch ('en') ausgewählt bei Erstbesuch
 * - Speichert Sprachauswahl in localStorage ('workout-calendar-language')
 * - Stellt Übersetzungswörterbuch und t(key, params) Funktion bereit
 * - Wendet Übersetzungen dynamisch auf DOM-Elemente mit [data-i18n] an
 *
 * Exportierte Funktionen (global auf window.I18n):
 * - init()           → void
 * - getLanguage()   → 'en' | 'de'
 * - setLanguage(lang) → void
 * - toggleLanguage() → void
 * - t(key, params)  → string
 * - translateReps(reps) → string
 * - translateText(text) → string
 * - applyTranslations() → void
 */

const I18n = (() => {
  const STORAGE_KEY = 'workout-calendar-language';
  const LANG_EN = 'en';
  const LANG_DE = 'de';

  let currentLang = LANG_EN;
  let listeners = [];

  const translations = {
    en: {
      // Nav / Sidebar
      nav_calendar: 'Calendar',
      nav_editor: 'Workout Editor',
      nav_leaderboard: 'Leaderboard',
      nav_prev: 'Previous',
      nav_next: 'Next',
      sidebar_subtitle: 'Your Workout Plan',
      sidebar_completed: 'Completed',
      sidebar_skipped: 'Skipped',

      // Header & User
      header_calendar_title: '📅 Calendar',
      header_calendar_subtitle: 'Your workout plan for the next 14 days',
      header_editor_title: '🏋️ Workout Editor',
      header_editor_subtitle: 'Customize your workout plan & rhythm',
      header_leaderboard_title: '🏆 Leaderboard',
      header_leaderboard_subtitle: 'Compare your progress with other users',
      header_logout: 'Sign out',
      header_logout_title: 'Sign out of your session',
      header_theme_title: 'Toggle Dark/Light Mode',
      header_lang_title: 'Switch Language (EN / DE)',
      header_settings_title: 'Settings',
      guest_user: 'Guest',

      // Stats Banner
      stats_completed: 'Completed:',
      stats_skipped: 'Skipped:',
      stats_streak: 'Streak:',
      stats_streak_days: '{n} Days',
      stats_progress: '{n}% Success Rate',
      stats_record: 'Record: {n}',

      // Login Overlay
      login_title: 'Welcome to Workout Calendar',
      login_subtitle: 'Please log in with your username and 10-word passphrase.',
      login_username_label: 'Username',
      login_username_placeholder: 'e.g. MaxMustermann',
      login_passphrase_label: 'Passphrase (exactly 10 words)',
      login_passphrase_placeholder: '10 words separated by spaces...',
      login_regen_passphrase: 'New Passphrase',
      login_button: 'Log in / Register',
      login_help: 'If the username & passphrase do not exist yet, a new profile will be created automatically.',
      login_err_username: 'Please enter a valid username.',
      login_err_passphrase: 'The passphrase must consist of exactly 10 words (currently: {count} words).',

      // Day View & Cards
      day_view_today: 'Today',
      day_view_rest: 'Rest Day',
      day_view_training: 'Training Day',
      day_view_scheduled_training: 'Scheduled Training Day',
      day_view_completed: 'Completed',
      day_view_skipped: 'Skipped',
      day_view_missed: 'Missed',
      day_view_skip_reason_vacation: 'Vacation',
      day_view_skip_reason_soreness: 'Soreness',
      day_view_skip_reason_heat: 'Heat',
      day_view_skip_reason_laziness: 'Laziness',
      day_view_rest_title: 'Rest & Recovery',
      day_view_rest_desc: 'No workout scheduled for today. Rest up for your next training session!',
      day_view_advance_btn: '⚡ Pull Workout to Today',
      day_view_complete_btn: '✅ Mark Workout as Completed',
      day_view_skip_btn: '⏭️ Skip Day',
      day_view_undo_skip_btn: '↩️ Undo Skip',
      day_view_exercises_checked: '{completed} of {total} exercises done',
      day_view_future_banner_title: 'This workout is in the future',
      day_view_future_banner_desc: 'You can check off exercises once the day arrives.',
      day_view_loading: 'Loading workout data...',
      day_view_rest_between_sets: '⏱️ {rest} rest between sets',
      day_view_no_rest: 'Back-to-back',
      day_view_next_training_day: 'Next training day:',
      day_view_do_workout_now: '🏃 Do Workout Now!',
      day_view_advance_hint: 'Pulls the next workout to today — the rhythm adjusts automatically.',
      day_view_completed_title: 'Workout Completed!',
      day_view_completed_desc: 'You successfully completed the workout on {date}. Keep it up!',
      day_view_skipped_frozen_title: 'Streak Frozen',
      day_view_skipped_frozen_desc: 'Your streak stays active — recover well! ❤️',
      day_view_skipped_desc: 'This training day was skipped. Next scheduled day is your training day!',
      day_view_undo_skip_title: '💪 Train Anyway!',
      day_view_undo_skip_desc: 'Do it — your streak will be restored!',
      day_view_missed_title: 'Workout Missed',
      day_view_missed_yesterday_desc: 'No workout was completed on {date}. Did you make it after all?',
      day_view_missed_did_it_btn: '✅ Completed After All!',
      day_view_missed_retroactive_hint: 'Logs the workout retroactively as completed.',
      day_view_missed_old_desc: 'No workout was completed on {date}. Happens to everyone!',
      day_view_missed_not_possible_title: 'Retroactive logging not available',
      day_view_missed_not_possible_desc: 'This workout is more than a day in the past. Only yesterday\'s workouts can be logged retroactively.',

      // Cards
      card_set: 'Set',
      card_sets: 'Sets',
      card_execution: 'Execution:',
      card_no_video: 'Video guide coming soon',
      card_check: 'Mark as completed',
      card_uncheck: 'Mark as incomplete',
      card_details: 'Show details',

      // Skip Modal
      skip_modal_title: '⏭️ Skip Training Day',
      skip_modal_desc: "Select a reason for skipping today's workout:",
      skip_reason_soreness_title: '🏋️ Soreness (Streak frozen)',
      skip_reason_soreness_desc: 'Muscle recovery is important. Your streak will not break.',
      skip_reason_vacation_title: '🌴 Vacation / Travel (Streak frozen)',
      skip_reason_vacation_desc: 'Enjoy your time off! Your streak is safely paused.',
      skip_reason_heat_title: '☀️ Extreme Heat (Streak resets)',
      skip_reason_heat_desc: 'Too hot to train safely today.',
      skip_reason_laziness_title: '😴 No Motivation (Streak resets)',
      skip_reason_laziness_desc: 'Honesty first! Streak will be reset to 0.',
      skip_confirm: 'Skip Day',
      skip_cancel: 'Cancel',

      // Settings Modal
      settings_title: '⚙️ Settings',
      settings_stats_section: '📊 Statistics',
      settings_completed: 'Completed',
      settings_skipped: 'Skipped',
      settings_delete_section: '🗑️ Delete Data',
      settings_delete_desc: 'Entries will be removed from your calendar.',
      settings_delete_completed_title: 'Completed Workouts',
      settings_delete_completed_desc: 'Delete all completion entries & reset streak',
      settings_delete_skipped_title: 'Skipped Workouts',
      settings_delete_skipped_desc: 'Delete all skip entries from your calendar',
      settings_delete_all_title: 'Reset All Data',
      settings_delete_all_desc: 'Delete all workouts + skips + reset streak',
      settings_delete_btn: 'Delete',
      settings_confirm_delete_completed_title: '🗑️ Delete Completed Workouts',
      settings_confirm_delete_completed_msg: 'Are you sure? All completed workouts will be deleted from your calendar, and your streak reset to 0. This action cannot be undone.',
      settings_confirm_delete_skipped_title: '🗑️ Delete Skipped Workouts',
      settings_confirm_delete_skipped_msg: 'Are you sure? All skipped days will be deleted from your calendar. This action cannot be undone.',
      settings_confirm_delete_all_title: '⚠️ Delete All Data',
      settings_confirm_delete_all_msg: 'Are you sure? ALL calendar entries (completed and skipped) will be deleted and your streak reset to 0. This action cannot be undone.',
      modal_confirm: 'Delete',
      modal_cancel: 'Cancel',

      // Editor Page & Multi-Workout
      editor_mode: 'Editor Mode',
      editor_loading: 'Loading workout data...',
      editor_info_title: 'Changes are saved automatically',
      editor_info_desc: 'Add, remove, or reorder exercises – everything updates your workout plan directly.',
      editor_rhythm_title: 'Workout Rhythm & Schedule',
      editor_rhythm_every: 'Train every {n} days',
      editor_phases_title: 'Training Phases',
      editor_phases_desc: 'Create, manage, and order your workout sections',
      editor_add_phase_btn: 'New Phase',
      editor_add_phase: 'Add Phase',
      editor_add_exercise: 'Add Exercise',
      editor_add_exercise_title: 'Add Exercise',
      editor_exercise_count_one: '{n} Exercise',
      editor_exercise_count_many: '{n} Exercises',
      editor_empty_phase: 'No exercises in this phase yet.',
      editor_empty_phase_hint: 'Click "Add" to enter the first exercise.',
      editor_field_name: 'Name',
      editor_field_sets: 'Sets',
      editor_field_reps: 'Reps / Duration',
      editor_field_desc: 'Description',
      editor_add_btn: 'Add Exercise',
      editor_move_up: 'Move up',
      editor_move_down: 'Move down',
      editor_edit_phase: 'Rename Phase',
      editor_delete_phase: 'Delete Phase',
      editor_edit_exercise: 'Edit Exercise',
      editor_delete_exercise: 'Delete Exercise',
      editor_sets: '{n} Sets',
      editor_reps: '{reps} Reps',
      editor_save: 'Save',
      editor_cancel: 'Cancel',
      editor_rename_routine: 'Rename Routine',
      editor_new_name: 'New Name',
      editor_rename_phase: 'Rename Phase',
      editor_new_phase_name: 'New Phase Name',
      editor_phase_name: 'Phase Name',
      editor_phase_placeholder: 'e.g. Phase 4: Cool-Down',
      editor_confirm_delete_exercise: 'Are you sure you want to delete this exercise?',
      editor_confirm_delete_phase: 'Are you sure you want to delete this phase and all its exercises?',
      editor_toast_exercise_added: 'Exercise added!',
      editor_toast_exercise_updated: 'Exercise updated!',
      editor_toast_exercise_removed: 'Exercise removed.',
      editor_toast_phase_deleted: 'Phase deleted.',
      editor_field_image: 'Exercise Image / GIF',
      editor_no_image: 'No Image',
      editor_preset_custom: '-- Custom Image / GIF URL --',
      editor_edit_exercise_title: '✏️ Edit Exercise',
      editor_upload_btn: '📤 Upload Image / GIF (max. 25MB)',
      editor_uploading: 'Uploading file...',
      editor_upload_success: 'Image uploaded successfully!',
      editor_upload_err_size: 'File is too large. Maximum size is 25MB.',
      editor_upload_err_type: 'Invalid file format. Only images and GIFs are allowed.',
      editor_dropzone_title: 'Drag & drop image or GIF here, or click to choose',
      editor_dropzone_subtitle: 'Supports GIF, PNG, JPG, WebP (max. 25MB)',

      // Routine Management & Schedule Types
      workout_routines: 'Workout Routines',
      editor_routines_desc: 'Create and manage different workouts (e.g. Full Body, Push/Pull, Leg Day)',
      editor_preview_14days: 'Training Calendar Preview (Next 14 Days):',
      schedule_type_rhythm: 'Interval Rhythm',
      schedule_type_weekdays: 'Fixed Weekdays',
      schedule_type_rhythm_desc: 'Train periodically every 1-7 days',
      schedule_type_weekdays_desc: 'Train on specific days of the week',
      editor_create_routine: 'Create Routine',
      editor_create_routine_title: 'Create New Workout Routine',
      editor_routine_name: 'Routine Name',
      editor_routine_schedule: 'Training Schedule',
      editor_routine_config_desc: 'Configure the training schedule for this workout',
      editor_interval_days: 'Interval in Days',
      editor_weekday_select: 'Select Active Training Days:',
      editor_delete_routine: 'Delete Routine',
      editor_confirm_delete_routine: 'Are you sure you want to delete this workout routine?',
      weekday_0: 'Sunday',
      weekday_1: 'Monday',
      weekday_2: 'Tuesday',
      weekday_3: 'Wednesday',
      weekday_4: 'Thursday',
      weekday_5: 'Friday',
      weekday_6: 'Saturday',
      weekday_short_0: 'Sun',
      weekday_short_1: 'Mon',
      weekday_short_2: 'Tue',
      weekday_short_3: 'Wed',
      weekday_short_4: 'Thu',
      weekday_short_5: 'Fri',
      weekday_short_6: 'Sat',

      // Leaderboard Page
      lb_mode: 'Leaderboard Mode',
      lb_summary_streak_rank: 'Streak Rank',
      lb_summary_workout_rank: 'Workouts Rank',
      lb_summary_my_streak: 'My Streak',
      lb_summary_my_workouts: 'My Workouts',
      lb_summary_unranked: 'Unranked',
      lb_streak_title: 'Streak Leaderboard',
      lb_streak_qualifier: 'Min. 3 Days',
      lb_streak_desc: 'Requires a minimum streak of 3 days',
      lb_workout_title: 'Total Workouts Leaderboard',
      lb_workout_desc: 'All completed workouts overall',
      lb_workout_qualifier: 'Total',
      lb_col_rank: 'Rank',
      lb_col_user: 'User',
      lb_col_streak: 'Streak',
      lb_col_workouts: 'Workouts',
      lb_you: '(You)',
      lb_empty_streak: 'No users with a streak of at least 3 days yet.',
      lb_empty_workout: 'No completed workouts registered yet.',

      // Overlays & Notifications
      overlay_happy_title: 'Great job! You did it!',
      overlay_happy_sub: 'Workout complete! You rock! 💪',
      overlay_sad_title: 'Too bad... but tomorrow you will crush it!',
      overlay_sad_sub: 'Do not give up! Everyone has an off day. 💙',
      overlay_encouraging_title: 'Soreness is a sign of growth!',
      overlay_encouraging_sub: 'Rest up – you earned it! You are on the right track! 🌟',
      overlay_hot_title: 'It is just too hot today!',
      overlay_hot_sub: 'Stay cool and drink plenty of water. You will crush it tomorrow! 🧊',
      notif_title: '🏋️ WorkoutPlaner',
      notif_training_msg: 'Today is training day! Are you ready? 💪',

      // Bug Report
      bug_report_btn: 'Report Bug',
      bug_report_title: '🐛 Report a Bug',
      bug_report_desc: 'Describe the problem or error you encountered:',
      bug_report_placeholder: 'What happened? E.g., button did not react...',
      bug_report_send: 'Send Report',
      bug_report_success: 'Bug report sent. Thank you!',
    },

    de: {
      // Nav / Sidebar
      nav_calendar: 'Kalender',
      nav_editor: 'Workout Editor',
      nav_leaderboard: 'Leaderboard',
      nav_prev: 'Zurück',
      nav_next: 'Vorwärts',
      sidebar_subtitle: 'Dein Trainingsplan',
      sidebar_completed: 'Abgeschlossen',
      sidebar_skipped: 'Übersprungen',

      // Header & User
      header_calendar_title: '📅 Kalender',
      header_calendar_subtitle: 'Dein Trainingsplan für die nächsten 14 Tage',
      header_editor_title: '🏋️ Workout Editor',
      header_editor_subtitle: 'Trainingsplan & Rhythmus anpassen',
      header_leaderboard_title: '🏆 Leaderboard',
      header_leaderboard_subtitle: 'Vergleiche deine Fortschritte mit anderen',
      header_logout: 'Abmelden',
      header_logout_title: 'Session beenden und abmelden',
      header_theme_title: 'Dark/Light Mode umschalten',
      header_lang_title: 'Sprache umschalten (EN / DE)',
      header_settings_title: 'Einstellungen',
      guest_user: 'Gast',

      // Stats Banner
      stats_completed: 'Abgeschlossen:',
      stats_skipped: 'Übersprungen:',
      stats_streak: 'Streak:',
      stats_streak_days: '{n} Tage',
      stats_progress: '{n}% Erfolgsquote',
      stats_record: 'Rekord: {n}',

      // Login Overlay
      login_title: 'Willkommen beim Workout Kalender',
      login_subtitle: 'Bitte melde dich mit deinem Benutzernamen und deiner 10-Wörter Passphrase an.',
      login_username_label: 'Benutzername',
      login_username_placeholder: 'z.B. MaxMustermann',
      login_passphrase_label: 'Passphrase (genau 10 Wörter)',
      login_passphrase_placeholder: '10 Wörter mit Leerzeichen getrennt...',
      login_regen_passphrase: 'Neue Passphrase',
      login_button: 'Anmelden / Registrieren',
      login_help: 'Falls Benutzername & Passphrase noch nicht existieren, wird automatisch ein neues Profil erstellt.',
      login_err_username: 'Bitte gib einen gültigen Benutzernamen ein.',
      login_err_passphrase: 'Die Passphrase muss aus genau 10 Wörtern bestehen (aktuell: {count} Wörter).',

      // Day View & Cards
      day_view_today: 'Heute',
      day_view_rest: 'Ruhetag',
      day_view_training: 'Trainingstag',
      day_view_scheduled_training: 'Geplanter Trainingstag',
      day_view_completed: 'Abgeschlossen',
      day_view_skipped: 'Übersprungen',
      day_view_missed: 'Versäumt',
      day_view_skip_reason_vacation: 'Urlaub',
      day_view_skip_reason_soreness: 'Muskelkater',
      day_view_skip_reason_heat: 'Hitze',
      day_view_skip_reason_laziness: 'Keine Lust',
      day_view_rest_title: 'Erholung & Regeneration',
      day_view_rest_desc: 'Heute steht kein Workout an. Ruh dich aus für das nächste Training!',
      day_view_advance_btn: '⚡ Workout auf heute vorziehen',
      day_view_complete_btn: '✅ Workout als abgeschlossen markieren',
      day_view_skip_btn: '⏭️ Tag überspringen',
      day_view_undo_skip_btn: '↩️ Skip rückgängig machen',
      day_view_exercises_checked: '{completed} von {total} Übungen erledigt',
      day_view_future_banner_title: 'Dieses Workout liegt in der Zukunft',
      day_view_future_banner_desc: 'Du kannst Übungen erst abhaken, wenn der Tag gekommen ist.',
      day_view_loading: 'Workout-Daten werden geladen...',
      day_view_rest_between_sets: '⏱️ {rest} Pause zwischen Sätzen',
      day_view_no_rest: 'Direkt hintereinander',
      day_view_next_training_day: 'Nächster Trainingstag:',
      day_view_do_workout_now: '🏃 Workout jetzt machen!',
      day_view_advance_hint: 'Zieht das nächste Training auf heute vor — der Rhythmus passt sich automatisch an.',
      day_view_completed_title: 'Workout abgeschlossen!',
      day_view_completed_desc: 'Du hast das Workout am {date} erfolgreich abgeschlossen. Weiter so!',
      day_view_skipped_frozen_title: 'Streak eingefroren',
      day_view_skipped_frozen_desc: 'Deine Streak läuft weiter — erhol dich gut! ❤️',
      day_view_skipped_desc: 'Dieser Trainingstag wurde übersprungen. Der nächste Tag ist dein Trainingstag!',
      day_view_undo_skip_title: '💪 Doch trainieren!',
      day_view_undo_skip_desc: 'Mach es — deine Streak wird wiederhergestellt!',
      day_view_missed_title: 'Workout versäumt',
      day_view_missed_yesterday_desc: 'Am {date} wurde kein Training gemacht. Hast du es doch noch geschafft?',
      day_view_missed_did_it_btn: '✅ Doch noch gemacht!',
      day_view_missed_retroactive_hint: 'Trägt das Workout nachträglich als abgeschlossen ein.',
      day_view_missed_old_desc: 'Am {date} wurde kein Training gemacht. Das passiert jedem mal!',
      day_view_missed_not_possible_title: 'Nachträgliches Eintragen nicht möglich',
      day_view_missed_not_possible_desc: 'Dieses Workout liegt mehr als einen Tag zurück. Nur gestrige Workouts können noch eingetragen werden.',

      // Cards
      card_set: 'Satz',
      card_sets: 'Sätze',
      card_execution: 'Ausführung:',
      card_no_video: 'Video-Anleitung wird noch hinzugefügt',
      card_check: 'Als erledigt markieren',
      card_uncheck: 'Als nicht erledigt markieren',
      card_details: 'Details anzeigen',

      // Skip Modal
      skip_modal_title: '⏭️ Trainingstag überspringen',
      skip_modal_desc: 'Wähle einen Grund, warum du das heutige Workout überspringst:',
      skip_reason_soreness_title: '🏋️ Muskelkater (Streak bleibt erhalten)',
      skip_reason_soreness_desc: 'Regeneration ist wichtig. Deine Streak bleibt erhalten.',
      skip_reason_vacation_title: '🌴 Urlaub / Reisen (Streak bleibt erhalten)',
      skip_reason_vacation_desc: 'Genieße deine Pause! Deine Streak wird pausiert.',
      skip_reason_heat_title: '☀️ Extreme Hitze (Streak wird zurückgesetzt)',
      skip_reason_heat_desc: 'Zu heiß für ein sicheres Training.',
      skip_reason_laziness_title: '😴 Keine Lust (Streak wird zurückgesetzt)',
      skip_reason_laziness_desc: 'Ehrlichkeit geht vor. Streak wird auf 0 zurückgesetzt.',
      skip_confirm: 'Tag überspringen',
      skip_cancel: 'Abbrechen',

      // Settings Modal
      settings_title: '⚙️ Einstellungen',
      settings_stats_section: '📊 Statistik',
      settings_completed: 'Abgeschlossen',
      settings_skipped: 'Übersprungen',
      settings_delete_section: '🗑️ Daten löschen',
      settings_delete_desc: 'Einträge werden aus dem Kalender entfernt.',
      settings_delete_completed_title: 'Abgeschlossene Workouts',
      settings_delete_completed_desc: 'Alle Einträge + Streak löschen',
      settings_delete_skipped_title: 'Übersprungene Workouts',
      settings_delete_skipped_desc: 'Alle Skip-Einträge aus dem Kalender löschen',
      settings_delete_all_title: 'Alle Daten zurücksetzen',
      settings_delete_all_desc: 'Alle Workouts + Skips + Streak löschen',
      settings_delete_btn: 'Löschen',
      settings_confirm_delete_completed_title: '🗑️ Abgeschlossene Workouts löschen',
      settings_confirm_delete_completed_msg: 'Bist du sicher? Alle abgeschlossenen Workouts werden aus dem Kalender gelöscht, der Streak wird auf 0 zurückgesetzt. Diese Aktion kann nicht rückgängig gemacht werden.',
      settings_confirm_delete_skipped_title: '🗑️ Übersprungene Workouts löschen',
      settings_confirm_delete_skipped_msg: 'Bist du sicher? Alle übersprungenen Tage werden aus dem Kalender gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.',
      settings_confirm_delete_all_title: '⚠️ Alle Daten löschen',
      settings_confirm_delete_all_msg: 'Bist du sicher? ALLE Kalendereinträge (abgeschlossen und übersprungen) werden gelöscht und dein Streak wird zurückgesetzt. Diese Aktion kann nicht rückgängig gemacht werden.',
      modal_confirm: 'Löschen',
      modal_cancel: 'Abbrechen',

      // Editor Page & Multi-Workout
      editor_mode: 'Editor-Modus',
      editor_loading: 'Workout-Daten werden geladen...',
      editor_info_title: 'Änderungen werden sofort gespeichert',
      editor_info_desc: 'Übungen hinzufügen, entfernen oder umsortieren – alles wird direkt im Trainingsplan gespeichert.',
      editor_rhythm_title: 'Trainings-Rhythmus & Tage',
      editor_rhythm_every: 'Alle {n} Tage trainieren',
      editor_phases_title: 'Trainings-Phasen',
      editor_phases_desc: 'Erstelle, verwalte und sortiere die Abschnitte deines Workouts',
      editor_add_phase_btn: 'Neue Phase',
      editor_add_phase: 'Phase hinzufügen',
      editor_add_exercise: 'Übung hinzufügen',
      editor_add_exercise_title: 'Übung hinzufügen',
      editor_exercise_count_one: '{n} Übung',
      editor_exercise_count_many: '{n} Übungen',
      editor_empty_phase: 'Noch keine Übungen in dieser Phase.',
      editor_empty_phase_hint: 'Klicke auf "Hinzufügen" um die erste Übung einzutragen.',
      editor_field_name: 'Name',
      editor_field_sets: 'Sätze',
      editor_field_reps: 'Wdh. / Dauer',
      editor_field_desc: 'Beschreibung',
      editor_add_btn: 'Übung hinzufügen',
      editor_move_up: 'Nach oben',
      editor_move_down: 'Nach unten',
      editor_edit_phase: 'Phase umbenennen',
      editor_delete_phase: 'Phase löschen',
      editor_edit_exercise: 'Übung bearbeiten',
      editor_delete_exercise: 'Übung entfernen',
      editor_sets: '{n} Sätze',
      editor_reps: '{reps} Wdh.',
      editor_save: 'Speichern',
      editor_cancel: 'Abbrechen',
      editor_rename_routine: 'Routine umbenennen',
      editor_new_name: 'Neuer Name',
      editor_rename_phase: 'Phase umbenennen',
      editor_new_phase_name: 'Neuer Phasen-Name',
      editor_phase_name: 'Phasen-Name',
      editor_phase_placeholder: 'z.B. Phase 4: Cool-Down',
      editor_confirm_delete_exercise: 'Möchtest du diese Übung wirklich löschen?',
      editor_confirm_delete_phase: 'Möchtest du diese Phase und alle enthaltenen Übungen wirklich löschen?',
      editor_toast_exercise_added: 'Übung hinzugefügt!',
      editor_toast_exercise_updated: 'Übung aktualisiert!',
      editor_toast_exercise_removed: 'Übung entfernt.',
      editor_toast_phase_deleted: 'Phase gelöscht.',
      editor_field_image: 'Übungs-Bild / GIF',
      editor_no_image: 'Kein Bild',
      editor_preset_custom: '-- Eigene Bild / GIF URL --',
      editor_edit_exercise_title: '✏️ Übung bearbeiten',
      editor_upload_btn: '📤 Bild / GIF hochladen (max. 25MB)',
      editor_uploading: 'Datei wird hochgeladen...',
      editor_upload_success: 'Bild erfolgreich hochgeladen!',
      editor_upload_err_size: 'Datei ist zu groß. Maximale Größe ist 25MB.',
      editor_upload_err_type: 'Ungültiges Dateiformat. Nur Bilder und GIFs sind erlaubt.',
      editor_dropzone_title: 'Bild oder GIF hierher ziehen oder klicken',
      editor_dropzone_subtitle: 'Unterstützt GIF, PNG, JPG, WebP (max. 25MB)',

      // Routine Management & Schedule Types
      workout_routines: 'Trainings-Routinen',
      editor_routines_desc: 'Erstelle und verwalte verschiedene Workouts (z.B. Ganzkörper, Push/Pull, Legday)',
      editor_preview_14days: 'Trainingskalender Vorschau (Nächste 14 Tage):',
      schedule_type_rhythm: 'Intervall-Rhythmus',
      schedule_type_weekdays: 'Feste Wochentage',
      schedule_type_rhythm_desc: 'Alle 1-7 Tage periodisch trainieren',
      schedule_type_weekdays_desc: 'An bestimmten Wochentagen trainieren',
      editor_create_routine: 'Routine anlegen',
      editor_create_routine_title: 'Neue Workout-Routine anlegen',
      editor_routine_name: 'Routine-Name',
      editor_routine_schedule: 'Trainings-Zeitplan',
      editor_routine_config_desc: 'Konfiguriere die Trainingszeiten für dieses Workout',
      editor_interval_days: 'Intervall in Tagen',
      editor_weekday_select: 'Aktive Trainings-Wochentage wählen:',
      editor_delete_routine: 'Routine löschen',
      editor_confirm_delete_routine: 'Möchtest du diese Workout-Routine wirklich löschen?',
      weekday_0: 'Sonntag',
      weekday_1: 'Montag',
      weekday_2: 'Dienstag',
      weekday_3: 'Mittwoch',
      weekday_4: 'Donnerstag',
      weekday_5: 'Freitag',
      weekday_6: 'Samstag',
      weekday_short_0: 'So',
      weekday_short_1: 'Mo',
      weekday_short_2: 'Di',
      weekday_short_3: 'Mi',
      weekday_short_4: 'Do',
      weekday_short_5: 'Fr',
      weekday_short_6: 'Sa',

      // Leaderboard Page
      lb_mode: 'Leaderboard-Modus',
      lb_summary_streak_rank: 'Streak-Rang',
      lb_summary_workout_rank: 'Workouts-Rang',
      lb_summary_my_streak: 'Meine Streak',
      lb_summary_my_workouts: 'Meine Workouts',
      lb_summary_unranked: 'Nicht platziert',
      lb_streak_title: 'Streak Leaderboard',
      lb_streak_qualifier: 'Min. 3 Tage',
      lb_streak_desc: 'Qualifikation ab einer Streak von mind. 3 Tagen',
      lb_workout_title: '🏋️ Gesamt-Workouts Leaderboard',
      lb_workout_desc: 'Alle absolvierten Workouts insgesamt',
      lb_workout_qualifier: 'Gesamt',
      lb_col_rank: 'Platz',
      lb_col_user: 'Benutzer',
      lb_col_streak: 'Streak',
      lb_col_workouts: 'Workouts',
      lb_you: '(Du)',
      lb_empty_streak: 'Noch keine Benutzer mit einer Streak von mind. 3 Tagen.',
      lb_empty_workout: 'Noch keine abgeschlossenen Workouts registriert.',

      // Overlays & Notifications
      overlay_happy_title: 'Großartig! Du hast es geschafft!',
      overlay_happy_sub: 'Workout komplett! Du rockst! 💪',
      overlay_sad_title: 'Schade... aber morgen packst du es!',
      overlay_sad_sub: 'Gib nicht auf! Jeder hat mal einen schwachen Tag. 💙',
      overlay_encouraging_title: 'Muskelkater ist ein Zeichen des Wachstums!',
      overlay_encouraging_sub: 'Ruh dich aus – du verdienst es! Du bist auf dem richtigen Weg! 🌟',
      overlay_hot_title: 'Heute ist es einfach zu heiß!',
      overlay_hot_sub: 'Bleib kühl und trink viel Wasser. Morgen packst du es wieder! 🧊',
      notif_title: '🏋️ WorkoutPlaner',
      notif_training_msg: 'Heute ist Trainingstag! Bist du bereit? 💪',

      // Bug Report
      bug_report_btn: 'Fehler melden',
      bug_report_title: '🐛 Fehler melden',
      bug_report_desc: 'Beschreibe das Problem oder den Fehler, den du festgestellt hast:',
      bug_report_placeholder: 'Was ist passiert? Z.B. Button hat nicht reagiert...',
      bug_report_send: 'Bericht senden',
      bug_report_success: 'Bugreport gespeichert. Vielen Dank!',
    },
  };

  /**
   * Ermittelt die initiale Sprache:
   * 1. localStorage ('workout-calendar-language')
   * 2. Default: 'en'
   */
  function _getInitialLanguage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === LANG_EN || saved === LANG_DE) {
        return saved;
      }
    } catch (_) { }
    return LANG_EN;
  }

  /**
   * Übersetzt einen Key mit optionalen Parametern {paramKey: string|number}
   */
  function t(key, params = {}) {
    const dict = translations[currentLang] || translations.en;
    let text = dict[key] || translations.en[key] || key;

    for (const [pKey, pVal] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
    }

    return text;
  }

  /**
   * Übersetzt Wiederholungen / Rhythmus-Text ins Englische falls Sprache = 'en'
   * @param {string} reps
   * @returns {string}
   */
  function translateReps(reps) {
    if (!reps || typeof reps !== 'string' || currentLang !== LANG_EN) return reps;
    return reps
      .replace(/Wiederholungen/gi, 'reps')
      .replace(/Wiederholung/gi, 'rep')
      .replace(/pro Richtung/gi, 'per direction')
      .replace(/Minuten/gi, 'minutes')
      .replace(/Minute/gi, 'minute')
      .replace(/pro Bein/gi, 'per leg')
      .replace(/Sekunden/gi, 'seconds')
      .replace(/Sekunde/gi, 'second')
      .replace(/halten/gi, 'hold')
      .replace(/Satz/gi, 'set')
      .replace(/Sätze/gi, 'sets');
  }

  /**
   * Übersetzt bekannte deutsche Texte/Überschriften ins Englische falls Sprache = 'en'
   * @param {string} text
   * @returns {string}
   */
  function translateText(text) {
    if (!text || typeof text !== 'string' || currentLang !== LANG_EN) return text;

    const map = {
      'Phase 1: Warm-Up (Das Aufwärmen)': 'Phase 1: Warm-Up',
      'Phase 2: Unterkörper (Fokus auf Volumen & Rundungen)': 'Phase 2: Lower Body (Volume & Shape)',
      'Phase 3: Körpermitte (Fokus auf straffe, schmale Taille)': 'Phase 3: Core (Tight Waist)',
      'Mache diese Bewegungen direkt hintereinander, um deinen Kreislauf in Schwung zu bringen und deine Gelenke auf das Training vorzubereiten.': 'Do these movements back-to-back to get your circulation going and warm up your joints.',
      'Mache alle 3 Sätze einer Übung komplett fertig, bevor du zur nächsten übergehst.': 'Complete all 3 sets of an exercise before moving on to the next.',
      'Auch hier machst du erst eine Übung fertig, bevor die nächste kommt.': 'Finish each exercise completely before moving to the next one.',
      '60 Sekunden': '60 seconds',
      '45-60 Sekunden': '45-60 seconds',
      'Direkt hintereinander': 'Back-to-back',
    };

    return map[text] || text;
  }

  /**
   * Wendet Übersetzungen auf alle [data-i18n] Elemente im DOM an.
   */
  function applyTranslations() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        el.textContent = t(key);
      }
    });

    // Platzhalter in Formularen [data-i18n-placeholder]
    const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
    placeholders.forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) {
        el.setAttribute('placeholder', t(key));
      }
    });

    // Tooltips [data-i18n-title]
    const titles = document.querySelectorAll('[data-i18n-title]');
    titles.forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      if (key) {
        el.setAttribute('title', t(key));
      }
    });

    _updateLangSwitchVisuals();
  }

  /**
   * Aktualisiert den Language-Toggle-Button im Header.
   */
  function _updateLangSwitchVisuals() {
    const langBtn = document.getElementById('lang-toggle');
    const langLabel = document.getElementById('lang-toggle-label');
    const langDot = document.getElementById('lang-toggle-dot');

    if (langBtn) {
      langBtn.setAttribute('title', t('header_lang_title'));
    }

    if (langLabel) {
      langLabel.textContent = currentLang.toUpperCase();
    }

    if (langDot) {
      if (currentLang === LANG_DE) {
        langDot.classList.add('translate-x-6');
        langDot.innerHTML = '<span class="leading-none text-[10px] font-bold">DE</span>';
      } else {
        langDot.classList.remove('translate-x-6');
        langDot.innerHTML = '<span class="leading-none text-[10px] font-bold">EN</span>';
      }
    }
  }

  /**
   * Registriert Event-Listener für den Language-Toggle-Button
   */
  function _bindEvents() {
    const langBtn = document.getElementById('lang-toggle');
    if (langBtn) {
      langBtn.removeEventListener('click', toggleLanguage);
      langBtn.addEventListener('click', toggleLanguage);
    }
  }

  function init() {
    currentLang = _getInitialLanguage();
    applyTranslations();
    _bindEvents();

    console.log(`[I18n] Initialized with language: ${currentLang}`);
  }

  function getLanguage() {
    return currentLang;
  }

  function setLanguage(lang) {
    if (lang !== LANG_EN && lang !== LANG_DE) return;
    currentLang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      console.warn('[I18n] localStorage not available:', e);
    }

    applyTranslations();
    listeners.forEach((fn) => {
      try {
        fn(currentLang);
      } catch (err) {
        console.error('[I18n] Callback error:', err);
      }
    });
  }

  function toggleLanguage() {
    const nextLang = currentLang === LANG_EN ? LANG_DE : LANG_EN;
    setLanguage(nextLang);
    console.log(`[I18n] Toggled language to: ${nextLang}`);
  }

  function onChange(callback) {
    if (typeof callback === 'function') {
      listeners.push(callback);
    }
  }

  return {
    init,
    getLanguage,
    setLanguage,
    toggleLanguage,
    t,
    translateReps,
    translateText,
    applyTranslations,
    onChange,
  };
})();

// Global verfügbar machen
window.I18n = I18n;
