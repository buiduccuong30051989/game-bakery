# Tiệm bánh của Nhím (game 4, Three.js)

Nhím (Twilight Sparkle đeo tạp dề) làm chủ tiệm bánh. Cả nhà đóng vai Equestria Girls – Ba Cường (Rainbow Dash), Mẹ Yến (Rarity), Bà Tuyết (Celestia), Ông Cương (Applejack), Bác Hanh (Luna) – cùng các bạn Pinkie, Fluttershy, Sunset và hai bé mèo Mun, Rơm lần lượt vào tiệm gọi món. Toán là **phép cộng trong 10** (bé đã biết đếm): mỗi khách gọi 2 phần, Nhím lấy món, cộng lại, chọn tổng, bấm chuông. Khách vui để lại ⭐, đủ sao thì tiệm được trang trí. Thiết kế: `PLAN.md`. Ghi công: `CREDITS.md` (model Equestria Girls CC BY-NC: chỉ chơi trong nhà).

## Cách chơi (bé 5 tuổi, không cần biết đọc, chỉ chạm)

- Màn đầu: thẻ **1** (cộng tới 5) hoặc **2** (cộng tới 10, trả xu). Cấp 2 mở sau 1 ngày cấp 1.
- Mỗi ngày 6 khách: 4 người nhà + 1 bạn xáo thứ tự + 1 mèo chen giữa. Chuông cửa leng keng, khách vào quầy, vẫy, nói "Chào Nhím! Mẹ muốn mua ba cây kem và hai cây kem nữa" rồi người dẫn hỏi "Ba cộng hai bằng mấy?".
- **Thẻ gọi món = phép cộng bằng hình**: `[🍦🍦🍦 3] + [🍦🍦 2] = ?`. Cấp 1 cùng 1 món (tổng ≤ 5, số sau 1–2), cấp 2 hai món khác nhau (`[🍩 bánh 2] + [🍦 kem 3]`, tổng ≤ 10). Chạm chữ món = đánh vần GDPT 2018, chữ sáng theo giọng; chạm hình = khách nhắc lại.
- **Lấy món**: chạm đĩa trên kệ → món bay vào **ngăn trái / ngăn phải** của khay (dấu ➕ ở giữa), đọc số đếm của ngăn, hình trên thẻ sáng dần, nhóm đang lấy viền hồng nhấp nháy. Chạm nhầm món: khách nghĩ ngợi, "Mẹ không mua cây nấm đâu nè" (món không bay vào). Chạm món trên khay để bỏ ra.
- Đủ 2 ngăn: 2 ngăn **trượt lại thành một hàng** → 3 nút số lớn. Chọn đúng: ô `?` thành số, khách + Nhím giơ tay mừng, "Đúng rồi! Năm. Nhím bấm chuông giao hàng nhé!". Chọn sai: nút sai biến mất, đọc số vừa chọn, **món trên khay nảy lên lần lượt đếm 1…N** cho bé thấy đáp án, hỏi lại; sai lần 2 nút đúng nhấp nháy (+ đếm lại). Không bao giờ thua.
- **🛎️** (đầu trái quầy): khách nói cả câu "Ba cộng hai bằng năm!", nhận hàng, nhảy mừng, tim bay, ⭐. Bấm chuông sớm: khách nhắc nhẹ "Mẹ cần thêm hai cây kem nữa nè".
- **Cấp 2 – trả xu cũng là phép cộng**: khách đưa xu ⭐ thành 2 nhóm theo giá từng món; bong bóng hiện `[🍉 dưa ⭐⭐⭐ 3 xu] + [🍊 cam ⭐⭐⭐⭐⭐ 5 xu] = ?`, đọc "dưa ba xu cộng cam năm xu bằng mấy xu?" → chọn số (sai thì xu nảy đếm 1..N) → xu bay vào hũ. Khách thứ 2 và 5 trong ngày còn có **bảng giá mất chữ** (A2).
- **Ngồi im 10 s**: khách nhắc lại món (khách đầu còn chỉ cách: "chạm vào món trên kệ"), tay 👆 chỉ đúng đĩa / chuông; đang chọn số thì hỏi lại + các nút nhún.
- **Đóng cửa tiệm** (sau 6 khách): đếm ⭐, cả nhà khen, mở nấc trang trí (6 ⭐ hoa + rèm + cờ, 12 ⭐ đèn nháy + bóng bay, 18 ⭐ bảng hiệu + tháp bánh + sao).

## Tiệm "sống"

- Equestria Girls không có clip: `src/eg.ts` dựng động tác theo tên xương VRoid (`J_Bip_*`), xoay theo trục khung nhân vật: hạ tay từ T-pose, đi (đùi + gối gập một chiều + vung tay + nhún), đứng thở / lắc, vẫy tay phải, giơ hai tay mừng, đưa hai tay nhận hàng, tay lên cằm nghĩ ngợi, gật đầu khi nói / khi đặt đúng món, ngó nghiêng khi chờ. Bảng tên: tên người nhà + dòng phụ vai EG ("Bà Tuyết / Celestia").
- Nhím đứng đầu phải quầy: vẫy khách mới, gật gù theo từng món, nghĩ ngợi khi bé chọn sai, giơ tay + nhảy khi đúng.
- Khách sau vào đứng chờ cạnh kệ bánh mì, ngó nghiêng, vẫy. Mun ngủ trên bậu cửa sổ, Rơm đi lang thang; chạm mèo: meo + làm trò; mèo làm khách thì nhảy lên quầy.

