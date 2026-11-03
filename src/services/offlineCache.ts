import { LS } from '../utils/helpers';

const AC = 'mp-audio-v1';
export const offOK = typeof window !== 'undefined' && 'caches' in window && window.isSecureContext !== false;

const offKey = (id: string) => new URL('__offline/' + encodeURIComponent(id), window.location.href).href;

// Cache map: id -> [bytes, lastUsed]
const offMap = new Map<string, [number, number]>(Object.entries(LS.get<Record<string, [number, number]>>('mp.off', {})));

const offSave = () => LS.set('mp.off', Object.fromEntries(offMap));

export const hasOfflineTrack = (id: string): boolean => offMap.has(id);

export const getOfflineTrackIds = (): Set<string> => new Set(offMap.keys());

export const getOfflineTotalBytes = (): number => {
  let n = 0;
  offMap.forEach((v) => {
    n += v[0] || 0;
  });
  return n;
};

export const touchOfflineTrack = (id: string): void => {
  const v = offMap.get(id);
  if (v) {
    v[1] = Date.now();
    offSave();
  }
};

export async function getOfflineBlobUrl(id: string): Promise<string | null> {
  if (!offOK) return null;
  try {
    const c = await caches.open(AC);
    const r = await c.match(offKey(id));
    if (!r) return null;
    const blob = await r.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export async function removeOfflineTrack(id: string): Promise<void> {
  offMap.delete(id);
  offSave();
  try {
    const c = await caches.open(AC);
    await c.delete(offKey(id));
  } catch {
    /* ignore */
  }
}

export async function clearAllOfflineTracks(): Promise<void> {
  offMap.clear();
  offSave();
  try {
    await caches.delete(AC);
  } catch {
    /* ignore */
  }
}

// Download queue
interface DownloadJob {
  id: string;
  url: string;
  manual?: boolean;
}

const queue: DownloadJob[] = [];
const busy = new Set<string>();
let isRunning = false;

export function isTrackDownloading(id: string): boolean {
  return busy.has(id) || queue.some((j) => j.id === id);
}

export function canAutoDownload(offWifi: boolean): boolean {
  if (!offOK || !navigator.onLine) return false;
  const nav = navigator as any;
  const c = nav.connection;
  if (c && c.saveData) return false;
  if (offWifi && c && c.type && !['wifi', 'ethernet'].includes(c.type)) return false;
  return true;
}

export async function evictIfOverLimit(limitMB: number, currentTrackId?: string): Promise<void> {
  if (!limitMB) return; // 0 = unlimited
  const limitBytes = limitMB * 1048576;
  let total = getOfflineTotalBytes();
  if (total <= limitBytes) return;

  const sorted = Array.from(offMap.entries()).sort((a, b) => a[1][1] - b[1][1]);
  for (const [id, [bytes]] of sorted) {
    if (total <= limitBytes) break;
    if (id === currentTrackId) continue;
    total -= bytes;
    await removeOfflineTrack(id);
  }
}

export function enqueueDownload(
  id: string,
  streamUrl: string,
  limitMB: number,
  options: { manual?: boolean; onFinish?: (id: string, success: boolean) => void } = {}
) {
  if (!offOK || offMap.has(id) || busy.has(id) || queue.some((q) => q.id === id)) return;
  queue.push({ id, url: streamUrl, manual: options.manual });
  busy.add(id);

  processQueue(limitMB, options.onFinish);
}

async function processQueue(limitMB: number, onFinish?: (id: string, success: boolean) => void) {
  if (isRunning) return;
  isRunning = true;

  while (queue.length > 0) {
    const job = queue.shift()!;
    let success = false;
    try {
      const res = await fetch(job.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      if (!blob.size) throw new Error('File rỗng');

      const c = await caches.open(AC);
      await c.put(offKey(job.id), new Response(blob, { headers: { 'content-type': blob.type || 'audio/mpeg' } }));

      offMap.set(job.id, [blob.size, Date.now()]);
      offSave();

      if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().catch(() => {});
      }

      await evictIfOverLimit(limitMB, job.id);
      success = true;
    } catch (e) {
      console.warn('Lỗi khi tải offline track:', job.id, e);
    } finally {
      busy.delete(job.id);
      if (onFinish) onFinish(job.id, success);
    }
  }

  isRunning = false;
}

export async function reconcileOfflineCache(): Promise<void> {
  if (!offOK) return;
  try {
    const c = await caches.open(AC);
    const keys = await c.keys();
    const have = new Set(keys.map((k) => decodeURIComponent(new URL(k.url).pathname.split('/').pop() || '')));
    for (const id of Array.from(offMap.keys())) {
      if (!have.has(id)) offMap.delete(id);
    }
    for (const id of have) {
      if (!offMap.has(id)) {
        const r = await c.match(offKey(id));
        const b = r ? (await r.blob()).size : 0;
        offMap.set(id, [b, Date.now()]);
      }
    }
    offSave();
  } catch {
    /* ignore */
  }
}
