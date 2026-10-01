// Dữ liệu game: món hàng, khách, cấp độ, nấc trang trí. File THUẦN (không DOM, không three):
// scripts/word-audio.mjs import thẳng để sinh / soát audio.
//
// Bản 1: cấp 1 + 2, 5 người nhà + 2 mèo. Bản 2 cắm thêm vào đây (không đổi luồng game):
//   - LEVELS[2] (cấp 3, pay: 'change' = thối tiền): đang enabled: false.
//   - khách kind 'pony' (model game 2): CustomerDef đã có kind + model, chỉ cần thêm dòng + nhánh dựng actor.

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
  { word: 'trứng', cls: 'quả', emoji: '🥚', model: 'food/egg.glb', size: 0.36, fill: { index: 2, distractors: ['á', 'ó'] } },
  { word: 'sữa', cls: 'hộp', emoji: '🥛', model: 'food/carton.glb', size: 0.5, rotY: -0.5, fill: { index: 0, distractors: ['x', 'c'] } },
  { word: 'cá', cls: 'con', emoji: '🐟', model: 'food/fish.glb', size: 0.52, rotY: 0.6, fill: { index: 0, distractors: ['b', 't'] } },
  { word: 'ngô', cls: 'bắp', emoji: '🌽', model: 'food/corn.glb', size: 0.52, rotY: 0.4, fill: { index: 2, distractors: ['o', 'ơ'] } },
  { word: 'bí', cls: 'quả', emoji: '🎃', model: 'food/pumpkin.glb', size: 0.46, fill: { index: 0, distractors: ['đ', 'l'] } },
  { word: 'nấm', cls: 'cây', emoji: '🍄', model: 'food/mushroom.glb', size: 0.42, fill: { index: 2, distractors: ['n', 'p'] } },
  { word: 'chanh', cls: 'quả', emoji: '🍋', model: 'food/lemon.glb', size: 0.4, fill: { index: 2, distractors: ['o', 'e'] } },
];

export const CLASSIFIERS: Classifier[] = ['quả', 'cái', 'chùm', 'cây', 'hộp', 'con', 'bắp'];
export const NUMBER_TEXT = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín', 'mười'];

export type CustomerId = 'ba_cuong' | 'me_yen' | 'ba_tuyet' | 'ong_cuong' | 'bac_hanh' | 'mun' | 'rom';
export type FamilyId = 'ba-cuong' | 'me-yen' | 'ba-tuyet' | 'ong-cuong' | 'bac-hanh';
/** Phụ kiện dựng bằng code gắn vào xương đầu */
export type Prop = 'glasses' | 'cap' | 'bun' | 'bow' | 'headband';

export interface CustomerDef {
  id: CustomerId;
  /** 'pony' = bản 2 (dùng model game 2) */
  kind: 'human' | 'cat' | 'pony';
  name: string;
  /** khách tự xưng: "Bà muốn mua…" */
  self: string;
  /** ảnh / emoji bong bóng gia đình (người nhà) */
  family?: FamilyId;
  emoji: string;
  /** màu bảng tên */
  color: string;
  model: string;
  height: number;
  /** đổi màu theo tên material của model */
  tint: Record<string, number>;
  props: Prop[];
  /** món hay mua (id = từ) – đủ món khác nhau để mỗi ngày không lặp */
  likes: string[];
  /** tốc độ đọc giọng Linh (macOS say -r): ông bà chậm hơn */
  rate: number;
}

