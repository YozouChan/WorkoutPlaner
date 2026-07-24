/**
 * modules/media.js
 * ================
 * Kleiner Helfer zum Erkennen und Aufbereiten von Medien-URLs im `gifUrl`-Feld.
 *
 * Das `gifUrl`-Feld einer Übung darf enthalten:
 * - ein Bild/GIF (lokaler Pfad oder https-URL)  → wird als <img> gerendert
 * - einen YouTube-Link (optional mit Timestamp) → wird als eingebettetes Video
 *   ab der angegebenen Startzeit gerendert
 *
 * Unterstützte YouTube-Formate:
 *   https://www.youtube.com/watch?v=ID&t=90
 *   https://youtu.be/ID?t=1m30s
 *   https://www.youtube.com/embed/ID?start=90
 *   https://www.youtube.com/shorts/ID
 *   https://youtube.com/live/ID   |   .../v/ID
 * Timestamp-Formate: 90 · 90s · 1m30s · 1h2m3s · 1:30 · 1:02:03 (Param t=, start= oder #t=)
 *
 * Exportiert als window.MediaUrl:
 * - parse(url)    → { id, start } | null
 * - isYouTube(url)→ boolean
 * - embedUrl(url) → https://www.youtube-nocookie.com/embed/... | null
 * - thumbUrl(url) → https://img.youtube.com/vi/ID/hqdefault.jpg | null
 *
 * Abhängigkeiten: keine. Genutzt von: workout-card.js, day-view.js, editor.js
 */
const MediaUrl = (() => {
  const ID_RE = /^[A-Za-z0-9_-]{11}$/;

  /** Wandelt einen Timestamp-String in Sekunden um. Unbekanntes → 0. */
  function _toSeconds(v) {
    v = String(v).trim();
    if (v === '') return 0;
    if (/^\d+$/.test(v)) return parseInt(v, 10);            // "90"
    if (/^\d+s$/i.test(v)) return parseInt(v, 10);          // "90s"
    const hms = v.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i); // "1h2m3s"
    if (hms && (hms[1] || hms[2] || hms[3])) {
      return parseInt(hms[1] || 0, 10) * 3600 + parseInt(hms[2] || 0, 10) * 60 + parseInt(hms[3] || 0, 10);
    }
    if (/^\d{1,2}(?::\d{1,2}){1,2}$/.test(v)) {             // "1:30" / "1:02:03"
      return v.split(':').map(Number).reduce((acc, n) => acc * 60 + n, 0);
    }
    return 0;
  }

  /** Extrahiert die 11-stellige Video-ID oder null. */
  function _extractId(url) {
    let host = url.hostname.replace(/^www\./, '').replace(/^m\./, '').replace(/^music\./, '');
    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return id && ID_RE.test(id) ? id : null;
    }
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (url.pathname === '/watch') {
        const v = url.searchParams.get('v');
        return v && ID_RE.test(v) ? v : null;
      }
      const parts = url.pathname.split('/').filter(Boolean);
      if (['embed', 'shorts', 'v', 'live'].includes(parts[0]) && parts[1]) {
        return ID_RE.test(parts[1]) ? parts[1] : null;
      }
    }
    return null;
  }

  /** Liest die Startzeit (Sekunden) aus t=, start= oder #t= aus. */
  function _extractStart(url) {
    let raw = url.searchParams.get('start') || url.searchParams.get('t');
    if (!raw && url.hash) {
      const m = url.hash.match(/(?:^#|&)t=([^&]+)/);
      if (m) raw = m[1];
    }
    return raw ? _toSeconds(raw) : 0;
  }

  function parse(u) {
    if (!u || typeof u !== 'string') return null;
    let url;
    try {
      url = new URL(u.trim(), 'https://invalid.local');
    } catch {
      return null;
    }
    const id = _extractId(url);
    if (!id) return null;
    return { id, start: _extractStart(url) };
  }

  function isYouTube(u) {
    return parse(u) !== null;
  }

  function embedUrl(u) {
    const p = parse(u);
    if (!p) return null;
    const params = ['rel=0'];
    if (p.start > 0) params.unshift('start=' + p.start);
    return `https://www.youtube-nocookie.com/embed/${p.id}?${params.join('&')}`;
  }

  function thumbUrl(u) {
    const p = parse(u);
    return p ? `https://img.youtube.com/vi/${p.id}/hqdefault.jpg` : null;
  }

  return { parse, isYouTube, embedUrl, thumbUrl };
})();

if (typeof window !== 'undefined') window.MediaUrl = MediaUrl;
if (typeof module !== 'undefined' && module.exports) module.exports = MediaUrl;
