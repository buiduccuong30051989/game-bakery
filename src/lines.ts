// Mọi câu thoại sinh từ dữ liệu (khách × món × số) + token đánh vần. File THUẦN (Node chạy được):
// scripts/word-audio.mjs gọi allGeneratedLines() để ghi scripts/audio/_gen.txt, game dùng các hàm key*().
import { spell, letterAudio, wordId, type SpellToken } from './spell.ts';
import { ITEMS, CUSTOMERS, NUMBER_TEXT, type ItemDef, type CustomerDef } from './data.ts';

/** key|text|rate (rate rỗng = mặc định) */
export type GenLine = [key: string, text: string, rate?: number];

export const itemId = (it: ItemDef) => wordId(it.word);
export const keyName = (it: ItemDef) => `name_${itemId(it)}`;
/** "ba quả táo" */
export const keyQty = (it: ItemDef, n: number) => `q${n}_${itemId(it)}`;
/** chỉ chữ món: "bánh" (đọc bảng giá) */
export const keyWord = (it: ItemDef) => `word_${itemId(it)}`;
export const keyNum = (n: number) => `n${n}`;
export const keyXu = (n: number) => `xu${n}`;

export interface WordInfo { id: string; word: string; tokens: SpellToken[]; nameKey: string; fillLetterKeys: Record<string, string> }
const wordCache = new Map<string, WordInfo>();
export function wordInfo(it: ItemDef): WordInfo {
  let w = wordCache.get(it.word);
  if (!w) {
    const s = spell(it.word);
    const fillLetterKeys: Record<string, string> = {};
    const correct = Array.from(s.word)[it.fill.index];
    for (const ch of [correct, ...it.fill.distractors]) { const a = letterAudio(ch); if (a) fillLetterKeys[ch] = a[0]; }
    w = { id: s.id, word: s.word, tokens: s.tokens, nameKey: keyName(it), fillLetterKeys };
    wordCache.set(it.word, w);
  }
  return w;
}

/** Câu riêng của từng khách. Đuôi câu chung (more_end…) ở scripts/audio-manifest.txt. */
export function customerLines(c: CustomerDef): GenLine[] {
  const P = c.self;
  const cat = c.kind === 'cat';
  const r = c.rate;
  const L: GenLine[] = [
    [`greet1_${c.id}`, cat ? `Meo meo! Chào Nhím! ${P} muốn mua` : `Chào Nhím! ${P} muốn mua`, r],
    [`greet2_${c.id}`, cat ? `Meo! Nhím ơi, ${P} đói bụng quá. ${P} muốn mua` : `Nhím ơi! Hôm nay ${P} muốn mua`, r],
    [`remind_${c.id}`, `Nhím ơi, ${P} muốn mua`, r],
    [`more_${c.id}`, `${P} cần thêm`, r],
    [`wrong_${c.id}`, `Ơ, ${P} không mua`, r],
    [`thanks1_${c.id}`, cat ? `Meo meo! Đúng rồi! ${P} cảm ơn Nhím!` : `Đúng rồi! Cảm ơn Nhím nhé!`, r],
    [`thanks2_${c.id}`, cat ? `Ngon quá! ${P} thương Nhím nhất!` : `Giỏi quá! ${P} thương Nhím lắm!`, r],
    [`pay_${c.id}`, cat ? `${P} gửi tiền nè, meo!` : `${P} gửi tiền nè!`, r],
    [`bye_${c.id}`, cat ? `Meo! Tạm biệt Nhím!` : `Tạm biệt Nhím! ${P} về nhé!`, r],
    [`tap_${c.id}`, cat ? `Meo meo! Nhột quá!` : `Hi hi! ${P} đây nè Nhím!`, r],
  ];
  return L;
}

export const CUSTOMER_KEYS = ['greet1', 'greet2', 'remind', 'more', 'wrong', 'thanks1', 'thanks2', 'pay', 'bye', 'tap'] as const;
export const ck = (kind: typeof CUSTOMER_KEYS[number], c: CustomerDef) => `${kind}_${c.id}`;

/** Mọi dòng tự sinh: tên món, chữ món, "N quả táo", số, xu, token đánh vần, chữ cái A2, câu khách. */
export function allGeneratedLines(): GenLine[] {
  const out = new Map<string, GenLine>();
  const add = (l: GenLine) => {
    const prev = out.get(l[0]);
    if (prev && prev[1] !== l[1]) throw new Error(`key ${l[0]}: "${prev[1]}" ≠ "${l[1]}"`);
    out.set(l[0], l);
  };
  for (let n = 1; n <= 10; n++) {
    add([keyNum(n), NUMBER_TEXT[n].replace(/^./, (s) => s.toUpperCase())]);
    add([keyXu(n), `${NUMBER_TEXT[n]} xu`]);
  }
  for (const it of ITEMS) {
    const s = spell(it.word);
    add([keyName(it), `${it.cls} ${it.word}`]);
    add([keyWord(it), it.word]);
    for (let n = 1; n <= 10; n++) add([keyQty(it, n), `${NUMBER_TEXT[n]} ${it.cls} ${it.word}`]);
    for (const [k, t] of s.lines) add([k, t]);
    const correct = Array.from(s.word)[it.fill.index];
    for (const ch of [correct, ...it.fill.distractors]) { const a = letterAudio(ch); if (a) add([a[0], a[1]]); }
  }
  for (const c of CUSTOMERS) for (const l of customerLines(c)) add(l);
  return [...out.values()];
}

/** Soát dữ liệu: trả danh sách lỗi (rỗng = đạt). */
export function validateData(): string[] {
  const errs: string[] = [];
  const emojis = new Set<string>();
  for (const it of ITEMS) {
    let s;
    try { s = spell(it.word); } catch (e) { errs.push(`món "${it.word}": ${(e as Error).message}`); continue; }
    if (emojis.has(it.emoji)) errs.push(`emoji ${it.emoji} trùng`);
    emojis.add(it.emoji);
    const chars = Array.from(s.word);
    const { index, distractors } = it.fill;
    if (index < 0 || index >= chars.length) { errs.push(`"${it.word}": fill.index ngoài từ`); continue; }
    const correct = chars[index];
    const onLen = Array.from(s.onset).length;
    if (onLen > 1 && index < onLen) errs.push(`"${it.word}": đừng che chữ trong âm đầu ghép "${s.onset}"`);
    for (const d of distractors) {
      if (Array.from(d).length !== 1) errs.push(`"${it.word}": chữ nhiễu "${d}" phải 1 ký tự`);
      if (d === correct) errs.push(`"${it.word}": chữ nhiễu trùng chữ đúng`);
      if (!letterAudio(d)) errs.push(`"${it.word}": chữ nhiễu "${d}" không đọc được`);
    }
  }
  for (const c of CUSTOMERS) {
    for (const w of c.likes) if (!ITEMS.some((i) => i.word === w)) errs.push(`${c.id}: món "${w}" không có trong ITEMS`);
    if (c.kind === 'eg' && c.likes.length < 3) errs.push(`${c.id}: cần ≥ 3 món hay mua`);
  }
  return errs;
}
