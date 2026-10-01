# Tiệm bánh của Nhím (game 4, Three.js)

Nhím làm chủ tiệm bánh. Cả nhà (Ba Cường, Mẹ Yến, Bà Tuyết, Ông Cương, Bác Hanh) và hai bé mèo Mun, Rơm lần lượt vào tiệm gọi món. Nhím nghe – nhìn thẻ gọi món – chạm món trên kệ cho đủ số – bấm chuông giao hàng; cấp 2 còn đếm xu ngôi sao và điền chữ thiếu trên bảng giá. Khách vui thì để lại ⭐, đủ sao thì tiệm được trang trí thêm. Thiết kế: `PLAN.md` (bản 1). Ghi công: `CREDITS.md`.

## Cách chơi (bé 5 tuổi, không cần biết đọc, chỉ chạm)

- Màn đầu: chạm thẻ **1** (🍎 đếm món) hoặc **2** (⭐ đếm xu). Cấp 2 mở sau khi đóng cửa 1 ngày ở cấp 1 (chạm thẻ 2 khi còn khoá: nghe nhắc).
- Mỗi ngày 6 khách: 5 người nhà xáo thứ tự + 1 mèo chen giữa. Chuông cửa leng keng, khách đi vào quầy, vẫy, nói "Chào Nhím! Bà muốn mua ba quả táo".
- **Thẻ gọi món** (bong bóng cạnh đầu khách): hình + chữ + ×N. Chạm **chữ** = đánh vần GDPT 2018, chữ sáng theo giọng. Chạm **hình** = khách nhắc lại món. Cấp 1 có hàng chấm hình sáng dần khi đặt đúng món; cấp 2 chỉ hiện số đang có trên khay (🧺 N).
- **Lấy món**: chạm đĩa trên kệ (2 hàng × 4 đĩa) → món bay theo cung vào khay, đọc số đếm (món đúng) hoặc tên món (món khác). Khay 2 bậc: món thứ 6–10 lên bậc sau, không che nhau. Chạm món trên khay để bỏ ra.
- **🛎️ Giao hàng**: khách kiểm khay. Nhầm món: "Ơ, Bà không mua quả lê đâu nè…"; thiếu: "Bà cần thêm một quả táo nữa nè"; dư: "nhiều quá rồi… Bà chỉ cần ba quả táo thôi nè". Không bao giờ phạt; nhắc lần 2 trở đi có tay 👆 chỉ đúng chỗ.
- **Cấp 2 – trả tiền**: 1 món = 1 xu ⭐. Khách đưa N xu lên khay, "Mỗi quả một xu. Nhím chạm vào từng xu để đếm nhé" → mỗi xu bay vào hũ, đọc số → chọn "Có tất cả mấy xu?" (3 số). Khách 1, 3, 5 trong ngày còn có **bảng giá mất chữ** (A2): chọn 1 trong 3 chữ, đúng thì đánh vần cả từ và bảng phấn trên tường ghi lại.
- Chọn sai (số / chữ): lần 1 nút sai biến mất + nghe âm của nút đó + hỏi lại; lần 2 nút đúng nhấp nháy.
- **Khách vui**: nhảy, tim bay, pháo giấy, ⭐ bay lên góc phải; khách 2 và 4 có người nhà cổ vũ (ảnh / emoji). Khách chào rồi ra cửa (khách sau đã vào đứng chờ cạnh kệ bánh mì, ngó nghiêng, vẫy Nhím).
- **Ngồi im 10 s**: khách nhắc lại món + vẫy, tay 👆 chỉ đúng việc cần làm (món trên kệ / món thừa trên khay / chuông / xu chưa đếm).
- **Đóng cửa tiệm** (sau 6 khách): biển "Đóng cửa" lật trên cửa, đếm ⭐ trong ngày, cả nhà lần lượt khen. Đủ mốc sao thì bảng tổng kết tạm ẩn để Nhím thấy tiệm đổi:
  1. 6 ⭐: rèm hồng, dây cờ, chậu hoa tulip trên quầy.
  2. 12 ⭐: đèn nháy viền cửa sổ + viền kệ, bóng bay đung đưa.
  3. 18 ⭐: bảng hiệu "Tiệm bánh Nhím", tháp bánh kem, dây sao.
- 🔊 góc phải: nghe lại câu đang hỏi. 🏠: về màn đầu.

## Tiệm "sống"

- Đèn treo đung đưa, chuông cửa lắc khi có khách, nắng qua cửa sổ nhìn ra phố.
- Mun ngủ trên bậu cửa sổ (thở, đuôi phe phẩy, zz), thỉnh thoảng thức dậy ngó ra phố rồi ngủ tiếp. Rơm đi lang thang, thỉnh thoảng múa / nhảy. Chạm mèo: meo + làm trò. Khi mèo là khách: Mun nhảy xuống bậu, đi tới quầy rồi nhảy lên quầy; xong thì về chỗ.
- Khách: Walk / Wave / Interact (Quaternius), gật đầu khi nói và khi Nhím đặt đúng món, nghiêng đầu khi kiểm khay, nhảy mừng khi đủ. Mỗi người một dáng riêng: màu áo / tóc + kính, mũ, búi tóc, nơ, kẹp hoa + bảng tên.

