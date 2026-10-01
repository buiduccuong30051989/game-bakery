# Tiệm bánh của Nhím (game 4, Three.js)

Nhím (Twilight Sparkle đeo tạp dề) làm chủ tiệm bánh. Cả nhà đóng vai Equestria Girls – Ba Cường (Rainbow Dash), Mẹ Yến (Rarity), Bà Tuyết (Celestia), Ông Cương (Applejack), Bác Hanh (Luna) – cùng các bạn Pinkie, Fluttershy, Sunset và hai bé mèo Mun, Rơm lần lượt vào tiệm gọi món. Toán là **cộng và trừ trong 10** (bé đã biết đếm) gắn với hàng thật trên kệ: khách mua 2 phần thì cộng, khách mua bớt thì trừ xem kệ còn mấy, bạn mang hàng tới thì cộng thêm. Khách vui để lại ⭐, đủ sao thì tiệm được trang trí. Thiết kế: `PLAN.md`. Ghi công: `CREDITS.md` (model Equestria Girls CC BY-NC: chỉ chơi trong nhà).

## Cách chơi (bé 5 tuổi, không cần biết đọc, chỉ chạm)

- Màn đầu: thẻ **1** (cộng / trừ trong 5) hoặc **2** (trong 10, có trả xu). Cấp 2 mở sau 1 ngày cấp 1.
- **Hàng thật trên kệ**: 8 đĩa, mỗi đĩa có huy hiệu số (cấp 1: 3–5 món, cấp 2: 5–10, đầy lại mỗi ngày). Đĩa hiện tối đa 3 món, hết hàng thì trống. Khách mua thì số giảm, nhập hàng thì số tăng, giữ suốt ngày.
- Mỗi ngày 6 khách (4 người nhà + 1 bạn + 1 mèo), bài **cộng** và **trừ xen kẽ**; giữa ngày có 1 lần **nhập hàng**.
- **Bài cộng**: "Mẹ muốn mua ba cây kem và hai cây kem nữa" → thẻ `[🍦🍦🍦 3] + [🍦🍦 2] = ?` → chạm đĩa, món bay vào ngăn trái / phải của khay (đọc số, hình trên thẻ sáng dần) → 2 ngăn trượt gộp → chọn tổng → 🛎️ → khách nói "Ba cộng hai bằng năm!". Cấp 1 cùng 1 món (tổng ≤ 5, số sau 1–2), cấp 2 hai món khác nhau (≤ 10) + trả xu cũng là phép cộng (`[🍉 3 xu] + [🍊 5 xu] = ? xu`).
- **Bài trừ** ("khách mua thì kệ còn mấy"): "Kệ có bảy quả táo" (đúng số trên đĩa, 7 quả bày ra khay) → "Chào Nhím! Ba mua ba quả táo" → thẻ `[🧺 🍎×7] − [🛍️ 🍎×3] = ?` → Nhím **chạm từng món trên khay để đưa khách** (bay vào tay khách, đếm to, hình bị gạch ✕, số trên đĩa giảm) → "Còn lại mấy?" + "bảy trừ ba bằng mấy?" → chọn số → 🛎️ → "Bảy trừ ba bằng bốn!", phần còn lại về đĩa.
- **Nhập hàng** (phép cộng): 1 bạn (Pinkie / Fluttershy / Sunset, người không làm khách hôm đó) ôm thùng hàng vào, đặt lên khay: "Kệ còn bốn quả táo" (4 quả ra ngăn trái) → "Chị mang thêm ba quả táo nữa" (3 quả nhảy từ thùng ra ngăn phải) → "Bây giờ có tất cả mấy?" → chọn → hàng lên đĩa, huy hiệu đổi số. Kệ không đủ hàng cho khách thì cũng tự gọi nhập hàng.
- Chọn sai số: nút sai biến mất, đọc số vừa chọn, **món (hoặc xu) trên khay nảy lên đếm 1…N** cho bé thấy đáp án, hỏi lại; sai lần 2 nút đúng nhấp nháy. Không bao giờ thua. Chạm nhầm món: khách nghĩ ngợi "Mẹ không mua cây nấm đâu nè". Đĩa hết hàng: "Đĩa này hết hàng rồi nè!".
- Chạm chữ món = đánh vần GDPT 2018. Khách 2 và 5 (cấp 2) còn có **bảng giá mất chữ** (A2).
- **Ngồi im 10 s**: khách nhắc lại, tay 👆 chỉ đúng đĩa / món cần đưa / chuông.
- **Đóng cửa tiệm** (sau 6 khách): đếm ⭐, cả nhà khen, mở nấc trang trí (6 ⭐ hoa + rèm + cờ, 12 ⭐ đèn nháy + bóng bay, 18 ⭐ bảng hiệu + tháp bánh + sao).
- **Chạm chính xác**: chạm kệ chọn đĩa theo hình chữ nhật trên màn hình của từng đĩa (đĩa + chồng món), trùng thì lấy tâm gần nhất, trượt ra ngoài chút thì lấy đĩa gần nhất; đĩa ở tiền cảnh ưu tiên hơn món trên khay phía sau. Chạm đúng thì đĩa nảy + viền loé vàng. Soát: `node scripts/tap-matrix.mjs` (bấm tâm từng món, 4 cỡ màn, chuột + cảm ứng).

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
| `?a=3&b=2` | ép số của khách đầu (cộng: a + b; trừ: kệ có a, mua b) |
| `?round=sub` / `?round=add` | loại bài của khách đầu (sau đó xen kẽ) |
| `?restock=1` | nhập hàng ngay trước khách đầu |
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
