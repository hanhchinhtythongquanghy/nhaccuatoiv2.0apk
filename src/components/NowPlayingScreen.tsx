import React from 'react';
import {
  ChevronDown,
  MoreVertical,
  Heart,
  Shuffle,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Repeat,
  Repeat1,
  Timer,
  ListMusic,
  Disc,
} from 'lucide-react';
import { Track, VisualizerMode } from '../types';
import { fmt, coverGradient, letter, subline } from '../utils/helpers';
import { VisualizerCanvas } from './VisualizerCanvas';

interface NowPlayingScreenProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  shuffle: boolean;
  onToggleShuffle: () => void;
  repeat: 'off' | 'all' | 'one';
  onCycleRepeat: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  speed: number;
  onCycleSpeed: () => void;
  sleepLabel?: string;
  onOpenSleepTimer: () => void;
  onOpenTrackMenu: () => void;
  onOpenQueue: () => void;
  fx: boolean;
  fxType: VisualizerMode;
  fxLevel: number;
  fxVinyl: boolean;
}

export const NowPlayingScreen: React.FC<NowPlayingScreenProps> = ({
  isOpen,
  onClose,
  track,
  isPlaying,
  isBuffering,
  currentTime,
  duration,
  onSeek,
  onTogglePlay,
  onNext,
  onPrev,
  shuffle,
  onToggleShuffle,
  repeat,
  onCycleRepeat,
  isFavorite,
  onToggleFavorite,
  speed,
  onCycleSpeed,
  sleepLabel,
  onOpenSleepTimer,
  onOpenTrackMenu,
  onOpenQueue,
  fx,
  fxType,
  fxLevel,
  fxVinyl,
}) => {
  if (!isOpen || !track) return null;

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <section
      className="fixed inset-0 z-40 flex flex-col bg-gradient-to-b from-[#242833] via-[#1b1e26] to-[#14161c] text-[#eef0f4] p-5 pb-8 overflow-hidden select-none animate-slideUp"
      aria-label="Đang phát"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between z-10">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full flex items-center justify-center text-[#98a1b1] hover:text-white hover:bg-white/10 transition"
          aria-label="Thu nhỏ"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        <span className="text-xs uppercase font-semibold tracking-widest text-[#98a1b1]">
          Đang phát
        </span>

        <button
          onClick={onOpenTrackMenu}
          className="w-10 h-10 rounded-full flex items-center justify-center text-[#98a1b1] hover:text-white hover:bg-white/10 transition"
          aria-label="Tùy chọn"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* Album Art & Visualizer Center */}
      <div className="flex-1 relative flex items-center justify-center my-4 min-h-0">
        {/* Radial Canvas Visualizer */}
        {fx && (
          <VisualizerCanvas
            isPlaying={isPlaying}
            isBuffering={isBuffering}
            visualizerType={fxType}
            visualizerLevel={fxLevel}
            folderOrTitle={track.folder || track.title}
            isRadial={true}
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
          />
        )}

        {/* Vinyl Disc / Cover */}
        <div
          className={`relative z-10 w-[72vw] max-w-[340px] aspect-square shadow-2xl flex items-center justify-center transition-transform ${
            fxVinyl
              ? `rounded-full border-4 border-[#14161c]/80 ${
                  isPlaying ? 'animate-[spin_18s_linear_infinite]' : ''
                }`
              : 'rounded-3xl'
          }`}
          style={{ background: coverGradient(track.folder || track.title) }}
        >
          {fxVinyl && (
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,transparent_0,transparent_18%,rgba(0,0,0,0.7)_19%,transparent_20%,transparent_36%,rgba(0,0,0,0.4)_37%,transparent_38%,transparent_62%,rgba(0,0,0,0.5)_63%,transparent_64%)] pointer-events-none opacity-80" />
          )}

          {fxVinyl && (
            <div className="absolute w-14 h-14 rounded-full bg-[#14161c] border-4 border-[#ff8a3d]/80 flex items-center justify-center shadow-inner">
              <div className="w-3 h-3 rounded-full bg-white/90" />
            </div>
          )}

          {!fxVinyl && (
            <span className="text-7xl font-black text-white/90 drop-shadow-md select-none">
              {letter(track.title)}
            </span>
          )}
        </div>
      </div>

      {/* Metadata & Favorite */}
      <div className="flex items-center justify-between gap-4 z-10 px-2 mt-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-white truncate drop-shadow-sm">{track.title}</h2>
          <p className="text-sm text-[#98a1b1] truncate mt-0.5">{subline(track.artist, track.folder)}</p>
        </div>
        <button
          onClick={onToggleFavorite}
          className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-white/10 transition flex-none"
        >
          <Heart
            className={`w-6 h-6 transition-transform active:scale-125 ${
              isFavorite ? 'text-[#ff8a3d] fill-[#ff8a3d]' : 'text-[#98a1b1]'
            }`}
          />
        </button>
      </div>

      {/* Seekbar */}
      <div className="z-10 px-2 mt-5">
        <input
          type="range"
          min="0"
          max={duration > 0 ? duration : 100}
          value={currentTime}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-[#363c4a] accent-[#ff8a3d]"
          style={{
            background: `linear-gradient(to right, #ff8a3d 0%, #ff8a3d ${progressPercent}%, #363c4a ${progressPercent}%, #363c4a 100%)`,
          }}
        />
        <div className="flex justify-between text-xs font-mono text-[#98a1b1] mt-1.5">
          <span>{fmt(currentTime)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between z-10 px-2 mt-4">
        <button
          onClick={onToggleShuffle}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition ${
            shuffle ? 'text-[#ff8a3d]' : 'text-[#98a1b1] hover:text-white'
          }`}
          title="Phát ngẫu nhiên"
        >
          <Shuffle className="w-5 h-5" />
        </button>

        <button
          onClick={onPrev}
          className="w-12 h-12 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition active:scale-90"
          title="Bài trước"
        >
          <SkipBack className="w-7 h-7" />
        </button>

        <button
          onClick={onTogglePlay}
          className="w-18 h-18 rounded-full bg-gradient-to-tr from-[#ff8a3d] to-[#ff5e3a] text-[#1d1204] flex items-center justify-center shadow-lg shadow-[#ff8a3d]/30 hover:brightness-110 active:scale-95 transition"
          title={isPlaying ? 'Tạm dừng' : 'Phát'}
        >
          {isPlaying ? (
            <Pause className="w-8 h-8 fill-current" />
          ) : (
            <Play className="w-8 h-8 fill-current ml-1" />
          )}
        </button>

        <button
          onClick={onNext}
          className="w-12 h-12 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition active:scale-90"
          title="Bài sau"
        >
          <SkipForward className="w-7 h-7" />
        </button>

        <button
          onClick={onCycleRepeat}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition ${
            repeat !== 'off' ? 'text-[#ff8a3d]' : 'text-[#98a1b1] hover:text-white'
          }`}
          title="Chế độ lặp lại"
        >
          {repeat === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
        </button>
      </div>

      {/* Extra Action Chips */}
      <div className="flex items-center justify-center gap-3 z-10 mt-5">
        <button
          onClick={onCycleSpeed}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
            speed !== 1
              ? 'bg-[#ff8a3d]/20 border-[#ff8a3d] text-[#ff8a3d]'
              : 'bg-[#242833] border-[#363c4a] text-[#98a1b1] hover:text-white'
          }`}
        >
          {speed}×
        </button>

        <button
          onClick={onOpenSleepTimer}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
            sleepLabel
              ? 'bg-[#ff8a3d]/20 border-[#ff8a3d] text-[#ff8a3d]'
              : 'bg-[#242833] border-[#363c4a] text-[#98a1b1] hover:text-white'
          }`}
        >
          <Timer className="w-3.5 h-3.5" />
          <span>{sleepLabel || 'Hẹn giờ'}</span>
        </button>

        <button
          onClick={() => {
            onClose();
            onOpenQueue();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#242833] border border-[#363c4a] text-[#98a1b1] hover:text-white transition"
        >
          <ListMusic className="w-3.5 h-3.5" />
          <span>Hàng đợi</span>
        </button>
      </div>
    </section>
  );
};
