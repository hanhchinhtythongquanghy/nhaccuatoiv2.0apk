# Nhạc của tôi 2.0 — Google Drive riêng tư + Video + Android APK

Bản nâng cấp giữ cấu trúc thư viện nhạc cũ, bổ sung tab Video, upload file lên thư mục Drive và lớp đóng gói Capacitor cho Android.

## 1. Cách hoạt động

- **Google Drive** là kho lưu trữ file. Ứng dụng quét thư mục gốc và các thư mục con, phân loại âm thanh/video.
- **Chế độ riêng tư:** đăng nhập Google OAuth. Không cần bật chia sẻ “Bất kỳ ai có liên kết”.
- **Upload:** chọn nhiều file âm thanh/video trong Cài đặt hoặc tab Video; file được tải lên thư mục gốc đã cấu hình.
- **Phát video:** tab Video, hỗ trợ MP4/WebM/MOV/3GP tùy codec thiết bị. MKV được liệt kê nhưng không đảm bảo phát trên mọi Android.
- **Tương thích thư viện cũ:** giữ `FOLDER_ID`; cache, yêu thích, playlist và hàng đợi cũ được giữ trong localStorage. Có thể tiếp tục dùng API key + thư mục công khai cũ nếu muốn, nhưng không khuyến nghị.

## 2. Thiết lập Google Drive riêng tư

1. Vào https://console.cloud.google.com/ tạo/chọn Google Cloud project.
2. Enable **Google Drive API**.
3. Vào Google Auth Platform / OAuth consent screen, cấu hình ứng dụng. Với nhu cầu cá nhân, để chế độ External và thêm Gmail của bạn vào **Test users** khi ứng dụng còn ở trạng thái Testing.
4. Tạo OAuth Client ID loại **Web application**.
5. Thêm Authorized JavaScript origins tương ứng:
   - Website deploy: `https://TEN-MIEN-CUA-BAN`
   - Capacitor Android WebView: `http://localhost`
   - Chạy local: `http://localhost:8000`
6. Copy Client ID (dạng `xxxxx.apps.googleusercontent.com`). Không tạo hoặc nhúng Client Secret vào ứng dụng.
7. Mở ứng dụng → Cài đặt → nhập Client ID và ID thư mục Drive (đang giữ ID thư mục trong bản ZIP gốc) → Lưu → Đăng nhập Google.
8. Chấp thuận quyền Google Drive. Ứng dụng dùng quyền Drive để liệt kê, đọc và tải file lên. Không chia sẻ công khai thư mục.

**Lưu ý OAuth:** Google có thể yêu cầu cấu hình/kiểm duyệt bổ sung nếu phát hành rộng rãi cho nhiều người dùng. Với ứng dụng cá nhân, cấu hình Test users phù hợp hơn. OAuth token chỉ được giữ trong bộ nhớ phiên, không ghi vào file cấu hình.

## 3. Quản lý nhạc/video bằng máy tính

Cách đơn giản nhất: cài Google Drive for desktop, tạo hoặc dùng thư mục Drive đang cấu hình, rồi kéo thả file vào đó bằng File Explorer. Có thể sắp xếp thư mục con như `Nhac`, `Album`, `Video`. Mở ứng dụng và bấm Quét lại.

Ngoài ra, trong ứng dụng có thể mở Cài đặt → Tải nhạc/video lên hoặc vào tab Video → Thêm video. Upload hiện đặt file vào thư mục gốc đã cấu hình.

## 4. Build APK bằng Capacitor

### Yêu cầu
- Windows 10/11 64-bit
- Node.js LTS (khuyến nghị 20 hoặc 22)
- Android Studio bản ổn định
- Android SDK Platform và Build Tools (cài trong Android Studio → SDK Manager)
- JDK 17 (Android Studio thường cài kèm runtime phù hợp)

### Các bước trên Windows PowerShell

Giải nén ZIP, mở PowerShell tại thư mục `nhaccuatoi-main`:

```powershell
node -v
npm -v
npm install
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

Trong Android Studio:
1. Chờ Gradle Sync hoàn tất.
2. Chọn Build → Build Bundle(s) / APK(s) → Build APK(s).
3. Khi build thành công, chọn **locate** để lấy APK. Thường ở `android\app\build\outputs\apk\debug\app-debug.apk`.
4. Chép APK sang điện thoại Android, cho phép cài ứng dụng từ nguồn này nếu Android yêu cầu, rồi cài đặt.

Khi sửa HTML/CSS/JS lần sau:

```powershell
npm run android:sync
```

Sau đó Build APK lại trong Android Studio.

### Build APK bằng dòng lệnh

Sau khi đã cài Android Studio/SDK và tạo thư mục `android`:

```powershell
cd android
.\gradlew.bat assembleDebug
```

APK debug ở `android\app\build\outputs\apk\debug\app-debug.apk`.

## 5. Đưa ứng dụng web lên Vercel/GitHub Pages

Có thể tiếp tục deploy thư mục gốc như web tĩnh. Không đưa OAuth Client Secret, access token hoặc API key cá nhân vào `config.js`. Cấu hình Client ID trong giao diện ứng dụng. Nhớ thêm đúng domain HTTPS vào Authorized JavaScript origins trong Google Cloud.

## 6. Bảo mật — cần làm trước khi dùng

- ZIP nguồn cũ có API key Google ghi thẳng trong `config.js`. Hãy **xóa/rotate/revoke API key cũ** tại Google Cloud Console; không tái sử dụng khóa đã lộ.
- Bản mới đã xóa API key khỏi `config.js`, nhưng nếu trình duyệt cũ từng lưu key trong localStorage, vào Cài đặt → Xóa dữ liệu trên máy sau khi đã sao lưu playlist/yêu thích nếu cần.
- Không commit file chứa Client Secret hoặc OAuth access token.
- Quyền OAuth `drive` là quyền rộng vì ứng dụng cần đọc các file sẵn có trong thư mục Drive riêng tư. Chỉ đăng nhập tài khoản Google cá nhân tin cậy.

## 7. Giới hạn kỹ thuật cần biết

- APK Capacitor hiện đóng gói giao diện web hiện có; phát nhạc/video dựa trên HTML Media. Nhạc nền tùy phiên bản Android, chính sách tiết kiệm pin và vòng đời WebView. Điều khiển media native ổn định khi màn hình khóa (MediaSession/Foreground Service) là hạng mục native nâng cao cần bổ sung riêng; chưa tuyên bố là đã hoàn thiện trong bản này.
- OAuth GIS trong WebView có thể bị chính sách Google chặn tùy phiên bản/thiết bị. Nếu đăng nhập bị chặn trong APK, dùng OAuth native qua plugin Google Sign-In/Authorization và cấu hình SHA-1/package Android; không hạ bảo mật bằng cách dùng thư mục công khai.
- Video Google Drive có thể không tua mượt như CDN chuyên video; định dạng, dung lượng, quota API và giới hạn phát của Drive ảnh hưởng trải nghiệm. Khuyến nghị MP4 H.264/AAC.
- Upload hiện dùng multipart upload, phù hợp file vừa/nhỏ. Với video rất lớn hoặc mạng hay gián đoạn, cần bổ sung resumable upload và thanh tiến trình ở bước tiếp theo.
- Video được quét vào bộ nhớ phiên; playlist và yêu thích cũ vẫn chỉ lưu cục bộ từng thiết bị như phiên bản trước.
