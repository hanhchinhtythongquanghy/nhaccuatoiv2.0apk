import React, { useState } from 'react';
import { Smartphone, Download, CheckCircle, Terminal, Github, Globe, X, Copy, ExternalLink, Sparkles } from 'lucide-react';

interface ApkGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstallPwa: () => void;
  isInstallable: boolean;
  isInstalled: boolean;
}

export const ApkGuideModal: React.FC<ApkGuideModalProps> = ({
  isOpen,
  onClose,
  onInstallPwa,
  isInstallable,
  isInstalled,
}) => {
  const [activeTab, setActiveTab] = useState<'pwa' | 'github' | 'pwabuilder' | 'capacitor'>('pwa');
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyCode = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const appUrl = window.location.origin;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-[#1b1e26] border border-[#2a2f3b] text-[#eef0f4] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2f3b] bg-[#14161c]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#ff8a3d] to-[#ff4520] flex items-center justify-center text-[#1d1204] shadow-md shadow-[#ff8a3d]/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Đóng gói & Cài đặt App APK cho Android
              </h2>
              <p className="text-xs text-[#98a1b1]">
                Chọn phương thức phù hợp nhất để cài đặt hoặc tạo file .apk
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#98a1b1] hover:text-white hover:bg-[#242833] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-[#2a2f3b] bg-[#14161c]/30 px-3 pt-2 gap-1 overflow-x-auto text-sm scrollbar-none">
          <button
            onClick={() => setActiveTab('pwa')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-xl font-medium transition border-b-2 whitespace-nowrap ${
              activeTab === 'pwa'
                ? 'border-[#ff8a3d] text-[#ff8a3d] bg-[#242833]/60'
                : 'border-transparent text-[#98a1b1] hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            1. Cài trực tiếp (WebAPK)
            <span className="text-[10px] bg-[#ff8a3d]/20 text-[#ff8a3d] px-1.5 py-0.5 rounded-full font-semibold">
              Khuyên dùng
            </span>
          </button>
          <button
            onClick={() => setActiveTab('github')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-xl font-medium transition border-b-2 whitespace-nowrap ${
              activeTab === 'github'
                ? 'border-[#ff8a3d] text-[#ff8a3d] bg-[#242833]/60'
                : 'border-transparent text-[#98a1b1] hover:text-white'
            }`}
          >
            <Github className="w-4 h-4" />
            2. Build APK với GitHub
          </button>
          <button
            onClick={() => setActiveTab('pwabuilder')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-xl font-medium transition border-b-2 whitespace-nowrap ${
              activeTab === 'pwabuilder'
                ? 'border-[#ff8a3d] text-[#ff8a3d] bg-[#242833]/60'
                : 'border-transparent text-[#98a1b1] hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4" />
            3. PWABuilder (1-Click)
          </button>
          <button
            onClick={() => setActiveTab('capacitor')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-xl font-medium transition border-b-2 whitespace-nowrap ${
              activeTab === 'capacitor'
                ? 'border-[#ff8a3d] text-[#ff8a3d] bg-[#242833]/60'
                : 'border-transparent text-[#98a1b1] hover:text-white'
            }`}
          >
            <Terminal className="w-4 h-4" />
            4. Capacitor Local
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5 text-sm space-y-4">
          {activeTab === 'pwa' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-xl bg-[#242833]/60 border border-[#363c4a]/50">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-green-500/20 text-green-400 mt-0.5">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-base">
                      Cài đặt thành WebAPK trên Android (Không cần máy tính hay Android Studio)
                    </h3>
                    <p className="text-[#98a1b1] text-xs mt-1 leading-relaxed">
                      Android (Chrome/Edge/Samsung Internet) sẽ tự động biên dịch ứng dụng này thành một{' '}
                      <strong className="text-white">file APK hệ thống (WebAPK)</strong> ngay trên điện thoại:
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-[#eef0f4] list-disc list-inside">
                      <li>Có biểu tượng ứng dụng riêng ngoài màn hình chính và danh sách app Android.</li>
                      <li>Mở toàn màn hình độc lập (không có thanh địa chỉ trình duyệt).</li>
                      <li>Phát nhạc offline không cần mạng từ bộ nhớ Cache.</li>
                      <li>Điều khiển nhạc ngay trên màn hình khóa và thanh thông báo.</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#363c4a]/50 flex flex-wrap items-center gap-3">
                  {isInstalled ? (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-900/40 border border-green-700/50 text-green-300 font-medium text-xs">
                      <CheckCircle className="w-4 h-4" /> Đã cài đặt trên thiết bị này!
                    </div>
                  ) : isInstallable ? (
                    <button
                      onClick={() => {
                        onInstallPwa();
                        onClose();
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ff8a3d] to-[#ff5e3a] text-[#1d1204] font-bold text-sm shadow-lg shadow-[#ff8a3d]/25 hover:brightness-110 active:scale-95 transition"
                    >
                      <Download className="w-4 h-4" /> Cài đặt ứng dụng ngay
                    </button>
                  ) : (
                    <div className="text-xs text-[#98a1b1]">
                      Mở link này trên trình duyệt điện thoại Android (Chrome) → Bấm menu{' '}
                      <strong className="text-white">⋮</strong> → Chọn{' '}
                      <strong className="text-[#ff8a3d]">“Cài đặt ứng dụng”</strong> hoặc{' '}
                      <strong className="text-[#ff8a3d]">“Thêm vào màn hình chính”</strong>.
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#14161c] border border-[#2a2f3b] space-y-2">
                <h4 className="font-semibold text-xs text-white uppercase tracking-wider">
                  Đường dẫn ứng dụng để mở trên điện thoại:
                </h4>
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#242833] font-mono text-xs text-[#ff8a3d] break-all">
                  <span>{appUrl}</span>
                  <button
                    onClick={() => copyCode(appUrl, 'url')}
                    className="flex-none p-1.5 rounded-md hover:bg-[#363c4a] text-[#98a1b1] hover:text-white transition"
                    title="Sao chép liên kết"
                  >
                    {copied === 'url' ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'github' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-xl bg-[#242833]/60 border border-[#363c4a]/50 space-y-2">
                <h3 className="font-semibold text-white text-base flex items-center gap-2">
                  <Github className="w-5 h-5 text-[#ff8a3d]" />
                  Tự động build file .apk miễn phí qua GitHub Actions
                </h3>
                <p className="text-xs text-[#98a1b1] leading-relaxed">
                  Tôi đã tạo sẵn file quy trình tự động tại{' '}
                  <code className="text-[#ff8a3d] font-mono">.github/workflows/build-apk.yml</code>. Bạn chỉ cần đưa mã
                  nguồn lên một kho GitHub (Private hoặc Public), GitHub sẽ tự động biên dịch ra file{' '}
                  <strong className="text-white">nhac-cua-toi-debug-apk</strong> trong 2 phút!
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-xs text-white uppercase tracking-wider">
                  Các bước thực hiện:
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-xs text-[#eef0f4] bg-[#14161c] p-4 rounded-xl border border-[#2a2f3b]">
                  <li>
                    Tạo một Repository mới trên{' '}
                    <a
                      href="https://github.com/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#ff8a3d] hover:underline inline-flex items-center gap-1"
                    >
                      github.com/new <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>Tải toàn bộ mã nguồn của dự án này về và push lên repo của bạn.</li>
                  <li>
                    Vào tab <strong className="text-white">Actions</strong> trên GitHub → Bạn sẽ thấy job{' '}
                    <strong className="text-white">Build Android APK (Debug)</strong> đang chạy.
                  </li>
                  <li>
                    Khi chạy xong (khoảng 2 phút), cuộn xuống mục <strong className="text-[#ff8a3d]">Artifacts</strong>{' '}
                    để tải file <strong className="text-white">nhac-cua-toi-debug-apk.zip</strong> chứa file{' '}
                    <strong className="text-white">app-debug.apk</strong> cài vào điện thoại!
                  </li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'pwabuilder' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-xl bg-[#242833]/60 border border-[#363c4a]/50 space-y-2">
                <h3 className="font-semibold text-white text-base flex items-center gap-2">
                  <Globe className="w-5 h-5 text-[#ff8a3d]" />
                  Tạo file APK / AAB với PWABuilder (Microsoft)
                </h3>
                <p className="text-xs text-[#98a1b1] leading-relaxed">
                  PWABuilder là công cụ trực tuyến miễn phí của Microsoft giúp chuyển đổi PWA đã triển khai thành file APK
                  và AAB chuẩn Google Play Store mà không cần cài đặt bất kỳ công cụ nào trên máy tính.
                </p>
              </div>

              <ol className="list-decimal list-inside space-y-2 text-xs text-[#eef0f4] bg-[#14161c] p-4 rounded-xl border border-[#2a2f3b]">
                <li>
                  Truy cập{' '}
                  <a
                    href="https://www.pwabuilder.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#ff8a3d] hover:underline inline-flex items-center gap-1"
                  >
                    pwabuilder.com <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  Dán đường dẫn URL của ứng dụng này vào ô tìm kiếm và bấm <strong className="text-white">Start</strong>.
                </li>
                <li>
                  Bấm <strong className="text-white">Package for Stores</strong> → Chọn{' '}
                  <strong className="text-[#ff8a3d]">Android</strong>.
                </li>
                <li>
                  Tải file APK trực tiếp về máy để cài đặt lên bất kỳ thiết bị Android nào!
                </li>
              </ol>
            </div>
          )}

          {activeTab === 'capacitor' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-xl bg-[#242833]/60 border border-[#363c4a]/50 space-y-2">
                <h3 className="font-semibold text-white text-base flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-[#ff8a3d]" />
                  Tự build bằng Capacitor & Android Studio trên máy tính
                </h3>
                <p className="text-xs text-[#98a1b1] leading-relaxed">
                  Dự án đã được cấu hình sẵn file <code className="text-[#ff8a3d]">capacitor.config.json</code> và thư viện{' '}
                  <code className="text-white">@capacitor/android</code>.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-[#98a1b1]">
                  <span>Lệnh chạy trên terminal máy tính (PowerShell / macOS / Linux):</span>
                  <button
                    onClick={() =>
                      copyCode(
                        `npm install\nnpm run build\nnpx cap add android\nnpx cap sync android\nnpx cap open android`,
                        'cli'
                      )
                    }
                    className="flex items-center gap-1 text-[#ff8a3d] hover:underline"
                  >
                    {copied === 'cli' ? 'Đã sao chép!' : 'Sao chép lệnh'}
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-[#14161c] border border-[#2a2f3b] font-mono text-xs text-green-400 overflow-x-auto">
{`# 1. Cài đặt dependencies và build web
npm install
npm run build

# 2. Thêm nền tảng Android & đồng bộ
npx cap add android
npx cap sync android

# 3. Mở Android Studio để bấm "Build APK"
npx cap open android`}
                </pre>
              </div>

              <div className="p-3 rounded-xl bg-[#14161c] border border-[#2a2f3b] text-xs text-[#98a1b1] space-y-1">
                <p>
                  Trong Android Studio: Chọn menu <strong className="text-white">Build</strong> →{' '}
                  <strong className="text-white">Build Bundle(s) / APK(s)</strong> →{' '}
                  <strong className="text-[#ff8a3d]">Build APK(s)</strong>.
                </p>
                <p>
                  File APK sau khi tạo nằm tại:{' '}
                  <code className="text-white">android/app/build/outputs/apk/debug/app-debug.apk</code>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#2a2f3b] bg-[#14161c]/50 text-xs text-[#98a1b1]">
          <span>App ID: com.nhaccuatoi.musicplayer</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#242833] text-white hover:bg-[#363c4a] transition font-medium"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
