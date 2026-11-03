import React from 'react';
import { Timer, X, Clock, StopCircle } from 'lucide-react';
import { SleepTimerState } from '../types';
import { fmt } from '../utils/helpers';

interface SleepTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sleepState: SleepTimerState | null;
  onSetTimer: (minutes: number | 'end' | null) => void;
}

const TIMER_OPTIONS: Array<[number, string]> = [
  [15, '15 phút'],
  [30, '30 phút'],
  [45, '45 phút'],
  [60, '1 giờ'],
  [90, '1 giờ 30 phút'],
];

export const SleepTimerModal: React.FC<SleepTimerModalProps> = ({
  isOpen,
  onClose,
  sleepState,
  onSetTimer,
}) => {
  if (!isOpen) return null;

  const remainingSeconds = sleepState?.until
    ? Math.max(0, Math.round((sleepState.until - Date.now()) / 1000))
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-sm rounded-2xl bg-[#1b1e26] border border-[#2a2f3b] text-[#eef0f4] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2f3b] bg-[#14161c]/50">
          <div className="flex items-center gap-2.5">
            <Timer className="w-5 h-5 text-[#ff8a3d]" />
            <h2 className="text-base font-bold text-white">Hẹn giờ tắt nhạc</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#98a1b1] hover:text-white hover:bg-[#242833] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current status banner */}
        {sleepState && (
          <div className="px-5 py-3 bg-[#ff8a3d]/10 border-b border-[#ff8a3d]/20 text-xs text-[#ff8a3d] flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="w-4 h-4" />
              {sleepState.endOfTrack ? 'Tắt khi hết bài đang phát' : `Còn lại: ${fmt(remainingSeconds)}`}
            </span>
            <button
              onClick={() => {
                onSetTimer(null);
                onClose();
              }}
              className="text-red-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <StopCircle className="w-3.5 h-3.5" /> Hủy hẹn giờ
            </button>
          </div>
        )}

        {/* Options */}
        <div className="p-3 space-y-1">
          {TIMER_OPTIONS.map(([mins, label]) => (
            <button
              key={mins}
              onClick={() => {
                onSetTimer(mins);
                onClose();
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-[#242833] text-sm text-[#eef0f4] transition text-left"
            >
              <span>{label}</span>
              <span className="text-xs text-[#98a1b1] font-mono">+{mins}m</span>
            </button>
          ))}

          <button
            onClick={() => {
              onSetTimer('end');
              onClose();
            }}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-[#242833] text-sm text-[#eef0f4] transition text-left"
          >
            <span>Khi hết bài đang phát</span>
            <span className="text-xs text-[#ff8a3d]">Hết bài</span>
          </button>
        </div>
      </div>
    </div>
  );
};
