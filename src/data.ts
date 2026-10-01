// Dữ liệu game: món hàng, khách, cấp độ, nấc trang trí. File THUẦN (không DOM, không three):
// scripts/word-audio.mjs import thẳng để sinh / soát audio.
//
// Toán: PHÉP CỘNG trong 10 (bé đã biết đếm). Mỗi khách gọi 2 phần: cấp 1 cùng 1 món (3 quả táo và 2 quả táo nữa,
// tổng ≤ 5, số sau 1–2); cấp 2 hai món khác nhau (2 cái bánh và 3 cây kem, tổng ≤ 10) + trả xu cũng là phép cộng.
// Khách là Equestria Girls (người nhà Nhím đóng vai) + 3 bạn, mèo Mun / Rơm; Nhím (Twilight) đứng quầy.
// Bản 2 cắm thêm vào đây: LEVELS[2] (thối tiền, pay 'change') đang enabled: false; thêm khách chỉ cần thêm dòng CUSTOMERS.

/** Loại từ (đơn vị đếm) – đọc trong "ba quả táo", "mỗi quả một xu". */
export type Classifier = 'quả' | 'cái' | 'chùm' | 'cây' | 'hộp' | 'con' | 'bắp';

export interface ItemDef {
  /** từ 1 tiếng, đúng chính tả (đánh vần GDPT 2018 bằng src/spell.ts) */
  word: string;
  cls: Classifier;
  emoji: string;
  /** file trong public/models/ */
  model: string;
  /** cạnh lớn nhất khi bày (m) */
  size: number;
  /** xoay cho đẹp khi bày (rad, quanh trục y) */
  rotY?: number;
  /** sơn lại 1 màu (thay texture) cho khớp emoji */
  color?: number;
  /** A2 điền chữ thiếu trên bảng giá: index chữ bị che + 2 chữ nhiễu */
  fill: { index: number; distractors: [string, string] };
}

export const ITEMS: ItemDef[] = [
  { word: 'táo', cls: 'quả', emoji: '🍎', model: 'food/apple.glb', size: 0.42, fill: { index: 2, distractors: ['u', 'e'] } },
  { word: 'lê', cls: 'quả', emoji: '🍐', model: 'food/pear.glb', size: 0.46, fill: { index: 0, distractors: ['b', 'm'] } },
  { word: 'cam', cls: 'quả', emoji: '🍊', model: 'food/orange.glb', size: 0.42, fill: { index: 2, distractors: ['n', 't'] } },
  { word: 'dưa', cls: 'quả', emoji: '🍉', model: 'food/watermelon.glb', size: 0.5, fill: { index: 1, distractors: ['u', 'o'] } },
  { word: 'nho', cls: 'chùm', emoji: '🍇', model: 'food/grapes.glb', size: 0.46, fill: { index: 2, distractors: ['a', 'ê'] } },
  { word: 'dâu', cls: 'quả', emoji: '🍓', model: 'food/strawberry.glb', size: 0.4, fill: { index: 2, distractors: ['i', 'o'] } },
  { word: 'bánh', cls: 'cái', emoji: '🍩', model: 'food/donut-sprinkles.glb', size: 0.48, fill: { index: 0, distractors: ['d', 'đ'] } },
  { word: 'kem', cls: 'cây', emoji: '🍦', model: 'food/ice-cream.glb', size: 0.5, fill: { index: 1, distractors: ['a', 'o'] } },
  { word: 'kẹo', cls: 'cây', emoji: '🍭', model: 'food/lollypop.glb', size: 0.5, fill: { index: 2, distractors: ['u', 'a'] } },
  // trứng Food Kit màu nâu → sơn trắng kem cho khớp hình 🥚 trên thẻ gọi món
  { word: 'trứng', cls: 'quả', emoji: '🥚', model: 'food/egg.glb', size: 0.36, color: 0xffffff, fill: { index: 2, distractors: ['á', 'ó'] } },
  { word: 'sữa', cls: 'hộp', emoji: '🥛', model: 'food/carton.glb', size: 0.5, rotY: -0.5, fill: { index: 0, distractors: ['x', 'c'] } },
  { word: 'cá', cls: 'con', emoji: '🐟', model: 'food/fish.glb', size: 0.52, rotY: 0.6, fill: { index: 0, distractors: ['b', 't'] } },
  { word: 'ngô', cls: 'bắp', emoji: '🌽', model: 'food/corn.glb', size: 0.52, rotY: 0.4, fill: { index: 2, distractors: ['o', 'ơ'] } },
  { word: 'bí', cls: 'quả', emoji: '🎃', model: 'food/pumpkin.glb', size: 0.46, fill: { index: 0, distractors: ['đ', 'l'] } },
  { word: 'nấm', cls: 'cây', emoji: '🍄', model: 'food/mushroom.glb', size: 0.42, fill: { index: 2, distractors: ['n', 'p'] } },
  { word: 'chanh', cls: 'quả', emoji: '🍋', model: 'food/lemon.glb', size: 0.4, fill: { index: 2, distractors: ['o', 'e'] } },
];

