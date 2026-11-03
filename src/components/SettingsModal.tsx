import React, { useState } from 'react';
import { X, Save, Key, Folder, Sparkles, HardDrive, Download, Upload, Trash2, CheckCircle, Disc } from 'lucide-react';
import { AppConfig, PlayerPrefs, Track } from '../types';
import { fmtMB, parseFolderId } from '../utils/helpers';
import { getOfflineTotalBytes, clearAllOfflineTracks, getOfflineTrackIds } from '../services/offlineCache';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  prefs: PlayerPrefs;
  onSaveConfig: (cfg: AppConfig) => void;
  onSavePrefs: (p: PlayerPrefs) => void;
  onConnectGoogle: () => void;
  onUploadMedia: () => void;
  onExportData: () => void;
  onImportData: (file: File) => void;
  onResetData: () => void;
  libraryCount: number;
  scannedAt: number;
  onOpenApkGuide: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  prefs,
  onSaveConfig,
  onSavePrefs,
  onConnectGoogle,
  onUploadMedia,
  onExportData,
  onImportData,
  onResetData,
  libraryCount,
  scannedAt,
  onOpenApkGuide,
}) => {
  const [clientId, setClientId] = useState(config.clientId);
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [folderId, setFolderId] = useState(config.folderId);
  const [nameFormat, setNameFormat] = useState(prefs.nameFormat);

  const [fx, setFx] = useState(prefs.fx);
  const [fxType, setFxType] = useState(prefs.fxType);
  const [fxLevel, setFxLevel] = useState(prefs.fxLevel);
  const [fxVinyl, setFxVinyl] = useState(prefs.fxVinyl);

  const [offAuto, setOffAuto] = useState(prefs.offAuto);
  const [offWifi, setOffWifi] = useState(prefs.offWifi);
  const [offLimit, setOffLimit] = useState(prefs.offLimit);

  if (!isOpen) return null;

  const handleSave = () => {
    const cleanedFolderId = parseFolderId(folderId);
    onSaveConfig({
      clientId: clientId.trim(),
      apiKey: apiKey.trim(),
      folderId: cleanedFolderId,
    });
    onSavePrefs({
      ...prefs,
      nameFormat,
      fx,
      fxType,
      fxLevel,
      fxVinyl,
      offAuto,
      offWifi,
      offLimit,
    });
    onClose();
  };

  const offlineBytes = getOfflineTotalBytes();
  const offlineCount = getOfflineTrackIds().size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-2xl bg-[#1b1e26] border border-[#2a2f3b] text-[#eef0f4] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2f3b] bg-[#14161c]/50">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Cài đặt ứng dụng
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#98a1b1] hover:text-white hover:bg-[#242833] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 text-sm space-y-5 scrollbar-thin">
          {/* Library Info */}
          <div className="p-3 rounded-xl bg-[#242833]/50 border border-[#363c4a]/50 text-xs text-[#98a1b1] flex items-center justify-between">
            <span>
              Thư viện: <strong className="text-white">{libraryCount} bài</strong>
              {scannedAt > 0 && ` · Quét lúc ${new Date(scannedAt).toLocaleTimeString('vi-VN')}`}
            </span>
            <button
              onClick={onOpenApkGuide}
              className="text-[#ff8a3d] hover:underline font-semibold flex items-center gap-1"
            >
              Cài đặt APK Android →
            </button>
          </div>

          {/* Google Drive Configuration */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#ff8a3d] uppercase tracking-wider flex items-center gap-1.5">
              <Folder className="w-4 h-4" /> Kết nối Google Drive
            </h3>

            <div className="space-y-1">
              <label className="text-xs text-[#98a1b1]">Google OAuth Client ID (Web Application)</label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="xxxxx.apps.googleusercontent.com"
                className="w-full px-3 py-2 rounded-xl bg-[#14161c] border border-[#2a2f3b] text-white text-xs font-mono outline-none focus:border-[#ff8a3d]"
              />
              <p className="text-[11px] text-[#98a1b1]">
                Dùng để truy cập Google Drive riêng tư mà không cần chia sẻ công khai.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-[#98a1b1]">Google Drive Folder ID hoặc Link thư mục</label>
              <input
                type="text"
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                className="w-full px-3 py-2 rounded-xl bg-[#14161c] border border-[#2a2f3b] text-white text-xs font-mono outline-none focus:border-[#ff8a3d]"
              />
              <p className="text-[11px] text-[#98a1b1]">
                ID thư mục hiện tại: <code className="text-[#ff8a3d]">{parseFolderId(folderId) || 'chưa nhập'}</code>
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-[#98a1b1]">Google API Key (Tùy chọn cho thư mục công khai cũ)</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Để trống nếu đã dùng OAuth riêng tư"
                className="w-full px-3 py-2 rounded-xl bg-[#14161c] border border-[#2a2f3b] text-white text-xs font-mono outline-none focus:border-[#ff8a3d]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onConnectGoogle}
                className="px-3.5 py-1.5 rounded-xl bg-[#242833] hover:bg-[#363c4a] text-white text-xs font-medium border border-[#363c4a] transition"
              >
                Đăng nhập Google Drive
              </button>
              <button
                type="button"
                onClick={onUploadMedia}
                className="px-3.5 py-1.5 rounded-xl bg-[#242833] hover:bg-[#363c4a] text-white text-xs font-medium border border-[#363c4a] transition"
              >
                Tải nhạc / video lên Drive
              </button>
            </div>
          </div>

          <div className="h-px bg-[#2a2f3b]" />

          {/* Name Format */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-[#ff8a3d] uppercase tracking-wider">
              Quy tắc đọc tên bài hát
            </h3>
            <select
              value={nameFormat}
              onChange={(e) => setNameFormat(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-[#14161c] border border-[#2a2f3b] text-white text-xs outline-none focus:border-[#ff8a3d]"
            >
              <option value="title-artist">Tên bài - Ca sĩ (Ví dụ: "Em Gái Mưa - Hương Tràm.mp3")</option>
              <option value="artist-title">Ca sĩ - Tên bài (Ví dụ: "Hương Tràm - Em Gái Mưa.mp3")</option>
            </select>
          </div>

          <div className="h-px bg-[#2a2f3b]" />

          {/* Offline Listening */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#ff8a3d] uppercase tracking-wider flex items-center gap-1.5">
              <HardDrive className="w-4 h-4" /> Nghe nhạc ngoại tuyến (Offline)
            </h3>

            <label className="flex items-center gap-2 text-xs text-[#eef0f4] cursor-pointer">
              <input
                type="checkbox"
                checked={offAuto}
                onChange={(e) => setOffAuto(e.target.checked)}
                className="w-4 h-4 rounded accent-[#ff8a3d]"
              />
              Tự động lưu bài hát về máy khi nghe
            </label>

            <label className="flex items-center gap-2 text-xs text-[#eef0f4] cursor-pointer">
              <input
                type="checkbox"
                checked={offWifi}
                onChange={(e) => setOffWifi(e.target.checked)}
                className="w-4 h-4 rounded accent-[#ff8a3d]"
              />
              Chỉ tự động lưu khi kết nối Wi-Fi (tiết kiệm 4G/5G)
            </label>

            <div className="space-y-1">
              <label className="text-xs text-[#98a1b1]">Giới hạn dung lượng lưu trữ trên máy</label>
              <select
                value={offLimit}
                onChange={(e) => setOffLimit(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-[#14161c] border border-[#2a2f3b] text-white text-xs outline-none focus:border-[#ff8a3d]"
              >
                <option value={512}>512 MB</option>
                <option value={1024}>1 GB</option>
                <option value={2048}>2 GB (Khuyên dùng)</option>
                <option value={5120}>5 GB</option>
                <option value={0}>Không giới hạn</option>
              </select>
            </div>

            <div className="flex items-center justify-between text-xs text-[#98a1b1] p-2.5 rounded-xl bg-[#14161c]">
              <span>
                Đang lưu trữ: <strong className="text-white">{offlineCount} bài</strong> ({fmtMB(offlineBytes)})
              </span>
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm('Bạn có chắc muốn xóa tất cả các bài đã tải về máy?')) {
                    await clearAllOfflineTracks();
                  }
                }}
                className="text-red-400 hover:underline flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Xóa tất cả bản tải
              </button>
            </div>
          </div>

          <div className="h-px bg-[#2a2f3b]" />

          {/* Visualizer Effects */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#ff8a3d] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Hiệu ứng thị giác & Visualizer
            </h3>

            <label className="flex items-center gap-2 text-xs text-[#eef0f4] cursor-pointer">
              <input
                type="checkbox"
                checked={fx}
                onChange={(e) => setFx(e.target.checked)}
                className="w-4 h-4 rounded accent-[#ff8a3d]"
              />
              Bật hiệu ứng Visualizer khi phát nhạc
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-[#98a1b1]">Kiểu hiệu ứng</label>
                <select
                  value={fxType}
                  onChange={(e) => setFxType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-[#14161c] border border-[#2a2f3b] text-white text-xs outline-none focus:border-[#ff8a3d]"
                >
                  <option value="bars">Cột sóng Equalizer</option>
                  <option value="wave">Đường lượn sóng</option>
                  <option value="pulse">Vòng sáng đập nhịp</option>
                  <option value="aurora">Cực quang (Aurora)</option>
                  <option value="particles">Hạt sao bay</option>
                  <option value="random">Ngẫu nhiên mỗi bài</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-[#98a1b1]">Cường độ nhịp</label>
                <select
                  value={fxLevel}
                  onChange={(e) => setFxLevel(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#14161c] border border-[#2a2f3b] text-white text-xs outline-none focus:border-[#ff8a3d]"
                >
                  <option value={1}>Nhẹ</option>
                  <option value={2}>Vừa (Mặc định)</option>
                  <option value={3}>Mạnh</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-[#eef0f4] cursor-pointer">
              <input
                type="checkbox"
                checked={fxVinyl}
                onChange={(e) => setFxVinyl(e.target.checked)}
                className="w-4 h-4 rounded accent-[#ff8a3d]"
              />
              Bìa xoay tròn như đĩa than trên màn hình Đang phát
            </label>
          </div>

          <div className="h-px bg-[#2a2f3b]" />

          {/* Backup & Reset */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-[#ff8a3d] uppercase tracking-wider">
              Sao lưu & Đồng bộ
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onExportData}
                className="px-3.5 py-1.5 rounded-xl bg-[#242833] hover:bg-[#363c4a] text-white text-xs font-medium border border-[#363c4a] flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" /> Xuất Yêu thích / Playlist (JSON)
              </button>

              <label className="px-3.5 py-1.5 rounded-xl bg-[#242833] hover:bg-[#363c4a] text-white text-xs font-medium border border-[#363c4a] flex items-center gap-1.5 cursor-pointer transition">
                <Upload className="w-3.5 h-3.5" /> Nhập dữ liệu
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onImportData(f);
                  }}
                />
              </label>

              <button
                type="button"
                onClick={onResetData}
                className="px-3.5 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 text-xs font-medium border border-red-800/40 flex items-center gap-1.5 transition ml-auto"
              >
                <Trash2 className="w-3.5 h-3.5" /> Xóa bộ nhớ cục bộ
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#2a2f3b] bg-[#14161c]/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#242833] text-[#98a1b1] hover:text-white transition text-xs font-medium"
          >
            Đóng
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-[#ff8a3d] to-[#ff5e3a] text-[#1d1204] font-bold text-xs shadow-md shadow-[#ff8a3d]/20 hover:brightness-110 active:scale-95 transition"
          >
            <Save className="w-4 h-4" /> Lưu & Quét lại
          </button>
        </div>
      </div>
    </div>
  );
};
