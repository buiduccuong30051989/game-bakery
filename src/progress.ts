// Tiến độ lưu localStorage + tham số URL debug.
import { DECOR } from './data.ts';

const KEY = 'bakery-progress-v1';

export interface Progress {
  /** tổng ⭐ (mỗi khách vui 1 ⭐) */
  stars: number;
  /** số ngày đã đóng cửa ở từng cấp */
  days: Record<string, number>;
  /** đã nghe lời dẫn đầu tiên */
  introDone: boolean;
  /** đã nghe lời dẫn cấp 2 */
  intro2Done: boolean;
  /** số nấc trang trí đã mở (0..3) */
  decor: number;
}

const DEFAULT: Progress = { stars: 0, days: {}, introDone: false, intro2Done: false, decor: 0 };

export const params = new URLSearchParams(location.search);
export const PARAM = {
  level: Number(params.get('level')) || 0,
  customer: params.get('customer'),
  auto: params.get('auto') === '1',
  mute: params.get('mute') === '1',
  debug: params.get('debug') === '1',
  /** xem trước N nấc trang trí (không lưu) */
  decor: params.has('decor') ? Number(params.get('decor')) : null,
  /** giả lập tổng sao (không lưu) */
  stars: params.has('stars') ? Number(params.get('stars')) : null,
  /** ép phép cộng của khách đầu: ?a=3&b=2 (mỗi số 1..5) */
  a: params.has('a') ? Math.max(1, Math.min(5, Number(params.get('a')))) : null,
  b: params.has('b') ? Math.max(1, Math.min(5, Number(params.get('b')))) : null,
  /** ngày ngắn (soát nhanh cuối ngày): số khách */
  day: params.has('day') ? Math.max(1, Math.min(6, Number(params.get('day')))) : null,
};
/** Đang giả lập (không ghi đè tiến độ thật) */
export const SIMULATED = PARAM.decor !== null || PARAM.stars !== null;

export function loadProgress(): Progress {
  if (params.get('reset') === '1') {
    try { localStorage.removeItem(KEY); } catch { /* bỏ qua */ }
  }
  let p: Progress = { ...DEFAULT, days: {} };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) p = { ...p, ...JSON.parse(raw) as Partial<Progress> };
  } catch { /* storage hỏng / chặn: chơi tiếp không lưu */ }
  if (PARAM.stars !== null) { p.stars = PARAM.stars; p.decor = DECOR.filter((d) => p.stars >= d.stars).length; }
  if (PARAM.decor !== null) p.decor = Math.max(0, Math.min(DECOR.length, PARAM.decor));
  return p;
}

export function saveProgress(p: Progress): void {
  if (SIMULATED) return;
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* bỏ qua */ }
}

export function level2Unlocked(p: Progress): boolean {
  return (p.days['1'] ?? 0) >= 1 || (p.days['2'] ?? 0) >= 1;
}