export const CUSTOMERS: CustomerDef[] = [
  {
    id: 'ba_cuong', kind: 'human', name: 'Ba Cường', self: 'Ba', family: 'ba-cuong', emoji: '👨', color: '#2f9df5',
    model: 'people/man_casual.glb', height: 1.95,
    tint: { LightBrown: 0x3d8bff, LightBlue: 0x3a4a6b, Hair: 0x1d1410, White: 0xffffff, Red_Dark: 0xe0483c },
    props: [], likes: ['bánh', 'trứng', 'ngô', 'cam', 'sữa'], rate: 150,
  },
  {
    id: 'me_yen', kind: 'human', name: 'Mẹ Yến', self: 'Mẹ', family: 'me-yen', emoji: '👩', color: '#ff5fb4',
    model: 'people/woman_casual.glb', height: 1.84,
    tint: { White: 0xff8cc6, Orange: 0xffffff, Hair_Brown: 0x2a1a14, Hair_Blond: 0x2a1a14, Brown: 0x2a1a14, Grey: 0xff5fa0 },
    props: ['bow'], likes: ['dâu', 'kem', 'nho', 'chanh', 'dưa'], rate: 155,
  },
  {
    id: 'ba_tuyet', kind: 'human', name: 'Bà Tuyết', self: 'Bà', family: 'ba-tuyet', emoji: '👵', color: '#8b5cf6',
    model: 'people/woman_formal.glb', height: 1.76,
    tint: { LimeGreen: 0x9b7be8, Gold: 0xffd166, Red: 0xdedae6, Brown: 0x8a7f96 },
    props: ['glasses', 'bun'], likes: ['bánh', 'lê', 'bí', 'nấm', 'trứng'], rate: 138,
  },
  {
    id: 'ong_cuong', kind: 'human', name: 'Ông Cương', self: 'Ông', family: 'ong-cuong', emoji: '👴', color: '#3f9b1f',
    model: 'people/man_suit.glb', height: 1.88,
    tint: { Suit: 0x6a8f4e, Tie: 0xd94b3d, Hair: 0xf1efe9, Eyebrows: 0xf1efe9, Black: 0x5a3b26 },
    props: ['glasses', 'cap'], likes: ['táo', 'lê', 'cam', 'ngô', 'dưa'], rate: 135,
  },
  {
    id: 'bac_hanh', kind: 'human', name: 'Bác Hanh', self: 'Bác', family: 'bac-hanh', emoji: '👩‍🦱', color: '#ff9600',
    model: 'people/woman_casual.glb', height: 1.8,
    tint: { White: 0xffb238, Orange: 0x2f7fd8, Hair_Brown: 0x5a2e1a, Hair_Blond: 0x5a2e1a, Brown: 0x5a2e1a, Grey: 0xffffff },
    props: ['headband'], likes: ['bánh', 'sữa', 'kẹo', 'nho', 'chanh'], rate: 155,
  },
  {
    id: 'mun', kind: 'cat', name: 'Mèo Mun', self: 'Mun', emoji: '🐈‍⬛', color: '#4a3a5a',
    model: 'cat.glb', height: 0.74,
    tint: { Cat_Main: 0x3a3a44, Cat_Secondary: 0x26262d },
    props: [], likes: ['cá', 'sữa'], rate: 165,
  },
  {
    id: 'rom', kind: 'cat', name: 'Mèo Rơm', self: 'Rơm', emoji: '🐈', color: '#e8892c',
    model: 'cat.glb', height: 0.74,
    tint: { Cat_Main: 0xf3a64e, Cat_Secondary: 0xd8742a },
    props: [], likes: ['cá', 'sữa'], rate: 165,
  },
];

export interface LevelDef {
  id: 1 | 2 | 3;
  enabled: boolean;
  /** số món khách gọi */
  count: [number, number];
  /** chấm hình dưới thẻ gọi món (hỗ trợ đếm bằng hình) */
  pips: boolean;
  /** 'none' cấp 1, 'count' cấp 2 (đếm xu), 'change' cấp 3 (thối tiền, bản 2) */
  pay: 'none' | 'count' | 'change';
  /** A2 điền chữ thiếu trên bảng giá: khách thứ mấy (0-based) trong ngày */
  fillAt: number[];
  /** số loại món bày trên kệ */
  shelf: number;
}

export const LEVELS: LevelDef[] = [
  { id: 1, enabled: true, count: [1, 5], pips: true, pay: 'none', fillAt: [], shelf: 8 },
  { id: 2, enabled: true, count: [3, 8], pips: false, pay: 'count', fillAt: [0, 2, 4], shelf: 8 },
  { id: 3, enabled: false, count: [2, 6], pips: false, pay: 'change', fillAt: [2, 4], shelf: 8 },
];

/** Khách mỗi ngày */
export const DAY_SIZE = 6;
/** Khay chứa tối đa */
export const TRAY_MAX = 10;

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
