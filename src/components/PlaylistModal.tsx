import React, { useState } from 'react';
import { X, Plus, Folder, Check } from 'lucide-react';
import { Playlist } from '../types';

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlists: Playlist[];
  trackIdToAdd: string | null;
  onAddToPlaylist: (playlistId: string, trackId: string) => void;
  onCreatePlaylist: (name: string, trackIdToAdd?: string) => void;
}

export const PlaylistModal: React.FC<PlaylistModalProps> = ({
  isOpen,
  onClose,
  playlists,
  trackIdToAdd,
  onAddToPlaylist,
  onCreatePlaylist,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onCreatePlaylist(newTitle.trim(), trackIdToAdd || undefined);
    setNewTitle('');
    setIsCreating(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-sm rounded-2xl bg-[#1b1e26] border border-[#2a2f3b] text-[#eef0f4] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2f3b] bg-[#14161c]/50">
          <h2 className="text-base font-bold text-white">
            {trackIdToAdd ? 'Thêm vào Playlist' : 'Quản lý Playlist'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#98a1b1] hover:text-white hover:bg-[#242833] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
          {isCreating ? (
            <form onSubmit={handleCreate} className="p-2 space-y-3 bg-[#14161c] rounded-xl border border-[#2a2f3b]">
              <input
                type="text"
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Nhập tên playlist mới..."
                className="w-full px-3 py-2 rounded-lg bg-[#242833] border border-[#363c4a] text-white text-xs outline-none focus:border-[#ff8a3d]"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-[#98a1b1] hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#ff8a3d] text-[#1d1204] font-bold text-xs hover:brightness-110"
                >
                  Tạo
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#242833]/60 hover:bg-[#242833] border border-[#363c4a]/50 text-[#ff8a3d] font-medium text-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo playlist mới…</span>
            </button>
          )}

          {playlists.length === 0 && !isCreating && (
            <div className="text-center py-6 text-xs text-[#98a1b1]">
              Chưa có playlist nào. Hãy tạo playlist đầu tiên của bạn!
            </div>
          )}

          {playlists.map((pl) => {
            const hasTrack = trackIdToAdd ? pl.ids.includes(trackIdToAdd) : false;
            return (
              <button
                key={pl.id}
                onClick={() => {
                  if (trackIdToAdd) {
                    onAddToPlaylist(pl.id, trackIdToAdd);
                    onClose();
                  }
                }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-[#242833] text-sm text-[#eef0f4] transition text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Folder className="w-4 h-4 text-[#ff8a3d] flex-none" />
                  <span className="truncate">{pl.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#98a1b1] font-mono">{pl.ids.length} bài</span>
                  {hasTrack && <Check className="w-4 h-4 text-green-400" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
