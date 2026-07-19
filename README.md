# ♔ ChessLouis

Web chơi cờ vua trực tuyến theo thời gian thực, xây bằng HTML/CSS/JavaScript thuần (ES Modules) và **Firebase** (Authentication + Firestore).

## Tính năng

- **Đấu cờ realtime**: tạo phòng / vào phòng bằng mã 6 ký tự hoặc liên kết mời, đồng bộ nước đi tức thời qua Firestore.
- **Đồng hồ thi đấu**: chọn 5 / 10 / 15 phút mỗi bên, tự động xử lý hết giờ.
- **Trò chuyện trong phòng**, đầu hàng, đề nghị hòa.
- **Hệ thống Elo** (K=32) cập nhật tự động sau mỗi ván, lưu lịch sử vào `matches`.
- **Danh hiệu theo Elo** (phong cách tu tiên): Phàm Nhân → Luyện Khí → Trúc Cơ → Kim Đan → Nguyên Anh → Hóa Thần → Luyện Hư → Hợp Thể → Đại Thừa → **Hư Vô Chi Chủ**, hiển thị ngay cạnh tên người chơi.
- **Nhà sáng lập / Quản trị viên**: tài khoản có tên đăng nhập `hieulouis` tự động nhận danh hiệu **"Nhà Sáng Lập"** và quyền truy cập trang `/pages/admin.html` (quản lý người chơi, khóa/mở khóa tài khoản, reset Elo, tạo & xóa giải đấu).
- **Bảng xếp hạng**, **lịch sử đấu**, **trang cài đặt** (đổi mật khẩu), **giải đấu** (đăng ký/rời giải).
- Giao diện tối màu – vàng kim, tối ưu responsive cho cả máy tính và điện thoại (menu rút gọn trên di động).

## Cấu trúc thư mục

```
ChessLouis/
├── index.html            Trang chủ
├── 404.html               Trang lỗi
├── favicon.svg, manifest.json, robots.txt, sitemap.xml
├── css/                   Toàn bộ style (biến màu, reset, navbar, bàn cờ, hồ sơ, xếp hạng, quản trị...)
├── js/
│   ├── firebase.js        Khởi tạo Firebase dùng chung (auth, db)
│   ├── utils.js            Hàm tiện ích + hệ thống danh hiệu theo Elo
│   ├── router.js            Bảo vệ trang theo trạng thái đăng nhập / quyền admin
│   ├── app.js               Thanh điều hướng, trạng thái đăng nhập chung mọi trang
│   ├── notification.js      Toast thông báo & hộp thoại xác nhận (thay cho alert/confirm)
│   ├── auth.js               Đăng ký / đăng nhập
│   ├── chess.js               Bộ điều khiển hiển thị bàn cờ (dùng thư viện chess.js)
│   ├── room.js                 Điều khiển phòng chơi realtime + elo + kết thúc ván
│   ├── timer.js                 Đồng hồ thi đấu
│   ├── chat.js                   Trò chuyện trong phòng
│   ├── elo.js                     Tính điểm Elo
│   ├── profile.js, ranking.js, history.js, settings.js, admin.js, tournament.js
├── pages/                 Toàn bộ trang con (login, register, play, profile, ranking, history, settings, tournament, admin)
├── images/logo/            Icon PWA
└── firebase/
    ├── config.js            Cấu hình Firebase project
    ├── rules.txt             Firestore Security Rules (dán vào Firebase Console)
    └── indexes.json           Chỉ mục Firestore cần tạo
```

## Cần làm khi triển khai

1. **Deploy Firestore Rules**: copy nội dung `firebase/rules.txt` vào Firebase Console → Firestore Database → Rules (hoặc dùng `firebase deploy --only firestore:rules` với file `firestore.rules`).
2. **Tạo chỉ mục Firestore**: theo `firebase/indexes.json`, hoặc để Firestore tự gợi ý link tạo index khi console báo lỗi truy vấn lần đầu.
3. **Bật Email/Password Authentication** trong Firebase Console → Authentication → Sign-in method.
4. Đăng ký một tài khoản với tên người dùng chính xác `hieulouis` để nhận quyền quản trị.

## Mô hình dữ liệu Firestore

- `users/{uid}`: username, email, avatar, elo, wins, losses, draws, role, banned
- `rooms/{code}`: trạng thái phòng, fen, lượt đi, thời gian còn lại mỗi bên, kết quả
- `rooms/{code}/messages/{id}`: tin nhắn trong phòng
- `matches/{id}`: lịch sử ván đấu đã kết thúc
- `tournaments/{id}`: giải đấu, danh sách người đăng ký