export const CLASSIFIERS: Classifier[] = ['quả', 'cái', 'chùm', 'cây', 'hộp', 'con', 'bắp'];
export const NUMBER_TEXT = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín', 'mười'];

export type CustomerId = 'ba_cuong' | 'me_yen' | 'ba_tuyet' | 'ong_cuong' | 'bac_hanh' | 'pinkie' | 'fluttershy' | 'sunset' | 'mun' | 'rom' | 'nhim';
export type FamilyId = 'ba-cuong' | 'me-yen' | 'ba-tuyet' | 'ong-cuong' | 'bac-hanh';

export interface CustomerDef {
  id: CustomerId;
  /** 'eg' = Equestria Girls (VRoid, động tác dựng bằng code ở src/eg.ts); 'cat' = mèo Quaternius */
  kind: 'eg' | 'cat';
  /** tên trên bảng tên */
  name: string;
  /** dòng phụ nhỏ dưới tên (vai Equestria Girls) */
  sub?: string;
  /** khách tự xưng: "Bà muốn mua…" */
  self: string;
  /** người nhà: ảnh / emoji bong bóng cổ vũ */
  family?: FamilyId;
  /** bạn của Nhím (không phải người nhà) */
  friend?: boolean;
  emoji: string;
  /** màu bảng tên */
  color: string;
  model: string;
  height: number;
  /** đổi màu theo tên material (mèo) */
  tint: Record<string, number>;
  /** món hay mua (từ) */
  likes: string[];
  /** tốc độ đọc giọng Linh (macOS say -r): ông bà chậm hơn */
  rate: number;
}

const eg = (id: CustomerId, name: string, sub: string, self: string, color: string, model: string, height: number, likes: string[], rate: number, extra: Partial<CustomerDef> = {}): CustomerDef =>
  ({ id, kind: 'eg', name, sub, self, color, model: `eg/${model}.glb`, height, tint: {}, likes, rate, emoji: '🙂', ...extra });