## Cá nhân hoá

- Ảnh thật: thả `public/family/ba-cuong.jpg`, `me-yen.jpg`, `ba-tuyet.jpg`, `ong-cuong.jpg`, `bac-hanh.jpg` (vuông ~400 px, nhận .jpg/.jpeg/.png/.webp) → bong bóng cổ vũ dùng ảnh thay emoji (vite.config.ts quét thư mục, không 404).
- Giọng thật: ghi đè `public/audio/<key>.m4a` cùng tên (key trong `scripts/audio-manifest.txt` và `scripts/audio/_gen.txt`).
- Đổi món khách hay mua / màu áo / phụ kiện: `CUSTOMERS` trong `src/data.ts`. Đổi câu khách: `customerLines()` trong `src/lines.ts`.

## Chạy

```bash
pnpm install
pnpm exec vite --port 5183 --strictPort   # http://localhost:5183 (đang chạy nền khi giao)
pnpm dev                                  # như trên, --host để mở trên iPad cùng Wi-Fi
pnpm exec tsc --noEmit
pnpm build                                # dist/ ~19 MB
bash scripts/gen-audio.sh                 # sinh clip còn thiếu (macOS, giọng Linh); FORCE=1 sinh lại hết
node scripts/word-audio.mjs --check       # soát dữ liệu (chính tả, chữ nhiễu, món khách) + đủ file audio cho mọi key
```

Đổi câu: sửa `scripts/audio-manifest.txt` (câu chung, `key|text|rate`) hoặc `src/data.ts` / `src/lines.ts` (câu sinh tự động), xoá đúng file `public/audio/<key>.m4a` cũ rồi chạy lại `gen-audio.sh` (chỉ sinh clip chưa có).

## Debug URL

| Tham số | Tác dụng |
|---|---|
| `?level=2` | vào thẳng cấp 2 (bỏ qua màn đầu; cấp chưa mở vẫn vào được) |
| `?customer=ba_cuong` | khách đầu tiên trong ngày (`ba_cuong`, `me_yen`, `ba_tuyet`, `ong_cuong`, `bac_hanh`, `mun`, `rom`) |
| `?n=8` | ép số món khách đầu gọi (soát khay 2 bậc) |
| `?day=1` | ngày ngắn: chỉ N khách (soát nhanh "Đóng cửa tiệm") |
| `?auto=1` | tự chơi: khách đầu thử đủ đường sai (nhầm món → thiếu → dư, chọn sai số / chữ 1 lần), khách sau làm đúng |
| `?mute=1` | tắt tiếng (giữ nhịp thời gian) |
| `?reset=1` | xoá tiến độ (localStorage `bakery-progress-v1`) |
| `?stars=5` | giả lập tổng sao (không lưu) – vd `?stars=5&day=1&auto=1` xem mở nấc trang trí 1 |
| `?decor=3` | xem trước 0–3 nấc trang trí (không lưu) |
| `?debug=1` | dòng trạng thái (fps, phase, khách, khay) + lộ `window.__game` trên bản build |
| `/lab.html?clip=wave&id=ba_tuyet,ong_cuong&zoom=1` | soát ngoại hình khách (clip idle / walk / wave / interact) |

Ví dụ: `?level=2&customer=ba_cuong&auto=1&mute=1&reset=1`.

## Cấu trúc

```
src/data.ts        món (16 từ 1 tiếng + model Food Kit + chữ thiếu A2), khách (7), cấp (1–3), nấc trang trí – thuần dữ liệu
src/lines.ts       sinh câu thoại: tên món, "ba quả táo", "mỗi quả một xu", câu từng khách, token đánh vần
src/spell.ts       đánh vần GDPT 2018 (copy game 3)
src/game.ts        luồng ngày / khách / khay / giao hàng / xu / bảng giá / cuối ngày / tự chơi
src/shop.ts        dựng tiệm 3D + 3 nấc trang trí
src/actors.ts      người (Quaternius) + mèo (đuôi code), phụ kiện gắn xương đầu
src/assets.ts      tải GLB, metalness 0, đổi màu material, fit kích thước, bảng tên
src/audio.ts tween.ts magic.ts family.ts   copy/chỉnh từ game 3
src/ui.ts progress.ts main.ts lab.ts
scripts/           gen-audio.sh, audio-manifest.txt, word-audio.mjs
```

## Bản 2 (chưa làm, dữ liệu đã chừa chỗ)

- Cấp 3 thối tiền: `LEVELS[2]` (`pay: 'change'`, `enabled: false`) – thêm nhánh trong `Game.pay()`.
- Khách pony (model game 2): `CustomerDef.kind = 'pony'` – thêm dòng `CUSTOMERS` + nhánh dựng trong `makeActor()`.
- Thẻ 2 món (cộng trong 10).
