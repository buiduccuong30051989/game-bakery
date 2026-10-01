# Plan game 4: "Tiệm bánh của Nhím" (Three.js 3D, bán hàng + học)

Trạng thái: PLAN, 01/10/2026, chờ Adam gật.

## 1 câu

Nhím làm chủ tiệm bánh nhỏ dễ thương; cả nhà (ba Cường, mẹ Yến, bà Tuyết, ông Cương, bác Hanh) và bạn bè (mèo Mun, mèo Rơm, các pony đã cứu ở game 2) lần lượt vào tiệm gọi món; Nhím nghe – đọc thẻ gọi món – lấy đúng món, đúng số lượng – nhận xu, thối tiền; khách vui thì tiệm lớn dần.

## Vòng chơi 1 khách (~1 phút)

1. **Khách bước vào** (cửa leng keng), đi tới quầy, vẫy chào: "Chào Nhím! Bà muốn mua…".
2. **Thẻ gọi món** hiện trên bong bóng: hình + chữ + số. Ví dụ `🍎 táo × 3`, `🍩 bánh × 1`. Chạm chữ → nghe đánh vần chuẩn lớp 1.
3. **Nhím lấy món**: chạm món trên kệ (kệ 3D bày Food Kit thật), món bay vào khay; đếm to "một, hai, ba". Lấy dư thì chạm khay để bỏ lại, không phạt.
4. **Giao hàng**: chạm nút 🛎️ → khách kiểm khay: đủ thì vui, thiếu thì nói nhẹ "Bà cần thêm 1 quả táo nữa nè".
5. **Trả tiền** (từ cấp 2): khách đưa xu ⭐ (1 xu = 1 ngôi sao, chưa dùng tiền thật). "Ba cái bánh, mỗi cái 1 xu, là mấy xu?" → đếm xu; cấp 3: khách đưa 5 xu, Nhím thối lại → trừ trong 5 / 10 bằng hình.
6. **Khách vui**: ôm Nhím / nhảy / tim bay, để lại 1 ⭐ đánh giá. Đủ ⭐ thì mở món mới + trang trí tiệm (rèm, đèn, hoa, bảng hiệu).

## Học gì

| Cấp | Đánh vần | Toán |
|---|---|---|
| 1 | Nghe tên món, chọn hình (A1) | Đếm 1–5 món |
| 2 | Thẻ chữ + nghe đánh vần; điền chữ thiếu trên bảng giá (A2) | Đếm 1–10, đếm xu |
| 3 | Đọc thẻ 2 món | Cộng trong 10 (2 món gộp), thối tiền (trừ trong 5–10) |

Từ vựng món (1 âm tiết, có trong Food Kit): táo, lê, cam, chuối→(2 âm, bỏ), dưa, nho, dâu, bánh, kem, kẹo, trứng, sữa, cá, ngô, bí, nấm, xôi?(không có model, bỏ). Token đánh vần theo GDPT 2018 như các game trước.

## Khách & tính cách

| Khách | Hiện ra | Thích mua |
|---|---|---|
| Ba Cường | người (Quaternius), hoặc Rainbow Dash nếu Nhím mở "khách pony" | bánh mì, cà phê… (cup) |
| Mẹ Yến | người / Rarity | dâu, kem |
| Bà Tuyết | người / Celestia | bánh kem, trà |
| Ông Cương | người / Applejack | táo, lê |
| Bác Hanh | người / Luna | bánh vòng, sữa |
| Mun, Rơm | mèo Quaternius | cá, sữa |
| Pony bạn (Pinkie, Fluttershy…) | dùng lại model game 2 | kẹo, bánh cupcake |

Người: model Quaternius CC0 (Animated Woman/Man/Old có Idle/Walk/Wave) đổi màu áo/tóc + bảng tên + ảnh thật từ `public/family/<id>.jpg` trên bong bóng. Mỗi người một giọng chào riêng (giọng Linh, thay được bằng giọng thật).

## Sinh động

- Tiệm 3D góc nhìn ấm áp: quầy gỗ, kệ bánh, tủ kính, cửa sổ nhìn ra phố, đèn treo; chuông cửa leng keng, mèo Mun ngủ trên bậu cửa vẫy đuôi.
- Khách đi vào/ra thật (Walk clip), xếp hàng 1–2 người chờ phía sau, ngó nghiêng, vẫy Nhím.
- Món bay vào khay theo cung, nảy nhẹ; giao đúng: pháo giấy + tim + khách nhảy.
- Ngồi im 10 s: khách nhắc lại món, mũi tay chỉ món đúng.
- Cuối ngày (6 khách): "Đóng cửa tiệm", đếm ⭐ cả ngày, cả nhà khen.

## Kỹ thuật

- Vite + TS + three r186, tái dùng audio/tween/magic/challenge/family từ game 1–3.
- Assets: Kenney Food Kit (CC0, đã tải, ~200 món), Kenney Furniture Kit (tải thêm, CC0) cho quầy/kệ, Quaternius người CC0, pony models từ game 2.
- Debug URL nhảy tới cấp / khách như các game trước. Lưu tiến độ localStorage.

## Bản 1

- Cấp 1 + 2 trọn vẹn, 6 khách gia đình + Mun/Rơm, trang trí mở 3 nấc.
- Cấp 3 (thối tiền), khách pony: bản 2.
