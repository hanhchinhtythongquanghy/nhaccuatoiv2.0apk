import { Track, VideoItem } from '../types';
import { coll, norm, parseTrackName } from '../utils/helpers';

const DRIVE = 'https://www.googleapis.com/drive/v3/files';
const AUDIO_EXT = /\.(mp3|m4a|aac|flac|wav|ogg|oga|opus|weba|mka)$/i;
const VIDEO_EXT = /\.(mp4|m4v|webm|mov|3gp|mkv)$/i;

let driveAccessToken: string | null = null;
let oauthClient: any = null;

export function getDriveAccessToken(): string | null {
  return driveAccessToken;
}

export function setDriveAccessToken(token: string | null): void {
  driveAccessToken = token;
}

export function getStreamUrl(id: string, apiKey: string): string {
  if (driveAccessToken) {
    return `${DRIVE}/${encodeURIComponent(id)}?alt=media&access_token=${encodeURIComponent(driveAccessToken)}`;
  }
  return `${DRIVE}/${encodeURIComponent(id)}?alt=media&key=${encodeURIComponent(apiKey)}`;
}

export function getDriveHeaders(): HeadersInit {
  return driveAccessToken ? { Authorization: `Bearer ${driveAccessToken}` } : {};
}

export function ensureGoogleAuth(clientId: string): Promise<string> {
  if (!clientId) {
    return Promise.reject(new Error('Chưa nhập Google OAuth Client ID trong Cài đặt.'));
  }
  const google = (window as any).google;
  if (!google?.accounts?.oauth2) {
    return Promise.reject(new Error('Không tải được thư viện Google Identity Services. Hãy kiểm tra kết nối mạng.'));
  }

  return new Promise((resolve, reject) => {
    oauthClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive',
      callback: (r: any) => {
        if (r.error) {
          reject(new Error(r.error_description || r.error));
        } else {
          driveAccessToken = r.access_token;
          resolve(r.access_token);
        }
      },
    });
    oauthClient.requestAccessToken({ prompt: driveAccessToken ? '' : 'consent' });
  });
}

export async function driveList(folderId: string, apiKey: string, pageToken?: string) {
  const p = new URLSearchParams({
    q: `'${folderId}' in parents and trashed=false`,
    pageSize: '1000',
    fields: 'nextPageToken,files(id,name,mimeType,size,webViewLink)',
  });
  if (!driveAccessToken && apiKey) {
    p.set('key', apiKey);
  }
  if (pageToken) {
    p.set('pageToken', pageToken);
  }

  for (let attempt = 0; ; attempt++) {
    const r = await fetch(`${DRIVE}?${p}`, { headers: getDriveHeaders() });
    if (r.ok) {
      return r.json();
    }
    if ((r.status === 429 || r.status >= 500) && attempt < 2) {
      await new Promise((res) => setTimeout(res, 800 * (attempt + 1)));
      continue;
    }
    let detail = '';
    try {
      const j = await r.json();
      detail = (j.error && j.error.message) || '';
    } catch {
      /* ignore */
    }
    const e = new Error(detail || `HTTP ${r.status}`) as any;
    e.status = r.status;
    e.detail = detail;
    throw e;
  }
}

export async function scanDriveFolder(
  rootId: string,
  apiKey: string,
  nameFormat: 'title-artist' | 'artist-title',
  onProgress?: (count: number) => void
): Promise<{ tracks: Track[]; videos: VideoItem[] }> {
  const rawFiles: Array<{ id: string; name: string; folder: string }> = [];
  const videos: VideoItem[] = [];
  const todo: Array<{ id: string; path: string }> = [{ id: rootId, path: '' }];

  while (todo.length) {
    const batch = todo.splice(0, 4); // Scan up to 4 folders concurrently
    const results = await Promise.all(
      batch.map(async (f) => {
        const out = { files: [] as any[], folders: [] as any[] };
        let token: string | undefined;
        do {
          const data = await driveList(f.id, apiKey, token);
          for (const it of data.files || []) {
            if (it.mimeType === 'application/vnd.google-apps.folder') {
              out.folders.push({ id: it.id, path: f.path ? f.path + ' / ' + it.name : it.name });
            } else if ((it.mimeType || '').startsWith('audio/') || AUDIO_EXT.test(it.name || '')) {
              out.files.push({ id: it.id, name: it.name, folder: f.path });
            } else if ((it.mimeType || '').startsWith('video/') || VIDEO_EXT.test(it.name || '')) {
              videos.push({
                id: it.id,
                name: it.name,
                folder: f.path,
                mimeType: it.mimeType || 'video/mp4',
              });
            }
          }
          token = data.nextPageToken;
        } while (token);
        return out;
      })
    );

    for (const r of results) {
      rawFiles.push(...r.files);
      todo.push(...r.folders);
    }
    if (onProgress) {
      onProgress(rawFiles.length);
    }
  }

  // Deduplicate and process tracks
  const seen = new Set<string>();
  const tracks: Track[] = [];

  for (const r of rawFiles) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    const parsed = parseTrackName(r.name, nameFormat);
    tracks.push({
      id: r.id,
      name: r.name,
      folder: r.folder || '',
      title: parsed.title || r.name,
      artist: parsed.artist,
      _k: norm(r.name + ' ' + (r.folder || '')),
    });
  }

  tracks.sort((a, b) => coll.compare(a.folder, b.folder) || coll.compare(a.name, b.name));
  videos.sort((a, b) => coll.compare(a.folder + a.name, b.folder + b.name));

  return { tracks, videos };
}

export function friendlyError(e: any): string {
  if (e && e.status === 400) return 'API key không hợp lệ. Kiểm tra lại trong Cài đặt.';
  if (e && e.status === 403) {
    return 'Google từ chối truy cập (403). Hãy bật Google Drive API cho key hoặc dùng đăng nhập Google OAuth. ' + (e.detail || '');
  }
  if (e && e.status === 404) {
    return 'Không tìm thấy thư mục. Kiểm tra link/ID và chia sẻ thư mục ở chế độ “Bất kỳ ai có đường liên kết” (hoặc đăng nhập OAuth).';
  }
  if (e && e.status === 429) return 'Vượt giới hạn truy cập của Google. Thử lại sau vài phút.';
  if (e instanceof TypeError || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return 'Không kết nối được mạng hoặc Google Drive.';
  }
  return (e && e.message) || 'Lỗi không xác định khi kết nối Google Drive';
}

export async function uploadToDrive(files: FileList | File[], folderId: string, clientId?: string): Promise<number> {
  if (!driveAccessToken) {
    if (!clientId) throw new Error('Cần Client ID để đăng nhập tải file.');
    await ensureGoogleAuth(clientId);
  }
  if (!folderId) throw new Error('Chưa cấu hình thư mục Drive đích.');

  let uploadedCount = 0;
  for (const file of Array.from(files)) {
    const metadata = {
      name: file.name,
      mimeType: file.type || (VIDEO_EXT.test(file.name) ? 'video/mp4' : 'audio/mpeg'),
      parents: [folderId],
    };
    const boundary = '-------NhacCuaToi' + Math.random().toString(16).slice(2);
    const body = new Blob(
      [
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${metadata.mimeType}\r\n\r\n`,
        file,
        `\r\n--${boundary}--`,
      ],
      { type: `multipart/related; boundary=${boundary}` }
    );

    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size',
      {
        method: 'POST',
        headers: {
          ...getDriveHeaders(),
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error?.message || `Upload thất bại (${res.status})`);
    }
    uploadedCount++;
  }

  return uploadedCount;
}
