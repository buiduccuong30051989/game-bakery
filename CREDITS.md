# Ghi công tài nguyên (dùng chơi trong nhà)

## Nhân vật Equestria Girls (Sketchfab, bordiyan20035, CC BY-NC 4.0 – CHỈ chơi trong nhà, không publish, không bán)

Nhân vật là IP Hasbro (My Little Pony: Equestria Girls), model fan làm (VRoid). Không có clip: mọi động tác dựng bằng code (src/eg.ts).

| File | Vai trong game | Tên model | Link |
|---|---|---|---|
| eg/twilight.glb | Nhím (chủ tiệm, tạp dề code) | Twilight Sparkle | https://sketchfab.com/3d-models/301632eaf3f240619de0e116eade16ee |
| eg/rarity.glb | Mẹ Yến | Rarity | https://sketchfab.com/3d-models/a736f5df175d4daf9eb179a82bdc7983 |
| eg/rainbow.glb | Ba Cường | Rainbow Dash | https://sketchfab.com/3d-models/4b0e0040d7d44f0fbe5ac91fb9afe8b4 |
| eg/applejack.glb | Ông Cương | Applejack | https://sketchfab.com/3d-models/7fd8b1c768b14c608c2882d1ad2eb012 |
| eg/celestia.glb | Bà Tuyết | Principal Celestia | https://sketchfab.com/3d-models/69e3f963f8784864979ac807aac8799a |
| eg/luna.glb | Bác Hanh | Principal Luna | https://sketchfab.com/3d-models/a2cab0de53de4f699fa9acc696b53575 |
| eg/pinkie.glb | Chị Pinkie (bạn) | Pinkie Pie | https://sketchfab.com/3d-models/b32dd08ff65a4031b46393dd23f013c7 |
| eg/fluttershy.glb | Chị Fluttershy (bạn) | Fluttershy | https://sketchfab.com/3d-models/4ee1e3036ee84e5085381b4db6340f27 |
| eg/sunset.glb | Chị Sunset (bạn) | Sunset Shimmer | https://sketchfab.com/3d-models/7687894bd4e04966a552ce7719313911 |

## Mèo (Quaternius, CC0)

| File | Tên model | Nguồn |
|---|---|---|
| cat.glb (Mun, Rơm – đổi màu, đuôi code) | Cat | copy từ game 1 (01-island-three), Quaternius CC0 |

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
