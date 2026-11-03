/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Music,
  Video as VideoIcon,
  Folder as FolderIcon,
  Heart,
  HardDrive,
  ListMusic,
  ListOrdered,
  Search,
  X,
  RotateCw,
  Settings,
  Smartphone,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Timer,
  MoreVertical,
  Check,
  Plus,
  ArrowLeft,
  Upload,
  Download,
  AlertCircle,
  WifiOff,
  Disc,
} from 'lucide-react';

import { AppConfig, PlayerPrefs, Playlist, TabView, Track, VideoItem, SleepTimerState } from './types';
import {
  LS,
  norm,
  fmt,
  fmtMB,
  shuffleArr,
  lastSeg,
  coll,
  coverGradient,
  letter,
  subline,
  parseFolderId,
  parseTrackName,
  SPEEDS,
} from './utils/helpers';
import {
  scanDriveFolder,
  getStreamUrl,
  ensureGoogleAuth,
  uploadToDrive,
  friendlyError,
  getDriveAccessToken,
} from './services/driveService';
import {
  offOK,
  hasOfflineTrack,
  getOfflineTrackIds,
  getOfflineBlobUrl,
  removeOfflineTrack,
  clearAllOfflineTracks,
  enqueueDownload,
  canAutoDownload,
  touchOfflineTrack,
  reconcileOfflineCache,
  isTrackDownloading,
} from './services/offlineCache';
import { usePWAInstall } from './hooks/usePWAInstall';
import { VisualizerCanvas } from './components/VisualizerCanvas';
import { ApkGuideModal } from './components/ApkGuideModal';
import { SettingsModal } from './components/SettingsModal';
import { VideoModal } from './components/VideoModal';
import { SleepTimerModal } from './components/SleepTimerModal';
import { PlaylistModal } from './components/PlaylistModal';
import { TrackMenuModal } from './components/TrackMenuModal';
import { NowPlayingScreen } from './components/NowPlayingScreen';

const DEFAULT_FOLDER_ID = '1ffPA4l6H67M3FGunYPUrf2Dmj7a9B_jH';

