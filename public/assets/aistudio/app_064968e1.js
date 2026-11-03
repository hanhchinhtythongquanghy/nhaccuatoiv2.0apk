/* Nhạc của tôi — trình nghe nhạc đọc từ thư mục Google Drive (PWA, không cần server) */
'use strict';
(() => {
  // =====================================================================
  //  Tiện ích
  // =====================================================================
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch { /* bỏ qua */ } }
  };
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const fmt = s => {
    if (!isFinite(s) || s < 0) return '0:00';
    s = Math.floor(s);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(x).padStart(2, '0');
  };
  const shuffleArr = a => {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const lastSeg = p => (p || '').split(' / ').pop();
  const coll = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' });
  const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
  const fmtSpeed = v => v + '×';

  // Icon (Material, viewBox 24)
  const ICONS = {
    play: 'M8 5v14l11-7z',
    pause: 'M6 19h4V5H6v14zm8-14v14h4V5h-4z',
    next: 'M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z',
    prev: 'M6 6h2v12H6zm3.5 6l8.5 6V6z',
    shuffle: 'M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z',
    repeat: 'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z',
    'repeat-one': 'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zM13 15V9h-1l-2 1v1h1.5v4H13z',
    heart: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
    'heart-o': 'M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z',
    more: 'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
    search: 'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
    refresh: 'M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z',
    settings: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
    volume: 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z',
    mute: 'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z',
    queue: 'M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z',
    folder: 'M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z',
    music: 'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z',
    timer: 'M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.962 8.962 0 0012 4c-4.97 0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z',
    'chevron-down': 'M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z',
    close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
    plus: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
    trash: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
    edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 000-1.41l-2.34-2.34a.996.996 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
    back: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
    download: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z',
    upload: 'M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z',
    done: 'M5 18h14v2H5v-2zm4.6-2.7L5 10.7l1.4-1.4 3.2 3.2 8-8L19 6l-9.4 9.3z'
  };
  const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[n] || ''}"/></svg>`;

  // =====================================================================
  //  Cấu hình & trạng thái
  // =====================================================================
  const DRIVE = 'https://www.googleapis.com/drive/v3/files';
  const AUDIO_EXT = /\.(mp3|m4a|aac|flac|wav|ogg|oga|opus|weba|mka)$/i;
  const VIDEO_EXT = /\.(mp4|m4v|webm|mov|3gp|mkv)$/i;
  let driveAccessToken = null, oauthClient = null;
  const PAGE = 300;
  const DEF = Object.assign({ API_KEY: '', FOLDER_ID: '' }, window.APP_CONFIG || {});

  function parseFolderId(v) {
    v = String(v || '').trim();
    const m = v.match(/\/folders\/([\w-]+)/) || v.match(/[?&]id=([\w-]+)/);
    return m ? m[1] : v.replace(/[^\w-]/g, '');
  }
  const getCfg = () => {
    const s = LS.get('mp.cfg', {}) || {};
    return { apiKey: String(s.apiKey || DEF.API_KEY || '').trim(), folderId: parseFolderId(s.folderId || DEF.FOLDER_ID || ''), clientId: String(s.clientId || '').trim() };
  };

  const audio = $('#audio');
  const dlg = $('#dlg');
  const mqMobile = window.matchMedia ? window.matchMedia('(max-width: 799px)') : { matches: false };

  const S = {
    lib: [], videos: [], byId: new Map(),
    favs: new Set(LS.get('mp.favs', [])),
    playlists: LS.get('mp.playlists', []),
    prefs: Object.assign({ shuffle: false, repeat: 'off', volume: 0.9, speed: 1, nameFormat: 'title-artist', fx: true, fxType: 'bars', fxVinyl: true, fxLevel: 2, offAuto: true, offWifi: false, offLimit: 2048 }, LS.get('mp.prefs', {})),
    base: [], queue: [], pos: -1,
    view: 'all', param: null, q: '', shown: PAGE, viewIds: [],
    scanning: false, scanCount: 0, error: null, scannedAt: 0,
    errStreak: 0, loadSeq: 0, blobUrl: '', restoring: false, sleep: null, sleepTick: null, installEvt: null
  };
  const savePrefs = () => LS.set('mp.prefs', S.prefs);
  const saveFavs = () => LS.set('mp.favs', Array.from(S.favs));
  const savePlaylists = () => LS.set('mp.playlists', S.playlists);
  const current = () => (S.pos >= 0 ? S.byId.get(S.queue[S.pos]) : undefined);
  const streamUrl = id => driveAccessToken ? `${DRIVE}/${encodeURIComponent(id)}?alt=media&access_token=${encodeURIComponent(driveAccessToken)}` : `${DRIVE}/${encodeURIComponent(id)}?alt=media&key=${encodeURIComponent(getCfg().apiKey)}`;
  const driveHeaders = () => driveAccessToken ? { Authorization: `Bearer ${driveAccessToken}` } : {};
  function ensureGoogleAuth() {
    const clientId = getCfg().clientId;
    if (!clientId) throw new Error('Chưa nhập Google OAuth Client ID trong Cài đặt.');
    if (!window.google?.accounts?.oauth2) throw new Error('Không tải được Google Identity Services. Kiểm tra mạng và thử lại.');
    return new Promise((resolve, reject) => {
      oauthClient = google.accounts.oauth2.initTokenClient({ client_id: clientId, scope: 'https://www.googleapis.com/auth/drive', callback: r => { if (r.error) reject(new Error(r.error_description || r.error)); else { driveAccessToken = r.access_token; resolve(driveAccessToken); } } });
      oauthClient.requestAccessToken({ prompt: driveAccessToken ? '' : 'consent' });
    });
  }

  // Tách "ca sĩ" và "tên bài" từ tên file
  function parseName(raw, fmtName) {
    let n = String(raw).replace(/\.[^.]+$/, '');
    n = n.replace(/^\s*\d{1,3}\s*[-._)\]]\s*/, '');   // bỏ số thứ tự "01 - ", "02. "
    n = n.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
    const parts = n.split(/\s+[-–—]\s+/);
    if (parts.length >= 2) {
      const a = parts[0].trim(), b = parts.slice(1).join(' - ').trim();
      return fmtName === 'artist-title' ? { artist: a, title: b } : { artist: b, title: a };
    }
    return { title: n, artist: '' };
  }
  function applyParse() {
    for (const t of S.lib) { const p = parseName(t.name, S.prefs.nameFormat); t.title = p.title || t.name; t.artist = p.artist; }
  }
  function setLibrary(rows) {
    const seen = new Set();
    S.lib = [];
    for (const r of rows) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      S.lib.push({ id: r.id, name: r.name, folder: r.folder || '', _k: norm(r.name + ' ' + (r.folder || '')) });
    }
    S.lib.sort((a, b) => coll.compare(a.folder, b.folder) || coll.compare(a.name, b.name));
    applyParse();
    S.byId = new Map(S.lib.map(t => [t.id, t]));
    pruneQueue();
  }
  function pruneQueue() {
    if (!S.queue.length) return;
    const curId = S.queue[S.pos];
    const ok = id => S.byId.has(id);
    if (S.queue.every(ok)) return;
    S.queue = S.queue.filter(ok); S.base = S.base.filter(ok);
    S.pos = S.queue.length ? Math.max(0, S.queue.indexOf(curId)) : -1;
  }
  const hue = str => { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return Math.abs(h) % 360; };
  const coverStyle = t => { const h = hue(t.folder || t.title || ''); return `background:linear-gradient(135deg,hsl(${h} 55% 44%),hsl(${(h + 55) % 360} 60% 26%))`; };
  const letter = t => ((t.title || '').match(/[\p{L}\p{N}]/u) || ['♪'])[0].toUpperCase();
  const subline = t => [t.artist, lastSeg(t.folder)].filter(Boolean).join(' · ') || 'Không rõ nghệ sĩ';

  // =====================================================================
  //  Quét thư mục Google Drive
  // =====================================================================
  async function driveList(folderId, key, pageToken) {
    const p = new URLSearchParams({ q: `'${folderId}' in parents and trashed=false`, pageSize: '1000', fields: 'nextPageToken,files(id,name,mimeType,size,webViewLink)' });
    if (!driveAccessToken) p.set('key', key);
    if (pageToken) p.set('pageToken', pageToken);
    for (let attempt = 0; ; attempt++) {
      const r = await fetch(`${DRIVE}?${p}`, { headers: driveHeaders() });
      if (r.ok) return r.json();
      if ((r.status === 429 || r.status >= 500) && attempt < 2) { await new Promise(res => setTimeout(res, 800 * (attempt + 1))); continue; }
      let detail = '';
      try { const j = await r.json(); detail = (j.error && j.error.message) || ''; } catch { /* bỏ qua */ }
      const e = new Error(detail || ('HTTP ' + r.status));
      e.status = r.status; e.detail = detail;
      throw e;
    }
  }
  async function scanFolder(rootId, key, onProgress) {
    const tracks = [], videos = [];
    const todo = [{ id: rootId, path: '' }];
    while (todo.length) {
      const batch = todo.splice(0, 4);     // quét song song tối đa 4 thư mục
      const results = await Promise.all(batch.map(async f => {
        const out = { files: [], folders: [] };
        let token;
        do {
          const data = await driveList(f.id, key, token);
          for (const it of data.files || []) {
            if (it.mimeType === 'application/vnd.google-apps.folder') {
              out.folders.push({ id: it.id, path: f.path ? f.path + ' / ' + it.name : it.name });
            } else if ((it.mimeType || '').startsWith('audio/') || AUDIO_EXT.test(it.name || '')) {
              out.files.push({ id: it.id, name: it.name, folder: f.path });
            } else if ((it.mimeType || '').startsWith('video/') || VIDEO_EXT.test(it.name || '')) {
              videos.push({ id: it.id, name: it.name, folder: f.path, mimeType: it.mimeType || 'video/mp4' });
            }
          }
          token = data.nextPageToken;
        } while (token);
        return out;
      }));
      for (const r of results) { tracks.push(...r.files); todo.push(...r.folders); }
      onProgress(tracks.length);
    }
    S.videos = videos.sort((a,b) => coll.compare(a.folder + a.name, b.folder + b.name));
    return tracks;
  }
  function friendlyError(e) {
    if (e && e.status === 400) return 'API key không hợp lệ. Kiểm tra lại trong Cài đặt.';
    if (e && e.status === 403) return 'Google từ chối truy cập (403). Hãy bật Google Drive API cho key và kiểm tra giới hạn tên miền của key. ' + (e.detail || '');
    if (e && e.status === 404) return 'Không tìm thấy thư mục. Kiểm tra link/ID và chia sẻ thư mục ở chế độ “Bất kỳ ai có đường liên kết”.';
    if (e && e.status === 429) return 'Vượt giới hạn truy cập của Google. Thử lại sau vài phút.';
    if (e instanceof TypeError || (typeof navigator !== 'undefined' && navigator.onLine === false)) return 'Không kết nối được mạng hoặc Google Drive.';
    return (e && e.message) || 'Lỗi không xác định';
  }
  async function refresh({ silent = false } = {}) {
    const c = getCfg();
    if ((!c.apiKey && !driveAccessToken && !c.clientId) || !c.folderId) { render(); return; }
    if (S.scanning) return;
    S.scanning = true; S.scanCount = 0; S.error = null;
    $('#btnRefresh').classList.add('spin');
    if (!S.lib.length) render();
    try {
      if (!driveAccessToken && c.clientId) await ensureGoogleAuth();
      else if (!driveAccessToken && !c.apiKey) await ensureGoogleAuth();
      const rows = await scanFolder(c.folderId, c.apiKey, n => { S.scanCount = n; const el = $('#scanCount'); if (el) el.textContent = n; });
      setLibrary(rows);
      S.scannedAt = Date.now();
      LS.set('mp.lib', { t: S.scannedAt, folderId: c.folderId, tracks: S.lib.map(t => [t.id, t.name, t.folder]) });
      if (!silent) toast(rows.length ? `Đã quét xong: ${rows.length} bài` : 'Thư mục chưa có file nhạc nào');
    } catch (e) {
      S.error = friendlyError(e);
      if (S.lib.length) toast(S.error);
    }
    S.scanning = false;
    $('#btnRefresh').classList.remove('spin');
    render();
    syncUI();
  }

  // =====================================================================
  //  Phát nhạc
  // =====================================================================
  function playList(ids, startId) {
    ids = ids.filter(id => S.byId.has(id));
    if (!ids.length) return;
    S.base = ids.slice();
    if (S.prefs.shuffle) {
      const first = startId && S.byId.has(startId) ? startId : ids[Math.floor(Math.random() * ids.length)];
      S.queue = [first, ...shuffleArr(ids.filter(x => x !== first))];
      S.pos = 0;
    } else {
      S.queue = ids.slice();
      S.pos = startId ? Math.max(0, S.queue.indexOf(startId)) : 0;
    }
    S.restoring = false;
    loadCurrent(true);
  }
  function loadCurrent(autoplay = true, startAt = 0) {
    const t = current();
    if (!t) return;
    const seq = ++S.loadSeq;
    const go = src => {
      if (seq !== S.loadSeq) return;
      const old = S.blobUrl; S.blobUrl = src.startsWith('blob:') ? src : '';
      audio.src = src;
      if (old) URL.revokeObjectURL(old);
      audio.defaultPlaybackRate = S.prefs.speed;
      audio.playbackRate = S.prefs.speed;
      if (startAt > 0) audio.addEventListener('loadedmetadata', () => { try { audio.currentTime = startAt; } catch { /* bỏ qua */ } }, { once: true });
      if (autoplay) { const p = audio.play(); if (p && p.catch) p.catch(onPlayError); }
      trackChanged();
    };
    if (OFF.has(t.id)) {                       // đã tải: phát từ bộ nhớ máy
      offBlobUrl(t.id).then(u => { if (u) { offTouch(t.id); go(u); } else { OFF.delete(t.id); offSave(); fromNet(); } });
      return;
    }
    fromNet();
    function fromNet() {
      if (!navigator.onLine) {                 // mất mạng: nhảy sang bài đã tải kế tiếp
        const i = S.queue.findIndex((id, k) => k > S.pos && OFF.has(id));
        if (i >= 0 && autoplay) { S.pos = i; loadCurrent(true); return; }
        trackChanged();
        toast('Đang ngoại tuyến — bài này chưa được tải về máy');
        return;
      }
      go(streamUrl(t.id));
    }
  }
  function trackChanged() {
    const t = current();
    document.title = t ? `${t.title} · Nhạc của tôi` : 'Nhạc của tôi';
    syncUI(); markPlaying(); updateMediaSession();
    LS.set('mp.queue', { base: S.base, queue: S.queue, pos: S.pos });
    if (S.view === 'queue' && !S.q) render();
  }
  function onPlayError(e) {
    if (!e || e.name === 'AbortError' || e.name === 'NotAllowedError') return;
    toast('Không phát được: ' + (e.message || e.name));
  }
  function togglePlay() {
    if (!current()) {
      const ids = S.viewIds.length ? S.viewIds : S.lib.map(t => t.id);
      playList(ids, null);
      return;
    }
    S.restoring = false;
    if (audio.paused) { const p = audio.play(); if (p && p.catch) p.catch(onPlayError); } else audio.pause();
  }
  function next(auto = false) {
    if (!S.queue.length) return;
    if (S.pos < S.queue.length - 1) { S.pos++; loadCurrent(true); return; }
    if (S.prefs.repeat === 'all' || !auto) {
      if (S.prefs.shuffle && S.queue.length > 1) {
        const last = S.queue[S.pos];
        let q = shuffleArr(S.queue);
        if (q[0] === last) q.push(q.shift());
        S.queue = q;
      }
      S.pos = 0; loadCurrent(true); return;
    }
    // hết hàng đợi, không lặp: dừng
    audio.pause(); try { audio.currentTime = 0; } catch { /* bỏ qua */ }
    syncUI();
  }
  function prev() {
    if (!S.queue.length) return;
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    if (S.pos > 0) { S.pos--; loadCurrent(true); }
    else if (S.prefs.repeat === 'all') { S.pos = S.queue.length - 1; loadCurrent(true); }
    else audio.currentTime = 0;
  }
  function setShuffle(on) {
    S.prefs.shuffle = on; savePrefs();
    const cur = current();
    if (cur && S.queue.length) {
      if (on) { const rest = shuffleArr(S.queue.filter((_, i) => i !== S.pos)); S.queue = [cur.id, ...rest]; S.pos = 0; }
      else { S.queue = S.base.slice(); S.pos = Math.max(0, S.queue.indexOf(cur.id)); }
      LS.set('mp.queue', { base: S.base, queue: S.queue, pos: S.pos });
      if (S.view === 'queue' && !S.q) render();
    }
    syncUI();
    toast(on ? 'Bật phát ngẫu nhiên' : 'Tắt phát ngẫu nhiên');
  }
  function cycleRepeat() {
    S.prefs.repeat = { off: 'all', all: 'one', one: 'off' }[S.prefs.repeat] || 'off';
    savePrefs(); syncUI();
    toast({ off: 'Không lặp', all: 'Lặp lại tất cả', one: 'Lặp lại một bài' }[S.prefs.repeat]);
  }
  function cycleSpeed() {
    const i = SPEEDS.indexOf(S.prefs.speed);
    S.prefs.speed = SPEEDS[(i + 1) % SPEEDS.length];
    audio.defaultPlaybackRate = S.prefs.speed; audio.playbackRate = S.prefs.speed;
    savePrefs(); syncUI();
  }
  function toggleMute() { audio.muted = !audio.muted; syncUI(); }
  function addNext(id) {
    if (!S.queue.length) { playList([id], id); return; }
    S.queue.splice(S.pos + 1, 0, id);
    const bi = S.base.indexOf(S.queue[S.pos]);
    S.base.splice(bi + 1, 0, id);
    afterQueueEdit(); toast('Sẽ phát tiếp theo');
  }
  function addEnd(id) {
    if (!S.queue.length) { playList([id], id); return; }
    S.queue.push(id); S.base.push(id);
    afterQueueEdit(); toast('Đã thêm vào hàng đợi');
  }
  function afterQueueEdit() {
    LS.set('mp.queue', { base: S.base, queue: S.queue, pos: S.pos });
    if (S.view === 'queue' && !S.q) render();
  }
  function removeFromQueue(pos) {
    if (pos <= S.pos || pos >= S.queue.length) return;
    const id = S.queue[pos];
    S.queue.splice(pos, 1);
    const bi = S.base.indexOf(id); if (bi >= 0) S.base.splice(bi, 1);
    afterQueueEdit();
  }

  // --- sự kiện của thẻ audio
  let dragging = false, lastSave = 0, lastPos = 0;
  audio.addEventListener('play', () => { syncUI(); setPlaybackState(); fxWake(); });
  audio.addEventListener('pause', () => {
    syncUI(); setPlaybackState();
    const t = current(); if (t) LS.set('mp.time', { id: t.id, t: audio.currentTime });
  });
  audio.addEventListener('playing', () => {
    S.errStreak = 0; document.body.classList.remove('buffering'); syncUI();
    const t = current();
    if (t && S.prefs.offAuto && !OFF.has(t.id) && offAutoAllowed()) offEnqueue(t.id, { auto: true });
  });
  audio.addEventListener('waiting', () => document.body.classList.add('buffering'));
  audio.addEventListener('canplay', () => document.body.classList.remove('buffering'));
  audio.addEventListener('loadedmetadata', () => { updateProgress(); updatePosition(); });
  audio.addEventListener('durationchange', updateProgress);
  audio.addEventListener('volumechange', () => {
    if (!audio.muted) { S.prefs.volume = audio.volume; savePrefs(); }
    $$('.vol').forEach(v => { v.value = audio.muted ? 0 : audio.volume; v.style.setProperty('--p', (audio.muted ? 0 : audio.volume * 100) + '%'); });
    syncUI();
  });
  audio.addEventListener('timeupdate', () => {
    updateProgress();
    const now = Date.now();
    if (now - lastSave > 5000) { lastSave = now; const t = current(); if (t) LS.set('mp.time', { id: t.id, t: audio.currentTime }); }
    if (now - lastPos > 1000) { lastPos = now; updatePosition(); }
    if (S.sleep && S.sleep.until && now >= S.sleep.until) sleepFire();
  });
  audio.addEventListener('ended', () => {
    if (S.sleep && S.sleep.end) { clearSleep(); toast('Đã dừng nhạc theo hẹn giờ'); syncUI(); return; }
    if (S.prefs.repeat === 'one') { audio.currentTime = 0; const p = audio.play(); if (p && p.catch) p.catch(onPlayError); return; }
    next(true);
  });
  audio.addEventListener('error', () => {
    if (!audio.getAttribute('src') || S.restoring) return;
    const t = current();
    S.errStreak++;
    const code = audio.error && audio.error.code;
    const hint = code === 4 ? ' — kiểm tra quyền chia sẻ hoặc định dạng file' : '';
    toast(`Không phát được “${t ? t.title : 'bài này'}”${hint}`);
    if (S.errStreak < 4 && S.pos < S.queue.length - 1) setTimeout(() => next(true), 900);
    else { document.body.classList.remove('buffering'); syncUI(); }
  });

  // =====================================================================
  //  Giao diện trình phát (thanh dưới + màn hình đang phát)
  // =====================================================================
  function syncUI() {
    const t = current();
    const playing = !audio.paused && !audio.ended;
    const b = document.body;
    b.classList.toggle('is-playing', playing);
    b.classList.toggle('has-track', !!t);
    $$('[data-ctl="play"]').forEach(el => { el.innerHTML = icon(playing ? 'pause' : 'play'); });
    $$('[data-ctl="shuffle"]').forEach(el => el.classList.toggle('on', S.prefs.shuffle));
    $$('[data-ctl="repeat"]').forEach(el => { el.classList.toggle('on', S.prefs.repeat !== 'off'); el.innerHTML = icon(S.prefs.repeat === 'one' ? 'repeat-one' : 'repeat'); });
    const fav = !!(t && S.favs.has(t.id));
    $$('[data-ctl="fav"]').forEach(el => { el.classList.toggle('on', fav); el.innerHTML = icon(fav ? 'heart' : 'heart-o'); });
    $$('[data-ctl="speed"]').forEach(el => { el.textContent = fmtSpeed(S.prefs.speed); el.classList.toggle('on', S.prefs.speed !== 1); });
    $$('[data-ctl="mute"]').forEach(el => { el.innerHTML = icon(audio.muted || audio.volume === 0 ? 'mute' : 'volume'); });
    $$('.np-title').forEach(el => { el.textContent = t ? t.title : 'Chưa phát bài nào'; });
    $$('.np-artist').forEach(el => { el.textContent = t ? subline(t) : ''; });
    $$('.np-cover').forEach(el => { el.style.cssText = t ? coverStyle(t) : ''; });
    const np = $('#np');
    if (np) np.style.setProperty('--np-c1', t ? `hsl(${hue(t.folder || t.title || '')} 40% 24%)` : '#2a3040');
    updateSleepLabel();
    if (FX.cv.np || FX.cv.bar) fxSync();
  }
  function updateProgress() {
    const d = audio.duration, c = audio.currentTime || 0;
    const p = isFinite(d) && d > 0 ? Math.min(1, c / d) : 0;
    if (!dragging) {
      $$('.seek').forEach(r => { r.value = Math.round(p * 1000); r.style.setProperty('--p', (p * 100) + '%'); });
      $$('.cur').forEach(el => { el.textContent = fmt(c); });
    }
    $$('.dur').forEach(el => { el.textContent = isFinite(d) ? fmt(d) : '0:00'; });
    const mini = $('#miniProg'); if (mini) mini.style.width = (p * 100) + '%';
  }
  function markPlaying() {
    const t = current();
    $$('.row').forEach(r => {
      const on = r.dataset.pos != null ? Number(r.dataset.pos) === S.pos : (t && r.dataset.id === t.id);
      r.classList.toggle('playing', !!on);
    });
  }
  // ---- Nút Quay lại: không thoát app, để nhạc chạy nền -----------------
  // Web không tự "thu nhỏ" app được, nên giữ app sống: Quay lại chỉ đóng lớp
  // đang mở (màn hình đang phát, tìm kiếm, thư mục/playlist). Ở màn hình gốc:
  //  - đang phát nhạc  -> ở lại (nhạc vẫn chạy), bấm Home để thu nhỏ
  //  - không phát nhạc -> bấm Quay lại 2 lần liên tiếp mới thoát
  const standalone = () => (window.matchMedia && (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: minimal-ui)').matches)) || navigator.standalone === true;
  const backGuard = () => standalone() || mqMobile.matches;
  let exitArmedAt = 0;
  function armGuard() {
    try { history.replaceState({ base: 1 }, ''); history.pushState({ app: 1 }, ''); } catch { /* bỏ qua */ }
  }
  function openNP() {
    if (!mqMobile.matches || !current()) return;
    const np = $('#np');
    if (np.classList.contains('open')) return;
    np.classList.add('open');
    fxWake();
    try { history.pushState({ np: 1 }, ''); } catch { /* bỏ qua */ }
  }
  function closeNP(fromPop) {
    const np = $('#np');
    if (!np.classList.contains('open')) return;
    np.classList.remove('open');
    if (!fromPop && history.state && history.state.np) history.back();
  }
  window.addEventListener('popstate', e => {
    const np = $('#np');
    if (np.classList.contains('open')) { closeNP(true); return; }
    if (!(e.state && e.state.base) || !backGuard()) return;   // chỉ xử lý khi đã lùi tới mốc gốc
    // Lùi từng lớp một
    if (dlg.open) { dlg.close(); }
    else if (S.q) { clearSearch(); }
    else if (S.param != null) { setView(S.view, null); }
    else if (S.view !== 'all') { setView('all'); }
    else if (!audio.paused && !audio.ended) {
      toast('Nhạc vẫn đang phát nền · bấm Home để thu nhỏ');
    } else if (Date.now() - exitArmedAt < 2000) {
      history.back(); return;                                // thoát thật (không có nhạc đang chạy)
    } else {
      exitArmedAt = Date.now(); toast('Bấm Quay lại lần nữa để thoát');
    }
    try { history.pushState({ app: 1 }, ''); } catch { /* bỏ qua */ }   // dựng lại "lớp đệm"
  });

  // Thanh tua + âm lượng
  document.addEventListener('input', e => {
    const el = e.target;
    if (el.classList && el.classList.contains('seek')) {
      dragging = true;
      const p = el.value / 1000;
      el.style.setProperty('--p', (p * 100) + '%');
      $$('.cur').forEach(c => { c.textContent = fmt(p * (audio.duration || 0)); });
    } else if (el.classList && el.classList.contains('vol')) {
      audio.muted = false;
      audio.volume = Number(el.value);
    }
  });
  document.addEventListener('change', e => {
    const el = e.target;
    if (el.classList && el.classList.contains('seek')) {
      dragging = false;
      if (isFinite(audio.duration) && audio.duration > 0) audio.currentTime = (el.value / 1000) * audio.duration;
    }
  });

  // Nút điều khiển (một chỗ xử lý chung)
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-ctl]');
    if (!b) return;
    const act = {
      play: togglePlay, next: () => next(false), prev,
      shuffle: () => setShuffle(!S.prefs.shuffle), repeat: cycleRepeat,
      fav: () => { const t = current(); if (t) toggleFav(t.id); },
      mute: toggleMute, speed: cycleSpeed, sleep: openSleepSheet,
      queue: () => { closeNP(); setView('queue'); },
      expand: openNP, collapse: () => closeNP(),
      more: () => { const t = current(); if (t) openTrackMenu(t.id, {}); }
    }[b.dataset.ctl];
    if (act) act();
  });

  // =====================================================================
  //  Hẹn giờ tắt nhạc
  // =====================================================================
  function clearSleep() {
    if (S.sleep && S.sleep.timer) clearTimeout(S.sleep.timer);
    clearInterval(S.sleepTick); S.sleepTick = null; S.sleep = null;
    updateSleepLabel();
  }
  function setSleep(v) {
    clearSleep();
    if (!v) { toast('Đã tắt hẹn giờ'); return; }
    if (v === 'end') { S.sleep = { end: true }; toast('Sẽ dừng khi hết bài này'); }
    else { S.sleep = { until: Date.now() + v * 60000, timer: setTimeout(sleepFire, v * 60000) }; toast(`Sẽ tắt nhạc sau ${v} phút`); }
    S.sleepTick = setInterval(updateSleepLabel, 1000);
    updateSleepLabel();
  }
  function sleepFire() { audio.pause(); clearSleep(); toast('Hết giờ hẹn — đã dừng phát nhạc'); }
  function updateSleepLabel() {
    const txt = !S.sleep ? '' : S.sleep.end ? 'hết bài' : fmt(Math.max(0, (S.sleep.until - Date.now()) / 1000));
    $$('[data-ctl="sleep"]').forEach(b => { b.classList.toggle('on', !!S.sleep); const l = $('.lbl', b); if (l) l.textContent = txt; });
  }
  function openSleepSheet() {
    const opts = [[15, '15 phút'], [30, '30 phút'], [45, '45 phút'], [60, '1 giờ'], [90, '1 giờ 30 phút'], ['end', 'Khi hết bài đang phát']];
    sheet('Hẹn giờ tắt nhạc',
      opts.map(([v, l]) => `<button class="menu-item" data-do="${v}">${icon('timer')}${l}</button>`).join('') +
      (S.sleep ? `<button class="menu-item danger" data-do="off">${icon('close')}Tắt hẹn giờ</button>` : ''),
      act => { dlg.close(); setSleep(act === 'off' ? null : act === 'end' ? 'end' : Number(act)); });
  }

  // =====================================================================
  //  Media Session (điều khiển trên màn hình khóa / tai nghe / phím media)
  // =====================================================================
  function updateMediaSession() {
    if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
    const t = current(); if (!t) return;
    const art = new URL('icons/icon-512.png', location.href).href;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: t.title, artist: t.artist || lastSeg(t.folder) || 'Nhạc của tôi', album: lastSeg(t.folder) || 'Nhạc của tôi',
        artwork: [{ src: art, sizes: '512x512', type: 'image/png' }]
      });
    } catch { /* bỏ qua */ }
  }
  function setPlaybackState() { if ('mediaSession' in navigator) try { navigator.mediaSession.playbackState = audio.paused ? 'paused' : 'playing'; } catch { /* bỏ qua */ } }
  function updatePosition() {
    if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
    const d = audio.duration;
    if (!isFinite(d) || d <= 0) return;
    try { navigator.mediaSession.setPositionState({ duration: d, position: Math.min(audio.currentTime, d), playbackRate: audio.playbackRate || 1 }); } catch { /* bỏ qua */ }
  }
  (function bindMediaSession() {
    if (!('mediaSession' in navigator)) return;
    const set = (n, f) => { try { navigator.mediaSession.setActionHandler(n, f); } catch { /* không hỗ trợ */ } };
    set('play', () => { S.restoring = false; const p = audio.play(); if (p && p.catch) p.catch(onPlayError); });
    set('pause', () => audio.pause());
    set('previoustrack', () => prev());
    set('nexttrack', () => next(false));
    set('seekbackward', d => { audio.currentTime = Math.max(0, audio.currentTime - ((d && d.seekOffset) || 10)); });
    set('seekforward', d => { audio.currentTime = Math.min(audio.duration || 1e9, audio.currentTime + ((d && d.seekOffset) || 10)); });
    set('seekto', d => { if (d && d.seekTime != null) audio.currentTime = d.seekTime; });
  })();

  // =====================================================================
  //  Yêu thích & Playlist
  // =====================================================================
  function toggleFav(id) {
    if (!S.byId.has(id) && !S.favs.has(id)) return;
    if (S.favs.has(id)) { S.favs.delete(id); toast('Đã bỏ khỏi yêu thích'); } else { S.favs.add(id); toast('Đã thêm vào yêu thích'); }
    saveFavs();
    if (S.view === 'favorites' && !S.q) { render(true); }
    else {
      $$('.row').forEach(r => {
        if (r.dataset.id !== id) return;
        const b = $('.fav', r); if (!b) return;
        const on = S.favs.has(id); b.classList.toggle('on', on); b.innerHTML = icon(on ? 'heart' : 'heart-o');
      });
    }
    syncUI();
  }
  const getPl = id => S.playlists.find(p => p.id === id);
  async function newPlaylist(thenAddId) {
    const name = await askText('Playlist mới', '', 'Tên playlist');
    if (!name) return null;
    const pl = { id: 'pl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name, ids: [] };
    S.playlists.push(pl);
    if (thenAddId) pl.ids.push(thenAddId);
    savePlaylists();
    toast(thenAddId ? `Đã thêm vào “${name}”` : `Đã tạo playlist “${name}”`);
    if (S.view === 'playlists' && !S.q) render();
    return pl;
  }
  function openAddToPlaylist(id) {
    const t = S.byId.get(id); if (!t) return;
    const items = S.playlists.map(p => `<button class="menu-item" data-do="${p.id}">${icon('queue')}${esc(p.name)}<small>${p.ids.length}</small></button>`).join('');
    sheet('Thêm vào playlist', `<button class="menu-item" data-do="__new">${icon('plus')}Playlist mới…</button>${items}`, async act => {
      if (act === '__new') { dlg.close(); await newPlaylist(id); return; }
      const pl = getPl(act); if (!pl) return;
      dlg.close();
      if (pl.ids.includes(id)) { toast('Bài này đã có trong playlist'); return; }
      pl.ids.push(id); savePlaylists(); toast(`Đã thêm vào “${pl.name}”`);
      if (S.view === 'playlists' && !S.q) render(true);
    });
  }
  async function renamePlaylist(id) {
    const pl = getPl(id); if (!pl) return;
    const name = await askText('Đổi tên playlist', pl.name, 'Tên playlist');
    if (!name) return;
    pl.name = name; savePlaylists(); render(true);
  }
  async function deletePlaylist(id) {
    const pl = getPl(id); if (!pl) return;
    if (!await confirmSheet('Xóa playlist?', `Playlist “${pl.name}” sẽ bị xóa (các file nhạc trên Drive không bị ảnh hưởng).`, 'Xóa')) return;
    S.playlists = S.playlists.filter(p => p.id !== id); savePlaylists();
    setView('playlists', null);
  }

  // =====================================================================
  //  Hộp thoại
  // =====================================================================
  let sheetHandler = null;
  function sheet(title, bodyHTML, handler) {
    sheetHandler = handler || null;
    dlg.innerHTML = `<div class="sheet-head"><h3>${esc(title)}</h3><button class="icon-btn" data-close aria-label="Đóng">${icon('close')}</button></div><div class="sheet-body">${bodyHTML}</div>`;
    if (!dlg.open) dlg.showModal();
    return dlg;
  }
  dlg.addEventListener('click', e => {
    if (e.target === dlg || e.target.closest('[data-close]')) { dlg.close(); return; }
    const el = e.target.closest('[data-do]');
    if (el && sheetHandler) sheetHandler(el.dataset.do, el);
  });
  function askText(title, initial, placeholder) {
    return new Promise(resolve => {
      let done = false;
      sheet(title, `<form class="ask"><input id="askInput" type="text" value="${esc(initial)}" placeholder="${esc(placeholder)}" maxlength="80" autocomplete="off"><div class="btn-row"><button type="button" class="btn" data-close>Hủy</button><button type="submit" class="btn primary">OK</button></div></form>`);
      const input = $('#askInput', dlg);
      $('form.ask', dlg).onsubmit = ev => { ev.preventDefault(); done = true; const v = input.value.trim(); dlg.close(); resolve(v || null); };
      dlg.addEventListener('close', () => { if (!done) resolve(null); }, { once: true });
      setTimeout(() => { input.focus(); input.select(); }, 60);
    });
  }
  function confirmSheet(title, msg, okLabel) {
    return new Promise(resolve => {
      let done = false;
      sheet(title, `<p class="sheet-sub" style="font-size:14px">${esc(msg)}</p><div class="btn-row"><button class="btn" data-close>Hủy</button><button class="btn primary" data-do="ok">${esc(okLabel)}</button></div>`,
        () => { done = true; dlg.close(); resolve(true); });
      dlg.addEventListener('close', () => { if (!done) resolve(false); }, { once: true });
    });
  }
  async function downloadMany(ids) {
    const todo = ids.filter(id => !OFF.has(id));
    if (!todo.length) { toast('Tất cả bài ở đây đã được tải về máy'); return; }
    if (!navigator.onLine) { toast('Cần có mạng để tải'); return; }
    const lim = Number(S.prefs.offLimit);
    if (!await confirmSheet('Tải về máy?', `Tải ${todo.length} bài để nghe offline. Có thể tốn khá nhiều dung lượng và dữ liệu di động${lim ? ` (giới hạn lưu hiện tại ${lim >= 1024 ? lim / 1024 + ' GB' : lim + ' MB'}, vượt quá sẽ xóa bài tải cũ nhất)` : ''}.`, 'Tải')) return;
    todo.forEach(id => offEnqueue(id, { manual: true }));
    toast(`Đang tải ${todo.length} bài ở nền…`);
  }
  function openTrackMenu(id, ctx) {
    const t = S.byId.get(id); if (!t) return;
    const fav = S.favs.has(id);
    const inPl = S.view === 'playlists' && S.param && !S.q;
    const item = (d, ic, label, cls = '') => `<button class="menu-item ${cls}" data-do="${d}">${icon(ic)}${label}</button>`;
    sheet(t.title,
      `<div class="sheet-sub">${esc(subline(t))}</div>` +
      item('next', 'queue', 'Phát tiếp theo') + item('end', 'queue', 'Thêm vào hàng đợi') +
      item('fav', fav ? 'heart' : 'heart-o', fav ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích', fav ? 'on' : '') +
      item('pl', 'plus', 'Thêm vào playlist…') +
      (offOK ? (OFF.has(id) ? item('rmoff', 'trash', 'Xóa bản đã tải khỏi máy') : item('dl', 'download', offBusy.has(id) ? 'Đang tải…' : 'Tải về máy để nghe offline')) : '') +
      (inPl ? item('rmpl', 'trash', 'Xóa khỏi playlist này', 'danger') : ''),
      act => {
        dlg.close();
        if (act === 'next') addNext(id);
        else if (act === 'end') addEnd(id);
        else if (act === 'fav') toggleFav(id);
        else if (act === 'pl') openAddToPlaylist(id);
        else if (act === 'dl') { if (!navigator.onLine) toast('Cần có mạng để tải'); else { offEnqueue(id, { manual: true }); toast('Đang tải về máy…'); } }
        else if (act === 'rmoff') { offRemove(id); toast('Đã xóa bản tải'); }
        else if (act === 'rmpl') { const pl = getPl(S.param); if (pl) { pl.ids = pl.ids.filter(x => x !== id); savePlaylists(); render(true); } }
      });
  }

  // =====================================================================
  //  Video và tải file lên Google Drive (OAuth riêng tư)
  // =====================================================================
  function playVideo(id) {
    const v = S.videos.find(x => x.id === id); if (!v) return;
    const dlgV = $('#videoDlg'), player = $('#videoPlayer');
    player.src = streamUrl(id); $('#videoTitle').textContent = v.name;
    dlgV.showModal(); player.play().catch(() => toast('Nhấn nút phát để bắt đầu xem video.'));
  }
  $('#closeVideo').addEventListener('click', () => { const v=$('#videoPlayer'); v.pause(); v.removeAttribute('src'); v.load(); $('#videoDlg').close(); });
  $('#videoDlg').addEventListener('click', e => { if (e.target.id === 'videoDlg') $('#closeVideo').click(); });
  async function uploadMedia(files) {
    if (!files?.length) return;
    try {
      if (!driveAccessToken) await ensureGoogleAuth();
      const folderId = getCfg().folderId; if (!folderId) throw new Error('Chưa cấu hình thư mục Drive.');
      for (const file of Array.from(files)) {
        const metadata = { name: file.name, mimeType: file.type || (VIDEO_EXT.test(file.name) ? 'video/mp4' : 'audio/mpeg'), parents: [folderId] };
        const boundary = '-------NhacCuaToi' + Math.random().toString(16).slice(2);
        const body = new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${metadata.mimeType}\r\n\r\n`, file, `\r\n--${boundary}--`], { type: `multipart/related; boundary=${boundary}` });
        const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size', { method:'POST', headers:{...driveHeaders(), 'Content-Type':`multipart/related; boundary=${boundary}`}, body });
        if (!res.ok) { const j=await res.json().catch(()=>({})); throw new Error(j.error?.message || `Upload thất bại (${res.status})`); }
      }
      toast(`Đã tải lên ${files.length} file`); await refresh({silent:true});
    } catch(e) { toast(e.message || 'Không tải được file'); }
    finally { $('#mediaUpload').value=''; }
  }
  const uploadInput = document.createElement('input'); uploadInput.type='file'; uploadInput.id='mediaUpload'; uploadInput.multiple=true; uploadInput.accept='audio/*,video/*,.mp3,.m4a,.flac,.wav,.ogg,.mp4,.webm,.mov,.mkv'; uploadInput.hidden=true; document.body.appendChild(uploadInput);
  uploadInput.addEventListener('change', () => uploadMedia(uploadInput.files));

  // =====================================================================
  //  Cài đặt
  // =====================================================================
  function openSettings() {
    const c = getCfg();
    const info = S.lib.length ? `Thư viện: ${S.lib.length} bài${S.scannedAt ? ' · quét lúc ' + new Date(S.scannedAt).toLocaleString('vi-VN') : ''}` : 'Thư viện: chưa có dữ liệu';
    sheet('Cài đặt', `
      <div class="field"><label for="setClient">Google OAuth Client ID (Web application)</label>
        <input id="setClient" type="text" value="${esc(c.clientId)}" autocomplete="off" spellcheck="false" placeholder="xxxxx.apps.googleusercontent.com"></div>
      <div class="field"><label for="setKey">Google API key (chỉ dùng chế độ thư mục công khai cũ, tùy chọn)</label>
        <input id="setKey" type="password" value="${esc(c.apiKey)}" autocomplete="off" spellcheck="false" placeholder="Để trống khi dùng Drive riêng tư"></div>
      <div class="field"><label for="setFolder">Link hoặc ID thư mục nhạc trên Google Drive</label>
        <input id="setFolder" type="text" value="${esc(c.folderId)}" autocomplete="off" spellcheck="false" placeholder="https://drive.google.com/drive/folders/…">
        <div class="hint">Ở chế độ riêng tư, không cần chia sẻ công khai. Đăng nhập Google sẽ cấp quyền đọc/ghi Drive cho ứng dụng. Thư mục con được quét tự động.</div></div>
      <div class="field"><label for="setFmt">Cách đọc tên file</label>
        <select id="setFmt">
          <option value="title-artist"${S.prefs.nameFormat === 'title-artist' ? ' selected' : ''}>Tên bài - Ca sĩ</option>
          <option value="artist-title"${S.prefs.nameFormat === 'artist-title' ? ' selected' : ''}>Ca sĩ - Tên bài</option>
        </select>
        <div class="hint">Áp dụng cho file đặt tên dạng “A - B.mp3”.</div></div>
      <div class="btn-row"><button class="btn primary" data-do="save">Lưu &amp; quét lại</button><button class="btn" data-do="connect">Đăng nhập Google</button><button class="btn" data-do="upload">Tải nhạc/video lên</button></div>
      <div class="sep"></div>
      <div class="field"><label class="sec">Nghe offline</label>
        ${offOK ? `<label class="switch"><input type="checkbox" id="setOffAuto"${S.prefs.offAuto ? ' checked' : ''}>Tự tải bài về máy khi nghe</label>
        <label class="switch" style="margin-top:10px!important"><input type="checkbox" id="setOffWifi"${S.prefs.offWifi ? ' checked' : ''}>Chỉ tự tải khi dùng Wi-Fi</label>` : '<div class="hint">Trình duyệt này chưa hỗ trợ lưu offline (cần mở bằng HTTPS).</div>'}</div>
      ${offOK ? `<div class="field"><label for="setOffLimit">Dung lượng tối đa dành cho nhạc đã tải</label>
        <select id="setOffLimit">${[[512, '512 MB'], [1024, '1 GB'], [2048, '2 GB'], [5120, '5 GB'], [0, 'Không giới hạn']].map(([v, l]) => `<option value="${v}"${Number(S.prefs.offLimit) === v ? ' selected' : ''}>${l}</option>`).join('')}</select>
        <div class="hint">Đã tải: ${OFF.size} bài · ${fmtMB(offBytes())}. Đầy thì tự xóa bài nghe lâu nhất. Bài đã tải nghe được cả khi không có mạng.</div>
        <div class="btn-row start"><button class="btn danger" data-do="clearoff">Xóa tất cả bài đã tải</button></div></div>` : ''}
      <div class="sep"></div>
      <div class="field"><label class="sec">Hiệu ứng khi phát nhạc</label>
        <label class="switch"><input type="checkbox" id="setFx"${S.prefs.fx ? ' checked' : ''}>Bật hiệu ứng</label></div>
      <div class="field"><label for="setFxType">Kiểu hiệu ứng</label>
        <select id="setFxType">${FX_TYPES.map(([v, l]) => `<option value="${v}"${S.prefs.fxType === v ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label for="setFxLevel">Cường độ</label>
        <select id="setFxLevel">${['Nhẹ', 'Vừa', 'Mạnh'].map((l, i) => `<option value="${i + 1}"${Number(S.prefs.fxLevel) === i + 1 ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label class="switch"><input type="checkbox" id="setFxVinyl"${S.prefs.fxVinyl ? ' checked' : ''}>Bìa xoay như đĩa than (màn hình Đang phát)</label>
        <div class="hint">Hiệu ứng chạy khi đang phát nhạc: ở màn hình Đang phát (điện thoại) và làm nền thanh phát nhạc. Đổi tại đây sẽ xem thử ngay vài giây.</div></div>
      <div class="sep"></div>
      <div class="btn-row start">
        ${S.installEvt ? `<button class="btn" data-do="install">${icon('download')}Cài ứng dụng</button>` : ''}
        <button class="btn" data-do="export">${icon('download')}Xuất yêu thích/playlist</button>
        <button class="btn" data-do="import">${icon('upload')}Nhập</button>
        <button class="btn danger" data-do="reset">Xóa dữ liệu trên máy</button>
      </div>
      <input type="file" id="importFile" accept="application/json,.json" hidden>
      <div class="about">${esc(info)}<br>Yêu thích và playlist được lưu ngay trên từng thiết bị; dùng “Xuất / Nhập” để chuyển giữa máy tính và điện thoại.${S.installEvt ? '' : '<br>Cài như app: trên Android mở menu ⋮ của Chrome → “Cài đặt ứng dụng”; trên máy tính bấm biểu tượng cài đặt ở thanh địa chỉ.'}</div>`,
      async act => {
        if (act === 'save') {
          const key = $('#setKey', dlg).value.trim();
          const clientId = $('#setClient', dlg).value.trim();
          const folderId = parseFolderId($('#setFolder', dlg).value);
          const fmtName = $('#setFmt', dlg).value;
          const changed = key !== c.apiKey || folderId !== c.folderId || clientId !== c.clientId;
          LS.set('mp.cfg', { apiKey: key, folderId, clientId });
          S.prefs.nameFormat = fmtName; savePrefs(); applyParse();
          dlg.close();
          if (changed || !S.lib.length) { if (changed) { S.lib = []; S.byId = new Map(); LS.del('mp.lib'); } refresh(); } else { render(); syncUI(); }
        } else if (act === 'connect') {
          const clientId = $('#setClient', dlg).value.trim();
          LS.set('mp.cfg', { ...c, clientId });
          try { await ensureGoogleAuth(); dlg.close(); toast('Đã kết nối Google Drive riêng tư'); await refresh({silent:true}); } catch(e) { toast(e.message); }
        } else if (act === 'upload') { dlg.close(); $('#mediaUpload').click();
        } else if (act === 'clearoff') {
          dlg.close();
          if (await confirmSheet('Xóa bài đã tải?', 'Các bài tải về máy sẽ bị xóa (file trên Drive không bị ảnh hưởng).', 'Xóa')) { await offClearAll(); toast('Đã xóa các bài đã tải'); }
        } else if (act === 'install') {
          dlg.close(); const ev = S.installEvt; S.installEvt = null; if (ev) { ev.prompt(); }
        } else if (act === 'export') exportData();
        else if (act === 'import') $('#importFile', dlg).click();
        else if (act === 'reset') {
          dlg.close();
          if (await confirmSheet('Xóa dữ liệu trên máy?', 'Xóa API key, danh sách bài, yêu thích và playlist đã lưu trên thiết bị này. File nhạc trên Drive không bị ảnh hưởng.', 'Xóa hết')) {
            Object.keys(localStorage).filter(k => k.startsWith('mp.')).forEach(k => LS.del(k));
            location.reload();
          }
        }
      });
    const fxSet = () => {
      S.prefs.fx = $('#setFx', dlg).checked; S.prefs.fxType = $('#setFxType', dlg).value;
      S.prefs.fxLevel = Number($('#setFxLevel', dlg).value) || 2; S.prefs.fxVinyl = $('#setFxVinyl', dlg).checked;
      savePrefs(); fxPreview();
    };
    ['#setFx', '#setFxType', '#setFxLevel', '#setFxVinyl'].forEach(id => $(id, dlg).addEventListener('change', fxSet));
    if (offOK) {
      const offSet = () => { S.prefs.offAuto = $('#setOffAuto', dlg).checked; S.prefs.offWifi = $('#setOffWifi', dlg).checked; S.prefs.offLimit = Number($('#setOffLimit', dlg).value); savePrefs(); offEvict(null); };
      ['#setOffAuto', '#setOffWifi', '#setOffLimit'].forEach(id => $(id, dlg).addEventListener('change', offSet));
    }
    $('#importFile', dlg).addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if (f) importData(f); });
  }
  function exportData() {
    const data = { app: 'nhac-cua-toi', version: 1, favs: Array.from(S.favs), playlists: S.playlists };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'nhac-cua-toi-du-lieu.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast('Đã xuất file dữ liệu');
  }
  function importData(file) {
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const d = JSON.parse(String(rd.result));
        if (!d || d.app !== 'nhac-cua-toi') throw new Error('sai định dạng');
        (d.favs || []).forEach(id => { if (typeof id === 'string') S.favs.add(id); });
        for (const p of d.playlists || []) {
          if (!p || typeof p.id !== 'string' || !Array.isArray(p.ids)) continue;
          const i = S.playlists.findIndex(x => x.id === p.id);
          const clean = { id: p.id, name: String(p.name || 'Playlist').slice(0, 80), ids: p.ids.filter(x => typeof x === 'string') };
          if (i >= 0) S.playlists[i] = clean; else S.playlists.push(clean);
        }
        saveFavs(); savePlaylists(); dlg.close(); render(); syncUI(); toast('Đã nhập dữ liệu');
      } catch { toast('File dữ liệu không hợp lệ'); }
    };
    rd.readAsText(file);
  }

  // =====================================================================
  //  Hiển thị danh sách
  // =====================================================================
  const main = $('#main');
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2400);
  }
  function setView(v, param = null) {
    S.view = v; S.param = param; S.q = ''; S.shown = PAGE;
    $('#search').value = ''; $('#searchClear').hidden = true;
    $$('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.view === v));
    render();
    main.scrollTop = 0;
  }
  function searchIds(q) {
    const terms = norm(q).split(/\s+/).filter(Boolean);
    return S.lib.filter(t => terms.every(w => t._k.includes(w))).map(t => t.id);
  }
  function headHTML({ title, sub, back, play, extra = '' }) {
    return `<div class="list-head">
      ${back ? `<button class="icon-btn back" data-act="back" aria-label="Quay lại">${icon('back')}</button>` : ''}
      <div class="ttl"><h2>${esc(title)}</h2>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</div>
      ${play ? `<button class="btn primary" data-act="play-all">${icon('play')}Phát</button><button class="btn" data-act="shuffle-all">${icon('shuffle')}Ngẫu nhiên</button>${offOK ? `<button class="icon-btn" data-act="dl-all" title="Tải tất cả về máy" aria-label="Tải tất cả về máy">${icon('download')}</button>` : ''}` : ''}
      ${extra}</div>`;
  }
  function rowHTML(t, o = {}) {
    const fav = S.favs.has(t.id);
    const playing = o.pos != null ? o.pos === S.pos : (current() && current().id === t.id);
    const isOff = OFF.has(t.id);
    return `<div class="row${playing ? ' playing' : ''}${isOff ? ' off' : ''}${!navigator.onLine && !isOff ? ' unavail' : ''}" data-id="${esc(t.id)}"${o.pos != null ? ` data-pos="${o.pos}"` : ''} tabindex="0">
      <div class="cover" style="${coverStyle(t)}"><span class="ltr">${esc(letter(t))}</span><span class="eq"><i></i><i></i><i></i></span></div>
      <div class="meta"><div class="t">${esc(t.title)}</div><div class="s">${isOff ? `<span class="dl" title="Đã tải về máy">${icon('done')}</span>` : ''}${esc(subline(t))}</div></div>
      <button class="icon-btn fav${fav ? ' on' : ''}" data-act="fav" aria-label="Yêu thích">${icon(fav ? 'heart' : 'heart-o')}</button>
      ${o.remove ? `<button class="icon-btn" data-act="remove" aria-label="Xóa khỏi hàng đợi">${icon('close')}</button>` : ''}
      <button class="icon-btn" data-act="more" aria-label="Tùy chọn">${icon('more')}</button>
    </div>`;
  }
  function listHTML(ids, emptyMsg) {
    if (!ids.length) return `<div class="state"><p>${esc(emptyMsg || 'Không có bài nào.')}</p></div>`;
    const rows = ids.slice(0, S.shown).map(id => S.byId.get(id)).filter(Boolean).map(t => rowHTML(t)).join('');
    const more = ids.length > S.shown ? `<div class="more-rows"><button class="btn" data-act="more-rows">Hiện thêm (${ids.length - S.shown} bài)</button></div>` : '';
    return rows + more;
  }
  function folderMap() {
    const m = new Map();
    for (const t of S.lib) m.set(t.folder, (m.get(t.folder) || 0) + 1);
    return Array.from(m.entries()).sort((a, b) => coll.compare(a[0], b[0]));
  }
  function render(keepScroll) {
    const st = main.scrollTop;
    const c = getCfg();
    let html;
    if ((!c.apiKey && !driveAccessToken && !c.clientId) || !c.folderId) {
      html = `<div class="state"><div class="state-icon">${icon('music')}</div><h2>Chào mừng!</h2>
        <p>Kết nối Google Drive riêng tư để nghe nhạc và xem video của bạn.</p>
        <ol><li>Tạo OAuth Client ID dạng Web trong Google Cloud.</li><li>Nhập Client ID và ID thư mục Drive trong Cài đặt.</li><li>Đăng nhập Google để cấp quyền truy cập riêng tư.</li></ol>
        <button class="btn primary" data-act="open-settings">Mở Cài đặt</button></div>`;
      S.viewIds = [];
    } else if (S.scanning && !S.lib.length) {
      html = `<div class="state"><div class="spinner"></div><p>Đang quét thư mục Drive…<br>Đã tìm thấy <b id="scanCount">${S.scanCount}</b> bài</p></div>`;
    } else if (S.error && !S.lib.length) {
      html = `<div class="state"><h2>Không tải được thư viện</h2><p class="err">${esc(S.error)}</p>
        <div class="btn-row" style="justify-content:center"><button class="btn primary" data-act="refresh">Thử lại</button><button class="btn" data-act="open-settings">Cài đặt</button></div></div>`;
    } else if (!S.lib.length && !(S.view === 'videos' && S.videos.length)) {
      html = `<div class="state"><h2>Chưa thấy file nhạc</h2><p>Thư mục chưa có file âm thanh (mp3, m4a, flac, wav, ogg…) hoặc chưa được chia sẻ công khai.</p>
        <div class="btn-row" style="justify-content:center"><button class="btn primary" data-act="refresh">Quét lại</button></div></div>`;
    } else {
      const q = S.q.trim();
      let head = '', body = '', ids = [];
      const valid = a => a.filter(id => S.byId.has(id));
      if (S.view === 'videos' && !q) {
        head = headHTML({ title: 'Video', sub: `${S.videos.length} video`, extra: `<button class="btn primary" data-act="upload">＋ Thêm video</button>` });
        body = S.videos.length ? S.videos.map(v => `<div class="row video-row" data-video="${esc(v.id)}" tabindex="0"><div class="cover">▶</div><div class="meta"><div class="t">${esc(v.name)}</div><div class="s">${esc(v.folder || 'Drive')} · Video</div></div><button class="icon-btn" data-act="play-video" aria-label="Phát video">▶</button></div>`).join('') : `<div class="state"><p>Chưa có video. Hãy tải video lên Drive hoặc thêm file vào thư mục đã chọn rồi quét lại.</p><button class="btn primary" data-act="upload">Tải video lên</button></div>`;
      } else if (q) {
        ids = searchIds(q);
        head = headHTML({ title: `Kết quả cho “${q}”`, sub: `${ids.length} bài`, play: ids.length > 0 });
        body = listHTML(ids, 'Không tìm thấy bài nào phù hợp.');
      } else if (S.view === 'all') {
        ids = S.lib.map(t => t.id);
        head = headHTML({ title: 'Tất cả bài hát', sub: `${ids.length} bài`, play: true });
        body = listHTML(ids);
      } else if (S.view === 'folders' && S.param == null) {
        const fm = folderMap();
        head = headHTML({ title: 'Thư mục', sub: `${fm.length} thư mục` });
        body = fm.map(([path, n]) => {
          const h = hue(path);
          const parent = path.includes(' / ') ? path.slice(0, path.lastIndexOf(' / ')) + ' · ' : '';
          return `<div class="row" data-act="open-folder" data-path="${esc(path)}" tabindex="0">
            <div class="cover" style="background:linear-gradient(135deg,hsl(${h} 55% 44%),hsl(${(h + 55) % 360} 60% 26%))">${icon('folder')}</div>
            <div class="meta"><div class="t">${esc(lastSeg(path) || 'Thư mục gốc')}</div><div class="s">${esc(parent)}${n} bài</div></div></div>`;
        }).join('');
      } else if (S.view === 'folders') {
        ids = S.lib.filter(t => t.folder === S.param).map(t => t.id);
        head = headHTML({ title: lastSeg(S.param) || 'Thư mục gốc', sub: `${ids.length} bài`, back: true, play: true });
        body = listHTML(ids);
      } else if (S.view === 'offline') {
        ids = S.lib.filter(t => OFF.has(t.id)).map(t => t.id);
        const size = ids.reduce((n, id) => n + ((OFF.get(id) || [0])[0] || 0), 0);
        head = headHTML({ title: 'Đã tải về máy', sub: `${ids.length} bài${ids.length ? ' · ' + fmtMB(size) : ''}`, play: ids.length > 0 });
        body = listHTML(ids, offOK ? 'Chưa có bài nào được tải. Nghe một bài là app tự lưu lại, hoặc dùng ⋯ → “Tải về máy”.' : 'Trình duyệt này không hỗ trợ lưu offline (cần HTTPS).');
      } else if (S.view === 'favorites') {
        ids = S.lib.filter(t => S.favs.has(t.id)).map(t => t.id);
        head = headHTML({ title: 'Yêu thích', sub: `${ids.length} bài`, play: ids.length > 0 });
        body = listHTML(ids, 'Chưa có bài yêu thích. Bấm ♡ cạnh bài hát để thêm.');
      } else if (S.view === 'playlists' && S.param == null) {
        head = headHTML({ title: 'Playlist', sub: `${S.playlists.length} playlist`, extra: `<button class="btn" data-act="new-pl">${icon('plus')}Tạo mới</button>` });
        body = S.playlists.length ? S.playlists.map(p => {
          const t = S.byId.get(valid(p.ids)[0]);
          return `<div class="row" data-act="open-pl" data-id-pl="${esc(p.id)}" tabindex="0">
            <div class="cover" style="${t ? coverStyle(t) : ''}">${icon('queue')}</div>
            <div class="meta"><div class="t">${esc(p.name)}</div><div class="s">${valid(p.ids).length} bài</div></div></div>`;
        }).join('') : `<div class="state"><p>Chưa có playlist nào. Bấm “Tạo mới” hoặc chọn ⋯ → “Thêm vào playlist” ở một bài hát.</p></div>`;
      } else if (S.view === 'playlists') {
        const pl = getPl(S.param);
        if (!pl) { S.param = null; return render(); }
        ids = valid(pl.ids);
        head = headHTML({
          title: pl.name, sub: `${ids.length} bài`, back: true, play: ids.length > 0,
          extra: `<button class="icon-btn" data-act="rename-pl" aria-label="Đổi tên">${icon('edit')}</button><button class="icon-btn" data-act="delete-pl" aria-label="Xóa playlist">${icon('trash')}</button>`
        });
        body = listHTML(ids, 'Playlist trống. Chọn ⋯ ở một bài hát → “Thêm vào playlist”.');
      } else if (S.view === 'queue') {
        const upcoming = S.pos >= 0 ? S.queue.slice(S.pos) : [];
        ids = [];
        head = headHTML({ title: 'Hàng đợi', sub: upcoming.length ? `${upcoming.length - 1} bài sắp phát` : '', extra: upcoming.length > 1 ? `<button class="btn" data-act="clear-queue">Xóa hàng đợi</button>` : '' });
        body = upcoming.length
          ? upcoming.slice(0, S.shown).map((id, i) => { const t = S.byId.get(id); return t ? rowHTML(t, { pos: S.pos + i, remove: i > 0 }) : ''; }).join('') +
            (upcoming.length > S.shown ? `<div class="more-rows"><button class="btn" data-act="more-rows">Hiện thêm</button></div>` : '')
          : `<div class="state"><p>Hàng đợi trống. Chọn một bài để phát, hoặc dùng ⋯ → “Thêm vào hàng đợi”.</p></div>`;
      }
      S.viewIds = ids;
      html = `<div class="content">${head}${body}</div>`;
    }
    main.innerHTML = html;
    main.scrollTop = keepScroll ? st : 0;
  }

  // Bấm trong danh sách
  main.addEventListener('click', e => {
    const actEl = e.target.closest('[data-act]');
    const row = e.target.closest('.row');
    if (actEl) {
      const id = row && row.dataset.id;
      switch (actEl.dataset.act) {
        case 'fav': if (id) toggleFav(id); break;
        case 'more': if (id) openTrackMenu(id, {}); break;
        case 'remove': if (row.dataset.pos != null) removeFromQueue(Number(row.dataset.pos)); break;
        case 'play-all': playList(S.viewIds, null); break;
        case 'shuffle-all': {
          if (!S.prefs.shuffle) { S.prefs.shuffle = true; savePrefs(); }
          playList(S.viewIds, null); break;
        }
        case 'back': setView(S.view, null); break;
        case 'open-folder': setView('folders', actEl.dataset.path); break;
        case 'open-pl': setView('playlists', actEl.dataset.idPl); break;
        case 'new-pl': newPlaylist(); break;
        case 'rename-pl': renamePlaylist(S.param); break;
        case 'delete-pl': deletePlaylist(S.param); break;
        case 'more-rows': S.shown += PAGE; render(true); break;
        case 'dl-all': downloadMany(S.viewIds); break;
        case 'open-settings': openSettings(); break;
        case 'upload': $('#mediaUpload').click(); break;
        case 'play-video': if (row?.dataset.video) playVideo(row.dataset.video); break;
        case 'refresh': refresh(); break;
        case 'clear-queue': {
          const cur = S.queue[S.pos]; S.queue = [cur]; S.base = [cur]; S.pos = 0; afterQueueEdit(); break;
        }
        default: break;
      }
      return;
    }
    if (row && row.dataset.video) { playVideo(row.dataset.video); return; }
    if (row && row.dataset.id) {
      if (row.dataset.pos != null) { S.pos = Number(row.dataset.pos); S.restoring = false; loadCurrent(true); }
      else playList(S.viewIds, row.dataset.id);
    }
  });
  main.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('row')) { e.preventDefault(); e.target.click(); }
  });

  // =====================================================================
  //  Thanh trên, tìm kiếm, phím tắt
  // =====================================================================
  let searchTimer;
  const searchInput = $('#search');
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      S.q = searchInput.value; S.shown = PAGE;
      $('#searchClear').hidden = !S.q;
      render();
    }, 120);
  });
  function clearSearch() { searchInput.value = ''; S.q = ''; $('#searchClear').hidden = true; render(); }
  $('#searchClear').addEventListener('click', () => { clearSearch(); searchInput.focus(); });
  $('#tabs').addEventListener('click', e => { const b = e.target.closest('button[data-view]'); if (b) setView(b.dataset.view); });
  $('#btnSettings').addEventListener('click', openSettings);
  $('#btnRefresh').addEventListener('click', () => {
    const c = getCfg();
    if ((!c.apiKey && !driveAccessToken) || !c.folderId) openSettings(); else refresh();
  });

  document.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) {
      if (e.key === 'Escape' && e.target.id === 'search') { clearSearch(); e.target.blur(); }
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey || dlg.open) return;
    const seek = d => { if (isFinite(audio.duration)) audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + d)); };
    switch (e.key) {
      case ' ': if (tag === 'button') return; e.preventDefault(); togglePlay(); break;
      case 'ArrowRight': e.preventDefault(); e.shiftKey ? next(false) : seek(5); break;
      case 'ArrowLeft': e.preventDefault(); e.shiftKey ? prev() : seek(-5); break;
      case 'ArrowUp': e.preventDefault(); audio.muted = false; audio.volume = Math.min(1, audio.volume + 0.05); break;
      case 'ArrowDown': e.preventDefault(); audio.volume = Math.max(0, audio.volume - 0.05); break;
      case 'm': case 'M': toggleMute(); break;
      case 's': case 'S': setShuffle(!S.prefs.shuffle); break;
      case 'r': case 'R': cycleRepeat(); break;
      case 'l': case 'L': { const t = current(); if (t) toggleFav(t.id); break; }
      case '/': e.preventDefault(); searchInput.focus(); break;
      default: break;
    }
  });

  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); S.installEvt = e; });
  window.addEventListener('appinstalled', () => { S.installEvt = null; });

  // =====================================================================
  //  Nghe offline: tải bài về bộ nhớ trình duyệt (Cache Storage)
  // =====================================================================
  const AC = 'mp-audio-v1';
  const offOK = 'caches' in window && window.isSecureContext !== false;
  const offKey = id => new URL('__offline/' + encodeURIComponent(id), location.href).href;
  const OFF = new Map(Object.entries(LS.get('mp.off', {})));          // id -> [bytes, lastUsed]
  const offSave = () => LS.set('mp.off', Object.fromEntries(OFF));
  const offQueue = [], offBusy = new Set();
  let offWorker = false, offWarned = false;
  const fmtMB = b => b >= 1073741824 ? (b / 1073741824).toFixed(2) + ' GB' : Math.max(1, Math.round(b / 1048576)) + ' MB';
  const offBytes = () => { let n = 0; OFF.forEach(v => { n += v[0] || 0; }); return n; };

  function offAutoAllowed() {
    if (!offOK || !navigator.onLine) return false;
    const c = navigator.connection;
    if (c && c.saveData) return false;
    if (S.prefs.offWifi && c && c.type && !['wifi', 'ethernet'].includes(c.type)) return false;
    return true;
  }
  async function offBlobUrl(id) {
    if (!offOK) return null;
    try {
      const r = await (await caches.open(AC)).match(offKey(id));
      return r ? URL.createObjectURL(await r.blob()) : null;
    } catch { return null; }
  }
  function offTouch(id) { const v = OFF.get(id); if (v) { v[1] = Date.now(); offSave(); } }
  function offEnqueue(id, o = {}) {
    if (!offOK || OFF.has(id) || offBusy.has(id) || offQueue.some(q => q.id === id)) return;
    offQueue.push({ id, auto: !!o.auto, manual: !!o.manual });
    offBusy.add(id);
    offRunner();
  }
  async function offRunner() {
    if (offWorker) return;
    offWorker = true;
    while (offQueue.length) {
      const job = offQueue.shift();
      try { await offDownload(job); } catch (e) {
        if (!offWarned && !job.auto) { offWarned = true; toast('Không tải về máy được: ' + ((e && e.message) || 'lỗi mạng hoặc Google chặn')); }
        else if (!offWarned && job.auto) { offWarned = true; toast('Không lưu offline được (trình duyệt/Google chặn tải toàn bộ file)'); }
      }
      offBusy.delete(job.id);
      offBadges();
      if (S.view === 'offline' && !S.q) render(true);
    }
    offWorker = false;
  }
  async function offDownload(job) {
    const r = await fetch(streamUrl(job.id));
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const blob = await r.blob();
    if (!blob.size) throw new Error('file rỗng');
    const c = await caches.open(AC);
    await c.put(offKey(job.id), new Response(blob, { headers: { 'content-type': blob.type || 'audio/mpeg' } }));
    OFF.set(job.id, [blob.size, Date.now()]);
    offSave();
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch { /* bỏ qua */ }
    await offEvict(job.id);
    if (job.manual && !offQueue.length) toast('Đã tải xong — nghe được khi không có mạng');
  }
  async function offEvict(keepId) {
    const limit = Number(S.prefs.offLimit) * 1048576;
    if (!limit) return;
    const cur = current();
    const list = Array.from(OFF.entries()).sort((a, b) => a[1][1] - b[1][1]);
    let total = offBytes();
    for (const [id] of list) {
      if (total <= limit) break;
      if (id === keepId || (cur && id === cur.id)) continue;
      total -= OFF.get(id)[0] || 0;
      await offRemove(id, true);
    }
  }
  async function offRemove(id, quiet) {
    OFF.delete(id); offSave();
    try { await (await caches.open(AC)).delete(offKey(id)); } catch { /* bỏ qua */ }
    if (!quiet) { offBadges(); if (S.view === 'offline' && !S.q) render(true); }
  }
  async function offClearAll() {
    OFF.clear(); offSave();
    try { await caches.delete(AC); } catch { /* bỏ qua */ }
    offBadges(); if (S.view === 'offline' && !S.q) render(true);
  }
  async function offReconcile() {          // đồng bộ danh sách ghi nhớ với bộ nhớ thật
    if (!offOK) return;
    try {
      const c = await caches.open(AC), keys = await c.keys();
      const have = new Set(keys.map(k => decodeURIComponent(new URL(k.url).pathname.split('/').pop())));
      for (const id of Array.from(OFF.keys())) if (!have.has(id)) OFF.delete(id);
      for (const id of have) if (!OFF.has(id)) { const r = await c.match(offKey(id)); const b = r ? (await r.blob()).size : 0; OFF.set(id, [b, 0]); }
      offSave(); offBadges();
    } catch { /* bỏ qua */ }
  }
  function offBadges() {
    $$('.row[data-id]').forEach(r => {
      const has = OFF.has(r.dataset.id), s = $('.meta .s', r); if (!s) return;
      const b = $('.dl', s);
      if (has && !b) s.insertAdjacentHTML('afterbegin', `<span class="dl" title="Đã tải về máy">${icon('done')}</span>`);
      if (!has && b) b.remove();
      r.classList.toggle('off', has);
    });
    updateNetUI();
  }
  function updateNetUI() {
    const offline = !navigator.onLine;
    document.body.classList.toggle('is-offline', offline);
    const bar = $('#offbar'); if (bar) bar.hidden = !offline;
    $$('.row[data-id]').forEach(r => r.classList.toggle('unavail', offline && !OFF.has(r.dataset.id)));
  }
  window.addEventListener('offline', () => { updateNetUI(); toast('Mất kết nối mạng — vẫn nghe được các bài đã tải'); });
  window.addEventListener('online', () => { updateNetUI(); toast('Đã có mạng trở lại'); const c = getCfg(); if (c.apiKey && c.folderId && Date.now() - S.scannedAt > 6 * 3600 * 1000) refresh({ silent: true }); });

  // =====================================================================
  //  Hiệu ứng khi phát nhạc (vẽ bằng canvas, không đụng tới luồng âm thanh)
  //  Nhịp được mô phỏng theo bài đang phát nên không ảnh hưởng nhạc chạy nền.
  // =====================================================================
  const FX_TYPES = [
    ['bars', 'Cột nhạc (equalizer)'], ['wave', 'Sóng nhạc'], ['pulse', 'Vòng sáng đập nhịp'],
    ['aurora', 'Cực quang'], ['particles', 'Hạt sáng bay'], ['random', 'Ngẫu nhiên mỗi bài']
  ];
  const FX_REAL = FX_TYPES.map(x => x[0]).filter(x => x !== 'random');
  const FX_LEVELS = [0.6, 1, 1.5];
  const FX = { raf: 0, last: 0, energy: 0, beat: 0, type: 'bars', hue: 24, bpm: 108, until: 0, cv: {}, parts: null };

  function fxInit() {
    for (const [k, id] of [['np', 'fxNp'], ['bar', 'fxBar']]) {
      const c = document.getElementById(id); if (!c) continue;
      const o = { c, ctx: c.getContext('2d'), w: 0, h: 0 };
      FX.cv[k] = o;
      const fit = () => {
        const r = c.getBoundingClientRect(); if (!r.width || !r.height) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        o.w = r.width; o.h = r.height;
        c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
        o.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      o.fit = fit;
      if (window.ResizeObserver) new ResizeObserver(fit).observe(c); else window.addEventListener('resize', fit);
      fit();
    }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) fxWake(); });
    fxSync();
  }
  function fxSync() {
    const t = current();
    const p = S.prefs;
    const on = !!p.fx;
    document.body.classList.toggle('fx-on', on);
    document.body.classList.toggle('fx-vinyl', on && !!p.fxVinyl);
    if (t) {
      FX.hue = hue(t.folder || t.title || '');
      let h = 0; for (let i = 0; i < t.id.length; i++) h = (h * 33 + t.id.charCodeAt(i)) | 0;
      FX.bpm = 92 + (Math.abs(h) % 40);
    }
    if (p.fxType === 'random') { if (!FX_REAL.includes(FX.type) || FX.lastTrack !== (t && t.id)) FX.type = FX_REAL[Math.floor(Math.random() * FX_REAL.length)]; }
    else FX.type = FX_REAL.includes(p.fxType) ? p.fxType : 'bars';
    FX.lastTrack = t && t.id;
    fxWake();
  }
  function fxPreview() { FX.until = performance.now() + 3500; fxSync(); }
  function fxWake() {
    if (FX.raf || document.hidden) return;
    FX.last = performance.now();
    FX.raf = requestAnimationFrame(fxFrame);
  }
  function fxFrame(now) {
    FX.raf = 0;
    const on = !!S.prefs.fx;
    const playing = !audio.paused && !audio.ended && !document.body.classList.contains('buffering');
    const target = on && (playing || now < FX.until) ? 1 : 0;
    const dt = Math.min(0.05, Math.max(0.001, (now - FX.last) / 1000)); FX.last = now;
    FX.energy += (target - FX.energy) * (1 - Math.exp(-dt * (target ? 4 : 3)));
    const t = now / 1000;
    const ph = t * FX.bpm / 60, fr = ph % 1, fr2 = (ph + 0.5) % 1;
    const kick = Math.min(1, Math.exp(-5 * fr) + 0.35 * Math.exp(-5 * fr2));
    FX.beat += (kick - FX.beat) * (1 - Math.exp(-dt * 30));
    const lv = FX_LEVELS[Math.max(0, Math.min(2, (Number(S.prefs.fxLevel) || 2) - 1))];
    const np = $('#np');
    const npOpen = np && np.classList.contains('open') && mqMobile.matches;
    if (np) np.style.setProperty('--beat', (1 + FX.beat * FX.energy * 0.035 * lv).toFixed(4));
    const E = FX.energy * lv;
    for (const [k, o] of Object.entries(FX.cv)) {
      if (!o.w) { o.fit(); }
      o.ctx.clearRect(0, 0, o.w, o.h);
      if (FX.energy < 0.01 || !on) continue;
      if (k === 'np' && !npOpen) continue;
      let geo;
      if (k === 'np') {
        const cov = $('.np-art .cover.big', np);
        const cr = cov.getBoundingClientRect(), r0 = o.c.getBoundingClientRect();
        geo = { radial: true, cx: cr.left + cr.width / 2 - r0.left, cy: cr.top + cr.height / 2 - r0.top, r: cov.offsetWidth / 2 };
      } else geo = { radial: false, cx: o.w / 2, cy: o.h / 2, r: o.h * 0.25 };
      fxDraw(o, geo, t, dt, E);
    }
    if (target || FX.energy >= 0.01) FX.raf = requestAnimationFrame(fxFrame);
  }
  const hsl = (h, s, l, a = 1) => `hsla(${((h % 360) + 360) % 360},${s}%,${l}%,${a})`;
  const lightTheme = () => window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches;
  function fxDraw(o, g, t, dt, E) {
    const { ctx, w, h } = o, B = FX.beat, H = FX.hue, L = lightTheme() ? 48 : 64;
    const band = (i, n) => {   // giá trị 0..1 của "dải tần" i, giả lập theo nhịp
      const x = i / n, v = 0.5 + 0.5 * Math.sin(t * (1.6 + x * 5.5) + i * 1.93) * Math.cos(t * 0.9 + i * 0.7);
      return Math.min(1, E * (0.12 + 0.88 * v * (0.5 + 0.5 * B)) * (1.05 - 0.45 * x));
    };
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    switch (FX.type) {
      case 'bars': {
        if (g.radial) {
          const n = 56, maxLen = Math.max(14, Math.min(g.r * 0.34, w / 2 - g.r - 6));
          ctx.lineWidth = Math.max(3, g.r * 0.035);
          for (let i = 0; i < n; i++) {
            const k = i < n / 2 ? i : n - 1 - i, a = (i / n) * Math.PI * 2 - Math.PI / 2;
            const len = 4 + maxLen * band(k, n / 2), r1 = g.r + 8, r2 = r1 + len;
            ctx.strokeStyle = hsl(H + (i / n) * 70, 85, L, 0.9);
            ctx.beginPath(); ctx.moveTo(g.cx + Math.cos(a) * r1, g.cy + Math.sin(a) * r1); ctx.lineTo(g.cx + Math.cos(a) * r2, g.cy + Math.sin(a) * r2); ctx.stroke();
          }
        } else {
          const bw = 7, gap = 3, n = Math.max(8, Math.floor(w / (bw + gap)));
          for (let i = 0; i < n; i++) {
            const k = Math.abs(i - (n - 1) / 2) / (n / 2) * (n / 2);
            const bh = 3 + (h - 6) * 0.92 * band(k, n / 2);
            ctx.fillStyle = hsl(H + (i / n) * 70, 85, L, 0.85);
            ctx.fillRect(i * (bw + gap) + (w - n * (bw + gap)) / 2, h - bh, bw, bh);
          }
        }
        break;
      }
      case 'wave': {
        ctx.lineWidth = g.radial ? 3 : 2;
        for (let j = 0; j < 3; j++) {
          ctx.strokeStyle = hsl(H + j * 35, 85, L, 0.85 - j * 0.22);
          ctx.beginPath();
          if (g.radial) {
            const steps = 120, amp = Math.min(g.r * 0.2, w / 2 - g.r - 8) * E;
            for (let i = 0; i <= steps; i++) {
              const a = (i / steps) * Math.PI * 2;
              const d = Math.sin(a * 5 + t * (2.2 + j * 0.7)) * 0.6 + Math.sin(a * 9 - t * 3.1 + j) * 0.4;
              const rr = g.r + 12 + j * 6 + amp * (0.25 + 0.75 * B) * d;
              const x = g.cx + Math.cos(a) * rr, y = g.cy + Math.sin(a) * rr;
              i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
            }
            ctx.closePath();
          } else {
            const amp = h * 0.38 * E * (0.35 + 0.65 * B);
            for (let x = 0; x <= w; x += 6) {
              const u = x / w, env = Math.sin(Math.PI * u);
              const y = h / 2 + env * amp * (Math.sin(u * 12 + t * (2.5 + j)) * 0.6 + Math.sin(u * 23 - t * 3.3 + j * 2) * 0.4);
              x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
            }
          }
          ctx.stroke();
        }
        break;
      }
      case 'pulse': {
        const maxR = g.radial ? Math.min(w, h) * 0.62 : Math.max(w, h) * 0.55;
        for (let j = 0; j < 4; j++) {
          const p = ((t * 0.32 + j / 4) % 1), rr = g.r * (1.05 + p * (maxR / g.r - 1.05));
          ctx.lineWidth = 2 + (1 - p) * 4 * (0.5 + B);
          ctx.strokeStyle = hsl(H + j * 22, 85, L, Math.max(0, (1 - p)) * 0.6 * Math.min(1, E));
          ctx.beginPath(); ctx.ellipse(g.cx, g.cy, rr, g.radial ? rr : rr * 0.9, 0, 0, Math.PI * 2); ctx.stroke();
        }
        const gr = ctx.createRadialGradient(g.cx, g.cy, g.r * 0.9, g.cx, g.cy, g.r * (1.35 + B * 0.25));
        gr.addColorStop(0, hsl(H, 90, L, 0.35 * Math.min(1, E))); gr.addColorStop(1, hsl(H, 90, L, 0));
        ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
        break;
      }
      case 'aurora': {
        const R = Math.max(w, h) * 0.55;
        for (let j = 0; j < 3; j++) {
          const x = w * (0.5 + 0.38 * Math.sin(t * (0.23 + j * 0.11) + j * 2.1));
          const y = h * (0.5 + 0.36 * Math.cos(t * (0.19 + j * 0.13) + j));
          const rr = R * (0.55 + 0.25 * Math.sin(t * 0.5 + j) + 0.18 * B * E);
          const gr = ctx.createRadialGradient(x, y, 0, x, y, rr);
          const a = (lightTheme() ? 0.28 : 0.34) * Math.min(1, E);
          gr.addColorStop(0, hsl(H + j * 55, 90, L, a)); gr.addColorStop(1, hsl(H + j * 55, 90, L, 0));
          ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
        }
        break;
      }
      case 'particles': {
        const n = g.radial ? 46 : Math.max(14, Math.floor(w / 18));
        if (!FX.parts || FX.parts.length !== n || FX.partsRadial !== g.radial) {
          FX.partsRadial = g.radial;
          FX.parts = Array.from({ length: n }, () => ({ x: Math.random(), y: Math.random(), r: 1.5 + Math.random() * 3.5, v: 0.03 + Math.random() * 0.08, p: Math.random() * 6.28, hh: Math.random() * 60 }));
        }
        for (const q of FX.parts) {
          q.y -= q.v * dt * (0.4 + E * 2.2 + B * 1.2);
          if (q.y < -0.05) { q.y = 1.05; q.x = Math.random(); }
          const x = (q.x + Math.sin(t * 0.6 + q.p) * 0.02) * w, y = q.y * h;
          const rr = q.r * (1 + B * 0.7 * E) * 2.4;
          const gr = ctx.createRadialGradient(x, y, 0, x, y, rr);
          const al = Math.min(1, E) * (0.5 + 0.4 * Math.sin(t * 2 + q.p));
          gr.addColorStop(0, hsl(H + q.hh, 90, L + 8, al)); gr.addColorStop(1, hsl(H + q.hh, 90, L, 0));
          ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }
      default: break;
    }
  }

  // =====================================================================
  //  Khởi động
  // =====================================================================
  function init() {
    $$('[data-i]').forEach(el => { el.innerHTML = icon(el.dataset.i); });
    audio.volume = Math.min(1, Math.max(0, Number(S.prefs.volume) || 0.9));
    audio.defaultPlaybackRate = S.prefs.speed; audio.playbackRate = S.prefs.speed;

    // Nạp danh sách đã lưu để mở app là có nhạc ngay
    const c = getCfg();
    const cache = LS.get('mp.lib', null);
    if (cache && cache.folderId === c.folderId && Array.isArray(cache.tracks)) {
      setLibrary(cache.tracks.map(r => ({ id: r[0], name: r[1], folder: r[2] })));
      S.scannedAt = cache.t || 0;
    }
    // Khôi phục hàng đợi + vị trí lần nghe trước (không tự phát)
    const qs = LS.get('mp.queue', null);
    if (S.lib.length && qs && Array.isArray(qs.queue) && qs.queue.length) {
      const curId = qs.queue[qs.pos];
      const ok = id => S.byId.has(id);
      S.queue = qs.queue.filter(ok); S.base = (qs.base || qs.queue).filter(ok);
      S.pos = Math.max(0, S.queue.indexOf(curId));
      if (S.queue.length && (c.apiKey || c.clientId)) {
        const tm = LS.get('mp.time', null);
        S.restoring = true;
        loadCurrent(false, tm && tm.id === S.queue[S.pos] ? tm.t : 0);
      } else { S.queue = []; S.base = []; S.pos = -1; }
    }

    offReconcile(); updateNetUI();
    if (backGuard()) armGuard();
    render(); syncUI(); updateProgress(); fxInit();
    if ($('.vol')) { const v = audio.volume; $$('.vol').forEach(x => { x.value = v; x.style.setProperty('--p', (v * 100) + '%'); }); }

    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* bỏ qua */ });
    }
    // Tự quét lại: lần đầu, hoặc khi danh sách đã cũ hơn 6 giờ
    if (navigator.onLine && c.folderId && (c.apiKey || c.clientId) && (!S.lib.length || Date.now() - S.scannedAt > 6 * 3600 * 1000)) {
      if (c.apiKey) refresh({ silent: S.lib.length > 0 });
      else { render(); toast('Đăng nhập Google trong Cài đặt để mở thư viện riêng tư.'); }
    }
  }
  init();
})();