export const CUSTOMERS: CustomerDef[] = [
  eg('ba_cuong', 'Ba Cường', 'Rainbow Dash', 'Ba', '#2f9df5', 'rainbow', 1.72, ['bánh', 'trứng', 'ngô', 'cam', 'sữa'], 150, { family: 'ba-cuong', emoji: '👨' }),
  eg('me_yen', 'Mẹ Yến', 'Rarity', 'Mẹ', '#ff5fb4', 'rarity', 1.7, ['dâu', 'kem', 'nho', 'chanh', 'dưa'], 155, { family: 'me-yen', emoji: '👩' }),
  eg('ba_tuyet', 'Bà Tuyết', 'Celestia', 'Bà', '#8b5cf6', 'celestia', 1.86, ['bánh', 'lê', 'bí', 'nấm', 'trứng'], 138, { family: 'ba-tuyet', emoji: '👵' }),
  eg('ong_cuong', 'Ông Cương', 'Applejack', 'Ông', '#3f9b1f', 'applejack', 1.74, ['táo', 'lê', 'cam', 'ngô', 'dưa'], 135, { family: 'ong-cuong', emoji: '👴' }),
  eg('bac_hanh', 'Bác Hanh', 'Luna', 'Bác', '#4f6bdc', 'luna', 1.84, ['bánh', 'sữa', 'kẹo', 'nho', 'chanh'], 155, { family: 'bac-hanh', emoji: '👩‍🦱' }),
  eg('pinkie', 'Chị Pinkie', 'Pinkie Pie', 'Chị', '#ff6fb5', 'pinkie', 1.68, ['kẹo', 'bánh', 'kem', 'dâu'], 160, { friend: true, emoji: '🎈' }),
  eg('fluttershy', 'Chị Fluttershy', 'Fluttershy', 'Chị', '#e8b800', 'fluttershy', 1.7, ['cá', 'sữa', 'nấm', 'lê'], 145, { friend: true, emoji: '🦋' }),
  eg('sunset', 'Chị Sunset', 'Sunset Shimmer', 'Chị', '#ff7a3d', 'sunset', 1.72, ['cam', 'chanh', 'táo', 'bánh'], 155, { friend: true, emoji: '🌅' }),
  {
    id: 'mun', kind: 'cat', name: 'Mèo Mun', self: 'Mun', emoji: '🐈‍⬛', color: '#4a3a5a',
    model: 'cat.glb', height: 0.74, tint: { Cat_Main: 0x3a3a44, Cat_Secondary: 0x26262d }, likes: ['cá', 'sữa'], rate: 165,
  },
  {
    id: 'rom', kind: 'cat', name: 'Mèo Rơm', self: 'Rơm', emoji: '🐈', color: '#e8892c',
    model: 'cat.glb', height: 0.74, tint: { Cat_Main: 0xf3a64e, Cat_Secondary: 0xd8742a }, likes: ['cá', 'sữa'], rate: 165,
  },
];

/** Nhím đứng quầy (Twilight Sparkle đeo tạp dề): vẫy, mừng khi đúng. */
export const NHIM: CustomerDef = eg('nhim', 'Nhím', 'Twilight', 'Nhím', '#a05ce6', 'twilight', 1.62, [], 150, { emoji: '🦔' });

export interface LevelDef {
  id: 1 | 2 | 3;
  enabled: boolean;
  /** tổng a + b */
  sum: [number, number];
  /** số hạng sau b */
  b: [number, number];
  /** 1 = hai phần cùng 1 món; 2 = hai món khác nhau */
  kinds: 1 | 2;
  /** 'none' cấp 1; 'add' cấp 2 (giá túi 1 + giá túi 2 = ? xu); 'change' cấp 3 (thối tiền, bản 2) */
  pay: 'none' | 'add' | 'change';
  /** A2 điền chữ thiếu trên bảng giá: khách thứ mấy (0-based) trong ngày */
  fillAt: number[];
  /** số loại món bày trên kệ */
  shelf: number;
}

export const LEVELS: LevelDef[] = [
  { id: 1, enabled: true, sum: [2, 5], b: [1, 2], kinds: 1, pay: 'none', fillAt: [], shelf: 8 },
  { id: 2, enabled: true, sum: [4, 10], b: [1, 5], kinds: 2, pay: 'add', fillAt: [1, 4], shelf: 8 },
  { id: 3, enabled: false, sum: [2, 10], b: [1, 5], kinds: 2, pay: 'change', fillAt: [2], shelf: 8 },
];

/** Khách mỗi ngày: 4 người nhà + 1 bạn + 1 mèo */
export const DAY_SIZE = 6;

/** 3 nấc trang trí: mở khi tổng ⭐ đạt mốc (mỗi khách vui = 1 ⭐, 1 ngày = 6 ⭐). */
export interface DecorDef { id: 'flowers' | 'lights' | 'sign'; stars: number; emoji: string; audio: string }
export const DECOR: DecorDef[] = [
  { id: 'flowers', stars: 6, emoji: '🌷', audio: 'decor_flowers' },
  { id: 'lights', stars: 12, emoji: '💡', audio: 'decor_lights' },
  { id: 'sign', stars: 18, emoji: '🧁', audio: 'decor_sign' },
];

export function itemByWord(word: string): ItemDef {
  const it = ITEMS.find((i) => i.word === word);
  if (!it) throw new Error(`không có món "${word}"`);
  return it;
}
export function customerById(id: string): CustomerDef | undefined {
  return CUSTOMERS.find((c) => c.id === id);
}
