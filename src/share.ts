import type { ProgrammeId } from './degrees/types';
import type { PlanState } from './types';
import {
  exportPlanPayload,
  importPlanPayload,
  rehydratePlanDetailed,
  type PlanImportResult,
  type RehydrateResult,
} from './planStorage';

const HASH_PREFIX = '#p=';

/**
 * Maximum share-link length we will happily copy/QR-encode. Links beyond this
 * get truncated by some browsers, chat apps and mail clients, and QR codes
 * above ~1–2 KB become too dense to scan reliably from a screen — so the share
 * dialog offers the plan JSON download instead. 2000 keeps every realistic
 * plan shareable while staying paste-safe everywhere.
 */
export const MAX_SHARE_URL_LENGTH = 2000;

export function isShareUrlTooLong(url: string, limit: number = MAX_SHARE_URL_LENGTH): boolean {
  return url.length > limit;
}

// Plan step 50: TextEncoder/TextDecoder instead of the deprecated
// escape()/unescape() UTF-8 hack. Byte-identical output for every input
// (UTF-8 both ways), so all previously generated share links still decode.
function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(input: string): string | null {
  try {
    let b64 = input.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) b64 += '=';
    const binary = atob(b64);
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export function buildShareUrl(
  plan: PlanState,
  programmeId: ProgrammeId,
  admissionTarget: number,
): string {
  const payload = toBase64Url(JSON.stringify(exportPlanPayload(plan, programmeId, admissionTarget)));
  const { origin, pathname, search } = window.location;
  return `${origin}${pathname}${search}${HASH_PREFIX}${payload}`;
}

/**
 * Returns a plan encoded in the URL hash (#p=…), or null.
 * Consuming code should strip the hash afterwards so edits persist to storage normally.
 */
export function readSharedPlanFromHash(): PlanState | null {
  return readSharedPlanDetailedFromHash()?.plan ?? null;
}

/**
 * Detailed variant: also reports references the link carries that cannot be
 * honoured (unknown course IDs, duplicate placements), so callers can tell the
 * user what was skipped instead of dropping them silently.
 *
 * v1 blobs go through importPlanPayload (programmeId + disclaimer gates).
 * Legacy `{ v: 1|2, p }` hashes are still readable so existing links open.
 */
export function readSharedPlanDetailedFromHash(): PlanImportResult | null {
  try {
    const hash = window.location.hash;
    if (!hash.startsWith(HASH_PREFIX)) return null;
    const raw = fromBase64Url(hash.slice(HASH_PREFIX.length));
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    const imported = importPlanPayload(data);
    if (imported) return imported;

    const legacy = data as { v?: number; p?: Record<string, unknown> };
    if ((legacy.v !== 1 && legacy.v !== 2) || !legacy.p || typeof legacy.p !== 'object') return null;
    const hasAny = Object.values(legacy.p).some((ids) => Array.isArray(ids) && ids.length > 0);
    if (!hasAny) return null;
    const result: RehydrateResult = rehydratePlanDetailed(legacy.p);
    return result;
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
