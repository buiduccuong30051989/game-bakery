# Ghi công tài nguyên (tất cả CC0 1.0, dùng chơi trong nhà)

## Nhân vật (Quaternius, CC0, tải qua poly.pizza static CDN)

| File | Tên model | Tác giả | Giấy phép | Trang | GLB |
|---|---|---|---|---|---|
| people/man_casual.glb (Ba Cường) | Casual Character | Quaternius | CC0 1.0 | https://poly.pizza/m/kZ3DmIoGip | https://static.poly.pizza/90a9e2d4-053f-42f1-99a2-8f5e1180ea7f.glb |
| people/woman_casual.glb (Mẹ Yến, Bác Hanh) | Animated Woman | Quaternius | CC0 1.0 | https://poly.pizza/m/qJ2gsTUBHL | https://static.poly.pizza/ba7a1955-ea51-4cb9-a561-188bdef0a6c7.glb |
| people/woman_formal.glb (Bà Tuyết) | Animated Woman | Quaternius | CC0 1.0 | https://poly.pizza/m/nIItLV9nxS | https://static.poly.pizza/46d6db5a-3c9f-4238-8cdf-8eb7194498dc.glb |
| people/man_suit.glb (Ông Cương) | Business Man | Quaternius | CC0 1.0 | https://poly.pizza/m/JFrLIKqvCH | https://static.poly.pizza/e599abbe-7d73-488c-9d7e-3ead281e705c.glb |
| people/man_worker.glb (dự phòng, chưa dùng) | Worker | Quaternius | CC0 1.0 | https://poly.pizza/m/Yg2bQZO6Hj | https://static.poly.pizza/3a5f3056-ffe6-42eb-bd52-122afcbd22b2.glb |
| cat.glb (Mun, Rơm – đổi màu) | Cat | Quaternius | CC0 1.0 | copy từ game 1 (01-island-three) | |

Clip dùng: Idle, Walk, Wave, Interact (người); Idle, Walk, Jump, Dance, Yes, No (mèo). Kính, mũ, búi tóc, nơ, kẹp hoa, đuôi mèo: dựng bằng code (src/actors.ts).

## Đồ vật

| Thư mục | Bộ | Tác giả | Giấy phép | Nguồn |
|---|---|---|---|---|
| public/models/food/ (+ Textures/colormap.png) | Food Kit | Kenney | CC0 1.0 | https://kenney.nl/assets/food-kit |
| public/models/furniture/ | Furniture Kit 2.0 | Kenney | CC0 1.0 | https://kenney.nl/assets/furniture-kit |

Phòng (tường, sàn, cửa, cửa sổ, quầy, kệ bày, khay 2 bậc, hũ xu, đèn treo, mái hiên, bảng giá, rèm, cờ, đèn nháy, bóng bay, bảng hiệu): dựng bằng code (src/shop.ts).

## Âm thanh

| File | Nguồn |
|---|---|
| public/audio/*.m4a (giọng) | macOS `say -v Linh`, sinh bằng scripts/gen-audio.sh |
| public/audio/cry_cat.m4a | Wikimedia Commons "Maullido de gata hembra joven.ogg" (CC0), đã cắt ngắn (copy từ game 1) |
| public/audio/sfx_*.ogg | Kenney (CC0), copy từ game 1/3 |
| chuông cửa, chuông giao hàng, leng keng xu, nhạc mở/đóng cửa | tổng hợp WebAudio (src/audio.ts, không file) |
