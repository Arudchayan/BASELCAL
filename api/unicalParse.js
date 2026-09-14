/**
 * Parse UniCal URLs / event-id lists for owner seed (Node, no TS imports).
 * Mirrors the client parser in src/unical.ts for unlock + vite local seed.
 */

export function normalizeEventId(id) {
  const trimmed = String(id || '').trim();
  if (!/^\d+$/.test(trimmed)) return trimmed;
  return trimmed.replace(/^0+/, '') || '0';
}

export function parseUnicalUrl(input) {
  const raw = String(input || '').trim();
  if (!raw) return { ok: false, error: 'Empty UniCal URL' };

  let eventParam = null;
  try {
    const maybeUrl =
      raw.includes('://') || raw.startsWith('unical.unibas.ch')
        ? new URL(raw.startsWith('http') ? raw : `https://${raw}`)
        : null;
    if (maybeUrl) {
      eventParam =
        maybeUrl.searchParams.get('e') ||
        maybeUrl.searchParams.get('eventIds') ||
        maybeUrl.searchParams.get('eventids');
    }
  } catch {
    // fall through
  }

  if (!eventParam) {
    const queryMatch = raw.match(/[?&](?:e|eventIds|eventids)=([^&#]+)/i);
    if (queryMatch) {
      try {
        eventParam = decodeURIComponent(queryMatch[1]);
      } catch {
        eventParam = queryMatch[1];
      }
    }
  }

  if (!eventParam && /^[\d,\s%]+$/.test(raw)) {
    try {
      eventParam = decodeURIComponent(raw);
    } catch {
      eventParam = raw;
    }
  }

  if (!eventParam) return { ok: false, error: 'No event ids in UniCal URL' };

  const parts = eventParam
    .split(/[,;\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const eventIds = [];
  const seen = new Set();
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return { ok: false, error: `Invalid event id ${part}` };
    const id = normalizeEventId(part);
    if (seen.has(id)) continue;
    seen.add(id);
    eventIds.push(id);
  }
  if (!eventIds.length) return { ok: false, error: 'No event ids in UniCal URL' };
  return { ok: true, eventIds };
}

/** Attach UNICAL_URL onto a student config object (mutates a shallow clone). */
export function withUnicalUrl(config, unicalUrl) {
  const next = config && typeof config === 'object' ? { ...config } : {};
  const url = String(unicalUrl || '').trim();
  if (url) {
    next.unicalUrl = url;
    if (next.seedPlan === undefined) next.seedPlan = true;
  }
  return Object.keys(next).length ? next : null;
}
