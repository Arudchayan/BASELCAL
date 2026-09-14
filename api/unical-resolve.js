/**
 * Server-side UniCal event resolve (avoids browser CORS).
 * POST { eventIds: string[] } → { events: [{ vvId, title?, schedule: [{day,time,room,from,until}] }] }
 */

const DAY_DE_TO_EN = {
  montag: 'Monday',
  dienstag: 'Tuesday',
  mittwoch: 'Wednesday',
  donnerstag: 'Thursday',
  freitag: 'Friday',
  samstag: 'Saturday',
  sonntag: 'Sunday',
};

function normalizeEventId(id) {
  const trimmed = String(id || '').trim();
  if (!/^\d+$/.test(trimmed)) return trimmed;
  return trimmed.replace(/^0+/, '') || '0';
}

function deDateToIso(value) {
  const match = String(value || '')
    .trim()
    .match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function parseModalHtml(html) {
  const text = String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&ouml;/gi, 'ö')
    .replace(/&uuml;/gi, 'ü')
    .replace(/&auml;/gi, 'ä')
    .replace(/&#x28;/gi, '(')
    .replace(/&#x29;/gi, ')')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');

  const titleMatch = text.match(
    /\d{4,}-\d{2}\s*[-–—]\s*(?:Hauptvorlesung|Vorlesung|Übung|Übungen|Seminar|Vorlesung mit Übungen)[^:]*:\s*([^]+?)(?:\s+Semester\s|\s+Termin\s)/i,
  );
  const title = titleMatch ? titleMatch[1].trim().slice(0, 200) : undefined;

  const schedule = [];
  const re =
    /w(?:ö|oe)chentlich\s+(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag)\s+(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})\s+(\d{2}\.\d{2}\.\d{4})\s+(\d{2}\.\d{2}\.\d{4})/gi;
  let match;
  while ((match = re.exec(text)) !== null) {
    const day = DAY_DE_TO_EN[match[1].toLowerCase()];
    const from = deDateToIso(match[4]);
    const until = deDateToIso(match[5]);
    if (!day || !from || !until) continue;
    const pad = (t) => (t.length === 4 ? `0${t}` : t);
    schedule.push({
      day,
      time: `${pad(match[2])} - ${pad(match[3])}`,
      room: '',
      from,
      until,
    });
  }
  return { title, schedule };
}

async function fetchEventModal(vvId) {
  const url =
    `https://unical.unibas.ch/modules/calendar/cfc/calendar.cfc` +
    `?method=renderEventModal&evn_id=${encodeURIComponent(vvId)}&focus_date=20260915`;
  const res = await fetch(url, {
    headers: { Accept: 'text/html', 'User-Agent': 'BaselCal/1.0 (+https://baselcal.vercel.app)' },
  });
  if (!res.ok) throw new Error(`UniCal ${vvId} HTTP ${res.status}`);
  return res.text();
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}');
    } catch {
      res.status(400).json({ error: 'Invalid JSON body' });
      return;
    }
  }
  body = body || {};

  const rawIds = Array.isArray(body.eventIds) ? body.eventIds : [];
  const eventIds = [...new Set(rawIds.map(normalizeEventId).filter((id) => /^\d+$/.test(id)))];
  if (eventIds.length === 0) {
    res.status(400).json({ error: 'eventIds required' });
    return;
  }
  if (eventIds.length > 40) {
    res.status(400).json({ error: 'Too many event ids (max 40)' });
    return;
  }

  const events = [];
  const errors = [];
  for (const vvId of eventIds) {
    try {
      const html = await fetchEventModal(vvId);
      const parsed = parseModalHtml(html);
      events.push({ vvId, title: parsed.title, schedule: parsed.schedule });
    } catch (err) {
      errors.push({ vvId, error: err instanceof Error ? err.message : String(err) });
      events.push({ vvId, schedule: [] });
    }
  }

  res.status(200).json({
    ok: true,
    events,
    errors: errors.length ? errors : undefined,
  });
}