## Cá nhân hoá

- Ảnh thật: thả `public/family/ba-cuong.jpg`, `me-yen.jpg`, `ba-tuyet.jpg`, `ong-cuong.jpg`, `bac-hanh.jpg` (vuông ~400 px, nhận .jpg/.jpeg/.png/.webp) → bong bóng cổ vũ dùng ảnh thay emoji (vite.config.ts quét thư mục, không 404).
- Giọng thật: ghi đè `public/audio/<key>.m4a` cùng tên (key trong `scripts/audio-manifest.txt` và `scripts/audio/_gen.txt`).
- Đổi món khách hay mua / vai EG: `CUSTOMERS` trong `src/data.ts`. Phạm vi phép cộng: `LEVELS`. Đổi câu khách: `customerLines()` trong `src/lines.ts`.

## Chạy

```bash
pnpm install
pnpm exec vite --port 5183 --strictPort   # http://localhost:5183 (đang chạy nền khi giao)
pnpm dev                                  # như trên, --host để mở trên iPad cùng Wi-Fi
pnpm exec tsc --noEmit
pnpm build                                # dist/ ~55 MB (9 model EG ~5 MB mỗi cái)
bash scripts/gen-audio.sh                 # sinh clip còn thiếu (macOS, giọng Linh); FORCE=1 sinh lại hết
node scripts/word-audio.mjs --check       # soát dữ liệu (chính tả, chữ nhiễu, món khách) + đủ file audio cho mọi key
```

Đổi câu: sửa `scripts/audio-manifest.txt` (câu chung, `key|text|rate`) hoặc `src/data.ts` / `src/lines.ts` (câu sinh tự động), xoá đúng file `public/audio/<key>.m4a` cũ rồi chạy lại `gen-audio.sh` (chỉ sinh clip chưa có).

## Debug URL

| Tham số | Tác dụng |
|---|---|
| `?level=2` | vào thẳng cấp 2 (bỏ qua màn đầu; cấp chưa mở vẫn vào được) |
| `?customer=ba_cuong` | khách đầu tiên trong ngày (`ba_cuong`, `me_yen`, `ba_tuyet`, `ong_cuong`, `bac_hanh`, `pinkie`, `fluttershy`, `sunset`, `mun`, `rom`) |
| `?a=3&b=2` | ép phép cộng của khách đầu (mỗi số 1..5) |
| `?day=1` | ngày ngắn: chỉ N khách (soát nhanh "Đóng cửa tiệm") |
| `?auto=1` | tự chơi: khách đầu thử đường sai (chạm nhầm món, bấm chuông sớm, chọn sai tổng / xu / chữ 1 lần), khách sau làm đúng |
| `?mute=1` | tắt tiếng (giữ nhịp thời gian) |
| `?reset=1` | xoá tiến độ (localStorage `bakery-progress-v1`) |
| `?stars=5` | giả lập tổng sao (không lưu) – vd `?stars=5&day=1&auto=1` xem mở nấc trang trí 1 |
| `?decor=3` | xem trước 0–3 nấc trang trí (không lưu) |
| `?debug=1` | dòng trạng thái (fps, phase, khách, khay) + lộ `window.__game` trên bản build |
| `/lab.html?clip=wave&id=nhim,ba_tuyet&zoom=1` | soát nhân vật (idle / walk / wave / cheer / interact / think) |

Ví dụ: `?level=2&customer=ba_cuong&auto=1&mute=1&reset=1`, `?level=1&a=3&b=2&day=1`.

## Cấu trúc

```
src/data.ts        món (16 từ 1 tiếng + model Food Kit + chữ thiếu A2), khách (8 EG + 2 mèo) + Nhím, cấp (phạm vi cộng), nấc trang trí
src/lines.ts       sinh câu thoại: tên món, "ba quả táo", "năm xu", câu từng khách, token đánh vần (phép cộng ghép từ mảnh: n3 + cong + n2 + bang_may)
src/spell.ts       đánh vần GDPT 2018 (copy game 3)
src/game.ts        luồng ngày / khách / khay 2 ngăn / chọn tổng / chuông / xu / bảng giá / cuối ngày / tự chơi
src/shop.ts        dựng tiệm 3D + 3 nấc trang trí
src/actors.ts      lớp Actor chung + mèo (đuôi code)
src/eg.ts          khách Equestria Girls: động tác dựng bằng code theo xương J_Bip_*
src/assets.ts      tải GLB, metalness 0, đổi màu material, fit kích thước, bảng tên
src/audio.ts tween.ts magic.ts family.ts   copy/chỉnh từ game 3
src/ui.ts progress.ts main.ts lab.ts
scripts/           gen-audio.sh, audio-manifest.txt, word-audio.mjs
```

## Bản 2 (chưa làm, dữ liệu đã chừa chỗ)

- Cấp 3 thối tiền: `LEVELS[2]` (`pay: 'change'`, `enabled: false`) – thêm nhánh trong `Game.pay()`.
- Khách pony (model game 2): `CustomerDef.kind = 'pony'` – thêm dòng `CUSTOMERS` + nhánh dựng trong `makeActor()`.
