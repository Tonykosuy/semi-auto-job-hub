# Semi-Auto Job Hub

Hệ thống thu thập tin tuyển dụng, quản lý danh sách ứng tuyển qua giao diện web, và gửi email ứng tuyển hàng loạt bán tự động qua Gmail SMTP kèm CV PDF (Việt/Anh).

## Cấu trúc chính

- `scraper.py` — Thu thập, phân loại và xuất dữ liệu việc làm ra `data/jobs_data.json` và `data/jobs_data.js`.
- `bulk_mailer.py` — Local HTTP Server phục vụ giao diện web (`index.html`, `styles.css`, `app.js`) và cung cấp API:
  - `GET /api/health` — Kiểm tra trạng thái server và file CV PDF trong `assets/`.
  - `POST /api/bulk-send` — Gửi email ứng tuyển theo chế độ `dry_run`, `test_self`, hoặc `live` qua Gmail SMTP (`smtp.gmail.com:587`) với tùy chọn đính kèm `CV_Phuc_Nguyen_VI.pdf` / `CV_Phuc_Nguyen_EN.pdf`.
- `index.html`, `styles.css`, `app.js` — Giao diện quản lý việc làm và điều phối gửi mail.
- `assets/` — CV PDF/PNG, ảnh đại diện, mã QR portfolio và icon ngành nghề.
- `data/` — Dữ liệu việc làm đã thu thập (`jobs_data.json`, `jobs_data.js`).

## Cách chạy

1. **Cập nhật dữ liệu việc làm:**
   ```bash
   python scraper.py
   ```
2. **Khởi động server & giao diện Web UI:**
   ```bash
   python bulk_mailer.py --port 8787
   ```
   Sau đó mở trình duyệt tại `http://127.0.0.1:8787`.
