import React from 'react';
import { X, PlayCircle, ListPlus, Heart, FolderPlus, Download, Trash2, CheckCircle } from 'lucide-react';
import { Track } from '../types';
import { subline } from '../utils/helpers';
import { hasOfflineTrack, isTrackDownloading } from '../services/offlineCache';

interface TrackMenuModalProps {
  track: Track | null;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onPlayNext: (id: string) => void;
  onAddToQueue: (id: string) => void;
  onAddToPlaylist: (id: string) => void;
  onDownloadOffline: (id: string) => void;
  onRemoveOffline: (id: string) => void;
  inPlaylistId?: string | null;
  onRemoveFromPlaylist?: (trackId: string, playlistId: string) => void;
}

export const TrackMenuModal: React.FC<TrackMenuModalProps> = ({
  track,
  onClose,
  isFavorite,
  onToggleFavorite,
  onPlayNext,
  onAddToQueue,
  onAddToPlaylist,
  onDownloadOffline,
  onRemoveOffline,
  inPlaylistId,
  onRemoveFromPlaylist,
}) => {
  if (!track) return null;

  const isDownloaded = hasOfflineTrack(track.id);
  const isDownloading = isTrackDownloading(track.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-sm rounded-2xl bg-[#1b1e26] border border-[#2a2f3b] text-[#eef0f4] shadow-2xl overflow-hidden">
        {/* Header with track info */}
        <div className="px-5 py-4 border-b border-[#2a2f3b] bg-[#14161c]/50 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-sm text-white truncate">{track.title}</h3>
            <p className="text-xs text-[#98a1b1] truncate mt-0.5">{subline(track.artist, track.folder)}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#98a1b1] hover:text-white hover:bg-[#242833] transition flex-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="p-2 space-y-0.5 text-sm">
          <button
            onClick={() => {
              onPlayNext(track.id);
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#242833] text-[#eef0f4] transition text-left"
          >
            <PlayCircle className="w-5 h-5 text-[#98a1b1]" />
            <span>Phát tiếp theo</span>
          </button>

          <button
            onClick={() => {
              onAddToQueue(track.id);
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#242833] text-[#eef0f4] transition text-left"
          >
            <ListPlus className="w-5 h-5 text-[#98a1b1]" />
            <span>Thêm vào hàng đợi</span>
          </button>

          <button
            onClick={() => {
              onToggleFavorite(track.id);
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#242833] text-[#eef0f4] transition text-left"
          >
            <Heart className={`w-5 h-5 ${isFavorite ? 'text-[#ff8a3d] fill-[#ff8a3d]' : 'text-[#98a1b1]'}`} />
            <span>{isFavorite ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'}</span>
          </button>

          <button
            onClick={() => {
              onAddToPlaylist(track.id);
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#242833] text-[#eef0f4] transition text-left"
          >
            <FolderPlus className="w-5 h-5 text-[#98a1b1]" />
            <span>Thêm vào Playlist…</span>
          </button>

          {isDownloaded ? (
            <button
              onClick={() => {
                onRemoveOffline(track.id);
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#242833] text-red-400 transition text-left"
            >
              <Trash2 className="w-5 h-5" />
              <span>Xóa bản tải offline khỏi máy</span>
            </button>
          ) : (
            <button
              onClick={() => {
                onDownloadOffline(track.id);
                onClose();
              }}
              disabled={isDownloading}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#242833] text-[#eef0f4] transition text-left disabled:opacity-50"
            >
              <Download className="w-5 h-5 text-[#98a1b1]" />
              <span>{isDownloading ? 'Đang tải về máy…' : 'Tải về máy để nghe offline'}</span>
            </button>
          )}

          {inPlaylistId && onRemoveFromPlaylist && (
            <button
              onClick={() => {
                onRemoveFromPlaylist(track.id, inPlaylistId);
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-950/40 text-red-400 transition text-left"
            >
              <Trash2 className="w-5 h-5" />
              <span>Xóa khỏi playlist này</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
