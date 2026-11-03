import React from 'react';
import { X, Film } from 'lucide-react';
import { VideoItem } from '../types';

interface VideoModalProps {
  video: VideoItem | null;
  streamUrl: string;
  onClose: () => void;
}

export const VideoModal: React.FC<VideoModalProps> = ({ video, streamUrl, onClose }) => {
  if (!video) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-[#1b1e26] border border-[#2a2f3b] text-[#eef0f4] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2f3b] bg-[#14161c]">
          <div className="flex items-center gap-2.5 min-w-0 pr-4">
            <Film className="w-5 h-5 text-[#ff8a3d] flex-none" />
            <span className="font-semibold text-sm text-white truncate">{video.name}</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#98a1b1] hover:text-white hover:bg-[#242833] transition flex-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player */}
        <div className="relative w-full bg-black flex items-center justify-center aspect-video max-h-[75vh]">
          <video
            src={streamUrl}
            controls
            autoPlay
            playsInline
            preload="metadata"
            className="w-full h-full max-h-[75vh] object-contain outline-none"
          />
        </div>

        {/* Footer info */}
        <div className="px-5 py-2.5 bg-[#14161c]/80 flex items-center justify-between text-xs text-[#98a1b1]">
          <span>Thư mục: {video.folder || 'Gốc'}</span>
          <span>Định dạng: {video.mimeType}</span>
        </div>
      </div>
    </div>
  );
};
