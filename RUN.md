# Cách chạy: Tiệm bánh của Nhím

Game web 3D (Vite + TypeScript + Three.js) cho Nhím học đánh vần và toán. Chạy trên Mac, mở được trên iPad cùng Wi-Fi.

## Cần có

- Node.js 20 trở lên (`node -v`)
- pnpm 9 trở lên: `corepack enable` hoặc `npm i -g pnpm`
- (Chỉ khi muốn sinh lại giọng đọc) macOS có giọng tiếng Việt **Linh**: System Settings → Accessibility → Spoken Content → System Voice → Manage Voices → Vietnamese → Linh

## Chạy lần đầu

```bash
git clone https://github.com/buiduccuong30051989/game-bakery.git
cd game-bakery
pnpm install
pnpm dev
```

Mở **http://localhost:5183**, chạm thẻ cấp 1 hoặc 2 để bắt đầu (lần chạm đầu cũng mở khoá âm thanh).

## Chơi trên iPad

1. Mac và iPad cùng Wi-Fi.
2. `pnpm dev` sẽ in dòng `Network: http://192.168.x.x:5183`. Mở địa chỉ đó bằng Safari trên iPad.
3. Safari → Chia sẻ → **Thêm vào MH chính** để chạy toàn màn hình như app.
4. Nếu không có tiếng: tắt chế độ im lặng, tăng âm lượng, chạm nút bắt đầu lại.

## Cách chơi

- Khách vào gọi món. Chạm chữ trên thẻ để nghe đánh vần.
- Mỗi đĩa trên kệ có số hàng (huy hiệu số). Khách mua thì đĩa bớt đi, có bạn mang hàng tới thì đĩa thêm vào.
- Bài **cộng**: khách mua 2 phần (3 quả táo và 2 quả táo nữa) → chạm đĩa lấy món vào 2 ngăn khay → chọn tổng → chạm 🛎️.
- Bài **trừ**: "Kệ có 7 quả táo, ba mua 3 quả" → chạm món trên khay đưa cho khách → "Còn lại mấy?" chọn số → 🛎️.
- **Nhập hàng** (giữa ngày): bạn mang thùng hàng tới, kệ còn 4 thêm 3 → bây giờ có mấy?
- Chọn sai: các món nảy lên đếm 1, 2, 3… để bé thấy đáp án, rồi chọn lại. Không bao giờ thua.
- Cấp 1 cộng / trừ trong 5, cấp 2 trong 10 + trả xu. Đủ 6 khách thì đóng cửa tiệm, ⭐ mở trang trí mới.

## Lệnh khác

| Lệnh | Làm gì |
|---|---|
| `pnpm dev` | chạy bản dev, tự tải lại khi sửa code |
| `pnpm build` | build bản chạy thật ra thư mục `dist/` |
| `pnpm preview` | chạy thử bản `dist/` (http://localhost:4173) |
| `node scripts/tap-matrix.mjs` | soát chạm kệ: bấm tâm từng món ở 4 cỡ màn (chuột + cảm ứng), cần dev server + playwright-core |
| `pnpm audio` | sinh giọng đọc còn thiếu từ `scripts/audio-manifest.txt` (chỉ macOS). Đổi câu thì xoá file `public/audio/<key>.m4a` cũ rồi chạy lại |

Bản `dist/` là web tĩnh: chép lên bất kỳ host tĩnh nào (Netlify, Vercel, GitHub Pages…) là chạy.

## Ảnh và giọng gia đình

- Ảnh thật: thả ảnh vuông vào `public/family/` tên `ba-cuong.jpg`, `me-yen.jpg`, `ba-tuyet.jpg`, `ong-cuong.jpg`, `bac-hanh.jpg`. Thiếu ảnh nào thì người đó hiện emoji.
- Giọng thật: ghi âm rồi lưu đè file `.m4a` cùng tên trong `public/audio/`.

## Link nhảy nhanh (dành cho ba mẹ / soát lỗi)

- `/?reset=1`: chơi lại từ đầu
- `/?level=2`: vào thẳng cấp 2
- `/?customer=ba_tuyet`: khách đầu tiên là bà Tuyết
- `/?round=sub` / `?round=add`: khách đầu làm bài trừ / cộng; `?restock=1`: nhập hàng ngay đầu ngày
- Đầy đủ: mục debug trong `README.md`

Chi tiết cấu trúc code xem `README.md`.

## Lưu ý

Nhân vật Disney / My Little Pony trong game là model 3D do fan làm (xem `CREDITS.md`), chỉ để chơi trong nhà, không dùng thương mại.
