import type { PlanState } from './types';
import { planToRefs, rehydratePlan } from './planStorage';

const HASH_PREFIX = '#p=';

function toBase64Url(input: string): string {
  const b64 = btoa(unescape(encodeURIComponent(input)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(input: string): string | null {
  try {
    let b64 = input.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) b64 += '=';
    return decodeURIComponent(escape(atob(b64)));
  } catch {
    return null;
  }
}

export function buildShareUrl(plan: PlanState): string {
  const payload = toBase64Url(JSON.stringify({ v: 2, p: planToRefs(plan) }));
  const { origin, pathname, search } = window.location;
  return `${origin}${pathname}${search}${HASH_PREFIX}${payload}`;
}

/**
 * Returns a plan encoded in the URL hash (#p=…), or null.
 * Consuming code should strip the hash afterwards so edits persist to storage normally.
 */
export function readSharedPlanFromHash(): PlanState | null {
  try {
    const hash = window.location.hash;
    if (!hash.startsWith(HASH_PREFIX)) return null;
    const raw = fromBase64Url(hash.slice(HASH_PREFIX.length));
    if (!raw) return null;
    const data = JSON.parse(raw) as { v?: number; p?: Record<string, unknown> };
    if ((data.v !== 1 && data.v !== 2) || !data.p || typeof data.p !== 'object') return null;
    const hasAny = Object.values(data.p).some((ids) => Array.isArray(ids) && ids.length > 0);
    if (!hasAny) return null;
    return rehydratePlan(data.p);
  } catch {
    return null;
  }
}

export function clearShareHash(): void {
  try {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  } catch {
    // Ignore — some environments disallow history mutation
  }
}