export default function App() {
  // PWA Install hook
  const { isInstallable, isInstalled, install: promptInstallPwa } = usePWAInstall();

  // App Configurations & Preferences
  const [config, setConfig] = useState<AppConfig>(() => {
    const saved = LS.get<any>('mp.cfg', {});
    return {
      apiKey: String(saved.apiKey || '').trim(),
      folderId: parseFolderId(saved.folderId || DEFAULT_FOLDER_ID),
      clientId: String(saved.clientId || '').trim(),
    };
  });

  const [prefs, setPrefs] = useState<PlayerPrefs>(() => {
    const def: PlayerPrefs = {
      shuffle: false,
      repeat: 'off',
      volume: 0.9,
      speed: 1,
      nameFormat: 'title-artist',
      fx: true,
      fxType: 'bars',
      fxVinyl: true,
      fxLevel: 2,
      offAuto: true,
      offWifi: false,
      offLimit: 2048,
    };
    const saved = LS.get<Partial<PlayerPrefs>>('mp.prefs', {});
    return { ...def, ...saved } as PlayerPrefs;
  });

  // Library & Data states
  const [library, setLibrary] = useState<Track[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set(LS.get<string[]>('mp.favs', [])));
  const [playlists, setPlaylists] = useState<Playlist[]>(() => LS.get<Playlist[]>('mp.playlists', []));
  const [scannedAt, setScannedAt] = useState<number>(0);
  const [isScanning, setIsScanning] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Playback Queue states
  const [baseQueue, setBaseQueue] = useState<string[]>([]);
  const [queue, setQueue] = useState<string[]>([]);
  const [pos, setPos] = useState<number>(-1);

  // Audio states
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [offlineIds, setOfflineIds] = useState<Set<string>>(() => getOfflineTrackIds());
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Sleep Timer
  const [sleepState, setSleepState] = useState<SleepTimerState | null>(null);

  // Navigation & Filtering
  const [activeTab, setActiveTab] = useState<TabView>('all');
  const [folderParam, setFolderParam] = useState<string | null>(null);
  const [playlistParam, setPlaylistParam] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [shownCount, setShownCount] = useState(250);

  // Modals & Sheets
  const [isApkGuideOpen, setIsApkGuideOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSleepOpen, setIsSleepOpen] = useState(false);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [trackIdForPlaylist, setTrackIdForPlaylist] = useState<string | null>(null);
  const [isTrackMenuOpen, setIsTrackMenuOpen] = useState(false);
  const [activeMenuTrack, setActiveMenuTrack] = useState<Track | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadSeqRef = useRef<number>(0);
  const blobUrlRef = useRef<string>('');
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  // Toast notification helper
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 2500);
  }, []);

  // Map of tracks by ID for fast lookup
  const byId = useMemo(() => new Map(library.map((t) => [t.id, t])), [library]);

  const currentTrack = pos >= 0 && pos < queue.length ? byId.get(queue[pos]) || null : null;

  // Persist preferences
  useEffect(() => {
    LS.set('mp.prefs', prefs);
  }, [prefs]);

  // Persist favorites
  useEffect(() => {
    LS.set('mp.favs', Array.from(favorites));
  }, [favorites]);

  // Persist playlists
  useEffect(() => {
    LS.set('mp.playlists', playlists);
  }, [playlists]);

  // Network state listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Đã có mạng trở lại');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('Mất kết nối mạng — đang phát nhạc từ bộ nhớ máy');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  // Initial load from localStorage cache
  useEffect(() => {
    const cache = LS.get<any>('mp.lib', null);
    if (cache && cache.folderId === config.folderId && Array.isArray(cache.tracks)) {
      const parsedTracks: Track[] = cache.tracks.map((r: any) => {
        const p = parseTrackName(r[1], prefs.nameFormat);
        return {
          id: r[0],
          name: r[1],
          folder: r[2] || '',
          title: p.title || r[1],
          artist: p.artist,
          _k: norm(r[1] + ' ' + (r[2] || '')),
        };
      });
      setLibrary(parsedTracks);
      setScannedAt(cache.t || 0);
    }

    reconcileOfflineCache().then(() => setOfflineIds(getOfflineTrackIds()));

    // Auto scan if library is empty or cached more than 8 hours
    if (config.folderId && (config.apiKey || config.clientId)) {
      if (!cache || !cache.tracks?.length || Date.now() - (cache.t || 0) > 8 * 3600 * 1000) {
        handleRefresh({ silent: !!cache?.tracks?.length });
      }
    }
  }, []);

  // Sleep timer ticker
  useEffect(() => {
    if (!sleepState?.until) return;
    const interval = setInterval(() => {
      if (sleepState.until && Date.now() >= sleepState.until) {
        if (audioRef.current) audioRef.current.pause();
        setSleepState(null);
        showToast('Hết giờ hẹn — Đã dừng phát nhạc');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [sleepState, showToast]);

  // Scan or Refresh Drive Folder
  const handleRefresh = async ({ silent = false }: { silent?: boolean } = {}) => {
    if ((!config.apiKey && !config.clientId && !getDriveAccessToken()) || !config.folderId) {
      setIsSettingsOpen(true);
      return;
    }
    if (isScanning) return;

    setIsScanning(true);
    setScanCount(0);
    setErrorMsg(null);

    try {
      if (!getDriveAccessToken() && config.clientId && !config.apiKey) {
        await ensureGoogleAuth(config.clientId);
      }
      const res = await scanDriveFolder(
        config.folderId,
        config.apiKey,
        prefs.nameFormat,
        (count) => setScanCount(count)
      );
      setLibrary(res.tracks);
      setVideos(res.videos);
      const now = Date.now();
      setScannedAt(now);
      LS.set('mp.lib', {
        t: now,
        folderId: config.folderId,
        tracks: res.tracks.map((t) => [t.id, t.name, t.folder]),
      });
      if (!silent) {
        showToast(res.tracks.length ? `Đã quét xong: ${res.tracks.length} bài hát` : 'Thư mục chưa có bài hát nào');
      }
    } catch (err: any) {
      const msg = friendlyError(err);
      setErrorMsg(msg);
      showToast(msg);
    } finally {
      setIsScanning(false);
    }
  };

  // Play a track and set up queue
  const playTrackList = useCallback(
    (trackIds: string[], startId?: string) => {
      const validIds = trackIds.filter((id) => byId.has(id));
      if (!validIds.length) return;

      setBaseQueue(validIds);
      let newQueue = validIds.slice();
      let newPos = 0;

      if (prefs.shuffle) {
        const first = startId && byId.has(startId) ? startId : validIds[Math.floor(Math.random() * validIds.length)];
        newQueue = [first, ...shuffleArr(validIds.filter((x) => x !== first))];
        newPos = 0;
      } else {
        newPos = startId ? Math.max(0, validIds.indexOf(startId)) : 0;
      }

      setQueue(newQueue);
      setPos(newPos);
      loadAndPlay(newQueue[newPos]);
    },
    [byId, prefs.shuffle]
  );

  // Load and play a specific track
  const loadAndPlay = async (trackId: string, autoplay = true) => {
    const audio = audioRef.current;
    if (!audio) return;

    const seq = ++loadSeqRef.current;
    const t = byId.get(trackId);
    if (!t) return;

    setIsBuffering(true);

    const applySrc = (src: string) => {
      if (seq !== loadSeqRef.current) return;
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = src.startsWith('blob:') ? src : '';
      audio.src = src;
      audio.playbackRate = prefs.speed;
      if (autoplay) {
        audio.play().catch((err) => {
          if (err.name !== 'AbortError') {
            showToast('Không phát được bài này');
          }
        });
      }
    };

    // Check offline Cache Storage first
    if (hasOfflineTrack(trackId)) {
      const blobUrl = await getOfflineBlobUrl(trackId);
      if (blobUrl) {
        touchOfflineTrack(trackId);
        applySrc(blobUrl);
        return;
      }
    }

    // From network
    if (!navigator.onLine) {
      showToast('Đang ngoại tuyến — bài này chưa được tải về máy');
      setIsBuffering(false);
      return;
    }

    const streamUrl = getStreamUrl(trackId, config.apiKey);
    applySrc(streamUrl);

    // Auto offline download if enabled
    if (prefs.offAuto && !hasOfflineTrack(trackId) && canAutoDownload(prefs.offWifi)) {
      enqueueDownload(trackId, streamUrl, prefs.offLimit, {
        onFinish: (id, success) => {
          if (success) setOfflineIds(getOfflineTrackIds());
        },
      });
    }
  };

  // Skip Next
  const handleNext = useCallback(
    (isAuto = false) => {
      if (!queue.length) return;
      if (pos < queue.length - 1) {
        const nextPos = pos + 1;
        setPos(nextPos);
        loadAndPlay(queue[nextPos], true);
        return;
      }
      if (prefs.repeat === 'all' || !isAuto) {
        let nextQueue = queue;
        if (prefs.shuffle && queue.length > 1) {
          nextQueue = shuffleArr(queue);
          setQueue(nextQueue);
        }
        setPos(0);
        loadAndPlay(nextQueue[0], true);
        return;
      }
      // Reached end with no repeat
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsPlaying(false);
    },
    [queue, pos, prefs.repeat, prefs.shuffle]
  );

  // Skip Previous
  const handlePrev = useCallback(() => {
    if (!queue.length || !audioRef.current) return;
    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    if (pos > 0) {
      const prevPos = pos - 1;
      setPos(prevPos);
      loadAndPlay(queue[prevPos], true);
    } else if (prefs.repeat === 'all') {
      const lastPos = queue.length - 1;
      setPos(lastPos);
      loadAndPlay(queue[lastPos], true);
    } else {
      audioRef.current.currentTime = 0;
    }
  }, [queue, pos, prefs.repeat]);

  // Toggle Play / Pause
  const handleTogglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!currentTrack) {
      if (library.length) playTrackList(library.map((t) => t.id));
      return;
    }
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [currentTrack, library, playTrackList]);

  // Audio element listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      if (sleepState?.endOfTrack) {
        setSleepState(null);
        showToast('Đã dừng nhạc theo hẹn giờ');
        return;
      }
      if (prefs.repeat === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }
      handleNext(true);
    };
    const onError = () => {
      setIsBuffering(false);
      showToast('Không thể phát bài hát này (kiểm tra mạng hoặc quyền chia sẻ)');
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [sleepState, prefs.repeat, handleNext, showToast]);

  // MediaSession integration (lockscreen, notification, headphones)
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist || 'Nhạc của tôi',
        album: lastSeg(currentTrack.folder) || 'Google Drive',
        artwork: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      });
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      navigator.mediaSession.setActionHandler('play', () => audioRef.current?.play());
      navigator.mediaSession.setActionHandler('pause', () => audioRef.current?.pause());
      navigator.mediaSession.setActionHandler('previoustrack', handlePrev);
      navigator.mediaSession.setActionHandler('nexttrack', () => handleNext(false));
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime != null && audioRef.current) {
          audioRef.current.currentTime = details.seekTime;
        }
      });
    } catch {
      /* ignore */
    }
  }, [currentTrack, isPlaying, handlePrev, handleNext]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (e.shiftKey) handleNext(false);
        else if (audioRef.current) audioRef.current.currentTime += 5;
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (e.shiftKey) handlePrev();
        else if (audioRef.current) audioRef.current.currentTime -= 5;
      } else if (e.code === 'KeyM') {
        setIsMuted((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlay, handleNext, handlePrev]);

  // Playlist Actions
  const handleToggleFavorite = (trackId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
        showToast('Đã bỏ khỏi Yêu thích');
      } else {
        next.add(trackId);
        showToast('Đã thêm vào Yêu thích');
      }
      return next;
    });
  };

  const handleCreatePlaylist = (name: string, trackIdToAdd?: string) => {
    const newPl: Playlist = {
      id: 'pl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      name,
      ids: trackIdToAdd ? [trackIdToAdd] : [],
    };
    setPlaylists((prev) => [...prev, newPl]);
    showToast(`Đã tạo playlist “${name}”`);
  };

  const handleAddToPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id !== playlistId) return pl;
        if (pl.ids.includes(trackId)) {
          showToast('Bài này đã có trong playlist');
          return pl;
        }
        showToast(`Đã thêm vào “${pl.name}”`);
        return { ...pl, ids: [...pl.ids, trackId] };
      })
    );
  };

  // Upload handler
  const handleUploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      showToast('Đang tải file lên Google Drive…');
      const count = await uploadToDrive(files, config.folderId, config.clientId);
      showToast(`Đã tải lên ${count} file thành công!`);
      handleRefresh({ silent: true });
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi tải file lên');
    }
  };

  // Search and view filtering
  const visibleTrackIds = useMemo(() => {
    const q = norm(searchQuery.trim());
    if (q) {
      const terms = q.split(/\s+/).filter(Boolean);
      return library.filter((t) => terms.every((term) => t._k.includes(term))).map((t) => t.id);
    }

    switch (activeTab) {
      case 'all':
        return library.map((t) => t.id);
      case 'favorites':
        return library.filter((t) => favorites.has(t.id)).map((t) => t.id);
      case 'offline':
        return library.filter((t) => offlineIds.has(t.id)).map((t) => t.id);
      case 'folders':
        if (folderParam) {
          return library.filter((t) => t.folder === folderParam).map((t) => t.id);
        }
        return [];
      case 'playlists':
        if (playlistParam) {
          const pl = playlists.find((p) => p.id === playlistParam);
          return pl ? pl.ids.filter((id) => byId.has(id)) : [];
        }
        return [];
      case 'queue':
        return pos >= 0 ? queue.slice(pos) : [];
      default:
        return library.map((t) => t.id);
    }
  }, [library, searchQuery, activeTab, folderParam, playlistParam, favorites, offlineIds, playlists, byId, pos, queue]);

  // Folder groups
  const folderList = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of library) {
      m.set(t.folder, (m.get(t.folder) || 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => coll.compare(a[0], b[0]));
  }, [library]);

  const sleepRemainingText = useMemo(() => {
    if (!sleepState) return undefined;
    if (sleepState.endOfTrack) return 'Hết bài';
    if (!sleepState.until) return undefined;
    const sec = Math.max(0, Math.round((sleepState.until - Date.now()) / 1000));
    return fmt(sec);
  }, [sleepState, currentTime]);

  return (
    <div className="fixed inset-0 w-full h-full flex flex-col bg-[#14161c] text-[#eef0f4] overflow-hidden select-none">
      <audio ref={audioRef} muted={isMuted} />

      {/* Top Header Bar */}
      <header className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2.5 bg-[#1b1e26] border-b border-[#2a2f3b] flex-none z-20">
        <div className="flex items-center gap-2 mr-1">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#ff8a3d] to-[#ff4520] flex items-center justify-center text-[#1d1204] shadow-md shadow-[#ff8a3d]/20 flex-none">
            <Music className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm sm:text-base text-white hidden md:inline">Nhạc của tôi</span>
        </div>

        {/* Search Input */}
        <div className="flex-1 max-w-md relative flex items-center">
          <Search className="w-4 h-4 text-[#98a1b1] absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm bài hát, ca sĩ, thư mục…"
            className="w-full pl-9 pr-8 py-1.5 rounded-full bg-[#14161c] border border-[#2a2f3b] text-white text-xs sm:text-sm outline-none focus:border-[#ff8a3d] transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 text-[#98a1b1] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Right action buttons */}
        <div className="flex items-center gap-1 sm:gap-2 ml-auto">
          {/* Prominent APK & Install Button */}
          <button
            onClick={() => setIsApkGuideOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#ff8a3d] to-[#ff5e3a] text-[#1d1204] font-bold text-xs shadow-md shadow-[#ff8a3d]/20 hover:brightness-110 active:scale-95 transition"
            title="Đóng gói & Cài đặt APK Android"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cài đặt APK</span>
          </button>

          {/* Scan / Refresh Drive */}
          <button
            onClick={() => handleRefresh()}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-[#98a1b1] hover:text-white hover:bg-[#242833] transition ${
              isScanning ? 'animate-spin text-[#ff8a3d]' : ''
            }`}
            title="Quét lại thư mục Google Drive"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Settings */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#98a1b1] hover:text-white hover:bg-[#242833] transition"
            title="Cài đặt"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Tabs navigation */}
      <nav className="flex items-center gap-1.5 px-3 sm:px-5 py-2 border-b border-[#2a2f3b] bg-[#14161c] overflow-x-auto scrollbar-none flex-none z-10">
        <button
          onClick={() => {
            setActiveTab('all');
            setFolderParam(null);
            setPlaylistParam(null);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
            activeTab === 'all'
              ? 'bg-white text-[#14161c] font-semibold'
              : 'text-[#98a1b1] hover:text-white hover:bg-[#1b1e26]'
          }`}
        >
          <Music className="w-3.5 h-3.5" /> Nhạc
        </button>

        <button
          onClick={() => {
            setActiveTab('videos');
            setFolderParam(null);
            setPlaylistParam(null);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
            activeTab === 'videos'
              ? 'bg-white text-[#14161c] font-semibold'
              : 'text-[#98a1b1] hover:text-white hover:bg-[#1b1e26]'
          }`}
        >
          <VideoIcon className="w-3.5 h-3.5" /> Video
          {videos.length > 0 && <span className="opacity-70">({videos.length})</span>}
        </button>

        <button
          onClick={() => {
            setActiveTab('folders');
            setFolderParam(null);
            setPlaylistParam(null);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
            activeTab === 'folders'
              ? 'bg-white text-[#14161c] font-semibold'
              : 'text-[#98a1b1] hover:text-white hover:bg-[#1b1e26]'
          }`}
        >
          <FolderIcon className="w-3.5 h-3.5" /> Thư mục
        </button>

        <button
          onClick={() => {
            setActiveTab('favorites');
            setFolderParam(null);
            setPlaylistParam(null);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
            activeTab === 'favorites'
              ? 'bg-white text-[#14161c] font-semibold'
              : 'text-[#98a1b1] hover:text-white hover:bg-[#1b1e26]'
          }`}
        >
          <Heart className="w-3.5 h-3.5" /> Yêu thích
        </button>

        <button
          onClick={() => {
            setActiveTab('offline');
            setFolderParam(null);
            setPlaylistParam(null);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
            activeTab === 'offline'
              ? 'bg-white text-[#14161c] font-semibold'
              : 'text-[#98a1b1] hover:text-white hover:bg-[#1b1e26]'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" /> Đã tải
          {offlineIds.size > 0 && <span className="opacity-70">({offlineIds.size})</span>}
        </button>

        <button
          onClick={() => {
            setActiveTab('playlists');
            setFolderParam(null);
            setPlaylistParam(null);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
            activeTab === 'playlists'
              ? 'bg-white text-[#14161c] font-semibold'
              : 'text-[#98a1b1] hover:text-white hover:bg-[#1b1e26]'
          }`}
        >
          <ListMusic className="w-3.5 h-3.5" /> Playlist
        </button>

        <button
          onClick={() => {
            setActiveTab('queue');
            setFolderParam(null);
            setPlaylistParam(null);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
            activeTab === 'queue'
              ? 'bg-white text-[#14161c] font-semibold'
              : 'text-[#98a1b1] hover:text-white hover:bg-[#1b1e26]'
          }`}
        >
          <ListOrdered className="w-3.5 h-3.5" /> Hàng đợi
          {queue.length > 0 && <span className="opacity-70">({queue.length})</span>}
        </button>
      </nav>

      {/* Offline Alert Bar */}
      {!isOnline && (
        <div className="flex items-center justify-center gap-2 py-1.5 px-4 bg-amber-500/20 text-amber-300 text-xs font-medium border-b border-amber-500/30">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Đang ngoại tuyến — chỉ phát được các bài đã tải về máy</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 scrollbar-thin">
        <div className="max-w-4xl mx-auto space-y-3">
          {/* Scanning Progress Banner */}
          {isScanning && (
            <div className="p-4 rounded-2xl bg-[#1b1e26] border border-[#2a2f3b] flex items-center justify-center gap-3 text-sm text-[#98a1b1]">
              <div className="w-4 h-4 border-2 border-[#ff8a3d] border-t-transparent rounded-full animate-spin" />
              <span>Đang quét thư mục Google Drive… Tìm thấy {scanCount} bài</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && !library.length && (
            <div className="p-5 rounded-2xl bg-red-950/30 border border-red-900/50 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
              <h3 className="text-base font-bold text-white">Không tải được thư viện Drive</h3>
              <p className="text-xs text-red-300 max-w-md mx-auto">{errorMsg}</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => handleRefresh()}
                  className="px-4 py-2 rounded-xl bg-[#ff8a3d] text-[#1d1204] font-bold text-xs"
                >
                  Thử lại
                </button>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[#242833] text-white text-xs"
                >
                  Mở Cài đặt
                </button>
              </div>
            </div>
          )}

          {/* Videos Tab Content */}
          {activeTab === 'videos' && !searchQuery && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2">
                <div>
                  <h2 className="text-lg font-bold text-white">Video trên Google Drive</h2>
                  <p className="text-xs text-[#98a1b1]">{videos.length} video</p>
                </div>
                <button
                  onClick={() => uploadInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ff8a3d] text-[#1d1204] font-semibold text-xs hover:brightness-110 transition"
                >
                  <Upload className="w-3.5 h-3.5" /> Thêm video
                </button>
              </div>

              {videos.length === 0 ? (
                <div className="text-center py-12 text-[#98a1b1] text-xs space-y-3">
                  <VideoIcon className="w-10 h-10 mx-auto text-[#363c4a]" />
                  <p>Chưa có file video (MP4, WebM, MOV…) trong thư mục Drive.</p>
                  <button
                    onClick={() => uploadInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-[#242833] text-white text-xs font-medium"
                  >
                    Tải video lên Drive
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {videos.map((v) => (
                    <div
                      key={v.id}
                      onClick={() => {
                        setActiveVideo(v);
                        setIsVideoModalOpen(true);
                      }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-[#1b1e26] hover:bg-[#242833] border border-[#2a2f3b] cursor-pointer transition"
                    >
                      <div className="w-12 h-12 rounded-lg bg-[#242833] flex items-center justify-center text-[#ff8a3d] flex-none">
                        <Play className="w-5 h-5 fill-current" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-semibold text-white truncate">{v.name}</h4>
                        <p className="text-xs text-[#98a1b1] truncate mt-0.5">
                          {v.folder ? lastSeg(v.folder) : 'Gốc'} · Video
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Folder View (List of Folders) */}
          {activeTab === 'folders' && !folderParam && !searchQuery && (
            <div className="space-y-2">
              <h2 className="text-base font-bold text-white pb-1">Thư mục ({folderList.length})</h2>
              {folderList.map(([folderPath, count]) => (
                <div
                  key={folderPath}
                  onClick={() => setFolderParam(folderPath)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[#1b1e26] hover:bg-[#242833] border border-[#2a2f3b] cursor-pointer transition"
                >
                  <div
                    className="w-11 h-11 rounded-lg flex items-center justify-center text-white flex-none"
                    style={{ background: coverGradient(folderPath) }}
                  >
                    <FolderIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-white truncate">
                      {lastSeg(folderPath) || 'Thư mục gốc'}
                    </h4>
                    <p className="text-xs text-[#98a1b1] truncate mt-0.5">{count} bài hát</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Playlist View (List of Playlists) */}
          {activeTab === 'playlists' && !playlistParam && !searchQuery && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <h2 className="text-base font-bold text-white">Playlist ({playlists.length})</h2>
                <button
                  onClick={() => {
                    setTrackIdForPlaylist(null);
                    setIsPlaylistModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#242833] hover:bg-[#363c4a] text-[#ff8a3d] font-semibold text-xs border border-[#363c4a] transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Tạo mới
                </button>
              </div>

              {playlists.map((pl) => (
                <div
                  key={pl.id}
                  onClick={() => setPlaylistParam(pl.id)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[#1b1e26] hover:bg-[#242833] border border-[#2a2f3b] cursor-pointer transition"
                >
                  <div className="w-11 h-11 rounded-lg bg-gradient-to-tr from-[#3a4153] to-[#222733] flex items-center justify-center text-[#ff8a3d] flex-none">
                    <ListMusic className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-white truncate">{pl.name}</h4>
                    <p className="text-xs text-[#98a1b1] truncate mt-0.5">{pl.ids.length} bài hát</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tracks List (For All, Search, Favorites, Offline, Inside Folder, Inside Playlist, Queue) */}
          {(activeTab === 'all' ||
            searchQuery ||
            activeTab === 'favorites' ||
            activeTab === 'offline' ||
            activeTab === 'queue' ||
            (activeTab === 'folders' && folderParam) ||
            (activeTab === 'playlists' && playlistParam)) && (
            <div className="space-y-3">
              {/* Header inside sub-view */}
              <div className="flex items-center justify-between flex-wrap gap-2 pb-1">
                <div className="flex items-center gap-2">
                  {(folderParam || playlistParam) && (
                    <button
                      onClick={() => {
                        setFolderParam(null);
                        setPlaylistParam(null);
                      }}
                      className="p-1 rounded-full text-[#98a1b1] hover:text-white hover:bg-[#242833]"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                  )}
                  <div>
                    <h2 className="text-base font-bold text-white">
                      {searchQuery
                        ? `Kết quả tìm kiếm cho “${searchQuery}”`
                        : folderParam
                        ? lastSeg(folderParam) || 'Thư mục gốc'
                        : playlistParam
                        ? playlists.find((p) => p.id === playlistParam)?.name || 'Playlist'
                        : activeTab === 'favorites'
                        ? 'Bài hát yêu thích'
                        : activeTab === 'offline'
                        ? 'Đã tải về máy (Offline)'
                        : activeTab === 'queue'
                        ? 'Hàng đợi đang phát'
                        : 'Tất cả bài hát'}
                    </h2>
                    <p className="text-xs text-[#98a1b1]">{visibleTrackIds.length} bài hát</p>
                  </div>
                </div>

                {visibleTrackIds.length > 0 && activeTab !== 'queue' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => playTrackList(visibleTrackIds)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#ff8a3d] text-[#1d1204] font-bold text-xs hover:brightness-110 active:scale-95 transition"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Phát tất cả
                    </button>
                    <button
                      onClick={() => {
                        if (!prefs.shuffle) setPrefs((p) => ({ ...p, shuffle: true }));
                        playTrackList(visibleTrackIds);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#242833] hover:bg-[#363c4a] text-white text-xs font-medium border border-[#363c4a] transition"
                    >
                      <Shuffle className="w-3.5 h-3.5" /> Ngẫu nhiên
                    </button>
                  </div>
                )}
              </div>

              {/* Rows */}
              {visibleTrackIds.length === 0 ? (
                <div className="text-center py-12 text-[#98a1b1] text-xs">
                  {searchQuery
                    ? 'Không tìm thấy bài hát nào phù hợp.'
                    : activeTab === 'favorites'
                    ? 'Chưa có bài hát yêu thích. Bấm biểu tượng trái tim để thêm vào đây.'
                    : activeTab === 'offline'
                    ? 'Chưa có bài nào được tải về máy. Mở tùy chọn (⋮) ở bất kỳ bài nào → “Tải về máy để nghe offline”.'
                    : 'Không có bài hát nào.'}
                </div>
              ) : (
                <div className="space-y-1">
                  {visibleTrackIds.slice(0, shownCount).map((id, index) => {
                    const t = byId.get(id);
                    if (!t) return null;
                    const isCur = currentTrack?.id === t.id;
                    const isFav = favorites.has(t.id);
                    const isOff = offlineIds.has(t.id);

                    return (
                      <div
                        key={t.id + index}
                        onClick={() => playTrackList(visibleTrackIds, t.id)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition ${
                          isCur
                            ? 'bg-[#242833] text-[#ff8a3d]'
                            : 'hover:bg-[#1b1e26] text-[#eef0f4]'
                        }`}
                      >
                        {/* Cover thumbnail */}
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm relative flex-none shadow-sm"
                          style={{ background: coverGradient(t.folder || t.title) }}
                        >
                          {isCur && isPlaying ? (
                            <div className="flex items-end gap-0.5 h-3">
                              <span className="w-0.5 h-full bg-white animate-pulse" />
                              <span className="w-0.5 h-2 bg-white animate-pulse delay-75" />
                              <span className="w-0.5 h-3 bg-white animate-pulse delay-150" />
                            </div>
                          ) : (
                            letter(t.title)
                          )}
                        </div>

                        {/* Metadata */}
                        <div className="min-w-0 flex-1">
                          <h4 className={`text-sm font-semibold truncate ${isCur ? 'text-[#ff8a3d]' : 'text-white'}`}>
                            {t.title}
                          </h4>
                          <p className="text-xs text-[#98a1b1] truncate mt-0.5 flex items-center gap-1.5">
                            {isOff && (
                              <span className="text-[#ff8a3d] font-semibold text-[10px] bg-[#ff8a3d]/10 px-1 rounded">
                                Offline
                              </span>
                            )}
                            <span>{subline(t.artist, t.folder)}</span>
                          </p>
                        </div>

                        {/* Favorite button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(t.id);
                          }}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[#98a1b1] hover:text-white transition flex-none"
                        >
                          <Heart
                            className={`w-4 h-4 ${
                              isFav ? 'text-[#ff8a3d] fill-[#ff8a3d]' : ''
                            }`}
                          />
                        </button>

                        {/* Context menu button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuTrack(t);
                            setIsTrackMenuOpen(true);
                          }}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[#98a1b1] hover:text-white transition flex-none"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}

                  {visibleTrackIds.length > shownCount && (
                    <div className="text-center pt-3 pb-6">
                      <button
                        onClick={() => setShownCount((c) => c + 250)}
                        className="px-4 py-2 rounded-xl bg-[#242833] hover:bg-[#363c4a] text-xs font-medium text-white transition"
                      >
                        Hiện thêm ({visibleTrackIds.length - shownCount} bài)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Persistent Bottom Audio Player */}
      <footer className="relative flex-none bg-[#1b1e26] border-t border-[#2a2f3b] z-30 px-3 sm:px-6 py-2.5 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
        {/* Background Visualizer bar */}
        {prefs.fx && currentTrack && (
          <VisualizerCanvas
            isPlaying={isPlaying}
            isBuffering={isBuffering}
            visualizerType={prefs.fxType}
            visualizerLevel={prefs.fxLevel}
            folderOrTitle={currentTrack.folder || currentTrack.title}
            isRadial={false}
            className="absolute inset-0 w-full h-full opacity-35 pointer-events-none z-0"
          />
        )}

        <div className="relative z-10 flex items-center justify-between gap-3 sm:gap-6">
          {/* Left: Track Info (Click opens Now Playing on mobile) */}
          <div
            onClick={() => setIsNowPlayingOpen(true)}
            className="flex items-center gap-3 min-w-0 flex-1 sm:max-w-xs cursor-pointer group"
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-base flex-none shadow-md"
              style={{
                background: currentTrack
                  ? coverGradient(currentTrack.folder || currentTrack.title)
                  : '#242833',
              }}
            >
              {currentTrack ? letter(currentTrack.title) : <Music className="w-5 h-5 text-[#98a1b1]" />}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-[#ff8a3d] transition">
                {currentTrack ? currentTrack.title : 'Chưa phát bài nào'}
              </h4>
              <p className="text-[11px] text-[#98a1b1] truncate mt-0.5">
                {currentTrack ? subline(currentTrack.artist, currentTrack.folder) : 'Chọn một bài để nghe'}
              </p>
            </div>
          </div>

          {/* Center: Controls & Scrubber (Desktop) */}
          <div className="hidden sm:flex flex-col items-center gap-1.5 flex-1 max-w-lg">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPrefs((p) => ({ ...p, shuffle: !p.shuffle }))}
                className={`p-1.5 rounded-full transition ${
                  prefs.shuffle ? 'text-[#ff8a3d]' : 'text-[#98a1b1] hover:text-white'
                }`}
                title="Phát ngẫu nhiên"
              >
                <Shuffle className="w-4 h-4" />
              </button>

              <button
                onClick={handlePrev}
                className="p-1.5 rounded-full text-white hover:text-[#ff8a3d] transition active:scale-95"
                title="Bài trước"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              <button
                onClick={handleTogglePlay}
                className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#ff8a3d] to-[#ff5e3a] text-[#1d1204] flex items-center justify-center shadow-md shadow-[#ff8a3d]/25 hover:brightness-110 active:scale-95 transition"
                title={isPlaying ? 'Tạm dừng' : 'Phát'}
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>

              <button
                onClick={() => handleNext(false)}
                className="p-1.5 rounded-full text-white hover:text-[#ff8a3d] transition active:scale-95"
                title="Bài sau"
              >
                <SkipForward className="w-5 h-5" />
              </button>

              <button
                onClick={() => {
                  const nextRepeat: 'off' | 'all' | 'one' =
                    prefs.repeat === 'off' ? 'all' : prefs.repeat === 'all' ? 'one' : 'off';
                  setPrefs((p) => ({ ...p, repeat: nextRepeat }));
                }}
                className={`p-1.5 rounded-full transition ${
                  prefs.repeat !== 'off' ? 'text-[#ff8a3d]' : 'text-[#98a1b1] hover:text-white'
                }`}
                title="Chế độ lặp lại"
              >
                {prefs.repeat === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
              </button>
            </div>

            {/* Seekbar */}
            <div className="w-full flex items-center gap-2 text-xs font-mono text-[#98a1b1]">
              <span className="w-8 text-right">{fmt(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={duration > 0 ? duration : 100}
                value={currentTime}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCurrentTime(val);
                  if (audioRef.current) audioRef.current.currentTime = val;
                }}
                className="flex-1 h-1 rounded-lg appearance-none cursor-pointer bg-[#363c4a] accent-[#ff8a3d]"
              />
              <span className="w-8">{fmt(duration)}</span>
            </div>
          </div>

          {/* Right: Sound, Speed, Sleep, Queue (Desktop) */}
          <div className="hidden sm:flex items-center gap-2 flex-none">
            <button
              onClick={() => {
                const nextSpeed = SPEEDS[(SPEEDS.indexOf(prefs.speed) + 1) % SPEEDS.length];
                setPrefs((p) => ({ ...p, speed: nextSpeed }));
                if (audioRef.current) audioRef.current.playbackRate = nextSpeed;
              }}
              className="px-2 py-1 rounded-lg text-xs font-mono font-medium text-[#98a1b1] hover:text-white hover:bg-[#242833] transition"
              title="Tốc độ phát"
            >
              {prefs.speed}×
            </button>

            <button
              onClick={() => setIsSleepOpen(true)}
              className={`p-1.5 rounded-full transition ${
                sleepState ? 'text-[#ff8a3d]' : 'text-[#98a1b1] hover:text-white'
              }`}
              title="Hẹn giờ tắt nhạc"
            >
              <Timer className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsMuted((m) => !m)}
              className="p-1.5 rounded-full text-[#98a1b1] hover:text-white transition"
              title={isMuted ? 'Bật tiếng' : 'Tắt tiếng'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : prefs.volume}
              onChange={(e) => {
                const v = Number(e.target.value);
                setPrefs((p) => ({ ...p, volume: v }));
                setIsMuted(false);
                if (audioRef.current) audioRef.current.volume = v;
              }}
              className="w-20 h-1 rounded-lg appearance-none cursor-pointer bg-[#363c4a] accent-[#ff8a3d]"
              title="Âm lượng"
            />
          </div>

          {/* Mobile compact play & next buttons */}
          <div className="flex sm:hidden items-center gap-1.5 flex-none">
            <button
              onClick={handleTogglePlay}
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#ff8a3d] to-[#ff5e3a] text-[#1d1204] flex items-center justify-center shadow-md shadow-[#ff8a3d]/20 active:scale-95 transition"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>
            <button
              onClick={() => handleNext(false)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white active:scale-95 transition"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
        </div>
      </footer>

      {/* Hidden file upload for Drive */}
      <input
        ref={uploadInputRef}
        type="file"
        multiple
        accept="audio/*,video/*,.mp3,.m4a,.flac,.wav,.ogg,.mp4,.webm,.mov,.mkv"
        className="hidden"
        onChange={(e) => handleUploadFiles(e.target.files)}
      />

      {/* Modals */}
      <ApkGuideModal
        isOpen={isApkGuideOpen}
        onClose={() => setIsApkGuideOpen(false)}
        onInstallPwa={promptInstallPwa}
        isInstallable={isInstallable}
        isInstalled={isInstalled}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        prefs={prefs}
        onSaveConfig={(newCfg) => {
          setConfig(newCfg);
          LS.set('mp.cfg', newCfg);
          handleRefresh({ silent: false });
        }}
        onSavePrefs={(newPrefs) => setPrefs(newPrefs)}
        onConnectGoogle={async () => {
          try {
            await ensureGoogleAuth(config.clientId);
            showToast('Đã kết nối Google Drive thành công!');
            handleRefresh({ silent: true });
          } catch (e: any) {
            showToast(e.message || 'Lỗi khi kết nối Google');
          }
        }}
        onUploadMedia={() => uploadInputRef.current?.click()}
        onExportData={() => {
          const data = { app: 'nhac-cua-toi', version: 2, favs: Array.from(favorites), playlists };
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'nhac-cua-toi-du-lieu.json';
          a.click();
          URL.revokeObjectURL(url);
          showToast('Đã xuất file dữ liệu Yêu thích & Playlist!');
        }}
        onImportData={(file) => {
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const d = JSON.parse(String(reader.result));
              if (d.favs) setFavorites(new Set(d.favs));
              if (d.playlists) setPlaylists(d.playlists);
              showToast('Đã nhập dữ liệu thành công!');
            } catch {
              showToast('File dữ liệu không hợp lệ');
            }
          };
          reader.readAsText(file);
        }}
        onResetData={() => {
          if (window.confirm('Xóa toàn bộ dữ liệu cấu hình, yêu thích và playlist đã lưu trên thiết bị này?')) {
            Object.keys(localStorage)
              .filter((k) => k.startsWith('mp.'))
              .forEach((k) => LS.del(k));
            window.location.reload();
          }
        }}
        libraryCount={library.length}
        scannedAt={scannedAt}
        onOpenApkGuide={() => {
          setIsSettingsOpen(false);
          setIsApkGuideOpen(true);
        }}
      />

      <VideoModal
        video={activeVideo}
        streamUrl={activeVideo ? getStreamUrl(activeVideo.id, config.apiKey) : ''}
        onClose={() => {
          setIsVideoModalOpen(false);
          setActiveVideo(null);
        }}
      />

      <SleepTimerModal
        isOpen={isSleepOpen}
        onClose={() => setIsSleepOpen(false)}
        sleepState={sleepState}
        onSetTimer={(minutes) => {
          if (minutes === null) {
            setSleepState(null);
            showToast('Đã tắt hẹn giờ');
          } else if (minutes === 'end') {
            setSleepState({ endOfTrack: true });
            showToast('Sẽ dừng nhạc khi hết bài đang phát');
          } else {
            setSleepState({ until: Date.now() + minutes * 60 * 1000 });
            showToast(`Sẽ tắt nhạc sau ${minutes} phút`);
          }
        }}
      />

      <PlaylistModal
        isOpen={isPlaylistModalOpen}
        onClose={() => {
          setIsPlaylistModalOpen(false);
          setTrackIdForPlaylist(null);
        }}
        playlists={playlists}
        trackIdToAdd={trackIdForPlaylist}
        onAddToPlaylist={handleAddToPlaylist}
        onCreatePlaylist={handleCreatePlaylist}
      />

      <TrackMenuModal
        track={activeMenuTrack}
        onClose={() => {
          setIsTrackMenuOpen(false);
          setActiveMenuTrack(null);
        }}
        isFavorite={activeMenuTrack ? favorites.has(activeMenuTrack.id) : false}
        onToggleFavorite={handleToggleFavorite}
        onPlayNext={(id) => {
          if (!queue.length) {
            playTrackList([id]);
            return;
          }
          const nextQ = [...queue];
          nextQ.splice(pos + 1, 0, id);
          setQueue(nextQ);
          showToast('Sẽ phát tiếp theo');
        }}
        onAddToQueue={(id) => {
          if (!queue.length) {
            playTrackList([id]);
            return;
          }
          setQueue((prev) => [...prev, id]);
          showToast('Đã thêm vào hàng đợi');
        }}
        onAddToPlaylist={(id) => {
          setTrackIdForPlaylist(id);
          setIsPlaylistModalOpen(true);
        }}
        onDownloadOffline={(id) => {
          const streamUrl = getStreamUrl(id, config.apiKey);
          enqueueDownload(id, streamUrl, prefs.offLimit, {
            manual: true,
            onFinish: (finishedId, success) => {
              if (success) {
                setOfflineIds(getOfflineTrackIds());
                showToast('Đã tải bài hát về máy thành công!');
              } else {
                showToast('Tải về máy không thành công (kiểm tra mạng)');
              }
            },
          });
          showToast('Đang tải bài hát về máy…');
        }}
        onRemoveOffline={async (id) => {
          await removeOfflineTrack(id);
          setOfflineIds(getOfflineTrackIds());
          showToast('Đã xóa bản tải offline');
        }}
        inPlaylistId={playlistParam}
        onRemoveFromPlaylist={(trackId, plId) => {
          setPlaylists((prev) =>
            prev.map((pl) => (pl.id === plId ? { ...pl, ids: pl.ids.filter((x) => x !== trackId) } : pl))
          );
          showToast('Đã xóa bài khỏi playlist');
        }}
      />

      <NowPlayingScreen
        isOpen={isNowPlayingOpen}
        onClose={() => setIsNowPlayingOpen(false)}
        track={currentTrack}
        isPlaying={isPlaying}
        isBuffering={isBuffering}
        currentTime={currentTime}
        duration={duration}
        onSeek={(t) => {
          setCurrentTime(t);
          if (audioRef.current) audioRef.current.currentTime = t;
        }}
        onTogglePlay={handleTogglePlay}
        onNext={() => handleNext(false)}
        onPrev={handlePrev}
        shuffle={prefs.shuffle}
        onToggleShuffle={() => setPrefs((p) => ({ ...p, shuffle: !p.shuffle }))}
        repeat={prefs.repeat}
        onCycleRepeat={() => {
          const nextRepeat = prefs.repeat === 'off' ? 'all' : prefs.repeat === 'all' ? 'one' : 'off';
          setPrefs((p) => ({ ...p, repeat: nextRepeat }));
        }}
        isFavorite={currentTrack ? favorites.has(currentTrack.id) : false}
        onToggleFavorite={() => currentTrack && handleToggleFavorite(currentTrack.id)}
        speed={prefs.speed}
        onCycleSpeed={() => {
          const nextSpeed = SPEEDS[(SPEEDS.indexOf(prefs.speed) + 1) % SPEEDS.length];
          setPrefs((p) => ({ ...p, speed: nextSpeed }));
          if (audioRef.current) audioRef.current.playbackRate = nextSpeed;
        }}
        sleepLabel={sleepRemainingText}
        onOpenSleepTimer={() => setIsSleepOpen(true)}
        onOpenTrackMenu={() => {
          if (currentTrack) {
            setActiveMenuTrack(currentTrack);
            setIsTrackMenuOpen(true);
          }
        }}
        onOpenQueue={() => setActiveTab('queue')}
        fx={prefs.fx}
        fxType={prefs.fxType}
        fxLevel={prefs.fxLevel}
        fxVinyl={prefs.fxVinyl}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-white text-[#14161c] text-xs font-semibold shadow-xl border border-white/20 animate-fadeIn pointer-events-none text-center max-w-sm">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
