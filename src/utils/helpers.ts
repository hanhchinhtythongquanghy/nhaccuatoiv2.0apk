export const LS = {
  get<T>(k: string, d: T): T {
    try {
      const v = localStorage.getItem(k);
      return v == null ? d : JSON.parse(v);
    } catch {
      return d;
    }
  },
  set<T>(k: string, v: T): boolean {
    try {
      localStorage.setItem(k, JSON.stringify(v));
      return true;
    } catch {
      return false;
    }
  },
  del(k: string): void {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  },
};

export const norm = (s: string): string =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

export const fmt = (s: number): string => {
  if (!isFinite(s) || s < 0) return '0:00';
  const sec = Math.floor(s);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const x = sec % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(x).padStart(2, '0');
};

export const fmtMB = (bytes: number): string => {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
  return Math.max(1, Math.round(bytes / 1048576)) + ' MB';
};

export const shuffleArr = <T>(arr: T[]): T[] => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const lastSeg = (p: string): string => (p || '').split(' / ').pop() || '';

export const coll = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' });

export const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export const hue = (str: string): number => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
};

export const coverGradient = (folderOrTitle: string): string => {
  const h = hue(folderOrTitle);
  return `linear-gradient(135deg, hsl(${h} 65% 42%), hsl(${(h + 55) % 360} 70% 22%))`;
};

export const letter = (title: string): string => {
  const m = (title || '').match(/[\p{L}\p{N}]/u);
  return (m ? m[0] : '♪').toUpperCase();
};

export const subline = (artist?: string, folder?: string): string => {
  return [artist, lastSeg(folder || '')].filter(Boolean).join(' · ') || 'Không rõ nghệ sĩ';
};

export function parseFolderId(v: string): string {
  v = String(v || '').trim();
  const m = v.match(/\/folders\/([\w-]+)/) || v.match(/[?&]id=([\w-]+)/);
  return m ? m[1] : v.replace(/[^\w-]/g, '');
}

export function parseTrackName(raw: string, fmtName: 'title-artist' | 'artist-title'): { title: string; artist: string } {
  let n = String(raw).replace(/\.[^.]+$/, '');
  n = n.replace(/^\s*\d{1,3}\s*[-._)\]]\s*/, ''); // Remove sequence numbering "01 - ", "02. "
  n = n.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  const parts = n.split(/\s+[-–—]\s+/);
  if (parts.length >= 2) {
    const a = parts[0].trim();
    const b = parts.slice(1).join(' - ').trim();
    return fmtName === 'artist-title' ? { artist: a, title: b } : { artist: b, title: a };
  }
  return { title: n, artist: '' };
}
